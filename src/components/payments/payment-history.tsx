'use client'

import { useState, useEffect } from 'react'
import supabase from '../../lib/supabase-client'
import { LoadingCard } from '../ui/loading'
import { ErrorCard, EmptyState } from '../ui/error'
import { Payment, Tenant, Unit, Property } from '../../lib/types/database'
import DateRangeSelector, { getDefaultDateRange, getPredefinedDateRanges } from '../ui/date-range-selector'

interface PaymentWithDetails extends Payment {
  tenants: Tenant & {
    units: (Unit & {
      properties: Property
    })[]
  }
}

interface PaymentHistoryProps {
  onRecordPayment: () => void
}

export default function PaymentHistory({ onRecordPayment }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMethod, setFilterMethod] = useState<string>('all')
  const [filterDateRange, setFilterDateRange] = useState<string>('all')
  const [customDateRange, setCustomDateRange] = useState(getDefaultDateRange())
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)

  useEffect(() => {
    loadPayments()
  }, [filterDateRange, customDateRange])

  const loadPayments = async () => {
    try {
      setLoading(true)
      setIsLoadingPayments(true)
      setError(null)

      // For now, using mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'

      // Build query with date filtering
      let query = supabase
        .from('payments')
        .select(`
          *,
          tenants (
            id,
            full_name,
            phone,
            units (
              id,
              unit_label,
              properties (
                id,
                name,
                landlord_id
              )
            )
          )
        `)
        .eq('tenants.units.properties.landlord_id', mockLandlordId)

      // Apply date filtering based on selected range
      if (filterDateRange === 'custom') {
        query = query
          .gte('payment_date', customDateRange.startDate)
          .lte('payment_date', customDateRange.endDate)
      } else if (filterDateRange !== 'all') {
        const now = new Date()
        let startDate: Date

        switch (filterDateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
            break
          case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
            break
          default:
            startDate = new Date(0) // Beginning of time
        }

        query = query.gte('payment_date', startDate.toISOString().split('T')[0])
      }

      const { data: paymentsData, error: paymentsError } = await query.order('payment_date', { ascending: false })

      if (paymentsError) {
        setError('Failed to load payment history')
        return
      }

      setPayments(paymentsData || [])
    } catch (err) {
      setError('Failed to load payment history')
      console.error('Payment history loading error:', err)
    } finally {
      setLoading(false)
      setIsLoadingPayments(false)
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
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'MPESA':
        return 'bg-green-100 text-green-800'
      case 'CASH':
        return 'bg-blue-100 text-blue-800'
      case 'BANK_TRANSFER':
        return 'bg-purple-100 text-purple-800'
      case 'CHEQUE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter payments based on search and method (date filtering now done server-side)
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === '' ||
      payment.tenants.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.tenants.units?.[0]?.properties?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.tenants.units?.[0]?.unit_label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.tx_ref || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesMethod = filterMethod === 'all' || payment.method === filterMethod

    return matchesSearch && matchesMethod
  })

  // Handle predefined period selection
  const handleDateRangeChange = (range: string) => {
    setFilterDateRange(range)

    // If switching to a predefined period, update custom date range to match
    if (range !== 'custom' && range !== 'all') {
      const predefinedRanges = getPredefinedDateRanges()
      switch (range) {
        case 'month': {
          setCustomDateRange(predefinedRanges.currentMonth)
          break
        }
        case 'quarter': {
          setCustomDateRange(predefinedRanges.last3Months)
          break
        }
        case 'week': {
          const now = new Date()
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          setCustomDateRange({
            startDate: weekAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
          })
          break
        }
        case 'today': {
          const today = new Date().toISOString().split('T')[0]
          setCustomDateRange({
            startDate: today,
            endDate: today
          })
          break
        }
      }
    }
  }

  // Handle custom date range change
  const handleCustomDateRangeChange = (newDateRange: { startDate: string; endDate: string }) => {
    setCustomDateRange(newDateRange)
    if (filterDateRange !== 'custom') {
      setFilterDateRange('custom')
    }
  }

  if (loading) {
    return <LoadingCard title="Loading payment history..." />
  }

  if (error) {
    return <ErrorCard title="Failed to load payment history" message={error} onRetry={loadPayments} />
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 relative">
        {isLoadingPayments && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center text-gray-600">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Filtering payments...
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filter Payments</h3>
          {filterDateRange === 'custom' && (
            <div className="text-sm text-gray-600">
              <strong>Selected Range:</strong> {new Date(customDateRange.startDate).toLocaleDateString()} - {new Date(customDateRange.endDate).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoadingPayments}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Search by tenant, property, or reference..."
              />
            </div>

            <div>
              <label htmlFor="method" className="block text-sm font-medium text-gray-700">
                Payment Method
              </label>
              <select
                id="method"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                disabled={isLoadingPayments}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="all">All Methods</option>
                <option value="MPESA">M-Pesa</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <select
                id="dateRange"
                value={filterDateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                disabled={isLoadingPayments}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last 3 Months</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {filterDateRange === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Date Range</label>
              <DateRangeSelector
                value={customDateRange}
                onChange={handleCustomDateRangeChange}
                disabled={isLoadingPayments}
                maxRangeYears={5}
              />

              {/* Quick preset buttons for custom range */}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const ranges = getPredefinedDateRanges()
                    handleCustomDateRangeChange(ranges.currentMonth)
                  }}
                  disabled={isLoadingPayments}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                >
                  Current Month
                </button>
                <button
                  onClick={() => {
                    const ranges = getPredefinedDateRanges()
                    handleCustomDateRangeChange(ranges.yearToDate)
                  }}
                  disabled={isLoadingPayments}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                >
                  Year to Date
                </button>
                <button
                  onClick={() => {
                    const ranges = getPredefinedDateRanges()
                    handleCustomDateRangeChange(ranges.last3Months)
                  }}
                  disabled={isLoadingPayments}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                >
                  Last 3 Months
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredPayments.length}
            </div>
            <div className="text-sm text-gray-500">Total Payments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount_kes, 0))}
            </div>
            <div className="text-sm text-gray-500">Total Amount</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(filteredPayments.length > 0 ? filteredPayments.reduce((sum, p) => sum + p.amount_kes, 0) / filteredPayments.length : 0)}
            </div>
            <div className="text-sm text-gray-500">Average Payment</div>
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Payment History</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <button
            onClick={onRecordPayment}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Record Payment
          </button>
        </div>

        {filteredPayments.length === 0 ? (
          <EmptyState
            title="No payments found"
            description="No payments match your current filters."
            actionLabel="Record Payment"
            onAction={onRecordPayment}
          />
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredPayments.map((payment) => (
              <li key={payment.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.tenants.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.tenants.units?.[0]?.properties?.name} - {payment.tenants.units?.[0]?.unit_label}
                      </div>
                      {payment.tx_ref && (
                        <div className="text-xs text-gray-400">
                          Ref: {payment.tx_ref}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount_kes)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodBadgeColor(payment.method || 'UNKNOWN')}`}>
                        {payment.method || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(payment.payment_date)}
                    </div>
                  </div>
                </div>
                {payment.notes && (
                  <div className="mt-2 text-sm text-gray-600 ml-14">
                    {payment.notes}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
