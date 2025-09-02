/**
 * Payment Installment Form Component
 * 
 * Extracted from PropertyAcquisitionFinancials.tsx to improve maintainability.
 * Handles the form for adding new payment installments.
 */

'use client'

import { useState } from 'react'
import { Button, TextField, Select } from '../../../ui'
import {
  PaymentInstallmentFormProps,
  validatePaymentInstallment,
  parseAmount,
} from './FinancialTypes'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'other', label: 'Other' },
]

export default function PaymentInstallmentForm({
  newPayment,
  onPaymentChange,
  onSubmit,
  onCancel,
  isLoading,
  isAddDisabled,
  financialsReadOnlyReason,
}: PaymentInstallmentFormProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const errors = validatePaymentInstallment(newPayment)
    setValidationErrors(errors)
    
    if (errors.length > 0) {
      return
    }
    
    try {
      await onSubmit()
      setValidationErrors([])
    } catch (error) {
      console.error('Error submitting payment installment:', error)
      setValidationErrors(['Failed to add payment installment. Please try again.'])
    }
  }

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal points
    const sanitized = value.replace(/[^0-9.]/g, '')
    onPaymentChange({ ...newPayment, amount_kes: sanitized })
  }

  if (isAddDisabled) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-700 text-sm">
          {financialsReadOnlyReason || 'Adding payments is disabled for completed properties'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Payment Installment</h3>
      
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
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Amount (KES) *
          </label>
          <TextField
            type="text"
            value={newPayment.amount_kes}
            onChange={handleAmountChange}
            placeholder="0.00"
            disabled={isLoading}
            className="w-full"
          />
          {newPayment.amount_kes && (
            <p className="mt-1 text-sm text-gray-600">
              Amount: KES {parseAmount(newPayment.amount_kes).toLocaleString()}
            </p>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Date *
          </label>
          <TextField
            type="date"
            value={newPayment.payment_date}
            onChange={(value) => onPaymentChange({ ...newPayment, payment_date: value })}
            disabled={isLoading}
            className="w-full"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method *
          </label>
          <Select
            value={newPayment.payment_method}
            onChange={(value) => onPaymentChange({ ...newPayment, payment_method: value })}
            disabled={isLoading}
            className="w-full"
          >
            <option value="">Select payment method...</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Payment Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Reference
          </label>
          <TextField
            type="text"
            value={newPayment.payment_reference}
            onChange={(value) => onPaymentChange({ ...newPayment, payment_reference: value })}
            placeholder="e.g., Transaction ID, Receipt Number"
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
            value={newPayment.notes}
            onChange={(e) => onPaymentChange({ ...newPayment, notes: e.target.value })}
            placeholder="Additional notes about this payment..."
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
            Add Payment
          </Button>
        </div>
      </form>
    </div>
  )
}
