'use client'

import { useState, useEffect, useMemo } from 'react'
import supabase from '../../lib/supabase-client'
import { LoadingCard } from '../ui/loading'
import { ErrorCard, EmptyState } from '../ui/error'
import { Payment } from '../../lib/types/database'
import { getPaymentMethod } from '../../lib/config/payment-methods'
import DateRangeSelector, { getDefaultDateRange } from '../ui/date-range-selector'

interface PaymentWithDetails extends Payment {
  tenants?: {
    full_name: string
    phone?: string
    units?: {
      unit_label: string
      properties?: {
        name: string
      }
    }[]
  }
  payment_allocations?: {
    amount_kes: number
    rent_invoices: {
      period_start: string
      period_end: string
    }
  }[]
}

interface PaymentFilters {
  searchTerm: string
  methodFilter: string
  amountRange: { min: number; max: number }
  tenantFilter: string
}

interface EnhancedPaymentHistoryProps {
  onRecordPayment: () => void
  onViewPayment?: (paymentId: string) => void
}

export default function EnhancedPaymentHistory({ onRecordPayment, onViewPayment }: EnhancedPaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState(getDefaultDateRange())
  const [filters, setFilters] = useState<PaymentFilters>({
    searchTerm: '',
    methodFilter: '',
    amountRange: { min: 0, max: 0 },
    tenantFilter: ''
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'tenant'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadPayments()
  }, [dateRange])

  const loadPayments = async () => {
    try {
      setLoading(true)
      setError(null)

      const mockLandlordId = '11111111-1111-1111-1111-111111111111'
      const { startDate, endDate } = dateRange

      let query = supabase
        .from('payments')
        .select(`
          *,
          tenants (
            full_name,
            phone,
            units (
              unit_label,
              properties (
                name,
                landlord_id
              )
            )
          ),
          payment_allocations (
            amount_kes,
            rent_invoices (
              period_start,
              period_end
            )
          )
        `)
        .eq('tenants.units.properties.landlord_id', mockLandlordId)

      if (startDate) {
        const startDateStr = typeof startDate === 'string' ? startDate : (startDate as Date).toISOString().split('T')[0]
        query = query.gte('payment_date', startDateStr)
      }
      if (endDate) {
        const endDateStr = typeof endDate === 'string' ? endDate : (endDate as Date).toISOString().split('T')[0]
        query = query.lte('payment_date', endDateStr)
      }

      const { data, error: paymentsError } = await query.order('payment_date', { ascending: false })

      if (paymentsError) {
        setError('Failed to load payment history')
        return
      }

      setPayments(data || [])
    } catch (err) {
      setError('Failed to load payment history')
      console.error('Payment history loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort payments
  const filteredAndSortedPayments = useMemo(() => {
    let filtered = payments.filter(payment => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const tenantName = payment.tenants?.full_name?.toLowerCase() || ''
        const txRef = payment.tx_ref?.toLowerCase() || ''
        const paymentId = payment.id.toLowerCase()
        
        if (!tenantName.includes(searchLower) && 
            !txRef.includes(searchLower) && 
            !paymentId.includes(searchLower)) {
          return false
        }
      }

      // Method filter
      if (filters.methodFilter && payment.method !== filters.methodFilter) {
        return false
      }

      // Amount range filter
      if (filters.amountRange.min > 0 && payment.amount_kes < filters.amountRange.min) {
        return false
      }
      if (filters.amountRange.max > 0 && payment.amount_kes > filters.amountRange.max) {
        return false
      }

      // Tenant filter
      if (filters.tenantFilter) {
        const tenantName = payment.tenants?.full_name?.toLowerCase() || ''
        if (!tenantName.includes(filters.tenantFilter.toLowerCase())) {
          return false
        }
      }

      return true
    })

    // Sort payments
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
          break
        case 'amount':
          comparison = a.amount_kes - b.amount_kes
          break
        case 'tenant': {
          const nameA = a.tenants?.full_name || ''
          const nameB = b.tenants?.full_name || ''
          comparison = nameA.localeCompare(nameB)
          break
        }
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [payments, filters, sortBy, sortOrder])

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

  const exportToCSV = () => {
    const headers = ['Date', 'Tenant', 'Amount', 'Method', 'Transaction Ref', 'Status']
    const csvData = filteredAndSortedPayments.map(payment => [
      payment.payment_date,
      payment.tenants?.full_name || 'Unknown',
      payment.amount_kes,
      payment.method,
      payment.tx_ref || '',
      'Completed'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPayments.length === filteredAndSortedPayments.length) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(filteredAndSortedPayments.map(p => p.id))
    }
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      methodFilter: '',
      amountRange: { min: 0, max: 0 },
      tenantFilter: ''
    })
  }

  const totalAmount = filteredAndSortedPayments.reduce((sum, payment) => sum + payment.amount_kes, 0)
  const averageAmount = filteredAndSortedPayments.length > 0 ? totalAmount / filteredAndSortedPayments.length : 0

  if (loading) return <LoadingCard />
  if (error) return <ErrorCard title="Error Loading Payments" message={error} onRetry={loadPayments} />

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Payment History</h2>
          <button
            onClick={onRecordPayment}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Record Payment
          </button>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-600">Total Payments</p>
            <p className="text-2xl font-bold text-blue-900">{filteredAndSortedPayments.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-600">Total Amount</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">Average Payment</p>
            <p className="text-2xl font-bold text-purple-900">{formatCurrency(averageAmount)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm font-medium text-orange-600">Selected</p>
            <p className="text-2xl font-bold text-orange-900">{selectedPayments.length}</p>
          </div>
        </div>

        {/* Date Range Selector */}
        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          className="mb-4"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by tenant, transaction ref, or payment ID..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <select
              value={filters.methodFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, methodFilter: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Methods</option>
              <option value="MPESA">M-Pesa</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {showAdvancedFilters ? 'Hide' : 'More'} Filters
            </button>

            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear
            </button>

            <button
              onClick={exportToCSV}
              className="px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Name</label>
              <input
                type="text"
                placeholder="Filter by tenant name..."
                value={filters.tenantFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, tenantFilter: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount (KES)</label>
              <input
                type="number"
                placeholder="0"
                value={filters.amountRange.min || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  amountRange: { ...prev.amountRange, min: Number(e.target.value) || 0 }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount (KES)</label>
              <input
                type="number"
                placeholder="No limit"
                value={filters.amountRange.max || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  amountRange: { ...prev.amountRange, max: Number(e.target.value) || 0 }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredAndSortedPayments.length === 0 ? (
          <EmptyState
            title="No payments found"
            description="No payments match your current filters."
            actionLabel="Record Payment"
            onAction={onRecordPayment}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPayments.length === filteredAndSortedPayments.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'date') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('date')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'tenant') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('tenant')
                        setSortOrder('asc')
                      }
                    }}
                  >
                    Tenant {sortBy === 'tenant' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'amount') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('amount')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedPayments.map((payment) => {
                  const methodInfo = getPaymentMethod(payment.method || '')
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedPayments.includes(payment.id)}
                          onChange={() => handleSelectPayment(payment.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.tenants?.full_name || 'Unknown Tenant'}
                        </div>
                        {payment.tenants?.units?.[0] && (
                          <div className="text-sm text-gray-500">
                            {payment.tenants.units[0].unit_label} - {payment.tenants.units[0].properties?.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount_kes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {methodInfo?.icon} {methodInfo?.label || payment.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {(payment as any).paid_by_name ? (
                          <div>
                            <div className="font-medium">{(payment as any).paid_by_name}</div>
                            {(payment as any).paid_by_contact && <div className="text-xs text-gray-500">{(payment as any).paid_by_contact}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {payment.tx_ref || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {onViewPayment && (
                          <button
                            onClick={() => onViewPayment(payment.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
