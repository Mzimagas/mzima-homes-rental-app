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
  const [submitting, setSubmitting] = useState(false)

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
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600">
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

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button variant="primary" className="flex-1">
                Edit Tenant
              </Button>
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
    </div>
  )
}
