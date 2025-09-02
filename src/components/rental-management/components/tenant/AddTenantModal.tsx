/**
 * Add Tenant Modal Component
 * 
 * Extracted from TenantManagement.tsx to improve maintainability.
 * Handles the creation of new tenants with form validation.
 */

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../../ui'
import Modal from '../../../ui/Modal'
import { tenantSchema, TenantFormData } from './TenantSchemas'

interface AddTenantModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TenantFormData) => Promise<void>
  isLoading?: boolean
}

export default function AddTenantModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: AddTenantModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
  })

  const handleFormSubmit = async (data: TenantFormData) => {
    try {
      await onSubmit(data)
      reset()
      onClose()
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error submitting tenant form:', error)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Tenant"
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              {...register('full_name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter full name"
              disabled={isLoading}
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., +254 700 123 456"
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Alternate Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alternate Phone
            </label>
            <input
              type="tel"
              {...register('alternate_phone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional alternate phone number"
              disabled={isLoading}
            />
            {errors.alternate_phone && (
              <p className="mt-1 text-sm text-red-600">{errors.alternate_phone.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional email address"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* National ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              National ID *
            </label>
            <input
              type="text"
              {...register('national_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter national ID number"
              disabled={isLoading}
            />
            {errors.national_id && (
              <p className="mt-1 text-sm text-red-600">{errors.national_id.message}</p>
            )}
          </div>

          {/* Employer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employer
            </label>
            <input
              type="text"
              {...register('employer')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional employer information"
              disabled={isLoading}
            />
            {errors.employer && (
              <p className="mt-1 text-sm text-red-600">{errors.employer.message}</p>
            )}
          </div>
        </div>

        {/* Emergency Contact Information */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900">Emergency Contact Information</h3>
          <p className="text-sm text-gray-600">
            Emergency contact name and phone must be provided together, or both left empty.
          </p>

          {/* Emergency Contact Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact Name
            </label>
            <input
              type="text"
              {...register('emergency_contact_name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Emergency contact full name"
              disabled={isLoading}
            />
            {errors.emergency_contact_name && (
              <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_name.message}</p>
            )}
          </div>

          {/* Emergency Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              {...register('emergency_contact_phone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Emergency contact phone number"
              disabled={isLoading}
            />
            {errors.emergency_contact_phone && (
              <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_phone.message}</p>
            )}
          </div>

          {/* Emergency Contact Relationship */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship
            </label>
            <input
              type="text"
              {...register('emergency_contact_relationship')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Spouse, Parent, Sibling"
              disabled={isLoading}
            />
            {errors.emergency_contact_relationship && (
              <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_relationship.message}</p>
            )}
          </div>

          {/* Emergency Contact Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact Email
            </label>
            <input
              type="email"
              {...register('emergency_contact_email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Emergency contact email address"
              disabled={isLoading}
            />
            {errors.emergency_contact_email && (
              <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_email.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional notes about the tenant"
            disabled={isLoading}
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            Add Tenant
          </Button>
        </div>
      </form>
    </Modal>
  )
}
