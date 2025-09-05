'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  UsersIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import {
  FinancialReportingService,
  ProfitLossStatement,
  CashFlowStatement,
  PortfolioPerformance,
  MemberContributionReport,
} from '../../../lib/services/financial-reporting.service'
import LoadingSpinner from '../../ui/LoadingSpinner'
import ErrorDisplay from '../../ui/ErrorDisplay'

interface FinancialReportsTabProps {
  className?: string
  onGenerateReport?: () => void
}

export default function FinancialReportsTab({
  className = '',
  onGenerateReport,
}: FinancialReportsTabProps) {
  const [profitLoss, setProfitLoss] = useState<ProfitLossStatement | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null)
  const [portfolioPerformance, setPortfolioPerformance] = useState<PortfolioPerformance | null>(
    null
  )
  const [memberReport, setMemberReport] = useState<MemberContributionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month')

  // Calculate date ranges based on selected period
  const getDateRange = useCallback(() => {
    const now = new Date()
    let startDate: string
    let endDate: string

    switch (selectedPeriod) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        break
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
        break
      case 'current_quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStart, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0).toISOString().split('T')[0]
        break
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    }

    return { startDate, endDate }
  }, [selectedPeriod])

  // Load financial reports data
  const loadReportsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { startDate, endDate } = getDateRange()

      const [plResult, cfResult, ppResult, mrResult] = await Promise.allSettled([
        FinancialReportingService.generateProfitLossStatement(startDate, endDate),
        FinancialReportingService.generateCashFlowStatement(startDate, endDate),
        FinancialReportingService.generatePortfolioPerformance(startDate, endDate),
        FinancialReportingService.generateMemberContributionReport(startDate, endDate),
      ])

      if (plResult.status === 'fulfilled') {
        setProfitLoss(plResult.value)
      }

      if (cfResult.status === 'fulfilled') {
        setCashFlow(cfResult.value)
      }

      if (ppResult.status === 'fulfilled') {
        setPortfolioPerformance(ppResult.value)
      }

      if (mrResult.status === 'fulfilled') {
        setMemberReport(mrResult.value)
      }

      // Check for any errors
      const errors = [plResult, cfResult, ppResult, mrResult]
        .filter((result) => result.status === 'rejected')
        .map((result) => (result as PromiseRejectedResult).reason.message)

      if (errors.length > 0) {
        setError(`Some reports could not be generated: ${errors.join(', ')}`)
      }
    } catch (err) {
      console.error('Error loading financial reports:', err)
      setError('Failed to load financial reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => {
    loadReportsData()
  }, [loadReportsData])

  const toggleCard = (cardId: string) => {
    setActiveCard(activeCard === cardId ? null : cardId)
  }

  const formatCurrency = (amount: number) => FinancialReportingService.formatCurrency(amount)
  const formatPercentage = (value: number) => FinancialReportingService.formatPercentage(value)

  const getChangeIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />
      case 'down':
        return <ArrowDownIcon className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getChangeColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error && !profitLoss) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ErrorDisplay
          title="Failed to Load Financial Reports"
          message={error}
          onRetry={loadReportsData}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
          <p className="text-sm text-gray-500 mt-1">
            Comprehensive financial analytics, P&L statements, and portfolio performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="current_month">Current Month</option>
            <option value="last_month">Last Month</option>
            <option value="current_quarter">Current Quarter</option>
            <option value="current_year">Current Year</option>
          </select>

          <button
            onClick={onGenerateReport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Income Card */}
        <div className="bg-white border-2 border-green-200 rounded-xl p-6 hover:border-green-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Net Income</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(profitLoss?.net_income || 0)}
              </p>
              {profitLoss?.comparisons?.previous_period && (
                <div className="flex items-center mt-1">
                  {getChangeIcon(
                    profitLoss.comparisons.previous_period.net_income_change > 0
                      ? 'up'
                      : profitLoss.comparisons.previous_period.net_income_change < 0
                        ? 'down'
                        : 'neutral'
                  )}
                  <span
                    className={`text-xs ml-1 ${getChangeColor(
                      profitLoss.comparisons.previous_period.net_income_change > 0
                        ? 'up'
                        : profitLoss.comparisons.previous_period.net_income_change < 0
                          ? 'down'
                          : 'neutral'
                    )}`}
                  >
                    {formatCurrency(
                      Math.abs(profitLoss.comparisons.previous_period.net_income_change)
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Total Revenue Card */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(profitLoss?.income.total_income || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Margin: {formatPercentage(profitLoss?.margins.net_margin || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white border-2 border-red-200 rounded-xl p-6 hover:border-red-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(profitLoss?.expenses.total_expenses || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {profitLoss && profitLoss.income.total_income > 0
                  ? formatPercentage(
                      (profitLoss.expenses.total_expenses / profitLoss.income.total_income) * 100
                    )
                  : '0%'}{' '}
                of revenue
              </p>
            </div>
          </div>
        </div>

        {/* Portfolio ROI Card */}
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 hover:border-purple-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Portfolio ROI</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(portfolioPerformance?.overview.average_roi || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {portfolioPerformance?.overview.total_properties || 0} properties
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit & Loss Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <DocumentTextIcon className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Profit & Loss Statement</h3>
              </div>
              <button
                onClick={() => toggleCard('profit_loss')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'profit_loss' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Gross Revenue</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(profitLoss?.income.total_income || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Expenses</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(profitLoss?.expenses.total_expenses || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-900">Net Income</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(profitLoss?.net_income || 0)}
                </span>
              </div>
            </div>

            {activeCard === 'profit_loss' && profitLoss && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Income Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rental Income</span>
                        <span className="font-medium">
                          {formatCurrency(profitLoss.income.rental_income)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Member Contributions</span>
                        <span className="font-medium">
                          {formatCurrency(profitLoss.income.member_contributions)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Property Sales</span>
                        <span className="font-medium">
                          {formatCurrency(profitLoss.income.property_sales)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Commission Income</span>
                        <span className="font-medium">
                          {formatCurrency(profitLoss.income.commission_income)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Expense Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Property Expenses</span>
                        <span className="font-medium">
                          {formatCurrency(profitLoss.expenses.property_expenses)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Business Expenses</span>
                        <span className="font-medium">
                          {formatCurrency(profitLoss.expenses.business_expenses)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Allocated Expenses</span>
                        <span className="font-medium">
                          {formatCurrency(profitLoss.expenses.allocated_expenses)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cash Flow Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Cash Flow Statement</h3>
              </div>
              <button
                onClick={() => toggleCard('cash_flow')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'cash_flow' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Operating Cash Flow</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(cashFlow?.operating_activities.net_operating_cash_flow || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Investing Cash Flow</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(cashFlow?.investing_activities.net_investing_cash_flow || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-900">Net Cash Flow</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(cashFlow?.net_cash_flow || 0)}
                </span>
              </div>
            </div>

            {activeCard === 'cash_flow' && cashFlow && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Operating Activities</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cash Inflows</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(cashFlow.operating_activities.operating_inflows)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cash Outflows</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(
                            Math.abs(cashFlow.operating_activities.operating_outflows)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Investing Activities</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Property Sales</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(cashFlow.investing_activities.investing_inflows)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Property Acquisitions</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(
                            Math.abs(cashFlow.investing_activities.investing_outflows)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
