/**
 * Cost Entry Form Component
 * 
 * Extracted from PropertyAcquisitionFinancials.tsx to improve maintainability.
 * Handles the form for adding new acquisition costs.
 */

'use client'

import { useState } from 'react'
import { Button, TextField, Select } from '../../../ui'
import {
  ACQUISITION_COST_TYPES,
  SUBDIVISION_COST_TYPES,
} from '../../types/property-management.types'
import {
  CostEntryFormProps,
  validateCostEntry,
  parseAmount,
} from './FinancialTypes'

export default function CostEntryForm({
  newCost,
  onCostChange,
  onSubmit,
  onCancel,
  isLoading,
  isAddDisabled,
  financialsReadOnlyReason,
}: CostEntryFormProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Combine acquisition and subdivision cost types for the dropdown
  const allCostTypes = [
    ...ACQUISITION_COST_TYPES.map(type => ({
      ...type,
      value: type.id,
      label: `${type.label} (Acquisition)`,
    })),
    ...SUBDIVISION_COST_TYPES.map(type => ({
      ...type,
      value: `subdivision_${type.id}`,
      label: `${type.label} (Subdivision)`,
    })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const errors = validateCostEntry(newCost)
    setValidationErrors(errors)
    
    if (errors.length > 0) {
      return
    }
    
    try {
      await onSubmit()
      setValidationErrors([])
    } catch (error) {
      console.error('Error submitting cost entry:', error)
      setValidationErrors(['Failed to add cost entry. Please try again.'])
    }
  }

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal points
    const sanitized = value.replace(/[^0-9.]/g, '')
    onCostChange({ ...newCost, amount_kes: sanitized })
  }

  if (isAddDisabled) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-700 text-sm">
          {financialsReadOnlyReason || 'Adding costs is disabled for completed properties'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Cost Entry</h3>
      
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cost Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost Type *
          </label>
          <Select
            value={newCost.cost_type_id}
            onChange={(value) => onCostChange({ ...newCost, cost_type_id: value })}
            disabled={isLoading}
            className="w-full"
          >
            <option value="">Select cost type...</option>
            {allCostTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (KES) *
          </label>
          <TextField
            type="text"
            value={newCost.amount_kes}
            onChange={handleAmountChange}
            placeholder="0.00"
            disabled={isLoading}
            className="w-full"
          />
          {newCost.amount_kes && (
            <p className="mt-1 text-sm text-gray-600">
              Amount: KES {parseAmount(newCost.amount_kes).toLocaleString()}
            </p>
          )}
        </div>

        {/* Payment Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Reference
          </label>
          <TextField
            type="text"
            value={newCost.payment_reference}
            onChange={(value) => onCostChange({ ...newCost, payment_reference: value })}
            placeholder="e.g., Receipt #12345, Bank Transfer Ref"
            disabled={isLoading}
            className="w-full"
          />
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Date *
          </label>
          <TextField
            type="date"
            value={newCost.payment_date}
            onChange={(value) => onCostChange({ ...newCost, payment_date: value })}
            disabled={isLoading}
            className="w-full"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={newCost.notes}
            onChange={(e) => onCostChange({ ...newCost, notes: e.target.value })}
            placeholder="Additional notes about this cost..."
            disabled={isLoading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            Add Cost Entry
          </Button>
        </div>
      </form>
    </div>
  )
}
