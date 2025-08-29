'use client'

import { useState, useEffect } from 'react'
import { PaymentService, PaymentConfirmation } from '../../lib/services/payment-service'
import { LoadingCard } from '../ui/loading'
import { ErrorCard } from '../ui/error'

interface PaymentConfirmationProps {
  paymentId: string
  onClose: () => void
  isOpen: boolean
}

export default function PaymentConfirmationModal({
  paymentId,
  onClose,
  isOpen,
}: PaymentConfirmationProps) {
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && paymentId) {
      loadConfirmation()
    }
  }, [isOpen, paymentId])

  const loadConfirmation = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await PaymentService.getPaymentConfirmation(paymentId)
      if (data) {
        setConfirmation(data)
      } else {
        setError('Unable to load payment confirmation details')
      }
    } catch (err) {
            setError('Failed to load payment confirmation')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Payment Confirmation
                </h3>
                <p className="text-sm text-gray-500">Payment processed successfully</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          {/* Content */}
          {loading && <LoadingCard />}

          {error && (
            <ErrorCard
              title="Error Loading Confirmation"
              message={error}
              onRetry={loadConfirmation}
            />
          )}

          {confirmation && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Payment Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Amount</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(confirmation.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Date</p>
                    <p className="text-sm text-gray-900">{formatDate(confirmation.paymentDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tenant</p>
                    <p className="text-sm text-gray-900">{confirmation.tenantName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Method</p>
                    <p className="text-sm text-gray-900">{confirmation.method}</p>
                  </div>
                  {confirmation.txRef && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Transaction Reference</p>
                        <p className="text-sm text-gray-900 font-mono">{confirmation.txRef}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Payment ID</p>
                        <p className="text-sm text-gray-900 font-mono">{confirmation.paymentId}</p>
                      </div>
                    </>
                  )}
                  {confirmation.paidByName && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Paid By</p>
                      <p className="text-sm text-gray-900">
                        {confirmation.paidByName}
                        {confirmation.paidByContact ? ` • ${confirmation.paidByContact}` : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Allocations */}
              {confirmation.allocations && confirmation.allocations.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Payment Allocation</h4>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice Period
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount Allocated
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {confirmation.allocations.map((allocation, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(allocation.periodStart)} -{' '}
                              {formatDate(allocation.periodEnd)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(allocation.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Print Receipt
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Simplified inline confirmation component for quick display
export function PaymentSuccessMessage({
  amount,
  method,
  txRef,
  onViewDetails,
}: {
  amount: number
  method: string
  txRef?: string
  onViewDetails?: () => void
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="rounded-md bg-green-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-green-800">Payment Recorded Successfully</h3>
          <div className="mt-2 text-sm text-green-700">
            <p>
              {formatCurrency(amount)} payment via {method}
              {txRef && ` (Ref: ${txRef})`} has been processed and allocated to outstanding
              invoices.
            </p>
          </div>
          {onViewDetails && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onViewDetails}
                className="text-sm font-medium text-green-800 hover:text-green-600"
              >
                View Details →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
