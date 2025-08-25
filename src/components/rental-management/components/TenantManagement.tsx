'use client'

import { useState, useEffect } from 'react'
import { Button, TextField } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'
import { RentalTenant, TenantFormData, LeaseAgreement, LeaseFormData } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
import { UnitAllocationService } from '../services/unit-allocation.service'
import { ConflictPreventionService } from '../services/conflict-prevention.service'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatUnitAllocation, extractUnitPropertyData } from '../utils/unit-display.utils'
import supabase from '../../../lib/supabase-client'

interface TenantManagementProps {
  onDataChange?: () => void
}

const phoneRegex = /^\+?[0-9\s\-()]+$/

const tenantSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(120),
  phone: z.string().min(1, 'Phone is required').regex(phoneRegex, 'Enter a valid phone number'),
  alternate_phone: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  national_id: z.string().min(1, 'National ID is required').max(40),
  employer: z.string().max(120).optional().or(z.literal('')),
  emergency_contact_name: z.string().max(120).optional().or(z.literal('')),
  emergency_contact_phone: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  emergency_contact_relationship: z.string().max(60).optional().or(z.literal('')),
  emergency_contact_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
}).refine((val) => {
  // Emergency contact name and phone should be provided together
  const hasName = !!val.emergency_contact_name
  const hasPhone = !!val.emergency_contact_phone
  return (hasName && hasPhone) || (!hasName && !hasPhone)
}, { message: 'Emergency contact name and phone must be provided together', path: ['emergency_contact_name'] })

const leaseSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant is required'),
  unit_id: z.string().min(1, 'Unit is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  monthly_rent_kes: z.coerce.number().min(1, 'Monthly rent is required'),
  security_deposit: z.coerce.number().optional(),
  pet_deposit: z.coerce.number().optional(),
  notes: z.string().optional(),
})

