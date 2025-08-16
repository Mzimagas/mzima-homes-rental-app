'use client'

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase-client'
import { formatCurrency } from '../../lib/export-utils'

export default function UtilityBalanceReport() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('utility_accounts')
      .select('id, unit_id, tenant_id, type, balance_kes, low_balance_threshold_kes, credit_limit_kes, units!inner(unit_label, properties(name))')
      .eq('is_active', true)
    if (error) setError(error.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="p-4">Loading utility balances...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Utility Balance Report</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Property</th>
              <th className="p-2">Unit</th>
              <th className="p-2">Type</th>
              <th className="p-2 text-right">Balance</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.units?.properties?.name}</td>
                <td className="p-2">{r.units?.unit_label}</td>
                <td className="p-2">{r.type.replace(/_/g, ' ')}</td>
                <td className="p-2 text-right">{formatCurrency(r.balance_kes)}</td>
                <td className="p-2">
                  {r.type === 'ELECTRICITY_PREPAID' && r.low_balance_threshold_kes != null && r.balance_kes <= r.low_balance_threshold_kes && (
                    <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs">Low</span>
                  )}
                  {r.type !== 'ELECTRICITY_PREPAID' && r.balance_kes < 0 && (
                    <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs">Outstanding</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="p-4 text-gray-500" colSpan={5}>No utility accounts</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

