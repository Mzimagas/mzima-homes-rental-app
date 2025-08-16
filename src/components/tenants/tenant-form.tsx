'use client'

import { useEffect, useState } from 'react'
import supabase, { handleSupabaseError } from '../../lib/supabase-client'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tenantSchema, type TenantFormValues } from '../../lib/validation/tenant'
import { Button, TextField } from '../ui'

interface TenantFormProps {
  onSuccess?: (tenantId: string) => void
  onCancel?: () => void
  isOpen: boolean
}

interface Unit {
  id: string
  unit_label: string
  monthly_rent_kes: number
  properties: { name: string }[]
}

export default function TenantForm({ onSuccess, onCancel, isOpen }: TenantFormProps) {
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(false)
  const { currentProperty, canManageTenants } = usePropertyAccess()

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      fullName: '', phone: '', email: '', nationalId: '',
      emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '', emergencyContactEmail: '', unitId: ''
    }
  })

  const loadAvailableUnits = async () => {
    try {
      setLoadingUnits(true)

      if (!currentProperty) {
        setAvailableUnits([])
        return
      }

      // Get units for the current property only
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          unit_label,
          monthly_rent_kes,
          property_id
        `)
        .eq('property_id', currentProperty.property_id)
        .eq('is_active', true)

      if (unitsError) {
        console.error('Error loading units:', unitsError)
        return
      }

      // Filter out units that have active tenants by checking tenancy agreements
      const { data: activeTenancies, error: tenancyError } = await supabase
        .from('tenancy_agreements')
        .select('unit_id')
        .eq('status', 'ACTIVE')

      if (tenancyError) {
        console.error('Error loading tenancies:', tenancyError)
        // Continue anyway, just don't filter
      }

      const occupiedUnitIds = activeTenancies?.map((t: { unit_id: string }) => t.unit_id).filter(Boolean) || []

      // Filter available units and add property names
      const availableUnitsFiltered = (unitsData || []).filter((unit: { id: string }) =>
        !occupiedUnitIds.includes(unit.id)
      )

      // Add property names to units
      const availableUnitsWithProperties = availableUnitsFiltered.map((unit: any) => ({
        ...unit,
        properties: [{
          name: currentProperty.property_name
        }]
      }))

      setAvailableUnits(availableUnitsWithProperties)
    } catch (err) {
      console.error('Error loading available units:', err)
    } finally {
      setLoadingUnits(false)
    }
  }

  useEffect(() => {
    if (isOpen && currentProperty) {
      loadAvailableUnits()
    }
  }, [isOpen, currentProperty])

  const onSubmit = async (values: TenantFormValues) => {
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          full_name: values.fullName.trim(),
          phone: values.phone.trim(),
          email: values.email?.trim() || null,
          national_id: values.nationalId?.trim() || null,
          emergency_contact_name: values.emergencyContactName?.trim() || null,
          emergency_contact_phone: values.emergencyContactPhone?.trim() || null,
          emergency_contact_relationship: values.emergencyContactRelationship?.trim() || null,
          emergency_contact_email: values.emergencyContactEmail?.trim() || null,
          status: 'ACTIVE'
        })
        .select()
        .single()
      if (tenantError) { alert(handleSupabaseError(tenantError)); return }

      if (values.unitId) {
        const selected = availableUnits.find(u => u.id === values.unitId)
        if (selected) {
          const { error: tenancyError } = await supabase
            .from('tenancy_agreements')
            .insert({
              tenant_id: tenantData.id,
              unit_id: values.unitId,
              rent_kes: selected.monthly_rent_kes,
              start_date: new Date().toISOString().split('T')[0],
              billing_day: 1,
              status: 'ACTIVE'
            })
          if (tenancyError) console.error('Error creating tenancy agreement:', tenancyError)
        }
      }

      reset()
      onSuccess?.(tenantData.id)
    } catch (err) {
      console.error('Tenant creation error:', err)
      alert('An unexpected error occurred')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Tenant</h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Permission check */}
          {!currentProperty && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">Please select a property to add tenants to.</p>
            </div>
          )}

          {currentProperty && !canManageTenants(currentProperty.property_id) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">You don't have permission to manage tenants for this property.</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <TextField label="Full Name *" placeholder="John Doe" error={errors.fullName?.message} {...register('fullName')} />
            <TextField label="Phone Number *" placeholder="+254 700 000 000" error={errors.phone?.message} {...register('phone')} />
            <TextField label="Email Address" type="email" placeholder="john@example.com" error={errors.email?.message} {...register('email')} />
            <TextField label="National ID" placeholder="12345678" error={errors.nationalId?.message} {...register('nationalId')} />

            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Emergency Contact / Next of Kin</h4>
              <TextField label="Full Name" placeholder="Jane Doe" error={errors.emergencyContactName?.message} {...register('emergencyContactName')} />
              <TextField label="Phone Number" placeholder="+254 700 000 001" error={errors.emergencyContactPhone?.message} {...register('emergencyContactPhone')} />
              <TextField label="Relationship" placeholder="Sister" error={errors.emergencyContactRelationship?.message} {...register('emergencyContactRelationship')} />
              <TextField label="Email (Optional)" type="email" placeholder="jane@example.com" error={errors.emergencyContactEmail?.message} {...register('emergencyContactEmail')} />
            </div>

            <div>
              <label htmlFor="unitId" className="block text-sm font-medium text-gray-700">Assign Unit (Optional)</label>
              <select id="unitId" {...register('unitId')} disabled={loadingUnits} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="">Select a unit (optional)</option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.properties[0]?.name} - {unit.unit_label} (KES {unit.monthly_rent_kes.toLocaleString()}/month)
                  </option>
                ))}
              </select>
              {loadingUnits && <p className="mt-1 text-sm text-gray-500">Loading available units...</p>}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !currentProperty || !canManageTenants(currentProperty?.property_id || '')}>{isSubmitting ? 'Creating…' : 'Create Tenant'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
