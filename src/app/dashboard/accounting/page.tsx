'use client'

import { Suspense, lazy } from 'react'
import ErrorBoundary from '../../../components/ui/ErrorBoundary'

// Lazy load the AccountingManagementTabs component
const AccountingManagementTabs = lazy(
  () => import('../../../components/accounting/AccountingManagementTabs')
)

// Loading component for the accounting tabs
function AccountingTabsLoading() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading accounting dashboard...</p>
      </div>
    </div>
  )
}

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Accounting</h1>
          <p className="mt-1 text-sm text-gray-500">Financial management workflows</p>
        </div>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<AccountingTabsLoading />}>
          <AccountingManagementTabs />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
