'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import supabase, { clientBusinessFunctions } from '../../lib/supabase-client'
import { LoadingCard } from '../ui/loading'
import { ErrorCard } from '../ui/error'
import DateRangeSelector, { getDefaultDateRange, getPredefinedDateRanges } from '../ui/date-range-selector'
import {
  createPDFHeader,
  addTableToPDF,
  addSummaryCardsToPDF,
  createExcelWorkbook,
  addTableToExcel,
  saveExcelFile,
  savePDFFile,
  generateFilename,
  formatCurrency,
  formatDate,
  formatPercentage,
  type ExportOptions,
  type TableData
} from '../../lib/export-utils'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface TenantAnalyticsData {
  tenantSummary: {
    totalTenants: number
    activeTenants: number
    inactiveTenants: number
    averageBalance: number
    totalOutstanding: number
  }
  paymentBehavior: {
    onTimePayments: number
    latePayments: number
    missedPayments: number
    averagePaymentDelay: number
  }
  topTenants: {
    tenantName: string
    propertyName: string
    unitLabel: string
    totalPaid: number
    paymentCount: number
    averagePayment: number
    onTimeRate: number
  }[]
  riskAnalysis: {
    highRisk: {
      tenantName: string
      propertyName: string
      unitLabel: string
      balance: number
      daysSinceLastPayment: number
      riskScore: number
    }[]
    mediumRisk: {
      tenantName: string
      propertyName: string
      unitLabel: string
      balance: number
      daysSinceLastPayment: number
      riskScore: number
    }[]
  }
  tenantRetention: {
    newTenants: number
    retainedTenants: number
    lostTenants: number
    retentionRate: number
    averageTenancyLength: number
  }
}

