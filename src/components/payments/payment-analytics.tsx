'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase-client'
import { LoadingCard } from '../ui/loading'
import { ErrorCard } from '../ui/error'
import DateRangeSelector, { getDefaultDateRange, getPredefinedDateRanges } from '../ui/date-range-selector'
import { Payment } from '../../../lib/types/database'

interface PaymentAnalytics {
  monthlyTrends: {
    month: string
    totalAmount: number
    paymentCount: number
  }[]
  methodBreakdown: {
    method: string
    amount: number
    count: number
    percentage: number
  }[]
  dailyAverages: {
    dayOfWeek: string
    averageAmount: number
    paymentCount: number
  }[]
  topTenants: {
    tenantName: string
    totalPaid: number
    paymentCount: number
  }[]
}

export default function PaymentAnalytics() {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'custom'>('6months')
  const [customDateRange, setCustomDateRange] = useState(getDefaultDateRange())
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [selectedPeriod, customDateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setIsGeneratingReport(true)
      setError(null)

      // Calculate date range
      let startDate: Date, endDate: Date

      if (selectedPeriod === 'custom') {
        startDate = new Date(customDateRange.startDate)
        endDate = new Date(customDateRange.endDate)
      } else {
        endDate = new Date()
        startDate = new Date()

        switch (selectedPeriod) {
          case '3months':
            startDate.setMonth(endDate.getMonth() - 3)
            break
          case '6months':
            startDate.setMonth(endDate.getMonth() - 6)
            break
          case '1year':
            startDate.setFullYear(endDate.getFullYear() - 1)
            break
        }
      }

      // For now, using mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          tenants (
            full_name,
            units (
              properties (
                landlord_id
              )
            )
          )
        `)
        .eq('tenants.units.properties.landlord_id', mockLandlordId)
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0])
        .order('payment_date', { ascending: false })

      if (paymentsError) {
        setError('Failed to load payment analytics')
        return
      }

      const payments = paymentsData || []

      // Calculate monthly trends
      const monthlyTrends = calculateMonthlyTrends(payments, startDate, endDate)
      
      // Calculate method breakdown
      const methodBreakdown = calculateMethodBreakdown(payments)
      
      // Calculate daily averages
      const dailyAverages = calculateDailyAverages(payments)
      
      // Calculate top tenants
      const topTenants = calculateTopTenants(payments)

      setAnalytics({
        monthlyTrends,
        methodBreakdown,
        dailyAverages,
        topTenants
      })

    } catch (err) {
      setError('Failed to load payment analytics')
      console.error('Payment analytics loading error:', err)
    } finally {
      setLoading(false)
      setIsGeneratingReport(false)
    }
  }

  // Handle predefined period selection
  const handlePeriodChange = (period: '3months' | '6months' | '1year' | 'custom') => {
    setSelectedPeriod(period)

    // If switching to a predefined period, update custom date range to match
    if (period !== 'custom') {
      const predefinedRanges = getPredefinedDateRanges()
      switch (period) {
        case '3months':
          setCustomDateRange(predefinedRanges.last3Months)
          break
        case '6months':
          setCustomDateRange(predefinedRanges.last6Months)
          break
        case '1year':
          setCustomDateRange(predefinedRanges.lastYear)
          break
      }
    }
  }

  // Handle custom date range change
  const handleCustomDateRangeChange = (newDateRange: { startDate: string; endDate: string }) => {
    setCustomDateRange(newDateRange)
    if (selectedPeriod !== 'custom') {
      setSelectedPeriod('custom')
    }
  }

  const calculateMonthlyTrends = (payments: any[], startDate: Date, endDate: Date) => {
    const monthlyData: { [key: string]: { totalAmount: number; paymentCount: number } } = {}
    
    // Initialize all months in the range
    const current = new Date(startDate)
    while (current <= endDate) {
      const monthKey = current.toISOString().slice(0, 7) // YYYY-MM format
      monthlyData[monthKey] = { totalAmount: 0, paymentCount: 0 }
      current.setMonth(current.getMonth() + 1)
    }

    // Aggregate payment data by month
    payments.forEach(payment => {
      const monthKey = payment.payment_date.slice(0, 7)
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].totalAmount += payment.amount_kes
        monthlyData[monthKey].paymentCount += 1
      }
    })

    return Object.entries(monthlyData).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-KE', { year: 'numeric', month: 'short' }),
      totalAmount: data.totalAmount,
      paymentCount: data.paymentCount
    }))
  }

  const calculateMethodBreakdown = (payments: any[]) => {
    const methodData: { [key: string]: { amount: number; count: number } } = {}
    const totalAmount = payments.reduce((sum, p) => sum + p.amount_kes, 0)

    payments.forEach(payment => {
      if (!methodData[payment.method]) {
        methodData[payment.method] = { amount: 0, count: 0 }
      }
      methodData[payment.method].amount += payment.amount_kes
      methodData[payment.method].count += 1
    })

    return Object.entries(methodData).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount)
  }

  const calculateDailyAverages = (payments: any[]) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dailyData: { [key: number]: { totalAmount: number; paymentCount: number } } = {}

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dailyData[i] = { totalAmount: 0, paymentCount: 0 }
    }

    payments.forEach(payment => {
      const dayOfWeek = new Date(payment.payment_date).getDay()
      dailyData[dayOfWeek].totalAmount += payment.amount_kes
      dailyData[dayOfWeek].paymentCount += 1
    })

    return Object.entries(dailyData).map(([day, data]) => ({
      dayOfWeek: dayNames[parseInt(day)],
      averageAmount: data.paymentCount > 0 ? data.totalAmount / data.paymentCount : 0,
      paymentCount: data.paymentCount
    }))
  }

  const calculateTopTenants = (payments: any[]) => {
    const tenantData: { [key: string]: { totalPaid: number; paymentCount: number; name: string } } = {}

    payments.forEach(payment => {
      const tenantId = payment.tenant_id
      const tenantName = payment.tenants?.full_name || 'Unknown'
      
      if (!tenantData[tenantId]) {
        tenantData[tenantId] = { totalPaid: 0, paymentCount: 0, name: tenantName }
      }
      tenantData[tenantId].totalPaid += payment.amount_kes
      tenantData[tenantId].paymentCount += 1
    })

    return Object.values(tenantData)
      .map(data => ({
        tenantName: data.name,
        totalPaid: data.totalPaid,
        paymentCount: data.paymentCount
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 10)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'MPESA': return 'bg-green-500'
      case 'CASH': return 'bg-blue-500'
      case 'BANK_TRANSFER': return 'bg-purple-500'
      case 'CHEQUE': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return <LoadingCard title="Loading payment analytics..." />
  }

  if (error) {
    return <ErrorCard title="Failed to load analytics" message={error} onRetry={loadAnalytics} />
  }

  if (!analytics) {
    return <div>No analytics data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Payment Analytics</h3>
            {isGeneratingReport && (
              <div className="flex items-center text-sm text-blue-600">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating analytics...
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value as any)}
                disabled={isGeneratingReport}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {selectedPeriod === 'custom' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Date Range</label>
                <DateRangeSelector
                  value={customDateRange}
                  onChange={handleCustomDateRangeChange}
                  disabled={isGeneratingReport}
                  maxRangeYears={5}
                />

                {/* Quick preset buttons for custom range */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const ranges = getPredefinedDateRanges()
                      handleCustomDateRangeChange(ranges.currentMonth)
                    }}
                    disabled={isGeneratingReport}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                  >
                    Current Month
                  </button>
                  <button
                    onClick={() => {
                      const ranges = getPredefinedDateRanges()
                      handleCustomDateRangeChange(ranges.last3Months)
                    }}
                    disabled={isGeneratingReport}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                  >
                    Last 3 Months
                  </button>
                  <button
                    onClick={() => {
                      const ranges = getPredefinedDateRanges()
                      handleCustomDateRangeChange(ranges.yearToDate)
                    }}
                    disabled={isGeneratingReport}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                  >
                    Year to Date
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedPeriod === 'custom' && (
            <div className="text-sm text-gray-600">
              <strong>Selected Range:</strong> {new Date(customDateRange.startDate).toLocaleDateString()} - {new Date(customDateRange.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Monthly Payment Trends</h4>
        <div className="space-y-4">
          {analytics.monthlyTrends.map((month, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{month.month}</div>
                <div className="text-sm text-gray-500">{month.paymentCount} payments</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">{formatCurrency(month.totalAmount)}</div>
                <div className="text-sm text-gray-500">
                  Avg: {formatCurrency(month.paymentCount > 0 ? month.totalAmount / month.paymentCount : 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h4>
        <div className="space-y-4">
          {analytics.methodBreakdown.map((method, index) => (
            <div key={index} className="flex items-center">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{method.method}</span>
                  <span className="text-sm text-gray-500">{method.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getMethodColor(method.method)}`}
                    style={{ width: `${method.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{formatCurrency(method.amount)}</span>
                  <span>{method.count} payments</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Paying Tenants */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Top Paying Tenants</h4>
        <div className="space-y-3">
          {analytics.topTenants.map((tenant, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{tenant.tenantName}</div>
                  <div className="text-sm text-gray-500">{tenant.paymentCount} payments</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">{formatCurrency(tenant.totalPaid)}</div>
                <div className="text-sm text-gray-500">
                  Avg: {formatCurrency(tenant.totalPaid / tenant.paymentCount)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Patterns */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Patterns by Day</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.dailyAverages.map((day, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="font-medium text-gray-900">{day.dayOfWeek}</div>
              <div className="text-sm text-gray-500 mt-1">{day.paymentCount} payments</div>
              <div className="text-lg font-semibold text-blue-600 mt-2">
                {formatCurrency(day.averageAmount)}
              </div>
              <div className="text-xs text-gray-500">Average</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
