'use client'

import { useEffect, useState } from 'react'
import { UtilityBalanceService } from '../../lib/services/utility-balance-service'
import { formatCurrency } from '../../lib/export-utils'

interface Props {
  tenantId: string
  unitId: string
}

export default function UtilityBalancePanel({ tenantId, unitId }: Props) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await UtilityBalanceService.listAccountsForUnit(unitId)
      if (error) throw new Error(error.message || 'Failed to load accounts')
      setAccounts(data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [unitId])

  if (loading) return <div className="p-4">Loading utility balances...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      {accounts.length === 0 && (
        <div className="p-4 text-gray-500">No utility accounts configured for this unit.</div>
      )}
      {accounts.map((ac) => (
        <div key={ac.id} className="border rounded p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{ac.type.replace(/_/g, ' ')}</div>
              <div className="text-lg font-semibold">{formatCurrency(ac.balance_kes)}</div>
            </div>
            {ac.type === 'ELECTRICITY_PREPAID' &&
              ac.low_balance_threshold_kes != null &&
              ac.balance_kes <= ac.low_balance_threshold_kes && (
                <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs">
                  Low balance
                </span>
              )}
            {ac.type !== 'ELECTRICITY_PREPAID' && ac.balance_kes < 0 && (
              <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs">Outstanding</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
