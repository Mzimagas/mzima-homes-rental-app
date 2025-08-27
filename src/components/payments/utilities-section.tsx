'use client'

import { useEffect, useState } from 'react'
import UtilityBalancePanel from '../utilities/utility-balance-panel'
import UtilityLedgerTable from '../utilities/utility-ledger-table'
import supabase from '../../lib/supabase-client'

export default function UtilitiesSection() {
  const [unitId, setUnitId] = useState<string>('')
  const [tenantId, setTenantId] = useState<string>('')
  const [firstAccountId, setFirstAccountId] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('is_active', true)
        .limit(1)
      if (units && units.length > 0) setUnitId(units[0].id)
      const { data: tenants } = await supabase.from('tenants').select('id').limit(1)
      if (tenants && tenants.length > 0) setTenantId(tenants[0].id)
      const { data: accounts } = await supabase
        .from('utility_accounts')
        .select('id')
        .eq('unit_id', units?.[0]?.id || '')
        .limit(1)
      if (accounts && accounts.length > 0) setFirstAccountId(accounts[0].id)
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold mb-2">Utility Accounts</h2>
        {tenantId && unitId ? (
          <UtilityBalancePanel tenantId={tenantId} unitId={unitId} />
        ) : (
          <div className="text-gray-500">No utility accounts found or context missing.</div>
        )}
      </div>
      <div>
        <h2 className="font-semibold mb-2">Recent Utility Transactions</h2>
        {firstAccountId ? (
          <UtilityLedgerTable accountId={firstAccountId} />
        ) : (
          <div className="text-gray-500">Select an account to view ledger.</div>
        )}
      </div>
    </div>
  )
}
