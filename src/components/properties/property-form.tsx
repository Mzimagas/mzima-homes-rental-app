'use client'

import { useEffect, useState } from 'react'
import supabase, { handleSupabaseError } from '../../lib/supabase-client'
import AddressAutocomplete from '../location/AddressAutocomplete'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { propertySchema, type PropertyFormValues, PropertyTypeEnum, getPropertyTypeLabel, isLandProperty } from '../../lib/validation/property'
import { Button, TextField, FormField } from '../ui'
import ConfirmDialog from '../ui/ConfirmDialog'

interface PropertyFormProps {
  onSuccess?: (propertyId: string) => void
  onCancel?: () => void
  isOpen: boolean
  property?: {
    id: string
    name: string
    physical_address?: string | null
    property_type?: string | null
    lat?: number | null
    lng?: number | null
    notes?: string | null
  }
}

export default function PropertyForm({ onSuccess, onCancel, isOpen, property }: PropertyFormProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmCounts, setConfirmCounts] = useState<{ units: number; tenants: number } | null>(null)

  const { register, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: property?.name || '',
      physicalAddress: property?.physical_address || '',
      propertyType: (property?.property_type as any) || 'HOME',
      lat: property?.lat ?? undefined,
      lng: property?.lng ?? undefined,
      notes: property?.notes || ''
    }
  })

  const selectedPropertyType = watch('propertyType')

  useEffect(() => {
    reset({
      name: property?.name || '',
      physicalAddress: property?.physical_address || '',
      propertyType: (property?.property_type as any) || 'HOME',
      lat: property?.lat ?? undefined,
      lng: property?.lng ?? undefined,
      notes: property?.notes || ''
    })
  }, [property, reset])



  const onSubmit = async (values: PropertyFormValues) => {
    try {
      if (property) {
        const updateData: any = {
          name: values.name.trim(),
          physical_address: values.physicalAddress.trim(),
          property_type: values.propertyType,
          notes: values.notes?.trim() || null,
        }
        if (values.lat !== undefined) updateData.lat = values.lat
        if (values.lng !== undefined) updateData.lng = values.lng

        // If only basic fields changed and type unchanged, do direct update
        const typeChanged = property?.property_type !== values.propertyType
        if (!typeChanged) {
          const { data, error: updateError } = await supabase
            .from('properties')
            .update(updateData)
            .eq('id', property.id)
            .select()
            .single()

          if (updateError) {
            alert(handleSupabaseError(updateError))
            return
          }

          onSuccess?.(data.id)
        } else {
          // Use API guardrails for type change
          const csrf = (typeof document !== 'undefined') ? (document.cookie.split(';').map(p=>p.trim()).find(p=>p.startsWith('csrf-token='))?.split('=')[1] || '') : ''
          const res = await fetch(`/api/properties/${property.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrf,
            },
            body: JSON.stringify({ property_type: values.propertyType }),
          })

          if (res.status === 409) {
            const payload = await res.json().catch(() => ({}))
            const unitCount = payload?.details?.unitCount || 0
            const activeTenantCount = payload?.details?.activeTenantCount || 0
            setConfirmCounts({ units: unitCount, tenants: activeTenantCount })
            setConfirmOpen(true)
            return
          } else if (!res.ok) {
            const txt = await res.text().catch(() => '')
            alert(`Failed to update property type: ${txt || res.status}`)
            return
          }

          // Update remaining fields after type change if needed
          const { error: updRestErr } = await supabase
            .from('properties')
            .update({
              name: updateData.name,
              physical_address: updateData.physical_address,
              notes: updateData.notes,
              lat: updateData.lat,
              lng: updateData.lng,
            })
            .eq('id', property.id)
          if (updRestErr) {
            console.warn('Post-type-change update warning:', updRestErr.message)
          }
          onSuccess?.(property.id)
        }
      } else {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) {
          alert('Please log in to create a property')
          return
        }

        const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
          property_name: values.name.trim(),
          property_address: values.physicalAddress.trim(),
          property_type: values.propertyType,
          owner_user_id: user.user.id
        })

        if (createError) {
          alert(`Failed to create property: ${createError.message}`)
          return
        }

        if (values.lat !== undefined || values.lng !== undefined || values.notes?.trim()) {
          const extra: any = {}
          if (values.lat !== undefined) extra.lat = values.lat
          if (values.lng !== undefined) extra.lng = values.lng
          extra.notes = values.notes?.trim() || null
          const { error: extraErr } = await supabase
            .from('properties')
            .update(extra)
            .eq('id', propertyId)
          if (extraErr) {
            console.warn('Failed to update property details:', extraErr.message)
          }
        }

        reset({ name: '', physicalAddress: '', propertyType: 'HOME', lat: undefined, lng: undefined, notes: '' })
        onSuccess?.(propertyId)
      }
    } catch (err) {
      console.error(property ? 'Property update error:' : 'Property creation error:', err)
      alert('An unexpected error occurred')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{property ? 'Edit Property' : 'Add New Property'}</h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <TextField label="Property Name" placeholder="e.g., Sunset Apartments" error={errors.name?.message} required {...register('name')} />

            {/* Property Type Selection */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('propertyType')}
                className="form-input"
              >
                {PropertyTypeEnum.options.map((type) => (
                  <option key={type} value={type}>
                    {getPropertyTypeLabel(type)}
                  </option>
                ))}
              </select>
              {errors.propertyType && (
                <p className="mt-1 text-xs text-red-600">{errors.propertyType.message}</p>
              )}
              {isLandProperty(selectedPropertyType) && (
                <p className="mt-1 text-xs text-amber-600">
                  ℹ️ Land properties will have additional configuration options after creation.
                </p>
              )}
              {property && (isLandProperty(selectedPropertyType) !== isLandProperty((property?.property_type as any) || 'HOME')) && (
                <p className="mt-1 text-xs text-amber-700">
                  ⚠️ Changing between rental and land types can affect existing units and tenants. Review related data after saving.
                </p>
              )}
            </div>

            <div>
              <AddressAutocomplete
                value={watch('physicalAddress') || ''}
                onChange={(val) => setValue('physicalAddress', val, { shouldDirty: true })}
                onSelect={({ address, lat, lng }) => {
                  setValue('physicalAddress', address, { shouldDirty: true })
                  if (lat !== undefined) setValue('lat', lat, { shouldDirty: true })
                  if (lng !== undefined) setValue('lng', lng, { shouldDirty: true })
                }}
                error={errors.physicalAddress?.message || null}
              />
              {errors.physicalAddress?.message && (
                <p className="mt-1 text-xs text-red-600">{errors.physicalAddress.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField label="Latitude" type="number" step="any" placeholder="-1.2921" error={errors.lat?.message} {...register('lat', { valueAsNumber: true })} />
              <TextField label="Longitude" type="number" step="any" placeholder="36.8219" error={errors.lng?.message} {...register('lng', { valueAsNumber: true })} />
            </div>

            {/* Conditional Information Section */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {isLandProperty(selectedPropertyType) ? 'Land Property Information' : 'Rental Property Information'}
              </h4>
              {isLandProperty(selectedPropertyType) ? (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• After creating this land property, you'll be able to add detailed information such as:</p>
                  <p>• Area measurements, zoning classification, and development permits</p>
                  <p>• Utility availability, road access, and topography details</p>
                  <p>• Pricing for sale or lease, and land-specific amenities</p>
                  <p>• Survey documents, title deeds, and development plans</p>
                </div>
              ) : (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• After creating this rental property, you'll be able to:</p>
                  <p>• Add individual units with rent amounts and amenities</p>
                  <p>• Set up utility configurations and billing settings</p>
                  <p>• Manage tenants, leases, and rental agreements</p>
                  <p>• Track occupancy rates and rental income</p>
                </div>
              )}
            </div>


          {/* Confirm dialog */}
          {confirmOpen && (
            <ConfirmDialog
              isOpen={confirmOpen}
              title="Confirm Property Type Change"
              confirmText="Proceed"
              cancelText="Cancel"
              onConfirm={async () => {
                const csrf = (typeof document !== 'undefined') ? (document.cookie.split(';').map(p=>p.trim()).find(p=>p.startsWith('csrf-token='))?.split('=')[1] || '') : ''
                const res2 = await fetch(`/api/properties/${property!.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
                  body: JSON.stringify({ property_type: watch('propertyType'), force: true }),
                })
                setConfirmOpen(false)
                if (!res2.ok) {
                  const txt = await res2.text().catch(() => '')
                  alert(`Failed to update property type: ${txt || res2.status}`)
                  return
                }
                // Update remaining fields after type change if needed
                const { error: updRestErr } = await supabase
                  .from('properties')
                  .update({
                    name: watch('name').trim(),
                    physical_address: (watch('physicalAddress') || '').trim(),
                    notes: (watch('notes') || '').trim() || null,
                    lat: watch('lat'),
                    lng: watch('lng'),
                  })
                  .eq('id', property!.id)
                if (updRestErr) console.warn('Post-type-change update warning:', updRestErr.message)
                onSuccess?.(property!.id)
              }}
              onCancel={() => setConfirmOpen(false)}
            >
              <p className="text-sm text-gray-700">Changing property type will affect related data.</p>
              <ul className="mt-3 text-sm text-gray-700 list-disc list-inside">
                <li>{confirmCounts?.units || 0} unit(s) found</li>
                <li>{confirmCounts?.tenants || 0} active tenant(s) found</li>
              </ul>
              <p className="mt-3 text-sm text-amber-700">Proceed anyway?</p>
            </ConfirmDialog>
          )}

            <TextField label="Notes" placeholder="Additional notes about the property..." error={errors.notes?.message} {...register('notes')} />

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{property ? (isSubmitting ? 'Updating…' : 'Update Property') : (isSubmitting ? 'Creating…' : 'Create Property')}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
