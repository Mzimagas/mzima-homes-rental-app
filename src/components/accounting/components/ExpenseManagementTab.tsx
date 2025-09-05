'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
  HomeIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'
import {
  ExpenseManagementService,
  ExpenseAnalytics,
  ExpenseTransaction,
  PropertyExpenseConsolidation,
} from '../../../lib/services/expense-management.service'
import LoadingSpinner from '../../ui/LoadingSpinner'
import ErrorDisplay from '../../ui/ErrorDisplay'

interface ExpenseManagementTabProps {
  className?: string
  onAddExpense?: () => void
  onGenerateReport?: () => void
}

export default function ExpenseManagementTab({
  className = '',
  onAddExpense,
  onGenerateReport,
}: ExpenseManagementTabProps) {
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null)
  const [recentExpenses, setRecentExpenses] = useState<ExpenseTransaction[]>([])
  const [propertyConsolidation, setPropertyConsolidation] = useState<
    PropertyExpenseConsolidation[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  // Load expense data
  const loadExpenseData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [analyticsData, expensesData, consolidationData] = await Promise.allSettled([
        ExpenseManagementService.getExpenseAnalytics(),
        ExpenseManagementService.getExpenseTransactions({ limit: 10 }),
        ExpenseManagementService.getPropertyExpenseConsolidation(),
      ])

      if (analyticsData.status === 'fulfilled') {
        setAnalytics(analyticsData.value)
      }

      if (expensesData.status === 'fulfilled') {
        setRecentExpenses(expensesData.value.data)
      }

      if (consolidationData.status === 'fulfilled') {
        setPropertyConsolidation(consolidationData.value.slice(0, 5)) // Top 5 properties
      }

      // Check for any errors
      const errors = [analyticsData, expensesData, consolidationData]
        .filter((result) => result.status === 'rejected')
        .map((result) => (result as PromiseRejectedResult).reason.message)

      if (errors.length > 0) {
        setError(`Some data could not be loaded: ${errors.join(', ')}`)
      }
    } catch (err) {
      console.error('Error loading expense data:', err)
      setError('Failed to load expense data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExpenseData()
  }, [loadExpenseData])

  const toggleCard = (cardId: string) => {
    setActiveCard(activeCard === cardId ? null : cardId)
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

  if (error && !analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ErrorDisplay
          title="Failed to Load Expense Data"
          message={error}
          onRetry={loadExpenseData}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Intelligent consolidation of property costs and comprehensive business expense tracking
          </p>
        </div>
        <button
          onClick={onAddExpense}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Expenses Card */}
        <div className="bg-white border-2 border-red-200 rounded-xl p-6 hover:border-red-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCardIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {ExpenseManagementService.formatCurrency(analytics?.totalExpenses || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Property Specific Card */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <HomeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Property Specific</p>
              <p className="text-2xl font-bold text-gray-900">
                {ExpenseManagementService.formatCurrency(analytics?.propertySpecificExpenses || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* General Business Card */}
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 hover:border-purple-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">General Business</p>
              <p className="text-2xl font-bold text-gray-900">
                {ExpenseManagementService.formatCurrency(analytics?.generalBusinessExpenses || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-white border-2 border-yellow-200 rounded-xl p-6 hover:border-yellow-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.pendingApprovals || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Expense Consolidation Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Property Expense Consolidation
                </h3>
              </div>
              <button
                onClick={() => toggleCard('consolidation')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'consolidation' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Properties Tracked</span>
                <span className="font-medium text-gray-900">{propertyConsolidation.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Consolidated</span>
                <span className="font-medium text-gray-900">
                  {ExpenseManagementService.formatCurrency(
                    propertyConsolidation.reduce(
                      (sum, prop) => sum + prop.grand_total_expenses_kes,
                      0
                    )
                  )}
                </span>
              </div>
            </div>

            {activeCard === 'consolidation' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Top Properties by Expense</h4>
                  {propertyConsolidation.map((property) => (
                    <div
                      key={property.property_id}
                      className="flex justify-between items-center py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {property.property_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Direct:{' '}
                          {ExpenseManagementService.formatCurrency(property.direct_expenses_kes)} |
                          Allocated:{' '}
                          {ExpenseManagementService.formatCurrency(property.allocated_expenses_kes)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {ExpenseManagementService.formatCurrency(
                            property.grand_total_expenses_kes
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Legacy:{' '}
                          {ExpenseManagementService.formatCurrency(
                            property.acquisition_costs_kes + property.handover_costs_kes
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Expenses Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ChartBarIcon className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
              </div>
              <button
                onClick={() => toggleCard('recent')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'recent' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Recent Transactions</span>
                <span className="font-medium text-gray-900">{recentExpenses.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Shared Allocated</span>
                <span className="font-medium text-purple-600">
                  {ExpenseManagementService.formatCurrency(analytics?.sharedAllocatedExpenses || 0)}
                </span>
              </div>
            </div>

            {activeCard === 'recent' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Latest Transactions</h4>
                  {recentExpenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500">{expense.category_name}</p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ExpenseManagementService.getStatusColor(expense.status)}`}
                          >
                            {expense.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {ExpenseManagementService.formatCurrency(expense.amount_kes)}
                        </p>
                        <p className="text-xs text-gray-500">{expense.transaction_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Category Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.categoryBreakdown.map((category) => (
              <div key={category.category} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">
                    {category.category.replace('_', ' ')}
                  </h4>
                  <span className="text-sm text-gray-500">{category.count} transactions</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">
                    {ExpenseManagementService.formatCurrency(category.amount)}
                  </span>
                  <span className="text-sm font-medium text-blue-600">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
