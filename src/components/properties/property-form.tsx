'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, TextField, FormField, Select } from '../ui'
import Modal from '../ui/Modal'
import AddressAutocomplete from '../location/AddressAutocomplete'
import {
  PropertyTypeEnum,
  propertySchema,
  type PropertyFormValues,
} from '../../lib/validation/property'
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
  onCancel,
}: PropertyFormProps) {
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: property
      ? {
          name: property.name || '',
          physical_address: property.physical_address || '',
          property_type: property.property_type || 'HOME',
          lat: property.lat || undefined,
          lng: property.lng || undefined,
          notes: property.notes || '',
          default_billing_day: property.default_billing_day || undefined,
          default_align_billing_to_start: property.default_align_billing_to_start ?? true,

        }
      : {
          property_type: 'HOME',
          default_align_billing_to_start: true,

        },
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
          default_align_billing_to_start: property.default_align_billing_to_start ?? true,

        })
      } else {
        reset({
          property_type: 'HOME',
          default_align_billing_to_start: true,

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
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(values),
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to save property')
      }

      showToast({
        type: 'success',
        message: property ? 'Property updated successfully' : 'Property created successfully',
      })

      reset()
      onClose()
      onSuccess?.(result.data?.id || property?.id)
    } catch (error: any) {
            showToast({
        type: 'error',
        message: error.message || 'Failed to save property',
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
      size="lg"
    >
      <div className="p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              <p className="text-sm text-gray-600 mt-1">Enter the essential details for this property</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Name */}
              <div className="md:col-span-2">
                <FormField name="name" label="Property Name" error={errors.name?.message}>
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('name')}
                      placeholder="Enter a descriptive name for the property"
                      className="w-full"
                    />
                  )}
                </FormField>
              </div>

              {/* Property Type */}
              <FormField name="property_type" label="Property Type" error={errors.property_type?.message}>
                {({ id }) => (
                  <Select id={id} {...register('property_type')} className="w-full">
                    {PropertyTypeEnum.options.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            </div>
          </div>

          {/* Location Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
              <p className="text-sm text-gray-600 mt-1">Specify the property's physical location and coordinates</p>
            </div>

            {/* Address with Autocomplete */}
            <FormField
              name="physical_address"
              label="Physical Address"
              error={errors.physical_address?.message}
            >
              {({ id }) => (
                <AddressAutocomplete
                  value={watch('physical_address') || ''}
                  onChange={(value) => setValue('physical_address', value)}
                  onSelect={handleAddressSelect}
                  label="Physical Address"
                  allowCurrentLocation={true}
                  error={errors.physical_address?.message}
                  placeholder="Enter the property's physical address"
                />
              )}
            </FormField>

            {/* Coordinates */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">GPS Coordinates</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField name="lat" label="Latitude">
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('lat', { valueAsNumber: true })}
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      className="bg-white"
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
                      className="bg-white"
                    />
                  )}
                </FormField>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Coordinates are automatically populated when you select an address, or you can enter them manually
              </p>
            </div>
          </div>

          {/* Billing Configuration Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Billing Configuration</h3>
              <p className="text-sm text-gray-600 mt-1">Set default billing preferences for this property</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="default_billing_day"
                label="Default Billing Day (1-31)"
                error={errors.default_billing_day?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('default_billing_day', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g., 1 for 1st of month"
                    className="w-full"
                  />
                )}
              </FormField>

              <div className="space-y-2">
                <FormField name="default_align_billing_to_start" label="Billing Alignment">
                  {({ id }) => (
                    <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <input
                        id={id}
                        type="checkbox"
                        {...register('default_align_billing_to_start')}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <label htmlFor={id} className="text-sm font-medium text-gray-700">
                          Align billing to lease start date
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          When enabled, billing will start from the lease start date regardless of the billing day
                        </p>
                      </div>
                    </div>
                  )}
                </FormField>
              </div>
            </div>
          </div>



          {/* Additional Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
              <p className="text-sm text-gray-600 mt-1">Add any additional notes or details about this property</p>
            </div>

            {/* Notes */}
            <FormField name="notes" label="Notes" error={errors.notes?.message}>
              {({ id }) => (
                <textarea
                  id={id}
                  {...register('notes')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4}
                  placeholder="Enter any additional notes, special instructions, or important details about this property..."
                />
              )}
            </FormField>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="px-6 py-2"
            >
              {isSubmitting ? 'Saving...' : property ? 'Update Property' : 'Create Property'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
