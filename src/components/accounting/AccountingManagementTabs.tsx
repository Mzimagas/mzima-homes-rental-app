'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import AccountingWorkflowNavigation, { AccountingTab } from './components/AccountingWorkflowNavigation'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'
import { AcquisitionFinancialsService } from '../properties/services/acquisition-financials.service'
import { perf } from '../../lib/performance-monitor'

// Shared currency formatter aligning with properties utils
function formatCurrency(amount: number) {
  if (amount == null || isNaN(amount as any)) return 'KES 0'
  return `KES ${Number(amount).toLocaleString()}`
}

interface PropertyRollup {
  property_id: string
  property_name: string
  acquisitionCosts: number
  purchaseInstallments: number
}

export default function AccountingManagementTabs() {
  const [activeTab, setActiveTab] = useState<AccountingTab>('expenses')

  // Persist active tab for consistency with other tabs
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('acct:activeTab') as AccountingTab | null : null
    if (saved) setActiveTab(saved)
  }, [])
  useEffect(() => {
    try { window.localStorage.setItem('acct:activeTab', activeTab) } catch {}
  }, [activeTab])

  // Reuse property access and aggregate expenses
  const { properties, loading: accessLoading } = usePropertyAccess()
  const [rollups, setRollups] = useState<PropertyRollup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Optimized data loading with proper error handling and timeout
  const loadAccountingData = useCallback(async () => {
    if (accessLoading) return
    if (!properties || properties.length === 0) {
      setRollups([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Load data with timeout and individual error handling using performance monitor
      const results = await perf.measure(
        'accounting-data-load',
        async () => Promise.allSettled(
          properties.map(async (p) => {
            try {
              const { costs, payments } = await perf.withTimeout(
                AcquisitionFinancialsService.loadAllFinancialData(p.property_id),
                5000,
                `property-${p.property_name}-financial-data`
              )

            const acquisitionCosts = (costs || []).reduce((sum: number, c: any) => sum + Number(c.amount_kes || 0), 0)
            const purchaseInstallments = (payments || []).reduce((sum: number, x: any) => sum + Number(x.amount_kes || 0), 0)

            return {
              property_id: p.property_id,
              property_name: p.property_name,
              acquisitionCosts,
              purchaseInstallments,
            }
          } catch (propertyError) {
            console.warn(`Failed to load data for property ${p.property_name}:`, propertyError)
            // Return default values for failed properties
            return {
              property_id: p.property_id,
              property_name: p.property_name,
              acquisitionCosts: 0,
              purchaseInstallments: 0,
            }
          }
        }),
        { propertyCount: properties.length }
      )

      // Extract successful results and handle failures gracefully
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<PropertyRollup> => result.status === 'fulfilled')
        .map(result => result.value)

      setRollups(successfulResults)

      // Log failed requests but don't block the UI
      const failedCount = results.filter(result => result.status === 'rejected').length
      if (failedCount > 0) {
        console.warn(`${failedCount} properties failed to load financial data`)
      }

    } catch (err) {
      console.error('Error loading accounting data:', err)
      setError('Some accounting data could not be loaded. The system is still functional.')
      // Set empty rollups to prevent UI blocking
      setRollups([])
    } finally {
      setLoading(false)
    }
  }, [accessLoading, properties])

  useEffect(() => {
    loadAccountingData()
  }, [loadAccountingData])

  const totals = useMemo(() => ({
    acquisitionCosts: rollups.reduce((s, r) => s + r.acquisitionCosts, 0),
    purchaseInstallments: rollups.reduce((s, r) => s + r.purchaseInstallments, 0)
  }), [rollups])

  // Show loading state
  if (loading && rollups.length === 0) {
    return (
      <div className="space-y-6">
        <AccountingWorkflowNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading accounting data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Workflow cards header - mirrors Properties tab */}
      <AccountingWorkflowNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Error Alert */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
              <p className="text-sm text-yellow-700 mt-1">{error}</p>
              <button
                onClick={loadAccountingData}
                className="text-sm text-yellow-800 underline hover:text-yellow-900 mt-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'income' && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900">Income Tracking</h3>
            <p className="text-sm text-gray-500 mt-1">Rental income integration pending. This section will display rent roll, collections, and aging once wired.</p>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Expense Management</h3>
                  <p className="text-sm text-gray-500 mt-1">Aggregated acquisition costs and purchase price installments across your accessible properties.</p>
                </div>
                {loading && (
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Refreshing...
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-sm text-gray-600">Acquisition Costs (Total)</div>
                  <div className="font-bold">{formatCurrency(totals.acquisitionCosts)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Purchase Installments (Total)</div>
                  <div className="font-bold">{formatCurrency(totals.purchaseInstallments)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">By Property</h4>
              <div className="space-y-2">
                {rollups.map(r => (
                  <div key={r.property_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="text-gray-800">{r.property_name}</div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm text-gray-600">Acquisition: <span className="font-semibold text-gray-900">{formatCurrency(r.acquisitionCosts)}</span></div>
                      <div className="text-sm text-gray-600">Installments: <span className="font-semibold text-gray-900">{formatCurrency(r.purchaseInstallments)}</span></div>
                    </div>
                  </div>
                ))}
                {(!loading && rollups.length === 0) && (
                  <div className="text-sm text-gray-500">No expense records found for your properties.</div>
                )}
                {loading && <div className="text-sm text-gray-500">Loading…</div>}
                {error && <div className="text-sm text-red-600">{error}</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900">Tax Planning</h3>
            <p className="text-sm text-gray-500 mt-1">Configure rates and view taxable income in a later phase.</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
            <p className="text-sm text-gray-500 mt-1">P&L and Cash Flow statements will be available here.</p>
          </div>
        )}
      </div>
    </div>
  )
}