export default function TenantManagement({ onDataChange }: TenantManagementProps) {
  const [tenants, setTenants] = useState<RentalTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Search and filter state (to mirror /dashboard/tenants)
  const [q, setQ] = useState('')
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([])
  const [units, setUnits] = useState<Array<{ id: string; unit_label: string; property_id: string }>>([])
  const [propertyId, setPropertyId] = useState('')
  const [unitId, setUnitId] = useState('')

  const [selectedTenant, setSelectedTenant] = useState<RentalTenant | null>(null)
  const [showTenantModal, setShowTenantModal] = useState(false)
  const [showAddTenantModal, setShowAddTenantModal] = useState(false)
  const [showReallocationModal, setShowReallocationModal] = useState(false)
  const [reallocationTenant, setReallocationTenant] = useState<RentalTenant | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reallocating, setReallocating] = useState(false)
  const [availableUnits, setAvailableUnits] = useState<any[]>([])
  const [selectedNewUnit, setSelectedNewUnit] = useState('')
  const [reallocationNotes, setReallocationNotes] = useState('')
  const [showEditTenantModal, setShowEditTenantModal] = useState(false)
  const [showLeaseHistoryModal, setShowLeaseHistoryModal] = useState(false)
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<RentalTenant | null>(null)
  const [leaseHistory, setLeaseHistory] = useState<any[]>([])
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Lease management state
  const [showLeaseManagementModal, setShowLeaseManagementModal] = useState(false)
  const [showCreateLeaseModal, setShowCreateLeaseModal] = useState(false)
  const [selectedLeaseForManagement, setSelectedLeaseForManagement] = useState<LeaseAgreement | null>(null)
  const [tenantForNewLease, setTenantForNewLease] = useState<RentalTenant | null>(null)
  const [leaseSubmitting, setLeaseSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema)
  })

  const {
    register: registerLease,
    handleSubmit: handleSubmitLease,
    reset: resetLease,
    watch: watchLease,
    setValue: setValueLease,
    formState: { errors: leaseErrors }
  } = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema)
  })

  useEffect(() => {
    loadTenants()
  }, [])

  // Load accessible properties similar to TenantList
  useEffect(() => {
    const loadProps = async () => {
      try {
        const { data: accessible, error: rpcErr } = await supabase.rpc('get_user_properties_simple')
        if (rpcErr) throw rpcErr
        const ids = (accessible || []).map((p: any) => (typeof p === 'string' ? p : p?.property_id)).filter(Boolean)
        if (ids.length === 0) { setProperties([]); return }
        const { data, error } = await supabase.from('properties').select('id, name').in('id', ids).order('name')
        if (error) throw error
        setProperties(data || [])
      } catch (e) {
        console.error('[TenantManagement] loadProps error', e)
      }
    }
    loadProps()
  }, [])

  // Load units when property changes
  useEffect(() => {
    const loadUnits = async () => {
      setUnits([])
      setUnitId('')
      if (!propertyId) return
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_label, property_id')
        .eq('property_id', propertyId)
        .order('unit_label')
      if (!error) setUnits(data || [])
    }
    loadUnits()
  }, [propertyId])

  const loadTenants = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await RentalManagementService.getTenants()
      setTenants(data)
    } catch (err: any) {
      console.error('Error loading tenants:', err)
      setError(err.message || 'Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesQ = !q || (
      tenant.full_name.toLowerCase().includes(q.toLowerCase()) ||
      (tenant.phone || '').toLowerCase().includes(q.toLowerCase()) ||
      (tenant.email || '').toLowerCase().includes(q.toLowerCase())
    )
    const matchesProperty = !propertyId || ((tenant as any).current_unit?.property_id === propertyId)
    const activeAgreementUnitId = (tenant as any)?.tenancy_agreements?.find((a: any) => a.status === 'ACTIVE')?.unit_id
    const matchesUnit = !unitId || (activeAgreementUnitId === unitId)
    return matchesQ && matchesProperty && matchesUnit
  })

  const handleTenantClick = (tenant: RentalTenant) => {
    setSelectedTenant(tenant)
    setShowTenantModal(true)
  }

  const handleAddTenant = async (data: TenantFormData) => {
    try {
      setSubmitting(true)
      await RentalManagementService.createTenant(data)
      await loadTenants()
      setShowAddTenantModal(false)
      reset()
      onDataChange?.()
    } catch (err: any) {
      console.error('Error creating tenant:', err)
      setError(err.message || 'Failed to create tenant')
    } finally {
      setSubmitting(false)
    }
  }

  const getTenantStatus = (tenant: RentalTenant) => {
    if (tenant.current_unit) {
      return { label: 'Active', color: 'bg-green-100 text-green-800' }
    }
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' }
  }

  const handleReallocation = async (tenant: RentalTenant) => {
    setReallocationTenant(tenant)
    setSelectedNewUnit('')
    setReallocationNotes('')

    // Load available units (vacant units + current unit for reference)
    try {
      const { data: allUnits, error } = await supabase
        .from('units')
        .select(`
          id,
          unit_label,
          monthly_rent_kes,
          property_id,
          properties!inner(id, name),
          tenancy_agreements!left(id, status, tenant_id)
        `)
        .order('unit_label')

      if (error) throw error

      // Filter to show only vacant units + current unit
      const availableUnitsData = allUnits?.filter((unit: any) => {
        const hasActiveTenant = unit.tenancy_agreements?.some((agreement: any) =>
          agreement.status === 'ACTIVE' && agreement.tenant_id !== tenant.id
        )
        return !hasActiveTenant
      }) || []

      setAvailableUnits(availableUnitsData)
      setShowReallocationModal(true)
    } catch (error) {
      console.error('Error loading available units:', error)
      setError('Failed to load available units')
    }
  }

  const confirmReallocation = async () => {
    if (!reallocationTenant || !selectedNewUnit) return

    try {
      setReallocating(true)

      // Use atomic reallocation service
      const result = await UnitAllocationService.reallocateTenant(
        reallocationTenant.id,
        selectedNewUnit,
        {
          effectiveDate: new Date().toISOString().split('T')[0],
          terminateCurrentLease: true,
          notes: reallocationNotes || 'Unit reallocation requested by user'
        }
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to reallocate tenant')
      }

      // Show success message with warnings if any
      let message = 'Tenant successfully reallocated to new unit!'
      if (result.warnings && result.warnings.length > 0) {
        message += `\n\nDetails:\n${result.warnings.join('\n')}`
      }
      alert(message)

      // Refresh tenant data
      await loadTenants()

      setShowReallocationModal(false)
      setReallocationTenant(null)
      setSelectedNewUnit('')
      setReallocationNotes('')
      onDataChange?.()

    } catch (error) {
      console.error('Error reallocating tenant:', error)
      setError(error instanceof Error ? error.message : 'Failed to reallocate tenant. Please try again.')
    } finally {
      setReallocating(false)
    }
  }

  const handleEditTenant = (tenant: RentalTenant) => {
    setEditingTenant(tenant)
    setShowEditTenantModal(true)
    setShowTenantModal(false)
  }

  const handleViewLeaseHistory = async (tenant: RentalTenant) => {
    try {
      setLoadingHistory(true)

      // Load lease history for the tenant
      const { data, error } = await supabase
        .from('tenancy_agreements')
        .select(`
          *,
          units!inner(
            id,
            unit_label,
            monthly_rent_kes,
            properties!inner(id, name)
          )
        `)
        .eq('tenant_id', tenant.id)
        .order('start_date', { ascending: false })

      if (error) throw error

      setLeaseHistory(data || [])
      setShowLeaseHistoryModal(true)
      setShowTenantModal(false)
    } catch (error) {
      console.error('Error loading lease history:', error)
      setError('Failed to load lease history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleViewPaymentHistory = async (tenant: RentalTenant) => {
    try {
      setLoadingHistory(true)

      // TODO: Load payment history when payments table is ready
      // For now, show placeholder
      setPaymentHistory([])
      setShowPaymentHistoryModal(true)
      setShowTenantModal(false)
    } catch (error) {
      console.error('Error loading payment history:', error)
      setError('Failed to load payment history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleUpdateTenant = async (data: TenantFormData) => {
    if (!editingTenant) return

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('tenants')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          alternate_phone: data.alternate_phone,
          email: data.email,
          national_id: data.national_id,
          employer: data.employer,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
          emergency_contact_relationship: data.emergency_contact_relationship,
          emergency_contact_email: data.emergency_contact_email,
          notes: data.notes
        })
        .eq('id', editingTenant.id)

      if (error) throw error

      await loadTenants()
      setShowEditTenantModal(false)
      setEditingTenant(null)
      reset()
      onDataChange?.()

      alert('Tenant updated successfully!')
    } catch (error) {
      console.error('Error updating tenant:', error)
      setError('Failed to update tenant')
    } finally {
      setSubmitting(false)
    }
  }

  // Lease Management Functions
  const handleCreateLease = async (tenant: RentalTenant) => {
    setTenantForNewLease(tenant)
    setValueLease('tenant_id', tenant.id)

    // Load available units
    try {
      const { data: allUnits, error } = await supabase
        .from('units')
        .select(`
          id,
          unit_label,
          monthly_rent_kes,
          property_id,
          properties!inner(id, name),
          tenancy_agreements!left(id, status, tenant_id)
        `)
        .order('unit_label')

      if (error) throw error

      // Filter to show only vacant units
      const availableUnitsData = allUnits?.filter((unit: any) => {
        const hasActiveTenant = unit.tenancy_agreements?.some((agreement: any) =>
          agreement.status === 'ACTIVE'
        )
        return !hasActiveTenant
      }) || []

      setAvailableUnits(availableUnitsData)
    } catch (error) {
      console.error('Error loading available units:', error)
      setError('Failed to load available units')
    }

    setShowCreateLeaseModal(true)
  }

  const handleManageLease = (lease: LeaseAgreement) => {
    setSelectedLeaseForManagement(lease)
    setShowLeaseManagementModal(true)
  }

  const onSubmitLease = async (data: LeaseFormData) => {
    try {
      setLeaseSubmitting(true)

      // Check for conflicts
      const conflictResult = await ConflictPreventionService.checkLeaseConflicts({
        tenant_id: data.tenant_id,
        unit_id: data.unit_id,
        start_date: data.start_date,
        end_date: data.end_date || undefined
      })

      if (!conflictResult.canProceed) {
        alert(`Cannot create lease: ${conflictResult.conflicts.join(', ')}`)
        return
      }

      // Create the lease
      const { error } = await supabase
        .from('tenancy_agreements')
        .insert({
          tenant_id: data.tenant_id,
          unit_id: data.unit_id,
          start_date: data.start_date,
          end_date: data.end_date || null,
          monthly_rent_kes: data.monthly_rent_kes,
          security_deposit: data.security_deposit || 0,
          pet_deposit: data.pet_deposit || 0,
          status: 'ACTIVE',
          notes: data.notes || null
        })

      if (error) throw error

      await loadTenants()
      setShowCreateLeaseModal(false)
      setTenantForNewLease(null)
      resetLease()
      onDataChange?.()

      alert('Lease created successfully!')
    } catch (error) {
      console.error('Error creating lease:', error)
      setError('Failed to create lease')
    } finally {
      setLeaseSubmitting(false)
    }
  }

  const handleTerminateLease = async (lease: LeaseAgreement) => {
    if (!confirm('Are you sure you want to terminate this lease?')) return

    try {
      const { error } = await supabase
        .from('tenancy_agreements')
        .update({
          status: 'TERMINATED',
          end_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', lease.id)

      if (error) throw error

      await loadTenants()
      setShowLeaseManagementModal(false)
      setSelectedLeaseForManagement(null)
      onDataChange?.()

      alert('Lease terminated successfully!')
    } catch (error) {
      console.error('Error terminating lease:', error)
      setError('Failed to terminate lease')
    }
  }

  if (loading) {
    return <LoadingCard title="Loading tenants..." />
  }

  if (error && tenants.length === 0) {
    return (
      <ErrorCard
        title="Error Loading Tenants"
        message={error}
        onRetry={loadTenants}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tenants & Leases</h2>
          <p className="text-sm text-gray-500">Manage tenant information and lease agreements</p>
        </div>
        <Button onClick={() => setShowAddTenantModal(true)} variant="primary">
          Add Tenant
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search by name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="border rounded px-3 py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">All properties</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select className="border rounded px-3 py-2" value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!propertyId}>
          <option value="">All units</option>
          {units.map(u => (
            <option key={u.id} value={u.id}>{u.unit_label || 'Unit'}</option>
          ))}
        </select>
        <button
          onClick={() => { setQ(''); setPropertyId(''); setUnitId('') }}
          className="px-3 py-2 text-sm bg-gray-100 border rounded hover:bg-gray-200"
        >
          Clear Filters
        </button>
        <Button onClick={loadTenants} variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Tenants List */}
      {filteredTenants.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Tenants ({filteredTenants.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredTenants.map((tenant) => {
              const status = getTenantStatus(tenant)
              const currentLease = tenant.current_lease
              const hasActiveLease = currentLease && currentLease.status === 'ACTIVE'

              return (
                <div key={tenant.id} className="bg-white border-b border-gray-200">
                  {/* Tenant Header */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-lg font-medium text-blue-600">
                              {tenant.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {tenant.full_name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                            {hasActiveLease && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active Lease
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-500">{tenant.phone}</p>
                            {tenant.email && (
                              <p className="text-sm text-gray-500">{tenant.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className="p-2 text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setSelectedTenant(tenant)
                            setShowTenantModal(true)
                          }}
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lease Information Section */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    {hasActiveLease ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-gray-900">Current Lease</h4>
                          <span className="text-sm text-gray-500">
                            {currentLease.start_date} - {currentLease.end_date || 'Ongoing'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Property & Unit</p>
                            {tenant.current_unit && (() => {
                              const { unit, property } = extractUnitPropertyData(tenant)
                              const unitDisplay = formatUnitAllocation(unit, property, {
                                fallbackText: 'Unit assignment pending'
                              })
                              return (
                                <p className="font-medium text-blue-600">
                                  📍 {unitDisplay}
                                </p>
                              )
                            })()}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Monthly Rent</p>
                            <p className="font-medium">
                              KES {currentLease.monthly_rent_kes?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Security Deposit</p>
                            <p className="font-medium">
                              KES {currentLease.security_deposit?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Lease Status</p>
                            <p className="font-medium text-green-600">{currentLease.status}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 mb-2">No active lease</p>
                        <p className="text-sm text-gray-400">This tenant doesn't have an active lease agreement</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="px-6 py-4 bg-white border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewLeaseHistory(tenant)
                          }}
                          className="text-xs"
                        >
                          📋 Lease History
                        </Button>
                        {tenant.current_unit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReallocation(tenant)
                            }}
                            className="text-xs"
                          >
                            🔄 Reallocate Unit
                          </Button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {hasActiveLease ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleManageLease(currentLease)
                            }}
                            className="text-xs"
                          >
                            📝 Manage Lease
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCreateLease(tenant)
                            }}
                            className="text-xs"
                          >
                            ➕ Create Lease
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tenants Found</h3>
          <p className="text-gray-500 mb-4">
            {q ? 'No tenants match your search criteria.' : 'Get started by adding your first tenant.'}
          </p>
          <Button onClick={() => setShowAddTenantModal(true)} variant="primary">
            Add Tenant
          </Button>
        </div>
      )}

      {/* Add Tenant Modal */}
      <Modal
        isOpen={showAddTenantModal}
        onClose={() => {
          setShowAddTenantModal(false)
          reset()
        }}
        title="Add New Tenant"
      >
        <form onSubmit={handleSubmit(handleAddTenant)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  {...register('full_name')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
                {errors.full_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  {...register('phone')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Phone (optional)
                </label>
                <input
                  {...register('alternate_phone')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter alternate phone number"
                />
                {errors.alternate_phone && (
                  <p className="text-xs text-red-600 mt-1">{errors.alternate_phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  National ID <span className="text-red-600">*</span>
                </label>
                <input
                  {...register('national_id')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter national ID number"
                />
                {errors.national_id && (
                  <p className="text-xs text-red-600 mt-1">{errors.national_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employer</label>
                <input
                  {...register('employer')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter employer name"
                />
                {errors.employer && (
                  <p className="text-xs text-red-600 mt-1">{errors.employer.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., employer information, special requirements, etc."
              />
              {errors.notes && (
                <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>
              )}
            </div>
          </div>

          {/* Emergency Contact Information */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Emergency Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  {...register('emergency_contact_name')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter contact name"
                />
                {errors.emergency_contact_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.emergency_contact_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  {...register('emergency_contact_phone')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter contact phone"
                />
                {errors.emergency_contact_phone && (
                  <p className="text-xs text-red-600 mt-1">{errors.emergency_contact_phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Relationship
                </label>
                <input
                  {...register('emergency_contact_relationship')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
                {errors.emergency_contact_relationship && (
                  <p className="text-xs text-red-600 mt-1">{errors.emergency_contact_relationship.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Email (optional)
                </label>
                <input
                  {...register('emergency_contact_email')}
                  type="email"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter contact email"
                />
                {errors.emergency_contact_email && (
                  <p className="text-xs text-red-600 mt-1">{errors.emergency_contact_email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddTenantModal(false)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Tenant
            </Button>
          </div>
        </form>
      </Modal>

      {/* Tenant Detail Modal */}
      <Modal
        isOpen={showTenantModal}
        onClose={() => {
          setShowTenantModal(false)
          setSelectedTenant(null)
        }}
        title={selectedTenant ? `${selectedTenant.full_name} Details` : ''}
      >
        {selectedTenant && (
          <div className="p-6 space-y-6">
            {/* Tenant Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tenant Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <p className="text-sm text-gray-900">{selectedTenant.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedTenant.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedTenant.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">National ID</label>
                  <p className="text-sm text-gray-900">{selectedTenant.national_id}</p>
                </div>
              </div>
            </div>

            {/* Current Lease */}
            {selectedTenant.current_unit && (() => {
              const { unit, property } = extractUnitPropertyData(selectedTenant)
              const unitDisplay = formatUnitAllocation(unit, property)

              return (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Current Assignment</h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-600">📍</span>
                      <p className="text-sm font-medium text-blue-900">
                        {unitDisplay}
                      </p>
                    </div>
                    {unit?.monthly_rent_kes && (
                      <p className="text-sm text-blue-700">
                        Monthly Rent: KES {unit.monthly_rent_kes.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Reallocation History */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Unit History</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Recent unit assignments:</p>
                {selectedTenant.tenancy_agreements && selectedTenant.tenancy_agreements.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTenant.tenancy_agreements
                      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                      .slice(0, 3)
                      .map((agreement, index) => (
                        <div key={agreement.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">
                            {(agreement as any).units?.unit_label || 'Unit'}
                            {index === 0 && agreement.status === 'ACTIVE' && (
                              <span className="ml-2 text-green-600 font-medium">(Current)</span>
                            )}
                          </span>
                          <span className="text-gray-500">
                            {new Date(agreement.start_date).toLocaleDateString()}
                            {agreement.end_date && ` - ${new Date(agreement.end_date).toLocaleDateString()}`}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No unit assignment history available</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handleEditTenant(selectedTenant)}
              >
                Edit Tenant
              </Button>
              {selectedTenant.current_unit && (
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowTenantModal(false)
                    handleReallocation(selectedTenant)
                  }}
                >
                  Reallocate Unit
                </Button>
              )}
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleViewLeaseHistory(selectedTenant)}
                disabled={loadingHistory}
              >
                {loadingHistory ? 'Loading...' : 'View Lease History'}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleViewPaymentHistory(selectedTenant)}
                disabled={loadingHistory}
              >
                Payment History
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Tenant Reallocation Modal */}
      <Modal
        isOpen={showReallocationModal}
        onClose={() => {
          setShowReallocationModal(false)
          setReallocationTenant(null)
          setSelectedNewUnit('')
          setReallocationNotes('')
        }}
        title="Reallocate Tenant to New Unit"
      >
        {reallocationTenant && (
          <div className="space-y-6">
            {/* Current Tenant Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Tenant Information</h3>
              <p className="text-sm text-gray-700">
                <strong>Name:</strong> {reallocationTenant.full_name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Phone:</strong> {reallocationTenant.phone}
              </p>
              {reallocationTenant.current_unit && (() => {
                const { unit, property } = extractUnitPropertyData(reallocationTenant)
                const unitDisplay = formatUnitAllocation(unit, property)

                return (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-medium text-blue-900 mb-2">Current Assignment:</p>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-blue-600">📍</span>
                      <p className="text-sm font-medium text-blue-700">{unitDisplay}</p>
                    </div>
                    {unit?.monthly_rent_kes && (
                      <p className="text-sm text-blue-700">
                        Current Rent: KES {unit.monthly_rent_kes.toLocaleString()}/month
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* New Unit Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Unit *
              </label>
              <select
                value={selectedNewUnit}
                onChange={(e) => setSelectedNewUnit(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a unit...</option>
                {availableUnits.map((unit) => {
                  const isCurrentUnit = unit.id === (reallocationTenant.current_unit as any)?.id
                  const unitData = {
                    id: unit.id,
                    unit_label: unit.unit_label,
                    property_id: unit.property_id,
                    monthly_rent_kes: unit.monthly_rent_kes
                  }
                  const propertyData = {
                    id: unit.properties.id,
                    name: unit.properties.name
                  }
                  const optionText = formatUnitAllocation(unitData, propertyData, {
                    includeRent: true
                  }) + (isCurrentUnit ? ' (Current Unit)' : '')

                  return (
                    <option key={unit.id} value={unit.id}>
                      {optionText}
                    </option>
                  )
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Only vacant units and the current unit are shown
              </p>
            </div>

            {/* New Unit Details */}
            {selectedNewUnit && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">New Assignment Details</h4>
                {(() => {
                  const newUnit = availableUnits.find(u => u.id === selectedNewUnit)
                  if (!newUnit) return null

                  const unitData = {
                    id: newUnit.id,
                    unit_label: newUnit.unit_label,
                    property_id: newUnit.property_id,
                    monthly_rent_kes: newUnit.monthly_rent_kes
                  }
                  const propertyData = {
                    id: newUnit.properties.id,
                    name: newUnit.properties.name
                  }
                  const unitDisplay = formatUnitAllocation(unitData, propertyData)
                  const isCurrentUnit = newUnit.id === (reallocationTenant.current_unit as any)?.id

                  return (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-green-600">📍</span>
                        <p className="text-sm font-medium text-green-900">{unitDisplay}</p>
                      </div>
                      <p className="text-sm text-green-700">
                        Monthly Rent: KES {(newUnit.monthly_rent_kes || 0).toLocaleString()}
                      </p>
                      {isCurrentUnit && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-700 font-medium">
                            ⚠️ This is the tenant's current unit
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Reallocation Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reallocation Notes (Optional)
              </label>
              <textarea
                value={reallocationNotes}
                onChange={(e) => setReallocationNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Reason for reallocation, special instructions, etc."
              />
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Important Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This action will:
                    </p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Terminate the current tenancy agreement</li>
                      <li>Create a new tenancy agreement for the selected unit</li>
                      <li>Update rent amount based on the new unit</li>
                      <li>This action cannot be easily undone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowReallocationModal(false)
                  setReallocationTenant(null)
                  setSelectedNewUnit('')
                  setReallocationNotes('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={confirmReallocation}
                disabled={!selectedNewUnit || reallocating || selectedNewUnit === (reallocationTenant.current_unit as any)?.id}
                className="flex-1"
              >
                {reallocating ? 'Reallocating...' : 'Confirm Reallocation'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={showEditTenantModal}
        onClose={() => {
          setShowEditTenantModal(false)
          setEditingTenant(null)
          reset()
        }}
        title="Edit Tenant"
      >
        {editingTenant && (
          <form onSubmit={handleSubmit(handleUpdateTenant)} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    {...register('full_name')}
                    defaultValue={editingTenant.full_name}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter full name"
                  />
                  {errors.full_name && (
                    <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-600">*</span>
                  </label>
                  <input
                    {...register('phone')}
                    defaultValue={editingTenant.phone}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternate Phone (optional)
                  </label>
                  <input
                    {...register('alternate_phone')}
                    defaultValue={editingTenant.alternate_phone || ''}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter alternate phone number"
                  />
                  {errors.alternate_phone && (
                    <p className="text-xs text-red-600 mt-1">{errors.alternate_phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    defaultValue={editingTenant.email || ''}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    National ID <span className="text-red-600">*</span>
                  </label>
                  <input
                    {...register('national_id')}
                    defaultValue={editingTenant.national_id || ''}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter national ID number"
                  />
                  {errors.national_id && (
                    <p className="text-xs text-red-600 mt-1">{errors.national_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employer</label>
                  <input
                    {...register('employer')}
                    defaultValue={editingTenant.employer || ''}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter employer name"
                  />
                  {errors.employer && (
                    <p className="text-xs text-red-600 mt-1">{errors.employer.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  {...register('notes')}
                  defaultValue={editingTenant.notes || ''}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., employer information, special requirements, etc."
                />
                {errors.notes && (
                  <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>
                )}
              </div>
            </div>

            {/* Emergency Contact Information */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900">Emergency Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    {...register('emergency_contact_name')}
                    defaultValue={editingTenant.emergency_contact_name || ''}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter contact name"
                  />
                  {errors.emergency_contact_name && (
                    <p className="text-xs text-red-600 mt-1">{errors.emergency_contact_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    {...register('emergency_contact_phone')}
                    defaultValue={editingTenant.emergency_contact_phone || ''}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter contact phone"
                  />
                  {errors.emergency_contact_phone && (
                    <p className="text-xs text-red-600 mt-1">{errors.emergency_contact_phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Relationship
                  </label>
                  <input
                    {...register('emergency_contact_relationship')}
                    defaultValue={editingTenant.emergency_contact_relationship || ''}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                  {errors.emergency_contact_relationship && (
                    <p className="text-xs text-red-600 mt-1">{errors.emergency_contact_relationship.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Email (optional)
                  </label>
                  <input
                    {...register('emergency_contact_email')}
                    type="email"
                    defaultValue={editingTenant.emergency_contact_email || ''}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter contact email"
                  />
                  {errors.emergency_contact_email && (
                    <p className="text-xs text-red-600 mt-1">{errors.emergency_contact_email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditTenantModal(false)
                  setEditingTenant(null)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Update Tenant
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Lease History Modal */}
      <Modal
        isOpen={showLeaseHistoryModal}
        onClose={() => {
          setShowLeaseHistoryModal(false)
          setLeaseHistory([])
        }}
        title={selectedTenant ? `Lease History - ${selectedTenant.full_name}` : 'Lease History'}
      >
        <div className="space-y-6">
          {leaseHistory.length > 0 ? (
            <div className="space-y-4">
              {leaseHistory.map((lease) => (
                <div key={lease.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {lease.units.properties.name} - {lease.units.unit_label}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Monthly Rent: KES {lease.monthly_rent_kes.toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lease.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      lease.status === 'TERMINATED' ? 'bg-red-100 text-red-800' :
                      lease.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {lease.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Start Date:</p>
                      <p className="font-medium">{new Date(lease.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">End Date:</p>
                      <p className="font-medium">
                        {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Ongoing'}
                      </p>
                    </div>
                  </div>

                  {lease.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700">{lease.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Lease History</h3>
              <p className="text-gray-500">This tenant has no lease agreements on record.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={showPaymentHistoryModal}
        onClose={() => {
          setShowPaymentHistoryModal(false)
          setPaymentHistory([])
        }}
        title={selectedTenant ? `Payment History - ${selectedTenant.full_name}` : 'Payment History'}
      >
        <div className="space-y-6">
          {paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        KES {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
              <p className="text-gray-500 mb-4">
                This tenant has no payment records yet. Payment tracking will be available once the payments system is fully implemented.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Coming Soon:</strong> Complete payment tracking with rent collection, payment methods, and financial reporting.
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Create Lease Modal */}
      <Modal
        isOpen={showCreateLeaseModal}
        onClose={() => {
          setShowCreateLeaseModal(false)
          setTenantForNewLease(null)
          resetLease()
        }}
        title={tenantForNewLease ? `Create Lease - ${tenantForNewLease.full_name}` : 'Create Lease'}
      >
        <form onSubmit={handleSubmitLease(onSubmitLease)} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Lease Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-600">*</span>
                </label>
                <select
                  {...registerLease('unit_id')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a unit</option>
                  {availableUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.properties?.name} - {unit.unit_label} (KES {unit.monthly_rent_kes?.toLocaleString()}/month)
                    </option>
                  ))}
                </select>
                {leaseErrors.unit_id && (
                  <p className="text-xs text-red-600 mt-1">{leaseErrors.unit_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rent (KES) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  {...registerLease('monthly_rent_kes')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter monthly rent"
                />
                {leaseErrors.monthly_rent_kes && (
                  <p className="text-xs text-red-600 mt-1">{leaseErrors.monthly_rent_kes.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  {...registerLease('start_date')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {leaseErrors.start_date && (
                  <p className="text-xs text-red-600 mt-1">{leaseErrors.start_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  {...registerLease('end_date')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Deposit (KES)
                </label>
                <input
                  type="number"
                  {...registerLease('security_deposit')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter security deposit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Deposit (KES)
                </label>
                <input
                  type="number"
                  {...registerLease('pet_deposit')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter pet deposit"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...registerLease('notes')}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Additional notes about the lease"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateLeaseModal(false)
                setTenantForNewLease(null)
                resetLease()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={leaseSubmitting}
              className="flex-1"
            >
              {leaseSubmitting ? 'Creating...' : 'Create Lease'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lease Management Modal */}
      <Modal
        isOpen={showLeaseManagementModal}
        onClose={() => {
          setShowLeaseManagementModal(false)
          setSelectedLeaseForManagement(null)
        }}
        title="Lease Management"
      >
        <div className="p-6 space-y-6">
          {selectedLeaseForManagement && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Lease Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Tenant:</p>
                    <p className="font-medium">{selectedLeaseForManagement.tenant?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Property & Unit:</p>
                    <p className="font-medium">
                      {selectedLeaseForManagement.unit?.properties?.name} - {selectedLeaseForManagement.unit?.unit_label}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monthly Rent:</p>
                    <p className="font-medium">KES {selectedLeaseForManagement.monthly_rent_kes?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status:</p>
                    <p className="font-medium">{selectedLeaseForManagement.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Start Date:</p>
                    <p className="font-medium">{new Date(selectedLeaseForManagement.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">End Date:</p>
                    <p className="font-medium">
                      {selectedLeaseForManagement.end_date
                        ? new Date(selectedLeaseForManagement.end_date).toLocaleDateString()
                        : 'Ongoing'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowLeaseManagementModal(false)
                    setSelectedLeaseForManagement(null)
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
                {selectedLeaseForManagement.status === 'ACTIVE' && (
                  <Button
                    variant="danger"
                    onClick={() => handleTerminateLease(selectedLeaseForManagement)}
                    className="flex-1"
                  >
                    Terminate Lease
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
