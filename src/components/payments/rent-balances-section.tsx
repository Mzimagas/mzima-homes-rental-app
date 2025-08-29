'use client'

import { useEffect, useMemo, useState } from 'react'
import supabase, { clientBusinessFunctions } from '../../lib/supabase-client'
import { formatCurrency, formatDate } from '../../lib/export-utils'

export default function RentBalancesSection() {
  const [tenantId, setTenantId] = useState<string>('')
  const [tenants, setTenants] = useState<{ id: string; full_name: string }[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [ledger, setLedger] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTenants = async () => {
      const { data } = await supabase.from('tenants').select('id, full_name').order('full_name')
      setTenants(data || [])
      if (data && data.length) setTenantId(data[0].id)
    }
    loadTenants()
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!tenantId) return
      setLoading(true)
      setError(null)
      try {
        const { data: sumData, error: sumError } =
          await clientBusinessFunctions.getRentBalanceSummary(tenantId)
        if (sumError) throw new Error(sumError)
        setSummary(sumData)
        const { data: ledgerData, error: ledgerError } =
          await clientBusinessFunctions.getRentLedger(tenantId, 100)
        if (ledgerError) throw new Error(ledgerError)
        setLedger(ledgerData || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])

  if (loading) return <div className="p-4">Loading rent balances...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  const tenantOptions = tenants.map((t) => (
    <option key={t.id} value={t.id}>
      {t.full_name}
    </option>
  ))

  const onExportPDF = async () => {
    setExporting('pdf')
    try {
      const { createPDFHeader, addTableToPDF, savePDFFile, generateFilename } = await import(
        '../../lib/export-utils'
      )
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')

      const doc = new jsPDF()
      createPDFHeader(doc, {
        title: 'Rent Balance Report',
        dateRange: { startDate: new Date().toISOString(), endDate: new Date().toISOString() },
        data: null,
        filename: 'rent-balance'
      })

      const headers = ['Date', 'Type', 'Ref', 'Amount', 'Running Balance']
      const rows = ledger.map((row) => [
        formatDate(row.entry_date),
        row.entry_type,
        row.invoice_id ? 'Invoice' : 'Payment',
        formatCurrency(row.amount_kes),
        formatCurrency(row.running_balance_kes),
      ])

      addTableToPDF(doc, { headers, rows }, 30)
      savePDFFile(doc, generateFilename('rent-balance', {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      }))
    } finally {
      setExporting(null)
    }
  }

  const onExportExcel = async () => {
    setExporting('excel')
    try {
      const { createExcelWorkbook, addTableToExcel, saveExcelFile, generateFilename } =
        await import('../../lib/export-utils')
      const wb = createExcelWorkbook({
        title: 'Rent Balance',
        dateRange: { startDate: new Date().toISOString(), endDate: new Date().toISOString() },
        data: null,
        filename: 'rent-balance'
      })
      const headers = ['Date', 'Type', 'Ref', 'Amount', 'Running Balance']
      const rows = ledger.map((row) => [
        formatDate(row.entry_date),
        row.entry_type,
        row.invoice_id ? 'Invoice' : 'Payment',
        row.amount_kes,
        row.running_balance_kes,
      ])
      addTableToExcel(wb, { headers, rows }, 'Ledger')
      saveExcelFile(wb, generateFilename('rent-balance', {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      }))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Tenant</label>
        <select
          className="border rounded p-2"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
        >
          {tenantOptions}
        </select>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onExportPDF}
            disabled={exporting === 'pdf'}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
          >
            {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={onExportExcel}
            disabled={exporting === 'excel'}
            className="px-3 py-2 bg-green-600 text-white rounded text-sm"
          >
            {exporting === 'excel' ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Outstanding</div>
          <div className="text-2xl font-bold">
            {formatCurrency(summary?.outstanding_total_kes || 0)}
          </div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Overdue</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary?.overdue_total_kes || 0)}
          </div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Open Invoices</div>
          <div className="text-2xl font-bold">{summary?.open_invoices_count || 0}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Last Payment</div>
          <div className="text-xl">
            {summary?.last_payment_date ? formatDate(summary.last_payment_date) : 'N/A'}
          </div>
        </div>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">Rent Ledger</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Type</th>
                <th className="p-2">Ref</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row: any) => (
                <tr
                  key={`${row.entry_date}-${row.invoice_id || row.payment_id}`}
                  className="border-t"
                >
                  <td className="p-2">{formatDate(row.entry_date)}</td>
                  <td className="p-2">{row.entry_type}</td>
                  <td className="p-2">{row.invoice_id ? 'Invoice' : 'Payment'}</td>
                  <td className="p-2 text-right">{formatCurrency(row.amount_kes)}</td>
                  <td className="p-2 text-right">{formatCurrency(row.running_balance_kes)}</td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={5}>
                    No ledger entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
