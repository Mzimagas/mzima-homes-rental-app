'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import supabase from '../../lib/supabase-client'
import { LoadingCard } from '../ui/loading'
import { ErrorCard } from '../ui/error'
import DateRangeSelector, {
  getDefaultDateRange,
  getPredefinedDateRanges,
} from '../ui/date-range-selector'
import {
  createPDFHeader,
  addTableToPDF,
  addSummaryCardsToPDF,
  createExcelWorkbook,
  addTableToExcel,
  addSummaryDashboardToExcel,
  saveExcelFile,
  savePDFFile,
  generateFilename,
  formatCurrency,
  formatDate,
  formatPercentage,
  type ExportOptions,
  type TableData,
} from '../../lib/export-utils'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface FinancialData {
  monthlyRevenue: {
    month: string
    revenue: number
    expenses: number
    netIncome: number
    collections: number
    outstanding: number
  }[]
  yearToDate: {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    collectionRate: number
    outstandingAmount: number
  }
  rentRoll: {
    propertyName: string
    unitLabel: string
    tenantName: string
    monthlyRent: number
    status: string
    lastPayment: string | null
    balance: number
  }[]
  profitLoss: {
    category: string
    amount: number
    percentage: number
  }[]
}

const FinancialReports = forwardRef(function FinancialReports(_props: {}, ref) {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'custom'>(
    '6months'
  )
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [customDateRange, setCustomDateRange] = useState(getDefaultDateRange())
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadFinancialData()
  }, [selectedPeriod, selectedYear, customDateRange])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      setIsGeneratingReport(true)
      setError(null)

      // For now, using mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'

      // Calculate date range
      let startDate: Date, endDate: Date

      if (selectedPeriod === 'custom') {
        startDate = new Date(customDateRange.startDate)
        endDate = new Date(customDateRange.endDate)
      } else {
        endDate = new Date()
        startDate = new Date()

        switch (selectedPeriod) {
          case '3months':
            startDate.setMonth(endDate.getMonth() - 3)
            break
          case '6months':
            startDate.setMonth(endDate.getMonth() - 6)
            break
          case '1year':
            startDate.setFullYear(endDate.getFullYear() - 1)
            break
        }
      }

      // Get monthly revenue data
      const monthlyRevenue = await calculateMonthlyRevenue(startDate, endDate, mockLandlordId)

      // Get year-to-date summary
      const yearToDate = await calculateYearToDate(selectedYear, mockLandlordId)

      // Get current rent roll
      const rentRoll = await getCurrentRentRoll(mockLandlordId)

      // Get profit/loss breakdown
      const profitLoss = await calculateProfitLoss(selectedYear, mockLandlordId)

      setData({
        monthlyRevenue,
        yearToDate,
        rentRoll,
        profitLoss,
      })
    } catch (err) {
      setError('Failed to load financial data')
      console.error('Financial data loading error:', err)
    } finally {
      setLoading(false)
      setIsGeneratingReport(false)
    }
  }

  // Handle predefined period selection
  const handlePeriodChange = (period: '3months' | '6months' | '1year' | 'custom') => {
    setSelectedPeriod(period)

    // If switching to a predefined period, update custom date range to match
    if (period !== 'custom') {
      const predefinedRanges = getPredefinedDateRanges()
      switch (period) {
        case '3months':
          setCustomDateRange(predefinedRanges.last3Months)
          break
        case '6months':
          setCustomDateRange(predefinedRanges.last6Months)
          break
        case '1year':
          setCustomDateRange(predefinedRanges.lastYear)
          break
      }
    }
  }

  // Handle custom date range change
  const handleCustomDateRangeChange = (newDateRange: { startDate: string; endDate: string }) => {
    // Additional validation for business logic
    const startDate = new Date(newDateRange.startDate)
    const endDate = new Date(newDateRange.endDate)

    // Check if the date range is reasonable for financial reporting
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 1) {
      setError('Date range must be at least 1 day')
      return
    }

    if (diffDays > 1825) {
      // 5 years
      setError('Date range cannot exceed 5 years')
      return
    }

    // Clear any previous errors
    setError(null)

    setCustomDateRange(newDateRange)
    if (selectedPeriod !== 'custom') {
      setSelectedPeriod('custom')
    }
  }

  // Export to PDF
  const handleExportPDF = async () => {
    if (!data || isExporting) return

    // Validate data structure
    if (!data.yearToDate || !data.monthlyRevenue || !data.rentRoll || !data.profitLoss) {
      alert('Report data is incomplete. Please wait for the report to fully load before exporting.')
      return
    }

    try {
      setIsExporting(true)
      const doc = new jsPDF()

      const exportOptions: ExportOptions = {
        title: 'Financial Reports',
        subtitle: 'Revenue, Expenses, and Profitability Analysis',
        dateRange: customDateRange,
        filters: {
          Period: selectedPeriod === 'custom' ? 'Custom Range' : selectedPeriod,
          Year: selectedYear.toString(),
        },
        data,
        filename: generateFilename('financial-report', customDateRange),
      }

      let yPosition = createPDFHeader(doc, exportOptions)

      // Summary cards
      const summaryCards = [
        { title: 'Total Revenue', value: formatCurrency(data.yearToDate.totalRevenue) },
        { title: 'Total Expenses', value: formatCurrency(data.yearToDate.totalExpenses) },
        { title: 'Net Income', value: formatCurrency(data.yearToDate.netIncome) },
        { title: 'Collection Rate', value: formatPercentage(data.yearToDate.collectionRate) },
        { title: 'Outstanding Amount', value: formatCurrency(data.yearToDate.outstandingAmount) },
      ]
      yPosition = addSummaryCardsToPDF(doc, summaryCards, yPosition, 'Year to Date Summary')

      // Monthly trends table
      const monthlyTrendsTable: TableData = {
        headers: ['Month', 'Revenue', 'Expenses', 'Net Income', 'Collections', 'Outstanding'],
        rows: (Array.isArray(data.monthlyRevenue) ? data.monthlyRevenue : []).map((month) => [
          month.month,
          formatCurrency(month.revenue),
          formatCurrency(month.expenses),
          formatCurrency(month.netIncome),
          formatCurrency(month.collections),
          formatCurrency(month.outstanding),
        ]),
      }
      yPosition = addTableToPDF(doc, monthlyTrendsTable, yPosition, 'Monthly Financial Trends')

      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      // Rent Roll table
      const rentRollTable: TableData = {
        headers: [
          'Property',
          'Unit',
          'Tenant',
          'Monthly Rent',
          'Status',
          'Last Payment',
          'Balance',
        ],
        rows: data.rentRoll.map((item) => [
          item.propertyName,
          item.unitLabel,
          item.tenantName,
          formatCurrency(item.monthlyRent),
          item.status,
          item.lastPayment ? formatDate(item.lastPayment) : 'N/A',
          formatCurrency(item.balance),
        ]),
      }
      yPosition = addTableToPDF(doc, rentRollTable, yPosition, 'Rent Roll')

      // Profit & Loss table
      const profitLossTable: TableData = {
        headers: ['Category', 'Amount', 'Percentage'],
        rows: data.profitLoss.map((item) => [
          item.category,
          formatCurrency(item.amount),
          formatPercentage(item.percentage),
        ]),
      }
      addTableToPDF(doc, profitLossTable, yPosition, 'Profit & Loss Breakdown')

      savePDFFile(doc, exportOptions.filename)
    } catch (error) {
      console.error('Error exporting PDF:', error)

      alert('Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Export to Excel
  const handleExportExcel = async () => {
    if (!data || isExporting) return

    // Validate data structure
    if (!data.yearToDate || !data.monthlyRevenue || !data.rentRoll || !data.profitLoss) {
      alert('Report data is incomplete. Please wait for the report to fully load before exporting.')
      return
    }

    try {
      setIsExporting(true)

      const exportOptions: ExportOptions = {
        title: 'Financial Reports',
        subtitle: 'Revenue, Expenses, and Profitability Analysis',
        dateRange: customDateRange,
        filters: {
          Period: selectedPeriod === 'custom' ? 'Custom Range' : selectedPeriod,
          Year: selectedYear.toString(),
        },
        data,
        filename: generateFilename('financial-report', customDateRange),
      }

      const workbook = createExcelWorkbook(exportOptions)

      // Enhanced Executive Summary Dashboard
      const summaryCards = [
        { title: 'Total Revenue', value: formatCurrency(data.yearToDate.totalRevenue) },
        { title: 'Total Expenses', value: formatCurrency(data.yearToDate.totalExpenses) },
        { title: 'Net Income', value: formatCurrency(data.yearToDate.netIncome) },
        { title: 'Collection Rate', value: formatPercentage(data.yearToDate.collectionRate) },
        { title: 'Outstanding Amount', value: formatCurrency(data.yearToDate.outstandingAmount) },
      ]
      addSummaryDashboardToExcel(workbook, summaryCards, exportOptions)

      // Monthly trends sheet
      const monthlyTrendsTable: TableData = {
        headers: ['Month', 'Revenue', 'Expenses', 'Net Income', 'Collections', 'Outstanding'],
        rows: (Array.isArray(data.monthlyRevenue) ? data.monthlyRevenue : []).map((month) => [
          month.month,
          month.revenue,
          month.expenses,
          month.netIncome,
          month.collections,
          month.outstanding,
        ]),
      }
      addTableToExcel(workbook, monthlyTrendsTable, 'Monthly Revenue')

      // Rent Roll sheet
      const rentRollTable: TableData = {
        headers: [
          'Property',
          'Unit',
          'Tenant',
          'Monthly Rent',
          'Status',
          'Last Payment',
          'Balance',
        ],
        rows: data.rentRoll.map((item) => [
          item.propertyName,
          item.unitLabel,
          item.tenantName,
          item.monthlyRent,
          item.status,
          item.lastPayment || 'N/A',
          item.balance,
        ]),
      }
      addTableToExcel(workbook, rentRollTable, 'Rent Roll')

      // Profit & Loss sheet
      const profitLossTable: TableData = {
        headers: ['Category', 'Amount', 'Percentage'],
        rows: data.profitLoss.map((item) => [item.category, item.amount, item.percentage]),
      }
      addTableToExcel(workbook, profitLossTable, 'Profit & Loss')

      saveExcelFile(workbook, exportOptions.filename)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Failed to export Excel file. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const calculateMonthlyRevenue = async (startDate: Date, endDate: Date, landlordId: string) => {
    const monthlyData: any[] = []

    // Get payments data
    const { data: payments } = await supabase
      .from('payments')

      .select(
        `
        payment_date,
        amount_kes,
        tenants (
          units (
            properties (
              landlord_id
            )
          )
        )
      `
      )
      .eq('tenants.units.properties.landlord_id', landlordId)
      .gte('payment_date', startDate.toISOString().split('T')[0])
      .lte('payment_date', endDate.toISOString().split('T')[0])

    // First get all properties for the landlord
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', landlordId)

    if (!properties || properties.length === 0) {
      const months: any[] = []
      {
        const current = new Date(startDate)
        while (current <= endDate) {
          months.push({
            month: current.toLocaleDateString('en-KE', { year: 'numeric', month: 'short' }),
            revenue: 0,
            expenses: 0,
            netIncome: 0,
            collections: 0,
            outstanding: 0,
          })
          current.setMonth(current.getMonth() + 1)
        }
      }
      return months
    }

    const propertyIds = properties.map((p: { id: string }) => p.id)

    // Get units for these properties
    const { data: units } = await supabase.from('units').select('id').in('property_id', propertyIds)

    if (!units || units.length === 0) {
      const months: any[] = []
      {
        const current = new Date(startDate)
        while (current <= endDate) {
          months.push({
            month: current.toLocaleDateString('en-KE', { year: 'numeric', month: 'short' }),
            revenue: 0,
            expenses: 0,
            netIncome: 0,
            collections: 0,
            outstanding: 0,
          })
          current.setMonth(current.getMonth() + 1)
        }
      }
      return months
    }

    const unitIds = units.map((u: { id: string }) => u.id)

    // Get invoices data for outstanding amounts
    const { data: invoices } = await supabase
      .from('rent_invoices')
      .select(
        `
        period_start,
        amount_due_kes,
        amount_paid_kes,
        status,
        units (
          unit_label,
          properties (
            name
          )
        )
      `
      )
      .in('unit_id', unitIds)
      .gte('period_start', startDate.toISOString().split('T')[0])
      .lte('period_start', endDate.toISOString().split('T')[0])

    // Group by month
    const monthlyMap: { [key: string]: any } = {}

    // Initialize months
    const current = new Date(startDate)
    while (current <= endDate) {
      const monthKey = current.toISOString().slice(0, 7)
      monthlyMap[monthKey] = {
        month: current.toLocaleDateString('en-KE', { year: 'numeric', month: 'short' }),
        revenue: 0,
        expenses: 0, // TODO: Add expenses tracking
        collections: 0,
        outstanding: 0,
      }
      current.setMonth(current.getMonth() + 1)
    }

    // Process payments
    payments?.forEach((payment: any) => {
      const monthKey = String(payment.payment_date).slice(0, 7)
      if (monthlyMap[monthKey]) {
        monthlyMap[monthKey].collections += payment.amount_kes || 0
        monthlyMap[monthKey].revenue += payment.amount_kes || 0
      }
    })

    // Process invoices for outstanding amounts
    invoices?.forEach((invoice: any) => {
      const monthKey = String(invoice.period_start).slice(0, 7)
      if (monthlyMap[monthKey]) {
        const outstanding = (invoice.amount_due_kes || 0) - (invoice.amount_paid_kes || 0)
        if (outstanding > 0) {
          monthlyMap[monthKey].outstanding += outstanding
        }
      }
    })

    // Calculate net income
    Object.values(monthlyMap).forEach((month: any) => {
      month.netIncome = (month.revenue || 0) - (month.expenses || 0)
    })

    return Object.values(monthlyMap)
  }

  const calculateYearToDate = async (year: number, landlordId: string) => {
    const startOfYear = `${year}-01-01`
    const endOfYear = `${year}-12-31`

    // First get all properties for the landlord
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', landlordId)

    if (!properties || properties.length === 0) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        collectionRate: 0,
        outstandingAmount: 0,
      }
    }

    const propertyIds = properties.map((p: { id: string }) => p.id)

    // Get units for these properties
    const { data: units } = await supabase.from('units').select('id').in('property_id', propertyIds)

    if (!units || units.length === 0) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        collectionRate: 0,
        outstandingAmount: 0,
      }
    }

    const unitIds = units.map((u: { id: string }) => u.id)

    // Get tenants for these units
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .in('current_unit_id', unitIds)

    if (!tenants || tenants.length === 0) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        collectionRate: 0,
        outstandingAmount: 0,
      }
    }

    const tenantIds = tenants.map((t: { id: string }) => t.id)

    // Get total payments for the year
    const { data: payments } = await supabase
      .from('payments')
      .select(
        `
        amount_kes,
        tenants (
          full_name,
          units (
            unit_label,
            properties (
              name
            )
          )
        )
      `
      )
      .in('tenant_id', tenantIds)
      .gte('payment_date', startOfYear)
      .lte('payment_date', endOfYear)

    const totalRevenue =
      payments?.reduce((sum: number, p: { amount_kes: number }) => sum + p.amount_kes, 0) || 0

    // Get outstanding invoices
    const { data: outstandingInvoices } = await supabase
      .from('rent_invoices')
      .select(
        `
        amount_due_kes,
        amount_paid_kes,
        units (
          properties (
            landlord_id
          )
        )
      `
      )
      .eq('units.properties.landlord_id', landlordId)
      .in('status', ['PENDING', 'PARTIAL', 'OVERDUE'])

    const outstandingAmount =
      outstandingInvoices?.reduce(
        (sum: number, inv: { amount_due_kes: number; amount_paid_kes: number }) =>
          sum + (inv.amount_due_kes - inv.amount_paid_kes),
        0
      ) || 0

    // Get total invoiced amount for collection rate
    const { data: allInvoices } = await supabase
      .from('rent_invoices')
      .select(
        `
        amount_due_kes,
        amount_paid_kes,
        units (
          unit_label,
          properties (
            name
          )
        )
      `
      )
      .in('unit_id', unitIds)
      .gte('period_start', startOfYear)
      .lte('period_start', endOfYear)

    const totalInvoiced =
      allInvoices?.reduce(
        (sum: number, inv: { amount_due_kes: number }) => sum + inv.amount_due_kes,
        0
      ) || 0
    const totalCollected =
      allInvoices?.reduce(
        (sum: number, inv: { amount_paid_kes: number }) => sum + inv.amount_paid_kes,
        0
      ) || 0
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0

    return {
      totalRevenue,
      totalExpenses: 0, // TODO: Add expenses tracking
      netIncome: totalRevenue,
      collectionRate,
      outstandingAmount,
    }
  }

  const getCurrentRentRoll = async (landlordId: string) => {
    const { data: properties } = await supabase
      .from('properties')
      .select(
        `
        name,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          tenants (
            id,
            full_name,
            status
          )
        )
      `
      )
      .eq('landlord_id', landlordId)

    const rentRoll: any[] = []

    for (const property of properties || []) {
      for (const unit of property.units) {
        const tenant = unit.tenants?.[0]

        // Get last payment if tenant exists
        let lastPayment = null
        let balance = 0

        if (tenant) {
          const { data: payments } = await supabase
            .from('payments')
            .select('payment_date')
            .eq('tenant_id', tenant.id)
            .order('payment_date', { ascending: false })
            .limit(1)

          lastPayment = payments?.[0]?.payment_date || null

          // Get balance (simplified - in real app would use the balance function)
          const { data: invoices } = await supabase
            .from('rent_invoices')
            .select('amount_due_kes, amount_paid_kes')
            .eq('tenant_id', tenant.id)
            .in('status', ['PENDING', 'PARTIAL', 'OVERDUE'])

          balance =
            invoices?.reduce(
              (sum: number, inv: { amount_due_kes: number; amount_paid_kes: number }) =>
                sum + (inv.amount_due_kes - inv.amount_paid_kes),
              0
            ) || 0
        }

        rentRoll.push({
          propertyName: property.name,
          unitLabel: unit.unit_label,
          tenantName: tenant?.full_name || 'Vacant',
          monthlyRent: unit.monthly_rent_kes,
          status: tenant?.status || 'VACANT',
          lastPayment,
          balance,
        })
      }
    }

    return rentRoll
  }

  const calculateProfitLoss = async (year: number, landlordId: string) => {
    // Simplified P&L - in real app would have expense categories
    const startOfYear = `${year}-01-01`
    const endOfYear = `${year}-12-31`

    const { data: payments } = await supabase
      .from('payments')
      .select(
        `
        amount_kes,
        tenants (
          units (
            properties (
              landlord_id
            )
          )
        )
      `
      )
      .eq('tenants.units.properties.landlord_id', landlordId)
      .gte('payment_date', startOfYear)
      .lte('payment_date', endOfYear)

    const totalRevenue =
      payments?.reduce((sum: number, p: { amount_kes: number }) => sum + p.amount_kes, 0) || 0

    return [
      { category: 'Rental Income', amount: totalRevenue, percentage: 100 },
      { category: 'Maintenance', amount: 0, percentage: 0 },
      { category: 'Utilities', amount: 0, percentage: 0 },
      { category: 'Insurance', amount: 0, percentage: 0 },
      { category: 'Property Tax', amount: 0, percentage: 0 },
      { category: 'Management Fees', amount: 0, percentage: 0 },
    ]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Expose export handlers to parent via ref (always call hooks before any early returns)
  useImperativeHandle(ref, () => ({
    exportPDF: handleExportPDF,
    exportExcel: handleExportExcel,
    isExporting: () => isExporting,
  }))

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return <LoadingCard title="Loading financial reports..." />
  }

  if (error) {
    return (
      <ErrorCard
        title="Failed to load financial data"
        message={error}
        onRetry={loadFinancialData}
      />
    )
  }

  if (!data) {
    return <div>No financial data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Financial Reports</h3>
            <div className="flex items-center gap-3">
              {/* Export Controls */}
              {data && !isGeneratingReport && (
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                  </button>

                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {isExporting ? 'Exporting...' : 'Export Excel'}
                  </button>
                </div>
              )}

              {isGeneratingReport && (
                <div className="flex items-center text-sm text-blue-600">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating report...
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year (for YTD Summary)
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  disabled={isGeneratingReport}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  {[2024, 2023, 2022].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value as any)}
                  disabled={isGeneratingReport}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
            </div>

            {selectedPeriod === 'custom' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Date Range
                </label>
                <DateRangeSelector
                  value={customDateRange}
                  onChange={handleCustomDateRangeChange}
                  disabled={isGeneratingReport}
                  maxRangeYears={5}
                />

                {/* Quick preset buttons for custom range */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const ranges = getPredefinedDateRanges()
                      handleCustomDateRangeChange(ranges.currentMonth)
                    }}
                    disabled={isGeneratingReport}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                  >
                    Current Month
                  </button>
                  <button
                    onClick={() => {
                      const ranges = getPredefinedDateRanges()
                      handleCustomDateRangeChange(ranges.yearToDate)
                    }}
                    disabled={isGeneratingReport}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                  >
                    Year to Date
                  </button>
                  <button
                    onClick={() => {
                      const ranges = getPredefinedDateRanges()
                      handleCustomDateRangeChange(ranges.last3Months)
                    }}
                    disabled={isGeneratingReport}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                  >
                    Last 3 Months
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedPeriod === 'custom' && (
            <div className="text-sm text-gray-600">
              <strong>Selected Range:</strong>{' '}
              {new Date(customDateRange.startDate).toLocaleDateString()} -{' '}
              {new Date(customDateRange.endDate).toLocaleDateString()}
              {(() => {
                const start = new Date(customDateRange.startDate)
                const end = new Date(customDateRange.endDate)
                const diffTime = Math.abs(end.getTime() - start.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                return ` (${diffDays} days)`
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Year-to-Date Summary */}
      <div className="bg-white shadow rounded-lg p-6 relative">
        {isGeneratingReport && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center text-gray-600">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Updating data...
            </div>
          </div>
        )}
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Year-to-Date Summary ({selectedYear})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.yearToDate.totalRevenue)}
            </div>
            <div className="text-sm text-gray-500">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.yearToDate.totalExpenses)}
            </div>
            <div className="text-sm text-gray-500">Total Expenses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.yearToDate.netIncome)}
            </div>
            <div className="text-sm text-gray-500">Net Income</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.yearToDate.collectionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Collection Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.yearToDate.outstandingAmount)}
            </div>
            <div className="text-sm text-gray-500">Outstanding</div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-white shadow rounded-lg p-6 relative">
        {isGeneratingReport && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center text-gray-600">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Updating data...
            </div>
          </div>
        )}
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Monthly Revenue Trend
          {selectedPeriod === 'custom' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({new Date(customDateRange.startDate).toLocaleDateString()} -{' '}
              {new Date(customDateRange.endDate).toLocaleDateString()})
            </span>
          )}
        </h4>
        <div className="space-y-4">
          {(Array.isArray(data.monthlyRevenue) ? data.monthlyRevenue : []).map((month, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="font-medium text-gray-900">{month.month}</div>
                <div className="text-sm text-gray-500">
                  Collections: {formatCurrency(month.collections)} | Outstanding:{' '}
                  {formatCurrency(month.outstanding)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">{formatCurrency(month.revenue)}</div>
                <div className="text-sm text-green-600">Net: {formatCurrency(month.netIncome)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Rent Roll */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Current Rent Roll</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property/Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Rent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.rentRoll.slice(0, 10).map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.propertyName}</div>
                    <div className="text-sm text-gray-500">{row.unitLabel}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.tenantName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.monthlyRent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : row.status === 'VACANT'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(row.lastPayment)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={row.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}
                    >
                      {formatCurrency(row.balance)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.rentRoll.length > 10 && (
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 text-center">
            Showing 10 of {data.rentRoll.length} units
          </div>
        )}
      </div>
    </div>
  )
})

export default FinancialReports
