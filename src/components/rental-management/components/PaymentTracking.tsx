'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
// Removed Modal import - using PaymentForm component instead
import { PaymentRecord } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
// Removed old form imports - using PaymentForm component instead
import PaymentAnalytics from '../../payments/payment-analytics'
import RentBalancesSection from '../../payments/rent-balances-section'
import UtilitiesSection from '../../payments/utilities-section'
// Import the main dashboard payment form
import PaymentForm from '../../payments/payment-form'

interface PaymentTrackingProps {
  onDataChange?: () => void
}

// Removed old payment schema - using PaymentForm component with its own validation

export default function PaymentTracking({ onDataChange }: PaymentTrackingProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'tracking' | 'analytics' | 'rent' | 'utilities'>(
    'tracking'
  )

  // PaymentForm component handles its own state and validation

  useEffect(() => {
    loadPayments()
    // PaymentForm component handles its own tenant loading
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

  // Removed loadTenants - PaymentForm component handles its own tenant loading

  // Payment form success handler
  const handlePaymentSuccess = () => {
    setShowPaymentForm(false)
    loadPayments() // Reload payment data
    onDataChange?.() // Notify parent component
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Payment Management</h2>
          <p className="text-sm text-gray-500">Comprehensive payment tracking and analytics</p>
        </div>
        <Button variant="primary" onClick={() => setShowPaymentForm(true)}>
          Record Payment
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'tracking', label: 'Payment Tracking', icon: '💳' },
            { key: 'analytics', label: 'Analytics', icon: '📊' },
            { key: 'rent', label: 'Rent Balances', icon: '🏠' },
            { key: 'utilities', label: 'Utility Balances', icon: '⚡' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tracking' && (
        <>
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
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                payment.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : payment.status === 'PENDING'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : payment.status === 'FAILED'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
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
                  <Button variant="primary" onClick={() => setShowPaymentForm(true)}>
                    Record First Payment
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <PaymentAnalytics />
        </div>
      )}

      {/* Rent Balances Tab */}
      {activeTab === 'rent' && (
        <div className="space-y-6">
          <RentBalancesSection />
        </div>
      )}

      {/* Utilities Tab */}
      {activeTab === 'utilities' && (
        <div className="space-y-6">
          <UtilitiesSection />
        </div>
      )}

      {/* Payment Form Modal - Using main dashboard payment form */}
      <PaymentForm
        isOpen={showPaymentForm}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setShowPaymentForm(false)}
      />
    </div>
  )
}
