/**
 * Financial Dashboard Section
 * Comprehensive financial overview with revenue tracking, payment analytics, and expense monitoring
 * Features KES currency formatting, cash flow analysis, and financial performance metrics
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { ResponsiveContainer } from '../../layout/ResponsiveContainer'
import { LoadingSpinner } from '../../ui/loading'
import { ErrorMessage } from '../../ui/error'
import { dashboardAnalyticsService } from '../../../services/DashboardAnalyticsService'

// Financial data interfaces
interface FinancialSummary {
  totalRevenue: number
  monthlyRevenue: number
  collectionRate: number
  outstandingAmount: number
  profitMargin: number
  revenueGrowth: number
  expenseRatio: number
}

interface PaymentAnalytics {
  totalPayments: number
  completedPayments: number
  pendingPayments: number
  overduePayments: number
  averagePaymentTime: number
  paymentMethods: PaymentMethodData[]
}

interface PaymentMethodData {
  method: string
  count: number
  percentage: number
  totalAmount: number
}

interface ExpenseBreakdown {
  category: string
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  monthlyBudget: number
}

interface CashFlowData {
  month: string
  income: number
  expenses: number
  netFlow: number
}

// Component props
export interface FinancialDashboardProps {
  loading?: boolean
  onRefresh?: () => Promise<void>
  className?: string
}

// KES currency formatter
const formatKES = (amount: number, options: { compact?: boolean; showDecimals?: boolean } = {}): string => {
  const { compact = false, showDecimals = false } = options
  
  if (compact) {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `KES ${(amount / 1000).toFixed(1)}K`
    }
  }
  
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount)
}

// Financial summary card component
interface FinancialSummaryCardProps {
  title: string
  value: string | number
  trend?: number
  icon: React.ComponentType<any>
  color: string
  format?: 'currency' | 'percentage' | 'number'
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  color,
  format = 'currency'
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return formatKES(val, { compact: true })
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'number':
        return new Intl.NumberFormat('en-KE').format(val)
      default:
        return val.toString()
    }
  }

  const getTrendColor = (trendValue?: number) => {
    if (!trendValue) return 'text-gray-500'
    return trendValue > 0 ? 'text-green-600' : 'text-red-600'
  }

  const TrendIcon = trend && trend > 0 ? ArrowUpIcon : ArrowDownIcon

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 text-sm ${getTrendColor(trend)}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <div className="text-2xl font-bold text-gray-900">{formatValue(value)}</div>
      </div>
    </div>
  )
}

// Payment methods chart component
interface PaymentMethodsChartProps {
  data: PaymentMethodData[]
}

const PaymentMethodsChart: React.FC<PaymentMethodsChartProps> = ({ data }) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500']

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
      
      <div className="space-y-4">
        {data.map((method, index) => (
          <div key={method.method} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`} />
              <div>
                <div className="font-medium text-gray-900">{method.method}</div>
                <div className="text-sm text-gray-600">{method.count} transactions</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">{formatKES(method.totalAmount, { compact: true })}</div>
              <div className="text-sm text-gray-600">{method.percentage.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Expense breakdown component
interface ExpenseBreakdownProps {
  data: ExpenseBreakdown[]
}

const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({ data }) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUpIcon className="w-4 h-4 text-red-500" />
      case 'down': return <TrendingDownIcon className="w-4 h-4 text-green-500" />
      default: return <div className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
      
      <div className="space-y-4">
        {data.map((expense) => (
          <div key={expense.category} className="border-b border-gray-100 pb-3 last:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{expense.category}</span>
                {getTrendIcon(expense.trend)}
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">{formatKES(expense.amount, { compact: true })}</div>
                <div className="text-sm text-gray-600">{expense.percentage.toFixed(1)}%</div>
              </div>
            </div>
            
            {/* Budget vs actual */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Budget: {formatKES(expense.monthlyBudget, { compact: true })}</span>
              <span className={`font-medium ${
                expense.amount > expense.monthlyBudget ? 'text-red-600' : 'text-green-600'
              }`}>
                {expense.amount > expense.monthlyBudget ? 'Over' : 'Under'} budget
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Cash flow chart component (simplified)
interface CashFlowChartProps {
  data: CashFlowData[]
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => Math.max(d.income, Math.abs(d.expenses))))
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow (6 Months)</h3>
      
      <div className="relative h-64">
        {/* Chart bars */}
        <div className="flex items-end justify-between h-full space-x-2">
          {data.map((item, index) => {
            const incomeHeight = (item.income / maxValue) * 100
            const expenseHeight = (Math.abs(item.expenses) / maxValue) * 100
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                {/* Income bar */}
                <div className="w-full flex justify-center mb-1">
                  <div 
                    className="bg-green-500 rounded-t w-3/4"
                    style={{ height: `${incomeHeight}%` }}
                    title={`Income: ${formatKES(item.income, { compact: true })}`}
                  />
                </div>
                
                {/* Expense bar */}
                <div className="w-full flex justify-center">
                  <div 
                    className="bg-red-500 rounded-b w-3/4"
                    style={{ height: `${expenseHeight}%` }}
                    title={`Expenses: ${formatKES(Math.abs(item.expenses), { compact: true })}`}
                  />
                </div>
                
                {/* Month label */}
                <div className="text-xs text-gray-600 mt-2 transform -rotate-45">
                  {item.month}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Legend */}
        <div className="absolute top-0 right-0 flex space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Income</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Expenses</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Outstanding payments component
interface OutstandingPaymentsProps {
  data: {
    totalOutstanding: number
    overdueCount: number
    averageDaysOverdue: number
    topOverdueProperties: Array<{
      propertyName: string
      amount: number
      daysOverdue: number
    }>
  }
}

const OutstandingPayments: React.FC<OutstandingPaymentsProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Outstanding Payments</h3>
        <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{formatKES(data.totalOutstanding, { compact: true })}</div>
          <div className="text-sm text-gray-600">Total Outstanding</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{data.overdueCount}</div>
          <div className="text-sm text-gray-600">Overdue Payments</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{data.averageDaysOverdue}</div>
          <div className="text-sm text-gray-600">Avg Days Overdue</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Top Overdue Properties</h4>
        {data.topOverdueProperties.map((property, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div>
              <div className="font-medium text-gray-900">{property.propertyName}</div>
              <div className="text-sm text-gray-600">{property.daysOverdue} days overdue</div>
            </div>
            <div className="font-medium text-red-600">
              {formatKES(property.amount, { compact: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Main Financial Dashboard Component
 */
export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  loading = false,
  onRefresh,
  className = ''
}) => {
  const [financialData, setFinancialData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month')

  // Load financial data
  React.useEffect(() => {
    const loadFinancialData = async () => {
      try {
        setDataLoading(true)
        setError(null)
        
        const data = await dashboardAnalyticsService.getFinancialAnalytics()
        setFinancialData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load financial data')
      } finally {
        setDataLoading(false)
      }
    }

    loadFinancialData()
  }, [selectedPeriod])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh()
    }
    
    try {
      setError(null)
      const data = await dashboardAnalyticsService.getFinancialAnalytics()
      setFinancialData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh financial data')
    }
  }, [onRefresh])

  // Mock data for demonstration
  const mockData = useMemo(() => ({
    summary: {
      totalRevenue: 2450000,
      monthlyRevenue: 2450000,
      collectionRate: 94.5,
      outstandingAmount: 135000,
      profitMargin: 68.2,
      revenueGrowth: 12.5,
      expenseRatio: 31.8
    },
    paymentMethods: [
      { method: 'Bank Transfer', count: 45, percentage: 65, totalAmount: 1592500 },
      { method: 'M-Pesa', count: 18, percentage: 26, totalAmount: 637000 },
      { method: 'Cash', count: 4, percentage: 6, totalAmount: 147000 },
      { method: 'Cheque', count: 2, percentage: 3, totalAmount: 73500 }
    ],
    expenses: [
      { category: 'Maintenance', amount: 245000, percentage: 40, trend: 'up' as const, monthlyBudget: 200000 },
      { category: 'Property Management', amount: 183750, percentage: 30, trend: 'stable' as const, monthlyBudget: 180000 },
      { category: 'Insurance', amount: 91875, percentage: 15, trend: 'stable' as const, monthlyBudget: 95000 },
      { category: 'Utilities', amount: 61250, percentage: 10, trend: 'down' as const, monthlyBudget: 70000 },
      { category: 'Other', amount: 30625, percentage: 5, trend: 'stable' as const, monthlyBudget: 35000 }
    ],
    cashFlow: [
      { month: 'Jul', income: 2200000, expenses: -680000, netFlow: 1520000 },
      { month: 'Aug', income: 2350000, expenses: -720000, netFlow: 1630000 },
      { month: 'Sep', income: 2180000, expenses: -650000, netFlow: 1530000 },
      { month: 'Oct', income: 2420000, expenses: -780000, netFlow: 1640000 },
      { month: 'Nov', income: 2380000, expenses: -740000, netFlow: 1640000 },
      { month: 'Dec', income: 2450000, expenses: -612500, netFlow: 1837500 }
    ],
    outstanding: {
      totalOutstanding: 135000,
      overdueCount: 8,
      averageDaysOverdue: 12,
      topOverdueProperties: [
        { propertyName: 'Kilimani Heights', amount: 45000, daysOverdue: 25 },
        { propertyName: 'Eastlands Plaza', amount: 32000, daysOverdue: 18 },
        { propertyName: 'Ngong Road Apartments', amount: 28000, daysOverdue: 15 }
      ]
    }
  }), [])

  const isLoading = loading || dataLoading

  if (error) {
    return (
      <ResponsiveContainer className={className}>
        <ErrorMessage
          title="Financial Dashboard Error"
          message={error}
          onRetry={handleRefresh}
        />
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer className={`financial-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
          <p className="text-gray-600">Revenue tracking and financial performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Period selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'month', label: 'Month' },
              { key: 'quarter', label: 'Quarter' },
              { key: 'year', label: 'Year' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedPeriod(key as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : <CurrencyDollarIcon className="w-4 h-4" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <FinancialSummaryCard
              title="Total Revenue"
              value={mockData.summary.totalRevenue}
              trend={mockData.summary.revenueGrowth}
              icon={CurrencyDollarIcon}
              color="bg-green-500"
              format="currency"
            />
            <FinancialSummaryCard
              title="Collection Rate"
              value={mockData.summary.collectionRate}
              trend={2.3}
              icon={TrendingUpIcon}
              color="bg-blue-500"
              format="percentage"
            />
            <FinancialSummaryCard
              title="Outstanding Amount"
              value={mockData.summary.outstandingAmount}
              trend={-15.7}
              icon={ExclamationTriangleIcon}
              color="bg-red-500"
              format="currency"
            />
            <FinancialSummaryCard
              title="Profit Margin"
              value={mockData.summary.profitMargin}
              trend={5.2}
              icon={ChartPieIcon}
              color="bg-purple-500"
              format="percentage"
            />
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <CashFlowChart data={mockData.cashFlow} />
            <PaymentMethodsChart data={mockData.paymentMethods} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseBreakdown data={mockData.expenses} />
            <OutstandingPayments data={mockData.outstanding} />
          </div>
        </>
      )}
    </ResponsiveContainer>
  )
}

export default FinancialDashboard
