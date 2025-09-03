'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import supabase, { clientBusinessFunctions, clientQueries } from '../../../lib/supabase-client'

const supabase = getSupabaseClient()
import { LoadingStats, LoadingCard } from '../../../components/ui/loading'
import { ErrorCard, EmptyState } from '../../../components/ui/error'
import { Payment, Unit, Property } from '../../../lib/types/database'
import PaymentForm from '../../../components/payments/payment-form'
import PaymentHistory from '../../../components/payments/payment-history'
import PaymentAnalytics from '../../../components/payments/payment-analytics'
import RentBalancesSection from '../../../components/payments/rent-balances-section'
import UtilitiesSection from '../../../components/payments/utilities-section'
import UtilityBalancePanel from '../../../components/utilities/utility-balance-panel'
import UtilityLedgerTable from '../../../components/utilities/utility-ledger-table'

interface PaymentWithDetails extends Payment {
  // tenants relationship removed during tenant module rebuild
}

interface PaymentStats {
  totalPaymentsToday: number
  totalPaymentsThisMonth: number
  totalOutstanding: number
  overdueCount: number
  recentPayments: PaymentWithDetails[]
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'history' | 'rent' | 'utilities' | 'analytics'
  >('overview')

  const loadPaymentStats = async () => {
    try {
      setLoading(true)
      setError(null)
      console.info('[Payments] Loading payment stats...')

      // For now, using mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'
      console.info('[Payments] Using landlord ID:', mockLandlordId)

      // Test if payments table exists first
      console.info('[Payments] Testing payments table access...')
      const { count, error: countError } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.warn('[Payments] Payments table access failed:', countError)
        setError('Payments table not accessible: ' + countError.message)
        return
      }

      console.info('[Payments] Payments table exists with', count, 'records')

      // Now get actual payment data
      console.info('[Payments] Loading payment records...')
      const { data: recentPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(20)

      if (paymentsError) {
        console.warn('[Payments] Error loading payments:', paymentsError)
        console.warn('[Payments] Error details:', JSON.stringify(paymentsError, null, 2))
        setError('Failed to load payment data: ' + (paymentsError.message || 'Unknown error'))
        return
      }
      console.info('[Payments] Loaded payments:', recentPayments?.length || 0)
      console.info('[Payments] Sample payment:', recentPayments?.[0])

      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

      const totalPaymentsToday =
        recentPayments
          ?.filter((p: PaymentWithDetails) => p.payment_date === today)
          .reduce((sum: number, p: PaymentWithDetails) => sum + p.amount_kes, 0) || 0

      const totalPaymentsThisMonth =
        recentPayments
          ?.filter((p: PaymentWithDetails) => p.payment_date.startsWith(thisMonth))
          .reduce((sum: number, p: PaymentWithDetails) => sum + p.amount_kes, 0) || 0

      // Get outstanding invoices count
      console.info('[Payments] Loading overdue invoices...')
      let overdueInvoices = []
      try {
        const { data, error: invoicesError } = await supabase
          .from('rent_invoices')
          .select('amount_due_kes, amount_paid_kes')
          .eq('status', 'OVERDUE')

        if (invoicesError) {
          if (invoicesError.message?.includes('does not exist')) {
            console.warn('[Payments] rent_invoices table does not exist, using empty data')
            overdueInvoices = []
          } else {
            console.error('[Payments] Error loading invoices:', invoicesError)
            overdueInvoices = []
          }
        } else {
          overdueInvoices = data || []
        }
      } catch (error: any) {
        console.warn('[Payments] Error loading overdue invoices:', error.message)
        overdueInvoices = []
      }
      console.info('[Payments] Loaded invoices:', overdueInvoices?.length || 0)

      const totalOutstanding =
        overdueInvoices?.reduce(
          (sum: number, inv: { amount_due_kes: number; amount_paid_kes: number }) =>
            sum + (inv.amount_due_kes - inv.amount_paid_kes),
          0
        ) || 0

      const overdueCount = overdueInvoices?.length || 0

      setStats({
        totalPaymentsToday,
        totalPaymentsThisMonth,
        totalOutstanding,
        overdueCount,
        recentPayments: recentPayments || [],
      })
    } catch (err) {
      console.error('[Payments] Unhandled error:', err)
      setError('Failed to load payment statistics: ' + (err as any)?.message)
    } finally {
      setLoading(false)
      console.info('[Payments] Loading complete')
    }
  }

  useEffect(() => {
    loadPaymentStats()
  }, [])

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
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading payment data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
        </div>
        <ErrorCard title="Failed to load payments" message={error} onRetry={loadPaymentStats} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
        <button
          onClick={() => setShowPaymentForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Record Payment
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'history', label: 'Payment History' },
            { key: 'rent', label: 'Rent Balances' },
            { key: 'utilities', label: 'Utility Balances' },
            { key: 'analytics', label: 'Analytics' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Payment Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Today&apos;s Payments
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {formatCurrency(stats.totalPaymentsToday)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {formatCurrency(stats.totalPaymentsThisMonth)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Outstanding</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {formatCurrency(stats.totalOutstanding)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-yellow-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Overdue Invoices
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.overdueCount}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Payments */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Payments</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Latest payment transactions</p>
            </div>
            {stats?.recentPayments.length === 0 ? (
              <EmptyState
                title="No payments recorded"
                description="Start by recording your first payment transaction."
                actionLabel="Record Payment"
                onAction={() => setShowPaymentForm(true)}
              />
            ) : (
              <ul className="divide-y divide-gray-200">
                {stats?.recentPayments.slice(0, 10).map((payment) => (
                  <li key={payment.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <svg
                              className="h-6 w-6 text-green-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm text-gray-500">Payment</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount_kes)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(payment.payment_date)} • {payment.method}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <PaymentHistory onRecordPayment={() => setShowPaymentForm(true)} />
      )}

      {activeTab === 'rent' && (
        <div className="space-y-6">
          {/* Rent Summary */}
          <RentBalancesSection />
        </div>
      )}

      {activeTab === 'utilities' && (
        <div className="space-y-6">
          <UtilitiesSection />
        </div>
      )}

      {activeTab === 'analytics' && <PaymentAnalytics />}

      {/* Payment Form Modal */}
      <PaymentForm
        isOpen={showPaymentForm}
        onSuccess={() => {
          setShowPaymentForm(false)
          loadPaymentStats() // Reload payment data
        }}
        onCancel={() => setShowPaymentForm(false)}
      />
    </div>
  )
}
