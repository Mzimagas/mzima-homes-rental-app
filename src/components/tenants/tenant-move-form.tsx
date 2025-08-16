"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import supabase from '../../lib/supabase-client'
import { tenantMoveSchema, type TenantMoveInput } from '../../lib/validation/tenant'

function getCsrf() {
  return document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''
}

type Props = {
  tenantId: string
  propertyId?: string
  defaultUnitId?: string
  onDone?: () => void
}

type TenantInfo = {
  id: string
  full_name: string
  current_unit_id: string | null
  current_unit?: {
    id: string
    unit_label: string
    property_id: string
    monthly_rent_kes: number | null
    property?: {
      name: string
    }
  }
}

type Unit = {
  id: string
  unit_label: string
  monthly_rent_kes: number | null
  is_occupied: boolean
  current_tenant?: {
    full_name: string
  }
}

export default function TenantMoveForm({ tenantId, propertyId, defaultUnitId, onDone }: Props) {
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [availableProperties, setAvailableProperties] = useState<{id: string, name: string}[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyId || '')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<TenantMoveInput>({
    resolver: zodResolver(tenantMoveSchema),
    defaultValues: {
      new_unit_id: defaultUnitId || '',
      move_date: new Date().toISOString().split('T')[0], // Today's date
      end_current_agreement: true,
      monthly_rent_kes: null,
      reason: '',
      notes: ''
    }
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form
  const watchedUnitId = watch('new_unit_id')
  const watchedMoveDate = watch('move_date')

  // Load tenant information
  useEffect(() => {
    const loadTenantInfo = async () => {
      try {
        // First get tenant basic info
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, full_name, current_unit_id')
          .eq('id', tenantId)
          .single()

        if (tenantError) throw tenantError

        let currentUnit = undefined

        // If tenant has a current unit, fetch unit details separately
        if (tenantData.current_unit_id) {
          const { data: unitData, error: unitError } = await supabase
            .from('units')
            .select(`
              id,
              unit_label,
              property_id,
              monthly_rent_kes,
              properties (
                name
              )
            `)
            .eq('id', tenantData.current_unit_id)
            .single()

          if (!unitError && unitData) {
            currentUnit = {
              id: unitData.id,
              unit_label: unitData.unit_label,
              property_id: unitData.property_id,
              monthly_rent_kes: unitData.monthly_rent_kes,
              property: unitData.properties
            }
          }
        }

        const tenantInfo: TenantInfo = {
          id: tenantData.id,
          full_name: tenantData.full_name,
          current_unit_id: tenantData.current_unit_id,
          current_unit: currentUnit
        }

        setTenantInfo(tenantInfo)

        // Set default property if not provided
        if (!propertyId && currentUnit?.property_id) {
          setSelectedPropertyId(currentUnit.property_id)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load tenant information')
      }
    }

    loadTenantInfo()
  }, [tenantId, propertyId])

  // Load available properties
  useEffect(() => {
    const loadProperties = async () => {
      try {
        const { data: accessible, error: rpcErr } = await supabase.rpc('get_user_properties_simple')
        if (rpcErr) throw rpcErr

        const ids = (accessible || []).map((p: any) => (typeof p === 'string' ? p : p?.property_id)).filter(Boolean)
        if (ids.length === 0) return

        const { data, error } = await supabase
          .from('properties')
          .select('id, name')
          .in('id', ids)
          .order('name')

        if (error) throw error
        setAvailableProperties(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load properties')
      }
    }

    loadProperties()
  }, [])

  // Load units for selected property
  useEffect(() => {
    const loadUnits = async () => {
      if (!selectedPropertyId) {
        setUnits([])
        return
      }

      try {
        // Get units for the property
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('id, unit_label, monthly_rent_kes')
          .eq('property_id', selectedPropertyId)
          .order('unit_label')

        if (unitsError) throw unitsError

        // Get tenants for these units to check occupancy
        const unitIds = (unitsData || []).map(unit => unit.id)
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, full_name, current_unit_id')
          .in('current_unit_id', unitIds)
          .eq('status', 'ACTIVE')

        if (tenantsError) throw tenantsError

        // Create a map of unit occupancy
        const occupancyMap = new Map()
        tenantsData?.forEach(tenant => {
          if (tenant.current_unit_id) {
            occupancyMap.set(tenant.current_unit_id, {
              id: tenant.id,
              full_name: tenant.full_name
            })
          }
        })

        const unitsWithOccupancy: Unit[] = (unitsData || []).map((unit: any) => {
          const currentTenant = occupancyMap.get(unit.id)
          return {
            id: unit.id,
            unit_label: unit.unit_label,
            monthly_rent_kes: unit.monthly_rent_kes,
            is_occupied: !!currentTenant,
            current_tenant: currentTenant
          }
        })

        setUnits(unitsWithOccupancy)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to load units')
        setLoading(false)
      }
    }

    loadUnits()
  }, [selectedPropertyId])

  // Auto-fill monthly rent when unit is selected
  useEffect(() => {
    const selectedUnit = units.find(u => u.id === watchedUnitId)
    if (selectedUnit?.monthly_rent_kes) {
      setValue('monthly_rent_kes', selectedUnit.monthly_rent_kes)
    }
  }, [watchedUnitId, units, setValue])

  const onSubmit = async (data: TenantMoveInput) => {
    setSubmitting(true)
    setError(null)

    try {
      // Validate that the selected unit is different from current unit
      if (data.new_unit_id === tenantInfo?.current_unit_id) {
        throw new Error('Please select a different unit than the current one')
      }

      // Check if moving to an occupied unit
      const selectedUnit = units.find(u => u.id === data.new_unit_id)
      if (selectedUnit?.is_occupied && selectedUnit.current_tenant?.full_name !== tenantInfo?.full_name) {
        throw new Error(`Unit ${selectedUnit.unit_label} is currently occupied by ${selectedUnit.current_tenant?.full_name}`)
      }

      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': getCsrf()
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch(`/api/tenants/${tenantId}/move`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })

      const result = await res.json().catch(() => ({}))
      if (!res.ok || !result.ok) {
        throw new Error(result?.message || 'Move failed')
      }

      onDone?.()
    } catch (err: any) {
      setError(err.message || 'Move failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading tenant information...</div>
      </div>
    )
  }

  if (!tenantInfo) {
    return (
      <div className="text-red-600 p-4">
        Failed to load tenant information. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Tenant Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Current Tenant Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Tenant:</span>
            <div className="font-medium">{tenantInfo.full_name}</div>
          </div>
          <div>
            <span className="text-gray-500">Current Unit:</span>
            <div className="font-medium">
              {tenantInfo.current_unit ? (
                <>
                  {tenantInfo.current_unit.unit_label}
                  {tenantInfo.current_unit.property?.name && (
                    <span className="text-gray-600"> - {tenantInfo.current_unit.property.name}</span>
                  )}
                </>
              ) : (
                <span className="text-gray-400">No current unit</span>
              )}
            </div>
          </div>
          {tenantInfo.current_unit?.monthly_rent_kes && (
            <div>
              <span className="text-gray-500">Current Rent:</span>
              <div className="font-medium">KES {tenantInfo.current_unit.monthly_rent_kes.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Move Form */}
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Property Selection */}
        {availableProperties.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Property
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              <option value="">Select property</option>
              {availableProperties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Unit Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Unit *
          </label>
          <select
            {...register('new_unit_id')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!selectedPropertyId}
          >
            <option value="">Select unit</option>
            {units.map(unit => (
              <option key={unit.id} value={unit.id} disabled={unit.is_occupied && unit.current_tenant?.full_name !== tenantInfo.full_name}>
                {unit.unit_label}
                {unit.monthly_rent_kes && ` - KES ${unit.monthly_rent_kes.toLocaleString()}`}
                {unit.is_occupied && unit.current_tenant?.full_name !== tenantInfo.full_name && ' (Occupied)'}
              </option>
            ))}
          </select>
          {errors.new_unit_id && (
            <p className="text-red-600 text-sm mt-1">{errors.new_unit_id.message}</p>
          )}
        </div>

        {/* Move Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Move Date *
          </label>
          <input
            type="date"
            {...register('move_date')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.move_date && (
            <p className="text-red-600 text-sm mt-1">{errors.move_date.message}</p>
          )}
        </div>

        {/* Monthly Rent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Rent (KES)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('monthly_rent_kes', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Auto-filled from unit, can be overridden"
          />
          {errors.monthly_rent_kes && (
            <p className="text-red-600 text-sm mt-1">{errors.monthly_rent_kes.message}</p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Move
          </label>
          <select
            {...register('reason')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select reason (optional)</option>
            <option value="TENANT_REQUEST">Tenant Request</option>
            <option value="UNIT_UPGRADE">Unit Upgrade</option>
            <option value="UNIT_DOWNGRADE">Unit Downgrade</option>
            <option value="MAINTENANCE">Maintenance Required</option>
            <option value="RENT_ADJUSTMENT">Rent Adjustment</option>
            <option value="FAMILY_SIZE_CHANGE">Family Size Change</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional information about this move..."
          />
          {errors.notes && (
            <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
          )}
        </div>

        {/* End Current Agreement */}
        <div className="flex items-center">
          <input
            type="checkbox"
            {...register('end_current_agreement')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            End current tenancy agreement (recommended)
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting || !watchedUnitId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            {submitting ? 'Moving Tenant...' : 'Move Tenant'}
          </button>
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

