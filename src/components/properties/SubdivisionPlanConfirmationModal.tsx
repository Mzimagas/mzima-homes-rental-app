'use client'

import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Property } from '../../lib/types/database'

interface SubdivisionPlanConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  property: Property
  isSubmitting?: boolean
}

export default function SubdivisionPlanConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  property,
  isSubmitting = false,
}: SubdivisionPlanConfirmationModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    setError(null)

    if (reason.length < 10) {
      setError('Reason must be at least 10 characters long')
      return
    }

    onConfirm(reason)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Subdivision Plan">
      <div className="space-y-4">
        {/* Warning Message */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                Important: Subdivision Plan Creation
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>Creating a subdivision plan will:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Mark the property as "Subdivided" in the system</li>
                  <li>Make the property unavailable for new rentals or tenants</li>
                  <li>Create an audit trail that cannot be undone</li>
                  <li>Require proper documentation and approval processes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Property Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Property Details</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <strong>Name:</strong> {property.name}
            </p>
            <p>
              <strong>Location:</strong> {property.location || 'Not specified'}
            </p>
            <p>
              <strong>Size:</strong>{' '}
              {property.size_acres ? `${property.size_acres} acres` : 'Not specified'}
            </p>
            <p>
              <strong>Current Status:</strong> {property.lifecycle_status || 'Active'}
            </p>
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label
            htmlFor="subdivision-reason"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Reason for Creating Subdivision Plan <span className="text-red-500">*</span>
          </label>
          <textarea
            id="subdivision-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Please provide a detailed reason for creating this subdivision plan (minimum 10 characters)..."
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">{reason.length}/10 characters minimum</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || reason.length < 10}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Creating Plan...' : 'Create Subdivision Plan'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
