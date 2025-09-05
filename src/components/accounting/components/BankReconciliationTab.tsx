'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BanknotesIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LinkIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  BankReconciliationService,
  ReconciliationAnalytics,
  BankTransaction,
  UnmatchedTransaction,
  BankAccount,
} from '../../../lib/services/bank-reconciliation.service'
import LoadingSpinner from '../../ui/LoadingSpinner'
import ErrorDisplay from '../../ui/ErrorDisplay'

interface BankReconciliationTabProps {
  className?: string
  onAutoMatch?: () => void
  onImportStatement?: () => void
}

export default function BankReconciliationTab({
  className = '',
  onAutoMatch,
  onImportStatement,
}: BankReconciliationTabProps) {
  const [analytics, setAnalytics] = useState<ReconciliationAnalytics[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [recentTransactions, setRecentTransactions] = useState<BankTransaction[]>([])
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<UnmatchedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [autoMatching, setAutoMatching] = useState(false)

  // Load reconciliation data
  const loadReconciliationData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [analyticsResult, accountsResult, transactionsResult, unmatchedResult] =
        await Promise.allSettled([
          BankReconciliationService.getReconciliationAnalytics(),
          BankReconciliationService.getBankAccounts({ isActive: true }),
          BankReconciliationService.getBankTransactions({ limit: 10 }),
          BankReconciliationService.getUnmatchedTransactions({ limit: 10 }),
        ])

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value)
      }

      if (accountsResult.status === 'fulfilled') {
        setBankAccounts(accountsResult.value)
      }

      if (transactionsResult.status === 'fulfilled') {
        setRecentTransactions(transactionsResult.value.data)
      }

      if (unmatchedResult.status === 'fulfilled') {
        setUnmatchedTransactions(unmatchedResult.value)
      }

      // Check for any errors
      const errors = [analyticsResult, accountsResult, transactionsResult, unmatchedResult]
        .filter((result) => result.status === 'rejected')
        .map((result) => (result as PromiseRejectedResult).reason.message)

      if (errors.length > 0) {
        setError(`Some reconciliation data could not be loaded: ${errors.join(', ')}`)
      }
    } catch (err) {
      console.error('Error loading reconciliation data:', err)
      setError('Failed to load reconciliation data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReconciliationData()
  }, [loadReconciliationData])

  const toggleCard = (cardId: string) => {
    setActiveCard(activeCard === cardId ? null : cardId)
  }

  const handleAutoMatch = async () => {
    try {
      setAutoMatching(true)
      const accountId = selectedAccount === 'all' ? undefined : selectedAccount
      const result = await BankReconciliationService.autoMatchTransactions(accountId)

      // Refresh data after auto-matching
      await loadReconciliationData()

      // Show success message (you might want to use a toast notification)
      console.log(
        `Auto-matching completed: ${result.matched} matched, ${result.potential_matches} potential matches`
      )
    } catch (error) {
      console.error('Error during auto-matching:', error)
      setError('Failed to auto-match transactions. Please try again.')
    } finally {
      setAutoMatching(false)
    }
  }

  const formatCurrency = (amount: number) => BankReconciliationService.formatCurrency(amount)
  const getStatusColor = (status: string) => BankReconciliationService.getStatusColor(status)

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error && analytics.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ErrorDisplay
          title="Failed to Load Reconciliation Data"
          message={error}
          onRetry={loadReconciliationData}
        />
      </div>
    )
  }

  // Calculate summary statistics
  const totalUnmatched = analytics.reduce((sum, acc) => sum + (acc.unmatched_transactions || 0), 0)
  const totalVariance = analytics.reduce((sum, acc) => sum + (acc.total_variance_kes || 0), 0)
  const totalExceptions = analytics.reduce((sum, acc) => sum + (acc.open_exceptions || 0), 0)
  const matchingRate =
    analytics.length > 0
      ? (analytics.reduce((sum, acc) => {
          const total = acc.total_transactions || 0
          const matched = acc.matched_transactions || 0
          return sum + (total > 0 ? matched / total : 0)
        }, 0) /
          analytics.length) *
        100
      : 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h2>
          <p className="text-sm text-gray-500 mt-1">
            Bank and M-PESA reconciliation with automated matching and statement import
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Accounts</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name} ({account.bank_name})
              </option>
            ))}
          </select>

          <button
            onClick={onAutoMatch}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Auto Match
          </button>

          <button
            onClick={onImportStatement}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Import Statement
          </button>
        </div>
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

      {/* Reconciliation Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Unmatched Transactions Card */}
        <div className="bg-white border-2 border-yellow-200 rounded-xl p-6 hover:border-yellow-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unmatched Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{totalUnmatched}</p>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </div>
          </div>
        </div>

        {/* Matching Rate Card */}
        <div className="bg-white border-2 border-green-200 rounded-xl p-6 hover:border-green-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Matching Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {(isNaN(matchingRate) ? 0 : matchingRate).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Auto + Manual matches</p>
            </div>
          </div>
        </div>

        {/* Total Variance Card */}
        <div className="bg-white border-2 border-red-200 rounded-xl p-6 hover:border-red-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Variance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Math.abs(isNaN(totalVariance) ? 0 : totalVariance))}
              </p>
              <p className="text-xs text-gray-500 mt-1">Reconciliation differences</p>
            </div>
          </div>
        </div>

        {/* Open Exceptions Card */}
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 hover:border-purple-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MagnifyingGlassIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Open Exceptions</p>
              <p className="text-2xl font-bold text-gray-900">{totalExceptions}</p>
              <p className="text-xs text-gray-500 mt-1">Need investigation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Accounts Overview Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BanknotesIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Bank Accounts</h3>
              </div>
              <button
                onClick={() => toggleCard('accounts')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'accounts' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              {analytics.slice(0, 3).map((account) => (
                <div key={account.bank_account_id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.account_name}</p>
                    <p className="text-xs text-gray-500">{account.bank_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(account.current_balance_kes)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {account.unmatched_transactions} unmatched
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {activeCard === 'accounts' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Account Statistics</h4>
                  {analytics.map((account) => (
                    <div key={account.bank_account_id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium text-gray-900">{account.account_name}</h5>
                        <span className="text-sm text-gray-500">{account.bank_name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Transactions:</span>
                          <span className="font-medium ml-2">{account.total_transactions}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Matched:</span>
                          <span className="font-medium ml-2 text-green-600">
                            {account.matched_transactions}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Unmatched:</span>
                          <span className="font-medium ml-2 text-yellow-600">
                            {account.unmatched_transactions}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Disputed:</span>
                          <span className="font-medium ml-2 text-red-600">
                            {account.disputed_transactions}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Unmatched Transactions Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ClockIcon className="h-6 w-6 text-yellow-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Unmatched Transactions</h3>
              </div>
              <button
                onClick={() => toggleCard('unmatched')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'unmatched' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              {unmatchedTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.description.substring(0, 30)}...
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.transaction_date} • {transaction.account_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amount_kes)}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        transaction.potential_match_type === 'NO_OBVIOUS_MATCH'
                          ? 'text-red-600 bg-red-100'
                          : 'text-yellow-600 bg-yellow-100'
                      }`}
                    >
                      {transaction.days_unmatched}d old
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {activeCard === 'unmatched' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">All Unmatched Transactions</h4>
                  {unmatchedTransactions.map((transaction) => (
                    <div key={transaction.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {transaction.transaction_ref} • {transaction.channel}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.transaction_date} • {transaction.account_name}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(transaction.amount_kes)}
                          </p>
                          <p className="text-xs text-gray-500">{transaction.transaction_type}</p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              transaction.potential_match_type === 'NO_OBVIOUS_MATCH'
                                ? 'text-red-600 bg-red-100'
                                : 'text-yellow-600 bg-yellow-100'
                            }`}
                          >
                            {transaction.potential_match_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.transaction_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.transaction_ref}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{transaction.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={
                          transaction.transaction_type === 'DEBIT'
                            ? 'text-red-600'
                            : 'text-green-600'
                        }
                      >
                        {transaction.transaction_type === 'DEBIT' ? '-' : '+'}
                        {formatCurrency(transaction.amount_kes)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.bank_account?.account_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
