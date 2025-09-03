'use client'

import { useEffect, useState } from 'react'
import getSupabaseClient, { clientBusinessFunctions } from '../../../lib/supabase-client'

const supabase = getSupabaseClient()
import UtilityBalancePanel from '../../../components/utilities/utility-balance-panel'
import UtilityLedgerTable from '../../../components/utilities/utility-ledger-table'

export default function UtilitiesDashboardPage() {
  const [unitId, setUnitId] = useState<string>('')
  const [tenantId, setTenantId] = useState<string>('')
  const [accounts, setAccounts] = useState<any[]>([])

  useEffect(() => {
    // Load first active unit for utilities display
    const load = async () => {
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('is_active', true)
        .limit(1)
      if (units && units.length > 0) setUnitId(units[0].id)
      const { data: tenants } = await supabase.from('tenants').select('id').limit(1)
      if (tenants && tenants.length > 0) setTenantId(tenants[0].id)
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Utility Balances</h1>
      {unitId && tenantId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-medium mb-2">Accounts</h2>
            <UtilityBalancePanel tenantId={tenantId} unitId={unitId} />
          </div>
          <div>
            <h2 className="font-medium mb-2">Recent Transactions</h2>
            {/* For demo pick first account */}
            {accounts[0] ? (
              <UtilityLedgerTable accountId={accounts[0].id} />
            ) : (
              <div className="text-gray-500">Select an account to view ledger.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-gray-500">Loading context...</div>
      )}
    </div>
  )
}
