'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, TextField, FormField, Select } from '../ui'
import Modal from '../ui/Modal'
import AddressAutocomplete from '../location/AddressAutocomplete'
import { PropertyTypeEnum, propertySchema, type PropertyFormValues } from '../../lib/validation/property'
import { useToast } from '../ui/Toast'

interface PropertyFormProps {
  isOpen: boolean
  onClose: () => void
  property?: any // For editing existing properties
  onSuccess?: (propertyId: string) => void
  onCancel?: () => void
}

function getCsrfToken(): string {
  return document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''
}

export default function PropertyForm({
  isOpen,
  onClose,
  property,
  onSuccess,
  onCancel
}: PropertyFormProps) {
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: property ? {
      name: property.name || '',
      physical_address: property.physical_address || '',
      property_type: property.property_type || 'HOME',
      lat: property.lat || undefined,
      lng: property.lng || undefined,
      notes: property.notes || '',
      default_billing_day: property.default_billing_day || undefined,
      default_align_billing_to_start: property.default_align_billing_to_start ?? true
    } : {
      property_type: 'HOME',
      default_align_billing_to_start: true
    }
  })

  const propertyType = watch('property_type')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (property) {
        reset({
          name: property.name || '',
          physical_address: property.physical_address || '',
          property_type: property.property_type || 'HOME',
          lat: property.lat || undefined,
          lng: property.lng || undefined,
          notes: property.notes || '',
          default_billing_day: property.default_billing_day || undefined,
          default_align_billing_to_start: property.default_align_billing_to_start ?? true
        })
      } else {
        reset({
          property_type: 'HOME',
          default_align_billing_to_start: true
        })
      }
    }
  }, [isOpen, property, reset])

  const onSubmit = async (values: PropertyFormValues) => {
    try {
      setIsSubmitting(true)

      const url = property ? `/api/properties/${property.id}` : '/api/properties'
      const method = property ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify(values)
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to save property')
      }

      showToast({
        type: 'success',
        message: property ? 'Property updated successfully' : 'Property created successfully'
      })

      reset()
      onClose()
      onSuccess?.(result.data?.id || property?.id)
    } catch (error: any) {
      console.error('Error saving property:', error)
      showToast({
        type: 'error',
        message: error.message || 'Failed to save property'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
    onCancel?.()
  }

  const handleAddressSelect = (result: any) => {
    setValue('physical_address', result.address)
    if (result.lat !== undefined) setValue('lat', result.lat)
    if (result.lng !== undefined) setValue('lng', result.lng)
  }



  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={property ? 'Edit Property' : 'Add New Property'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Property Name */}
        <FormField name="name" label="Property Name" error={errors.name?.message}>
          {({ id }) => (
            <TextField
              id={id}
              {...register('name')}
              placeholder="Enter property name"
            />
          )}
        </FormField>

        {/* Property Type */}
        <FormField name="property_type" label="Property Type" error={errors.property_type?.message}>
          {({ id }) => (
            <Select id={id} {...register('property_type')}>
              {PropertyTypeEnum.options.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        {/* Address with Autocomplete */}
        <FormField name="physical_address" label="Physical Address" error={errors.physical_address?.message}>
          {({ id }) => (
            <AddressAutocomplete
              value={watch('physical_address') || ''}
              onChange={(value) => setValue('physical_address', value)}
              onSelect={handleAddressSelect}
              label="Physical Address"
              allowCurrentLocation={true}
              error={errors.physical_address?.message}
            />
          )}
        </FormField>

        {/* Coordinates (read-only display) */}
        {(watch('lat') || watch('lng')) && (
          <div className="grid grid-cols-2 gap-4">
            <FormField name="lat" label="Latitude">
              {({ id }) => (
                <TextField
                  id={id}
                  {...register('lat', { valueAsNumber: true })}
                  type="number"
                  step="any"
                  placeholder="Latitude"
                />
              )}
            </FormField>
            <FormField name="lng" label="Longitude">
              {({ id }) => (
                <TextField
                  id={id}
                  {...register('lng', { valueAsNumber: true })}
                  type="number"
                  step="any"
                  placeholder="Longitude"
                />
              )}
            </FormField>
          </div>
        )}

        {/* Billing Defaults */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Billing Defaults</h3>
          
          <FormField name="default_billing_day" label="Default Billing Day (1-31)" error={errors.default_billing_day?.message}>
            {({ id }) => (
              <TextField
                id={id}
                {...register('default_billing_day', { valueAsNumber: true })}
                type="number"
                min="1"
                max="31"
                placeholder="e.g., 1 for 1st of month"
              />
            )}
          </FormField>

          <FormField name="default_align_billing_to_start" label="Align Billing to Start Date">
            {({ id }) => (
              <div className="flex items-center space-x-2">
                <input
                  id={id}
                  type="checkbox"
                  {...register('default_align_billing_to_start')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={id} className="text-sm text-gray-700">
                  Align new tenancy billing dates to start date by default
                </label>
              </div>
            )}
          </FormField>
        </div>

        {/* Notes */}
        <FormField name="notes" label="Notes" error={errors.notes?.message}>
          {({ id }) => (
            <textarea
              id={id}
              {...register('notes')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes about the property"
            />
          )}
        </FormField>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : property ? 'Update Property' : 'Create Property'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
