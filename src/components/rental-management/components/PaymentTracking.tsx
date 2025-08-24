'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'
import { PaymentRecord } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface PaymentTrackingProps {
  onDataChange?: () => void
}

const paymentSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant is required'),
  amount: z.coerce.number().min(1, 'Amount is required'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'MPESA', 'CHEQUE', 'CARD']),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

export default function PaymentTracking({ onDataChange }: PaymentTrackingProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tenants, setTenants] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema)
  })

  useEffect(() => {
    loadPayments()
    loadTenants()
  }, [])

  const loadPayments = async () => {
    try {
      setLoading(true)
      // TODO: Implement getPayments in service
      setPayments([])
    } catch (error) {
      console.error('Error loading payments:', error)
      setError('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const loadTenants = async () => {
    try {
      const tenantsData = await RentalManagementService.getTenants()
      setTenants(tenantsData)
    } catch (error) {
      console.error('Error loading tenants:', error)
    }
  }

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setSubmitting(true)
      // TODO: Implement createPayment in service
      console.log('Payment data:', data)
      alert('Payment recording functionality will be implemented in the next phase')
      setShowPaymentModal(false)
      reset()
      loadPayments()
      onDataChange?.()
    } catch (error) {
      console.error('Error creating payment:', error)
      setError('Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Payment Tracking</h2>
          <p className="text-sm text-gray-500">Track rent payments and collection</p>
        </div>
        <Button variant="primary" onClick={() => setShowPaymentModal(true)}>
          Record Payment
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <TextField
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Payments' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
        </div>
        <Button variant="secondary" onClick={loadPayments}>
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingCard />
      ) : error ? (
        <ErrorCard message={error} />
      ) : (
        <div className="bg-white rounded-lg shadow">
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {/* TODO: Show tenant name */}
                        Tenant
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        KES {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          payment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.reference_number || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
              <p className="text-gray-500 mb-4">
                Start tracking payments by recording your first payment.
              </p>
              <Button variant="primary" onClick={() => setShowPaymentModal(true)}>
                Record First Payment
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          reset()
        }}
        title="Record Payment"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tenant Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant *
            </label>
            <select
              {...register('tenant_id')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.full_name}
                </option>
              ))}
            </select>
            {errors.tenant_id && (
              <p className="text-red-500 text-sm mt-1">{errors.tenant_id.message}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (KES) *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('amount')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter payment amount"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              {...register('payment_date')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.payment_date && (
              <p className="text-red-500 text-sm mt-1">{errors.payment_date.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method *
            </label>
            <select
              {...register('payment_method')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select payment method</option>
              <option value="CASH">Cash</option>
              <option value="MPESA">M-Pesa</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
            </select>
            {errors.payment_method && (
              <p className="text-red-500 text-sm mt-1">{errors.payment_method.message}</p>
            )}
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              {...register('reference_number')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Transaction reference (optional)"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes (optional)"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowPaymentModal(false)
                reset()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
