'use client'

import { useState, useEffect } from 'react'
import { Button, TextField } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'
import { RentalTenant, TenantFormData } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import supabase from '../../../lib/supabase-client'

interface TenantManagementProps {
  onDataChange?: () => void
}

const tenantSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  national_id: z.string().min(1, 'National ID is required'),
  employer: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema)
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

      // Get current active tenancy agreement
      const { data: currentAgreements, error: fetchError } = await supabase
        .from('tenancy_agreements')
        .select('*')
        .eq('tenant_id', reallocationTenant.id)
        .eq('status', 'ACTIVE')

      if (fetchError) throw fetchError

      const currentAgreement = currentAgreements?.[0]

      if (currentAgreement) {
        // End current tenancy agreement
        const { error: endError } = await supabase
          .from('tenancy_agreements')
          .update({
            status: 'TERMINATED',
            end_date: new Date().toISOString().split('T')[0],
            notes: `${currentAgreement.notes || ''}\n\nTerminated for unit reallocation: ${reallocationNotes || 'No notes provided'}`
          })
          .eq('id', currentAgreement.id)

        if (endError) throw endError
      }

      // Get new unit details for rent amount
      const { data: newUnitData, error: unitError } = await supabase
        .from('units')
        .select('monthly_rent_kes')
        .eq('id', selectedNewUnit)
        .single()

      if (unitError) throw unitError

      // Create new tenancy agreement for new unit
      const { error: createError } = await supabase
        .from('tenancy_agreements')
        .insert({
          tenant_id: reallocationTenant.id,
          unit_id: selectedNewUnit,
          start_date: new Date().toISOString().split('T')[0],
          monthly_rent_kes: newUnitData.monthly_rent_kes,
          status: 'ACTIVE',
          notes: `Unit reallocation from previous unit. ${reallocationNotes || ''}`
        })

      if (createError) throw createError

      // Refresh tenant data
      await loadTenants()

      setShowReallocationModal(false)
      setReallocationTenant(null)
      setSelectedNewUnit('')
      setReallocationNotes('')
      onDataChange?.()

      alert('Tenant successfully reallocated to new unit!')
    } catch (error) {
      console.error('Error reallocating tenant:', error)
      setError('Failed to reallocate tenant. Please try again.')
    } finally {
      setReallocating(false)
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
          <h2 className="text-xl font-semibold text-gray-900">Tenant Management</h2>
          <p className="text-sm text-gray-500">Manage tenant information and relationships</p>
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
              return (
                <div
                  key={tenant.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleTenantClick(tenant)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {tenant.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tenant.full_name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500">{tenant.phone}</p>
                          {tenant.email && (
                            <p className="text-sm text-gray-500">{tenant.email}</p>
                          )}
                          {tenant.current_unit && (
                            <p className="text-sm text-blue-600">
                              Unit: {(tenant.current_unit as any)?.unit_label}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {tenant.current_unit && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleReallocation(tenant)}
                          className="text-xs"
                        >
                          Reallocate Unit
                        </Button>
                      )}
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
                      <button className="p-2 text-gray-400 hover:text-red-600" title="Delete Tenant">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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
        <form onSubmit={handleSubmit(handleAddTenant)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Full Name *"
              {...register('full_name')}
              error={errors.full_name?.message}
            />
            <TextField
              label="Phone Number *"
              {...register('phone')}
              error={errors.phone?.message}
            />
            <TextField
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <TextField
              label="National ID *"
              {...register('national_id')}
              error={errors.national_id?.message}
            />
            <TextField
              label="Employer"
              {...register('employer')}
              error={errors.employer?.message}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Contact Name"
                {...register('emergency_contact_name')}
                error={errors.emergency_contact_name?.message}
              />
              <TextField
                label="Contact Phone"
                {...register('emergency_contact_phone')}
                error={errors.emergency_contact_phone?.message}
              />
              <TextField
                label="Relationship"
                {...register('emergency_contact_relationship')}
                error={errors.emergency_contact_relationship?.message}
              />
              <TextField
                label="Contact Email"
                type="email"
                {...register('emergency_contact_email')}
                error={errors.emergency_contact_email?.message}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Additional notes about the tenant..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
              Add Tenant
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
            {selectedTenant.current_unit && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Lease</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Unit: {(selectedTenant.current_unit as any)?.unit_label}
                  </p>
                  <p className="text-sm text-blue-700">
                    Property: {(selectedTenant.current_unit as any)?.properties?.name}
                  </p>
                </div>
              </div>
            )}

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
            <div className="flex space-x-3">
              <Button variant="primary" className="flex-1">
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
              <Button variant="secondary" className="flex-1">
                View Lease History
              </Button>
              <Button variant="secondary">
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
              {reallocationTenant.current_unit && (
                <div className="mt-2 p-3 bg-blue-50 rounded border">
                  <p className="text-sm font-medium text-blue-900">Current Assignment:</p>
                  <p className="text-sm text-blue-700">
                    Unit: {(reallocationTenant.current_unit as any)?.unit_label}
                  </p>
                  <p className="text-sm text-blue-700">
                    Property: {(reallocationTenant.current_unit as any)?.properties?.name}
                  </p>
                  <p className="text-sm text-blue-700">
                    Current Rent: KES {((reallocationTenant.current_unit as any)?.monthly_rent_kes || 0).toLocaleString()}/month
                  </p>
                </div>
              )}
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
                  return (
                    <option key={unit.id} value={unit.id}>
                      {unit.properties.name} - {unit.unit_label}
                      {unit.monthly_rent_kes ? ` (KES ${unit.monthly_rent_kes.toLocaleString()}/month)` : ''}
                      {isCurrentUnit ? ' (Current Unit)' : ''}
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
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">New Unit Details</h4>
                {(() => {
                  const newUnit = availableUnits.find(u => u.id === selectedNewUnit)
                  if (!newUnit) return null
                  return (
                    <div>
                      <p className="text-sm text-green-700">
                        <strong>Property:</strong> {newUnit.properties.name}
                      </p>
                      <p className="text-sm text-green-700">
                        <strong>Unit:</strong> {newUnit.unit_label}
                      </p>
                      <p className="text-sm text-green-700">
                        <strong>Monthly Rent:</strong> KES {(newUnit.monthly_rent_kes || 0).toLocaleString()}
                      </p>
                      {newUnit.id === (reallocationTenant.current_unit as any)?.id && (
                        <p className="text-sm text-yellow-700 font-medium mt-1">
                          ⚠️ This is the tenant's current unit
                        </p>
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
    </div>
  )
}
