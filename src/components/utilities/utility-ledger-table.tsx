'use client'

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase-client'
import { formatCurrency, formatDate } from '../../lib/export-utils'

export default function UtilityLedgerTable({ accountId }: { accountId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('utility_ledger')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) setError(error.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  if (loading) return <div className="p-4">Loading ledger...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">Date</th>
            <th className="p-2">Type</th>
            <th className="p-2 text-right">Amount</th>
            <th className="p-2 text-right">Balance</th>
            <th className="p-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{formatDate(r.created_at)}</td>
              <td className="p-2">{r.txn_type}</td>
              <td className="p-2 text-right">{formatCurrency(r.amount_kes)}</td>
              <td className="p-2 text-right">{formatCurrency(r.balance_after_kes)}</td>
              <td className="p-2">{r.description}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="p-4 text-gray-500" colSpan={5}>No transactions</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

