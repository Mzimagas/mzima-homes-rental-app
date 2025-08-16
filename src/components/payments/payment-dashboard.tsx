'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import supabase from '../../lib/supabase-client'
import { LoadingStats } from '../ui/loading'
import { ErrorCard } from '../ui/error'
import EnhancedPaymentHistory from './enhanced-payment-history'
import EnhancedPaymentForm from './enhanced-payment-form'
import PaymentAnalytics from './payment-analytics'
import NotificationCenter from '../notifications/notification-center'

interface PaymentStats {
  totalPayments: number
  totalAmount: number
  averagePayment: number
  pendingPayments: number
  overdueAmount: number
  thisMonthPayments: number
  thisMonthAmount: number
  paymentMethods: {
    method: string
    count: number
    amount: number
  }[]
}

export default function PaymentDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [activeTab, setActiveTab] = useState<'history' | 'analytics'>('history')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    loadPaymentStats()
  }, [refreshKey])

  const loadPaymentStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'

      // Get payment statistics
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          amount_kes,
          method,
          payment_date,
          tenants (
            units (
              properties (
                landlord_id
              )
            )
          )
        `)
        .eq('tenants.units.properties.landlord_id', mockLandlordId)

      if (paymentsError) {
        setError('Failed to load payment statistics')
        return
      }

      // Get overdue invoices
      const { data: overdueInvoices, error: invoicesError } = await supabase
        .from('rent_invoices')
        .select('amount_due_kes, amount_paid_kes')
        .eq('status', 'OVERDUE')

      if (invoicesError) {
        console.error('Error loading overdue invoices:', invoicesError)
      }

      // Calculate statistics
      const totalPayments = payments?.length || 0
      const totalAmount = payments?.reduce((sum, p) => sum + p.amount_kes, 0) || 0
      const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0

      const overdueAmount = overdueInvoices?.reduce(
        (sum, inv) => sum + (inv.amount_due_kes - inv.amount_paid_kes), 
        0
      ) || 0

      // This month's payments
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const thisMonthPayments = payments?.filter(p => 
        new Date(p.payment_date) >= thisMonth
      ) || []
      
      const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + p.amount_kes, 0)

      // Payment methods breakdown
      const methodStats = payments?.reduce((acc, payment) => {
        const method = payment.method || 'UNKNOWN'
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 }
        }
        acc[method].count++
        acc[method].amount += payment.amount_kes
        return acc
      }, {} as Record<string, { count: number; amount: number }>) || {}

      const paymentMethods = Object.entries(methodStats).map(([method, stats]) => ({
        method,
        count: stats.count,
        amount: stats.amount
      }))

      setStats({
        totalPayments,
        totalAmount,
        averagePayment,
        pendingPayments: 0, // Would need to calculate from pending invoices
        overdueAmount,
        thisMonthPayments: thisMonthPayments.length,
        thisMonthAmount,
        paymentMethods
      })

    } catch (err) {
      setError('Failed to load payment statistics')
      console.error('Payment stats loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false)
    setRefreshKey(prev => prev + 1) // Trigger refresh
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) return <LoadingStats />
  if (error) return <ErrorCard title="Error Loading Dashboard" message={error} onRetry={loadPaymentStats} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Manage rent payments and track financial performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7H4l5-5v5zm6 10V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2z" />
            </svg>
            {/* Notification badge would go here */}
          </button>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Record Payment
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Collected</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalAmount)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.thisMonthAmount)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Average Payment</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.averagePayment)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Overdue Amount</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.overdueAmount)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payment History
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' && (
        <EnhancedPaymentHistory
          onRecordPayment={() => setShowPaymentForm(true)}
          onViewPayment={(paymentId) => {
            // Handle payment view
            console.log('View payment:', paymentId)
          }}
        />
      )}

      {activeTab === 'analytics' && (
        <PaymentAnalytics />
      )}

      {/* Payment Form Modal */}
      <EnhancedPaymentForm
        isOpen={showPaymentForm}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setShowPaymentForm(false)}
      />

      {/* Notification Center */}
      <NotificationCenter
        userId={user?.id || ''}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  )
}
