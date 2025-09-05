'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { BankReconciliationService } from '../../../lib/services/bank-reconciliation.service'

interface AutoMatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface BankAccount {
  id: string
  account_name: string
  bank_name: string
}

interface MatchResult {
  transaction_id: string
  matched_entity_type: string
  matched_entity_id: string
  confidence: number
  match_reason: string
}

export default function AutoMatchModal({ isOpen, onClose, onSuccess }: AutoMatchModalProps) {
  const [loading, setLoading] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [matchingRules, setMatchingRules] = useState({
    amountTolerance: 0.01,
    dateTolerance: 3,
    descriptionSimilarity: 0.8,
    autoApproveHighConfidence: true,
    minimumConfidence: 0.7,
  })
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [isMatching, setIsMatching] = useState(false)
  const [matchingComplete, setMatchingComplete] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadBankAccounts()
    }
  }, [isOpen])

  const loadBankAccounts = async () => {
    try {
      const accounts = await BankReconciliationService.getBankAccounts()
      setBankAccounts(accounts)
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0].id)
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error)
    }
  }

  const handleAutoMatch = async () => {
    if (!selectedAccount) {
      alert('Please select a bank account')
      return
    }

    setIsMatching(true)
    setLoading(true)

    try {
      // Simulate auto-matching process
      const results = await performAutoMatching(selectedAccount, matchingRules)
      setMatchResults(results)
      setMatchingComplete(true)
    } catch (error) {
      console.error('Error performing auto-match:', error)
      alert('Failed to perform auto-matching. Please try again.')
    } finally {
      setIsMatching(false)
      setLoading(false)
    }
  }

  const performAutoMatching = async (accountId: string, rules: any): Promise<MatchResult[]> => {
    // This is a simplified auto-matching simulation
    // In a real implementation, this would:
    // 1. Get unmatched transactions for the account
    // 2. Get potential matches from income/expense transactions
    // 3. Apply matching algorithms based on amount, date, description
    // 4. Return confidence scores and match suggestions

    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults: MatchResult[] = [
          {
            transaction_id: '1',
            matched_entity_type: 'INCOME_TRANSACTION',
            matched_entity_id: 'inc_001',
            confidence: 0.95,
            match_reason: 'Exact amount and date match',
          },
          {
            transaction_id: '2',
            matched_entity_type: 'EXPENSE_TRANSACTION',
            matched_entity_id: 'exp_001',
            confidence: 0.87,
            match_reason: 'Amount match with 1-day date difference',
          },
          {
            transaction_id: '3',
            matched_entity_type: 'INCOME_TRANSACTION',
            matched_entity_id: 'inc_002',
            confidence: 0.72,
            match_reason: 'Similar amount and description keywords',
          },
        ]
        resolve(mockResults)
      }, 3000) // Simulate processing time
    })
  }

  const applyMatches = async () => {
    setLoading(true)
    try {
      // Apply the matches
      for (const result of matchResults) {
        if (result.confidence >= matchingRules.minimumConfidence) {
          // In a real implementation, this would update the database
          console.log('Applying match:', result)
        }
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error applying matches:', error)
      alert('Failed to apply matches. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetMatching = () => {
    setMatchResults([])
    setMatchingComplete(false)
    setIsMatching(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <MagnifyingGlassIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Auto Match Transactions</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!matchingComplete ? (
            <>
              {/* Bank Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account *
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Matching Rules */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Matching Rules</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount Tolerance (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={matchingRules.amountTolerance}
                      onChange={(e) =>
                        setMatchingRules((prev) => ({
                          ...prev,
                          amountTolerance: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Tolerance (days)
                    </label>
                    <input
                      type="number"
                      value={matchingRules.dateTolerance}
                      onChange={(e) =>
                        setMatchingRules((prev) => ({
                          ...prev,
                          dateTolerance: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description Similarity (0-1)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={matchingRules.descriptionSimilarity}
                      onChange={(e) =>
                        setMatchingRules((prev) => ({
                          ...prev,
                          descriptionSimilarity: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Confidence (0-1)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={matchingRules.minimumConfidence}
                      onChange={(e) =>
                        setMatchingRules((prev) => ({
                          ...prev,
                          minimumConfidence: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={matchingRules.autoApproveHighConfidence}
                      onChange={(e) =>
                        setMatchingRules((prev) => ({
                          ...prev,
                          autoApproveHighConfidence: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    Auto-approve high confidence matches (≥90%)
                  </label>
                </div>
              </div>

              {/* Matching Progress */}
              {isMatching && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <div>
                      <h4 className="font-medium text-blue-900">Processing Auto-Match</h4>
                      <p className="text-sm text-blue-700">
                        Analyzing transactions and finding matches...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Match Results */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Match Results</h3>
                <button
                  onClick={resetMatching}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Run Again
                </button>
              </div>

              {matchResults.length > 0 ? (
                <div className="space-y-3">
                  {matchResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckCircleIcon
                            className={`h-5 w-5 mr-2 ${
                              result.confidence >= 0.9
                                ? 'text-green-500'
                                : result.confidence >= 0.7
                                  ? 'text-yellow-500'
                                  : 'text-red-500'
                            }`}
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              Transaction {result.transaction_id}
                            </p>
                            <p className="text-sm text-gray-600">{result.match_reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              result.confidence >= 0.9
                                ? 'bg-green-100 text-green-800'
                                : result.confidence >= 0.7
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {(result.confidence * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No matches found with the current criteria.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            {!matchingComplete ? (
              <button
                onClick={handleAutoMatch}
                disabled={loading || !selectedAccount}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                {isMatching ? 'Matching...' : 'Start Auto-Match'}
              </button>
            ) : (
              <button
                onClick={applyMatches}
                disabled={loading || matchResults.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading
                  ? 'Applying...'
                  : `Apply ${matchResults.filter((r) => r.confidence >= matchingRules.minimumConfidence).length} Matches`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
