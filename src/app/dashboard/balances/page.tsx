'use client'

import { useEffect, useState } from 'react'
import supabase, { clientBusinessFunctions } from '../../../lib/supabase-client'
import { formatCurrency, formatDate } from '../../../lib/export-utils'

export default function BalancesPage() {
  const [tenantId, setTenantId] = useState<string>('')
  const [summary, setSummary] = useState<any>(null)
  const [ledger, setLedger] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // For demo: pick first tenant
    const pickTenant = async () => {
      const { data } = await supabase.from('tenants').select('id, full_name').limit(1)
      if (data && data.length) setTenantId(data[0].id)
    }
    pickTenant()
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!tenantId) return
      setLoading(true)
      setError(null)
      try {
        const { data: sumData, error: sumError } = await clientBusinessFunctions.getRentBalanceSummary(tenantId)
        if (sumError) throw new Error(sumError)
        setSummary(sumData)
        const { data: ledgerData, error: ledgerError } = await supabase.rpc('get_rent_ledger', { p_tenant_id: tenantId, p_limit: 100 })
        if (ledgerError) throw new Error(ledgerError.message || 'Failed to load ledger')
        setLedger(ledgerData || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Rent Balances</h1>
      {!tenantId && <div className="text-gray-500">Select a tenant to view balances.</div>}
      {tenantId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Outstanding</div>
              <div className="text-2xl font-bold">{formatCurrency(summary?.outstanding_total_kes || 0)}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Overdue</div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.overdue_total_kes || 0)}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Open Invoices</div>
              <div className="text-2xl font-bold">{summary?.open_invoices_count || 0}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Last Payment</div>
              <div className="text-xl">{summary?.last_payment_date ? formatDate(summary.last_payment_date) : 'N/A'}</div>
            </div>
          </div>

          <div className="border rounded p-4">
            <h2 className="font-semibold mb-2">Recent Ledger</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Invoice/Payment</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row: any) => (
                    <tr key={`${row.entry_date}-${row.invoice_id || row.payment_id}`} className="border-t">
                      <td className="p-2">{formatDate(row.entry_date)}</td>
                      <td className="p-2">{row.entry_type}</td>
                      <td className="p-2">{row.invoice_id ? 'Invoice' : 'Payment'}</td>
                      <td className="p-2 text-right">{formatCurrency(row.amount_kes)}</td>
                      <td className="p-2 text-right">{formatCurrency(row.running_balance_kes)}</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td className="p-4 text-gray-500" colSpan={5}>No ledger entries</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

