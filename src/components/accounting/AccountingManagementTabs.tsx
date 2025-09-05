'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import AccountingWorkflowNavigation, {
  AccountingTab,
} from './components/AccountingWorkflowNavigation'
import IncomeManagementTab from './components/IncomeManagementTab'
import ExpenseManagementTab from './components/ExpenseManagementTab'
import FinancialReportsTab from './components/FinancialReportsTab'
import TaxManagementTab from './components/TaxManagementTab'
import BankReconciliationTab from './components/BankReconciliationTab'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'
import { AcquisitionFinancialsService } from '../properties/services/acquisition-financials.service'
import { perf } from '../../lib/performance-monitor'

// Import all modals
import AddIncomeModal from './modals/AddIncomeModal'
import AddExpenseModal from './modals/AddExpenseModal'
import AddTaxRecordModal from './modals/AddTaxRecordModal'
import GenerateReportModal from './modals/GenerateReportModal'
import AutoMatchModal from './modals/AutoMatchModal'
import ImportStatementModal from './modals/ImportStatementModal'

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

  // Modal states
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false)
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [showAddTaxRecordModal, setShowAddTaxRecordModal] = useState(false)
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false)
  const [showAutoMatchModal, setShowAutoMatchModal] = useState(false)
  const [showImportStatementModal, setShowImportStatementModal] = useState(false)

  // Persist active tab for consistency with other tabs
  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem('acct:activeTab') as AccountingTab | null)
        : null
    if (saved) setActiveTab(saved)
  }, [])
  useEffect(() => {
    try {
      window.localStorage.setItem('acct:activeTab', activeTab)
    } catch {}
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
      // Financial APIs are now implemented and working
      console.log('📊 Accounting: Loading financial data from APIs')

      // Load real financial data
      const results = await perf.measure(
        'accounting-data-load',
        async () =>
          Promise.allSettled(
            properties.map(async (p) => {
              try {
                const { costs, payments } = await perf.withTimeout(
                  AcquisitionFinancialsService.loadAllFinancialData(p.property_id),
                  5000,
                  `property-${p.property_name}-financial-data`
                )

                const acquisitionCosts = (costs || []).reduce(
                  (sum: number, c: any) => sum + Number(c.amount_kes || 0),
                  0
                )
                const purchaseInstallments = (payments || []).reduce(
                  (sum: number, x: any) => sum + Number(x.amount_kes || 0),
                  0
                )

                return {
                  property_id: p.property_id,
                  property_name: p.property_name,
                  acquisitionCosts,
                  purchaseInstallments,
                }
              } catch (propertyError) {
                // Return default values for failed properties
                return {
                  property_id: p.property_id,
                  property_name: p.property_name,
                  acquisitionCosts: 0,
                  purchaseInstallments: 0,
                }
              }
            })
          ),
        { propertyCount: properties.length }
      )

      // Extract successful results and handle failures gracefully
      const successfulResults = results
        .filter(
          (result): result is PromiseFulfilledResult<PropertyRollup> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value)

      setRollups(successfulResults)

      // Log failed requests but don't block the UI
      const failedCount = results.filter((result) => result.status === 'rejected').length
      if (failedCount > 0) {
        console.warn(`📊 Accounting: ${failedCount} properties failed to load financial data`)
      }
    } catch (err) {
      console.warn('Accounting data loading error:', err)
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

  const totals = useMemo(
    () => ({
      acquisitionCosts: rollups.reduce((s, r) => s + r.acquisitionCosts, 0),
      purchaseInstallments: rollups.reduce((s, r) => s + r.purchaseInstallments, 0),
    }),
    [rollups]
  )

  // Modal handlers
  const handleModalSuccess = useCallback(() => {
    // Refresh data when modals complete successfully
    loadAccountingData()
  }, [loadAccountingData])

  const openAddIncomeModal = () => setShowAddIncomeModal(true)
  const openAddExpenseModal = () => setShowAddExpenseModal(true)
  const openAddTaxRecordModal = () => setShowAddTaxRecordModal(true)
  const openGenerateReportModal = () => setShowGenerateReportModal(true)
  const openAutoMatchModal = () => setShowAutoMatchModal(true)
  const openImportStatementModal = () => setShowImportStatementModal(true)

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
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
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
          <IncomeManagementTab
            onAddIncome={openAddIncomeModal}
            onGenerateReport={openGenerateReportModal}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseManagementTab
            onAddExpense={openAddExpenseModal}
            onGenerateReport={openGenerateReportModal}
          />
        )}

        {activeTab === 'reports' && (
          <FinancialReportsTab onGenerateReport={openGenerateReportModal} />
        )}

        {activeTab === 'tax' && (
          <TaxManagementTab
            onAddTaxRecord={openAddTaxRecordModal}
            onGenerateReport={openGenerateReportModal}
          />
        )}

        {activeTab === 'reconciliation' && (
          <BankReconciliationTab
            onAutoMatch={openAutoMatchModal}
            onImportStatement={openImportStatementModal}
          />
        )}

        {activeTab === 'invoicing' && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900">Invoicing & Receipts</h3>
            <p className="text-sm text-gray-500 mt-1">
              Professional invoicing system coming soon. This will include automated invoice
              generation, receipt management, payment tracking, and customizable templates.
            </p>
          </div>
        )}
      </div>

      {/* All Modals */}
      <AddIncomeModal
        isOpen={showAddIncomeModal}
        onClose={() => setShowAddIncomeModal(false)}
        onSuccess={handleModalSuccess}
      />

      <AddExpenseModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onSuccess={handleModalSuccess}
      />

      <AddTaxRecordModal
        isOpen={showAddTaxRecordModal}
        onClose={() => setShowAddTaxRecordModal(false)}
        onSuccess={handleModalSuccess}
      />

      <GenerateReportModal
        isOpen={showGenerateReportModal}
        onClose={() => setShowGenerateReportModal(false)}
        onSuccess={handleModalSuccess}
      />

      <AutoMatchModal
        isOpen={showAutoMatchModal}
        onClose={() => setShowAutoMatchModal(false)}
        onSuccess={handleModalSuccess}
      />

      <ImportStatementModal
        isOpen={showImportStatementModal}
        onClose={() => setShowImportStatementModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