const TenantAnalytics = forwardRef(function TenantAnalytics(_props: {}, ref) {
  const [data, setData] = useState<TenantAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'custom'>('6months')
  const [customDateRange, setCustomDateRange] = useState(getDefaultDateRange())
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadTenantAnalytics()
  }, [selectedPeriod, customDateRange])

  const loadTenantAnalytics = async () => {
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

      // Get tenant summary
      const tenantSummary = await calculateTenantSummary(mockLandlordId)

      // Get payment behavior with date range
      const paymentBehavior = await calculatePaymentBehavior(mockLandlordId, startDate, endDate)

      // Get top tenants with date range
      const topTenants = await getTopTenants(mockLandlordId, startDate, endDate)

      // Get risk analysis
      const riskAnalysis = await calculateRiskAnalysis(mockLandlordId)

      // Get tenant retention with date range
      const tenantRetention = await calculateTenantRetention(mockLandlordId, startDate, endDate)

      setData({
        tenantSummary,
        paymentBehavior,
        topTenants,
        riskAnalysis,
        tenantRetention
      })

    } catch (err) {
      setError('Failed to load tenant analytics')
      console.error('Tenant analytics loading error:', err)
    } finally {
      setLoading(false)
      setIsGeneratingReport(false)
    }
  }

  // SINGLE unconditional useImperativeHandle (before any early return)
  useImperativeHandle(ref, () => ({
    exportPDF: handleExportPDF,
    exportExcel: handleExportExcel,
    isExporting: () => isExporting,
  }))




  // Export to PDF
  const handleExportPDF = async () => {
    if (!data || isExporting) return

    // Validate data structure
    if (!data.tenantSummary || !data.paymentBehavior || !data.tenantRetention) {
      alert('Report data is incomplete. Please wait for the report to fully load before exporting.')
      return
    }

    try {
      setIsExporting(true)
      const doc = new jsPDF()

      const exportOptions: ExportOptions = {
        title: 'Tenant Analytics',
        subtitle: 'Tenant Demographics and Behavior Analysis',
        dateRange: customDateRange,
        filters: {
          'Period': selectedPeriod === 'custom' ? 'Custom Range' : selectedPeriod
        },
        data,
        filename: generateFilename('tenant-analytics', customDateRange)
      }

      let yPosition = createPDFHeader(doc, exportOptions)

      // Summary cards
      const summaryCards = [
        { title: 'Total Tenants', value: data.tenantSummary.totalTenants.toString() },
        { title: 'Active Tenants', value: data.tenantSummary.activeTenants.toString() },
        { title: 'New Tenants', value: data.tenantRetention.newTenants.toString() },
        { title: 'Retention Rate', value: formatPercentage(data.tenantRetention.retentionRate) },
        { title: 'Avg Tenancy Length', value: `${data.tenantRetention.averageTenancyLength} months` }
      ]
      yPosition = addSummaryCardsToPDF(doc, summaryCards, yPosition, 'Tenant Analytics Summary')

      // Payment behavior summary table
      const paymentBehaviorTable: TableData = {
        headers: ['Metric', 'Count'],
        rows: [
          ['On-time Payments', data.paymentBehavior.onTimePayments.toString()],
          ['Late Payments', data.paymentBehavior.latePayments.toString()],
          ['Missed Payments', data.paymentBehavior.missedPayments.toString()],
          ['Average Payment Delay (days)', data.paymentBehavior.averagePaymentDelay.toString()]


        ]
      }
      yPosition = addTableToPDF(doc, paymentBehaviorTable, yPosition, 'Payment Behavior Summary')

      // Top tenants table
      if (data.topTenants.length > 0) {
        const topTenantsTable: TableData = {
          headers: ['Tenant', 'Property', 'Unit', 'Total Paid', 'Payment Count', 'On-time Rate'],
          rows: data.topTenants.map(tenant => [
            tenant.tenantName,
            tenant.propertyName,
            tenant.unitLabel,
            formatCurrency(tenant.totalPaid),
            tenant.paymentCount.toString(),
            formatPercentage(tenant.onTimeRate)
          ])
        }
        addTableToPDF(doc, topTenantsTable, yPosition, 'Top Tenants Analysis')
      }

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
    if (!data.tenantSummary || !data.paymentBehavior || !data.tenantRetention) {
      alert('Report data is incomplete. Please wait for the report to fully load before exporting.')
      return
    }

    try {
      setIsExporting(true)

      const exportOptions: ExportOptions = {
        title: 'Tenant Analytics',
        subtitle: 'Tenant Demographics and Behavior Analysis',
        dateRange: customDateRange,
        filters: {
          'Period': selectedPeriod === 'custom' ? 'Custom Range' : selectedPeriod
        },
        data,
        filename: generateFilename('tenant-analytics', customDateRange)
      }

      const workbook = createExcelWorkbook(exportOptions)

      // Enhanced Executive Summary Dashboard
      const summaryCards = [
        { title: 'Total Tenants', value: data.tenantSummary.totalTenants.toString() },
        { title: 'Active Tenants', value: data.tenantSummary.activeTenants.toString() },
        { title: 'Inactive Tenants', value: data.tenantSummary.inactiveTenants.toString() },
        { title: 'New Tenants', value: data.tenantRetention.newTenants.toString() },
        { title: 'Retained Tenants', value: data.tenantRetention.retainedTenants.toString() },
        { title: 'Lost Tenants', value: data.tenantRetention.lostTenants.toString() },
        { title: 'Retention Rate', value: formatPercentage(data.tenantRetention.retentionRate) },
        { title: 'Average Tenancy Length', value: `${data.tenantRetention.averageTenancyLength} months` }
      ]
      addSummaryDashboardToExcel(workbook, summaryCards, exportOptions)

      // Payment behavior summary sheet
      const paymentBehaviorTable: TableData = {
        headers: ['Metric', 'Count'],
        rows: [
          ['On-time Payments', data.paymentBehavior.onTimePayments],
          ['Late Payments', data.paymentBehavior.latePayments],
          ['Missed Payments', data.paymentBehavior.missedPayments],
          ['Average Payment Delay (days)', data.paymentBehavior.averagePaymentDelay]
        ]
      }
      addTableToExcel(workbook, paymentBehaviorTable, 'Payment Behavior')

      // Top tenants sheet
      if (data.topTenants.length > 0) {
        const topTenantsTable: TableData = {
          headers: ['Tenant Name', 'Property', 'Unit', 'Total Paid', 'Payment Count', 'Average Payment', 'On-time Rate'],
          rows: data.topTenants.map(tenant => [
            tenant.tenantName,
            tenant.propertyName,
            tenant.unitLabel,
            tenant.totalPaid,
            tenant.paymentCount,
            tenant.averagePayment,
            tenant.onTimeRate
          ])
        }
        addTableToExcel(workbook, topTenantsTable, 'Top Tenants')
      }

      saveExcelFile(workbook, exportOptions.filename)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Failed to export Excel file. Please try again.')
    } finally {
      setIsExporting(false)


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
    setCustomDateRange(newDateRange)
    if (selectedPeriod !== 'custom') {
      setSelectedPeriod('custom')
    }
  }

  const calculateTenantSummary = async (landlordId: string) => {
    // Get all tenants
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        status,
        units (
          properties (
            landlord_id
          )
        )
      `)
      .eq('units.properties.landlord_id', landlordId)

    const totalTenants = tenants?.length || 0
    const activeTenants = tenants?.filter((t: any) => t.status === 'ACTIVE').length || 0
    const inactiveTenants = totalTenants - activeTenants

    // Get balances for all tenants
    let totalOutstanding = 0
    let balanceCount = 0

    for (const tenant of tenants || []) {
      const { data: balance } = await clientBusinessFunctions.getTenantBalance(tenant.id)
      if (balance && balance > 0) {
        totalOutstanding += balance
        balanceCount++
      }
    }

    const averageBalance = balanceCount > 0 ? totalOutstanding / balanceCount : 0

    return {
      totalTenants,
      activeTenants,
      inactiveTenants,
      averageBalance,
      totalOutstanding
    }
  }

  const calculatePaymentBehavior = async (landlordId: string, startDate: Date, endDate: Date) => {

    // First get all properties for the landlord
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', landlordId)

    if (!properties || properties.length === 0) {
      return { onTimePayments: 0, latePayments: 0, missedPayments: 0, averagePaymentDelay: 0 }
    }

    const propertyIds = properties.map((p: { id: string }) => p.id)

    // Get units for these properties
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('property_id', propertyIds)

    if (!units || units.length === 0) {
      return { onTimePayments: 0, latePayments: 0, missedPayments: 0, averagePaymentDelay: 0 }
    }

    const unitIds = units.map((u: { id: string }) => u.id)

    // Get invoices and payments for the period
    const { data: invoices } = await supabase
      .from('rent_invoices')
      .select(`
        id,
        due_date,
        amount_due_kes,
        amount_paid_kes,
        status,
        units (
          unit_label,
          properties (
            name
          )
        ),
        payments (
          payment_date
        )
      `)
      .in('unit_id', unitIds)
      .gte('due_date', startDate.toISOString().split('T')[0])
      .lte('due_date', endDate.toISOString().split('T')[0])

    let onTimePayments = 0
    let latePayments = 0
    let missedPayments = 0
    let totalDelayDays = 0
    let latePaymentCount = 0

    invoices?.forEach((invoice: any) => {
      if (invoice.status === 'PAID') {
        // Check if payment was on time
        const payment = invoice.payments?.[0]
        if (payment) {
          const paymentDate = new Date(payment.payment_date)
          const dueDate = new Date(invoice.due_date)

          if (paymentDate <= dueDate) {
            onTimePayments++
          } else {
            latePayments++
            const delayDays = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            totalDelayDays += delayDays
            latePaymentCount++
          }
        }
      } else if (invoice.status === 'OVERDUE') {
        missedPayments++
      }
    })

    const averagePaymentDelay = latePaymentCount > 0 ? Math.floor(totalDelayDays / latePaymentCount) : 0

    return {
      onTimePayments,
      latePayments,
      missedPayments,
      averagePaymentDelay
    }
  }

  const getTopTenants = async (landlordId: string, startDate: Date, endDate: Date) => {

    // Get payments for the period
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        amount_kes,
        payment_date,
        tenants (
          id,
          full_name,
          units (
            unit_label,
            properties (
              name,
              landlord_id
            )
          )
        )
      `)
      .eq('tenants.units.properties.landlord_id', landlordId)
      .gte('payment_date', startDate.toISOString().split('T')[0])
      .lte('payment_date', endDate.toISOString().split('T')[0])

    // Group by tenant
    const tenantData: { [key: string]: any } = {}

    payments?.forEach((payment: any) => {
      const tenant = Array.isArray(payment.tenants) ? payment.tenants[0] : payment.tenants as any
      if (tenant && tenant.id) {
        if (!tenantData[tenant.id]) {
          tenantData[tenant.id] = {
            tenantName: tenant.full_name || 'Unknown',
            propertyName: (tenant.units && tenant.units[0] && tenant.units[0].properties && tenant.units[0].properties[0]) ? tenant.units[0].properties[0].name : 'Unknown',
            unitLabel: (tenant.units && tenant.units[0]) ? tenant.units[0].unit_label : 'Unknown',
            totalPaid: 0,
            paymentCount: 0,
            onTimePayments: 0
          }
        }

        tenantData[tenant.id].totalPaid += payment.amount_kes
        tenantData[tenant.id].paymentCount++

        // Simplified on-time calculation (would need invoice due dates for accuracy)
        tenantData[tenant.id].onTimePayments++
      }
    })

    // Calculate averages and rates
    const topTenants = Object.values(tenantData).map((tenant: any) => ({
      ...tenant,
      averagePayment: tenant.paymentCount > 0 ? tenant.totalPaid / tenant.paymentCount : 0,
      onTimeRate: tenant.paymentCount > 0 ? (tenant.onTimePayments / tenant.paymentCount) * 100 : 0
    }))

    // Sort by total paid and return top 10
    return topTenants
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 10)
  }

  const calculateRiskAnalysis = async (landlordId: string) => {
    // Get all active tenants with their balances and last payment dates
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        full_name,
        status,
        units (
          unit_label,
          properties (
            name,
            landlord_id
          )
        )
      `)
      .eq('status', 'ACTIVE')
      .eq('units.properties.landlord_id', landlordId)

    const riskTenants = []

    for (const tenant of tenants || []) {
      // Get balance
      const { data: balance } = await clientBusinessFunctions.getTenantBalance(tenant.id)

      // Get last payment date
      const { data: lastPayment } = await supabase
        .from('payments')
        .select('payment_date')
        .eq('tenant_id', tenant.id)
        .order('payment_date', { ascending: false })
        .limit(1)

      const daysSinceLastPayment = lastPayment?.[0]
        ? Math.floor((new Date().getTime() - new Date(lastPayment[0].payment_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      // Calculate risk score (simplified)
      let riskScore = 0
      if (balance && balance > 0) riskScore += Math.min(50, balance / 1000) // Balance factor
      if (daysSinceLastPayment > 30) riskScore += Math.min(50, daysSinceLastPayment - 30) // Days factor

      if (riskScore > 0) {
        riskTenants.push({
          tenantName: tenant.full_name || 'Unknown',
          propertyName: (tenant.units && tenant.units[0] && tenant.units[0].properties && tenant.units[0].properties[0]) ? tenant.units[0].properties[0].name : 'Unknown',
          unitLabel: (tenant.units && tenant.units[0]) ? tenant.units[0].unit_label : 'Unknown',
          balance: balance || 0,
          daysSinceLastPayment,
          riskScore
        })
      }
    }

    // Sort by risk score
    riskTenants.sort((a, b) => b.riskScore - a.riskScore)

    return {
      highRisk: riskTenants.filter(t => t.riskScore >= 70),
      mediumRisk: riskTenants.filter(t => t.riskScore >= 40 && t.riskScore < 70)
    }
  }

  const calculateTenantRetention = async (landlordId: string, startDate: Date, endDate: Date) => {

    // Get tenancy agreements
    const { data: tenancies } = await supabase
      .from('tenancy_agreements')
      .select(`
        start_date,
        end_date,
        status,
        units (
          properties (
            landlord_id
          )
        )
      `)
      .eq('units.properties.landlord_id', landlordId)

    const newTenants = tenancies?.filter((t: any) =>
      t.start_date &&
      new Date(t.start_date) >= startDate &&
      new Date(t.start_date) <= endDate
    ).length || 0

    const lostTenants = tenancies?.filter((t: any) =>
      t.end_date &&
      new Date(t.end_date) >= startDate &&
      new Date(t.end_date) <= endDate
    ).length || 0

    const activeTenants = tenancies?.filter((t: any) => t.status === 'ACTIVE').length || 0
    const retainedTenants = activeTenants

    const retentionRate = (retainedTenants + lostTenants) > 0
      ? (retainedTenants / (retainedTenants + lostTenants)) * 100
      : 0

    // Calculate average tenancy length
    const completedTenancies = tenancies?.filter((t: any) => t.start_date && t.end_date) || []
    let totalDays = 0

    completedTenancies.forEach((tenancy: any) => {
      const days = Math.floor(
        (new Date(tenancy.end_date!).getTime() - new Date(tenancy.start_date!).getTime()) / (1000 * 60 * 60 * 24)
      )
      totalDays += days
    })

    const averageTenancyLength = completedTenancies.length > 0 ? Math.floor(totalDays / completedTenancies.length) : 0

    return {
      newTenants,
      retainedTenants,
      lostTenants,
      retentionRate,
      averageTenancyLength
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return <LoadingCard title="Loading tenant analytics..." />
  }

  if (error) {
    return <ErrorCard title="Failed to load tenant analytics" message={error} onRetry={loadTenantAnalytics} />
  }

  if (!data) {
    return <div>No tenant analytics data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Tenant Analytics</h3>
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
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                  </button>

                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {isExporting ? 'Exporting...' : 'Export Excel'}
                  </button>
                </div>
              )}

              {isGeneratingReport && (
              <div className="flex items-center text-sm text-blue-600">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating analytics...
              </div>
            )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
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

            {selectedPeriod === 'custom' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Date Range</label>
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
              <strong>Selected Range:</strong> {new Date(customDateRange.startDate).toLocaleDateString()} - {new Date(customDateRange.endDate).toLocaleDateString()}
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

      {/* Tenant Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Tenant Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.tenantSummary.totalTenants}
            </div>
            <div className="text-sm text-gray-500">Total Tenants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.tenantSummary.activeTenants}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {data.tenantSummary.inactiveTenants}
            </div>
            <div className="text-sm text-gray-500">Inactive</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.tenantSummary.averageBalance)}
            </div>
            <div className="text-sm text-gray-500">Avg Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.tenantSummary.totalOutstanding)}
            </div>
            <div className="text-sm text-gray-500">Total Outstanding</div>
          </div>
        </div>
      </div>

      {/* Payment Behavior */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Behavior</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.paymentBehavior.onTimePayments}
            </div>
            <div className="text-sm text-gray-500">On-Time Payments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {data.paymentBehavior.latePayments}
            </div>
            <div className="text-sm text-gray-500">Late Payments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.paymentBehavior.missedPayments}
            </div>
            <div className="text-sm text-gray-500">Missed Payments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.paymentBehavior.averagePaymentDelay}
            </div>
            <div className="text-sm text-gray-500">Avg Delay (Days)</div>
          </div>
        </div>
      </div>

      {/* Top Tenants */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Top Paying Tenants</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property/Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">On-Time Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topTenants.map((tenant, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tenant.tenantName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tenant.propertyName} - {tenant.unitLabel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(tenant.totalPaid)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tenant.paymentCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(tenant.averagePayment)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      tenant.onTimeRate >= 90 ? 'text-green-600' :
                      tenant.onTimeRate >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {tenant.onTimeRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Analysis */}
      {(data.riskAnalysis.highRisk.length > 0 || data.riskAnalysis.mediumRisk.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Risk Tenants */}
          {data.riskAnalysis.highRisk.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <h4 className="text-lg font-medium text-red-900">High Risk Tenants</h4>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {data.riskAnalysis.highRisk.slice(0, 5).map((tenant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{tenant.tenantName}</div>
                        <div className="text-sm text-gray-500">
                          {tenant.propertyName} - {tenant.unitLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">{formatCurrency(tenant.balance)}</div>
                        <div className="text-sm text-gray-500">{tenant.daysSinceLastPayment} days</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Medium Risk Tenants */}
          {data.riskAnalysis.mediumRisk.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
                <h4 className="text-lg font-medium text-yellow-900">Medium Risk Tenants</h4>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {data.riskAnalysis.mediumRisk.slice(0, 5).map((tenant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{tenant.tenantName}</div>
                        <div className="text-sm text-gray-500">
                          {tenant.propertyName} - {tenant.unitLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-yellow-600">{formatCurrency(tenant.balance)}</div>
                        <div className="text-sm text-gray-500">{tenant.daysSinceLastPayment} days</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tenant Retention */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Tenant Retention</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.tenantRetention.newTenants}
            </div>
            <div className="text-sm text-gray-500">New Tenants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.tenantRetention.retainedTenants}
            </div>
            <div className="text-sm text-gray-500">Retained</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.tenantRetention.lostTenants}
            </div>
            <div className="text-sm text-gray-500">Lost Tenants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.tenantRetention.retentionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Retention Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data.tenantRetention.averageTenancyLength}
            </div>
            <div className="text-sm text-gray-500">Avg Tenancy (Days)</div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default TenantAnalytics
