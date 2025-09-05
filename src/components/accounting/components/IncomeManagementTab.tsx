'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  CurrencyDollarIcon,
  UsersIcon,
  HomeIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import {
  IncomeManagementService,
  IncomeAnalytics,
  IncomeTransaction,
  MemberContribution,
} from '../../../lib/services/income-management.service'
import LoadingSpinner from '../../ui/LoadingSpinner'
import ErrorDisplay from '../../ui/ErrorDisplay'

interface IncomeManagementTabProps {
  className?: string
  onAddIncome?: () => void
  onGenerateReport?: () => void
}

export default function IncomeManagementTab({
  className = '',
  onAddIncome,
  onGenerateReport,
}: IncomeManagementTabProps) {
  const [analytics, setAnalytics] = useState<IncomeAnalytics | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<IncomeTransaction[]>([])
  const [memberContributions, setMemberContributions] = useState<MemberContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  // Load income data
  const loadIncomeData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [analyticsData, transactionsData, contributionsData] = await Promise.allSettled([
        IncomeManagementService.getIncomeAnalytics(),
        IncomeManagementService.getIncomeTransactions({ limit: 10 }),
        IncomeManagementService.getMemberContributions({ limit: 10, status: 'PENDING' }),
      ])

      if (analyticsData.status === 'fulfilled') {
        setAnalytics(analyticsData.value)
      }

      if (transactionsData.status === 'fulfilled') {
        setRecentTransactions(transactionsData.value.data)
      }

      if (contributionsData.status === 'fulfilled') {
        setMemberContributions(contributionsData.value.data)
      }

      // Check for any errors
      const errors = [analyticsData, transactionsData, contributionsData]
        .filter((result) => result.status === 'rejected')
        .map((result) => (result as PromiseRejectedResult).reason.message)

      if (errors.length > 0) {
        setError(`Some data could not be loaded: ${errors.join(', ')}`)
      }
    } catch (err) {
      console.error('Error loading income data:', err)
      setError('Failed to load income data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIncomeData()
  }, [loadIncomeData])

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
          error={{ message: error || 'Unknown error', code: 'LOAD_ERROR' }}
          title="Failed to Load Income Data"
          onRetry={loadIncomeData}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Income Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track rental income, member contributions, property sales, and other revenue streams
          </p>
        </div>
        <button
          onClick={onAddIncome}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Income
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
        {/* Total Income Card */}
        <div className="bg-white border-2 border-green-200 rounded-xl p-6 hover:border-green-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-gray-900">
                {IncomeManagementService.formatCurrency(analytics?.totalIncome || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Recurring Card */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Recurring</p>
              <p className="text-2xl font-bold text-gray-900">
                {IncomeManagementService.formatCurrency(analytics?.monthlyRecurring || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Amount Card */}
        <div className="bg-white border-2 border-yellow-200 rounded-xl p-6 hover:border-yellow-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {IncomeManagementService.formatCurrency(analytics?.pendingAmount || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Overdue Amount Card */}
        <div className="bg-white border-2 border-red-200 rounded-xl p-6 hover:border-red-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">
                {IncomeManagementService.formatCurrency(analytics?.overdueAmount || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rental Income Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <HomeIcon className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Rental Income</h3>
              </div>
              <button
                onClick={() => toggleCard('rental')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'rental' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Monthly Rent Collection</span>
                <span className="font-medium text-gray-900">
                  {IncomeManagementService.formatCurrency(
                    analytics?.categoryBreakdown.find((c) => c.category === 'RENTAL_INCOME')
                      ?.amount || 0
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Collection Rate</span>
                <span className="font-medium text-green-600">95%</span>
              </div>
            </div>

            {activeCard === 'rental' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Recent Rental Payments</h4>
                  {recentTransactions
                    .filter((t) => t.category?.category_name === 'RENTAL_INCOME')
                    .slice(0, 5)
                    .map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.tenant_name || 'Unknown Tenant'}
                          </p>
                          <p className="text-xs text-gray-500">{transaction.property_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {IncomeManagementService.formatCurrency(transaction.amount_kes)}
                          </p>
                          <p className="text-xs text-gray-500">{transaction.transaction_date}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Member Contributions Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <UsersIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Member Contributions</h3>
              </div>
              <button
                onClick={() => toggleCard('contributions')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'contributions' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Monthly Fees Collected</span>
                <span className="font-medium text-gray-900">
                  {IncomeManagementService.formatCurrency(
                    analytics?.memberContributionSummary.monthlyFeeCollected || 0
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Active Contributors</span>
                <span className="font-medium text-blue-600">
                  {analytics?.memberContributionSummary.activeContributors || 0} /{' '}
                  {analytics?.memberContributionSummary.totalMembers || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Outstanding</span>
                <span className="font-medium text-red-600">
                  {IncomeManagementService.formatCurrency(
                    analytics?.memberContributionSummary.monthlyFeeOutstanding || 0
                  )}
                </span>
              </div>
            </div>

            {activeCard === 'contributions' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Pending Contributions</h4>
                  {memberContributions.slice(0, 5).map((contribution) => (
                    <div key={contribution.id} className="flex justify-between items-center py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {contribution.member_name} ({contribution.member_number})
                        </p>
                        <p className="text-xs text-gray-500">
                          {contribution.contribution_type.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {IncomeManagementService.formatCurrency(contribution.amount_kes)}
                        </p>
                        <p className="text-xs text-gray-500">Due: {contribution.due_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
