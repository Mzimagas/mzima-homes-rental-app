'use client'

import AccountingManagementTabs from '../../../components/accounting/AccountingManagementTabs'

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Accounting</h1>
          <p className="mt-1 text-sm text-gray-500">Financial management workflows</p>
        </div>
      </div>

      <AccountingManagementTabs />
    </div>
  )
}

