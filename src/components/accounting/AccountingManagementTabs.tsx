'use client'

import { useEffect, useMemo, useState } from 'react'
import AccountingWorkflowNavigation, { AccountingTab } from './components/AccountingWorkflowNavigation'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'
import { AcquisitionFinancialsService } from '../properties/services/acquisition-financials.service'

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

  useEffect(() => {
    async function load() {
      if (accessLoading) return
      if (!properties || properties.length === 0) { setRollups([]); return }
      setLoading(true)
      setError(null)
      try {
        const results: PropertyRollup[] = await Promise.all(
          properties.map(async (p) => {
            const { costs, payments } = await AcquisitionFinancialsService.loadAllFinancialData(p.property_id)
            const acquisitionCosts = (costs || []).reduce((sum: number, c: any) => sum + Number(c.amount_kes || 0), 0)
            const purchaseInstallments = (payments || []).reduce((sum: number, x: any) => sum + Number(x.amount_kes || 0), 0)
            return { property_id: p.property_id, property_name: p.property_name, acquisitionCosts, purchaseInstallments }
          })
        )
        setRollups(results)
      } catch (e: any) {
        console.error('Failed to load accounting rollups', e)
        setError(e?.message || 'Failed to load accounting data')
      } finally { setLoading(false) }
    }
    load()
  }, [properties, accessLoading])

  const totals = useMemo(() => ({
    acquisitionCosts: rollups.reduce((s, r) => s + r.acquisitionCosts, 0),
    purchaseInstallments: rollups.reduce((s, r) => s + r.purchaseInstallments, 0)
  }), [rollups])

  return (
    <div className="space-y-6">
      {/* Workflow cards header - mirrors Properties tab */}
      <AccountingWorkflowNavigation activeTab={activeTab} onTabChange={setActiveTab} />

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
              <h3 className="text-lg font-semibold text-gray-900">Expense Management</h3>
              <p className="text-sm text-gray-500 mt-1">Aggregated acquisition costs and purchase price installments across your accessible properties.</p>
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

