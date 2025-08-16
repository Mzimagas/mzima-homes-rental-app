'use client'

import { useEffect } from 'react'
import supabase, { handleSupabaseError } from '../../lib/supabase-client'
import AddressAutocomplete from '../location/AddressAutocomplete'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { propertySchema, type PropertyFormValues } from '../../lib/validation/property'
import { Button, TextField, FormField } from '../ui'

interface PropertyFormProps {
  onSuccess?: (propertyId: string) => void
  onCancel?: () => void
  isOpen: boolean
  property?: {
    id: string
    name: string
    physical_address?: string | null
    lat?: number | null
    lng?: number | null
    notes?: string | null
  }
}

export default function PropertyForm({ onSuccess, onCancel, isOpen, property }: PropertyFormProps) {
  const { register, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: property?.name || '',
      physicalAddress: property?.physical_address || '',
      lat: property?.lat ?? undefined,
      lng: property?.lng ?? undefined,
      notes: property?.notes || ''
    }
  })

  useEffect(() => {
    reset({
      name: property?.name || '',
      physicalAddress: property?.physical_address || '',
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
          notes: values.notes?.trim() || null,
        }
        if (values.lat !== undefined) updateData.lat = values.lat
        if (values.lng !== undefined) updateData.lng = values.lng

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
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) {
          alert('Please log in to create a property')
          return
        }

        const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
          property_name: values.name.trim(),
          property_address: values.physicalAddress.trim(),
          property_type: 'APARTMENT',
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

        reset({ name: '', physicalAddress: '', lat: undefined, lng: undefined, notes: '' })
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
            <TextField label="Property Name *" placeholder="e.g., Sunset Apartments" error={errors.name?.message} {...register('name')} />

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
