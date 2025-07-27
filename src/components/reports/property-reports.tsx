'use client'

import { useState, useEffect } from 'react'
import { supabase, clientBusinessFunctions } from '../../lib/supabase-client'
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

interface PropertyReportsData {
  propertyPerformance: {
    propertyName: string
    totalUnits: number
    occupiedUnits: number
    occupancyRate: number
    monthlyRentPotential: number
    monthlyRentActual: number
    collectionRate: number
    averageRent: number
    totalRevenue: number
  }[]
  unitAnalysis: {
    propertyName: string
    unitLabel: string
    monthlyRent: number
    status: string
    tenantName: string | null
    lastPayment: string | null
    balance: number
    daysVacant: number
  }[]
  revenueComparison: {
    propertyName: string
    currentMonth: number
    previousMonth: number
    growth: number
    yearToDate: number
  }[]
  maintenanceOverview: {
    propertyName: string
    totalRequests: number
    pendingRequests: number
    completedRequests: number
    averageResolutionTime: number
    maintenanceCosts: number
  }[]
}

export default function PropertyReports() {
  const [data, setData] = useState<PropertyReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [propertiesLoaded, setPropertiesLoaded] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'custom'>('6months')
  const [customDateRange, setCustomDateRange] = useState(getDefaultDateRange())
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadProperties()
  }, [])

  useEffect(() => {
    // Only load reports when properties are loaded and other dependencies change
    if (propertiesLoaded && !isGeneratingReport) {
      loadPropertyReports()
    }
  }, [propertiesLoaded, selectedProperty, selectedPeriod, customDateRange])

  const loadProperties = async () => {
    try {
      // For now, using mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'

      const { data: propertiesData, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('landlord_id', mockLandlordId)
        .order('name')

      if (error) {
        console.error('Supabase error loading properties:', error)
        setProperties([]) // Set empty array to prevent infinite loading
        setPropertiesLoaded(true) // Still mark as loaded to prevent infinite retries
        return
      }

      setProperties(propertiesData || [])
      setPropertiesLoaded(true)
      console.log('Properties loaded:', propertiesData?.length || 0, 'properties')
    } catch (err) {
      console.error('Error loading properties:', err)
      setProperties([]) // Set empty array to prevent infinite loading
      setPropertiesLoaded(true) // Still mark as loaded to prevent infinite retries
    }
  }

  const loadPropertyReports = async () => {
    // Prevent multiple simultaneous calls
    if (isGeneratingReport) {
      console.log('Already generating report, skipping loadPropertyReports call')
      return
    }

    // Don't load if properties haven't been loaded yet
    if (!propertiesLoaded) {
      console.log('Properties not loaded yet, skipping report load')
      return
    }

    try {
      setLoading(true)
      setIsGeneratingReport(true)
      setError(null)

      console.log('Loading property reports...', {
        selectedProperty,
        selectedPeriod,
        customDateRange,
        propertiesCount: properties.length,
        propertiesLoaded,
        loading,
        isGeneratingReport
      })

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

      // Get property performance with date range
      const propertyPerformance = await calculatePropertyPerformance(mockLandlordId, selectedProperty, startDate, endDate)

      // Get unit analysis
      const unitAnalysis = await calculateUnitAnalysis(mockLandlordId, selectedProperty)

      // Get revenue comparison with date range
      const revenueComparison = await calculateRevenueComparison(mockLandlordId, selectedProperty, startDate, endDate)

      // Get maintenance overview (placeholder - would need maintenance table)
      const maintenanceOverview = await calculateMaintenanceOverview(mockLandlordId, selectedProperty)

      const reportData = {
        propertyPerformance,
        unitAnalysis,
        revenueComparison,
        maintenanceOverview
      }

      console.log('Property reports data loaded successfully:', reportData)
      setData(reportData)

    } catch (err) {
      console.error('Property reports loading error:', err)

      // Set fallback data to prevent infinite loading
      const fallbackData = {
        propertyPerformance: [],
        unitAnalysis: [],
        revenueComparison: [],
        maintenanceOverview: []
      }

      console.log('Setting fallback data due to error')
      setData(fallbackData)
      setError('Failed to load property reports. Please try again.')
    } finally {
      setLoading(false)
      setIsGeneratingReport(false)
      console.log('Property reports loading completed')
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

  // Export to PDF
  const handleExportPDF = async () => {
    if (!data || isExporting) return

    try {
      setIsExporting(true)
      const doc = new jsPDF()

      const selectedPropertyName = selectedProperty === 'all'
        ? 'All Properties'
        : properties.find(p => p.id === selectedProperty)?.name || 'Unknown Property'

      const exportOptions: ExportOptions = {
        title: 'Property Reports',
        subtitle: `Performance Analysis for ${selectedPropertyName}`,
        dateRange: customDateRange,
        filters: {
          'Property': selectedPropertyName,
          'Period': selectedPeriod === 'custom' ? 'Custom Range' : selectedPeriod
        },
        data,
        filename: generateFilename('property-report', customDateRange)
      }

      let yPosition = createPDFHeader(doc, exportOptions)

      // Property Performance table
      const performanceTable: TableData = {
        headers: ['Property', 'Units', 'Occupancy', 'Rent Potential', 'Rent Actual', 'Collection Rate', 'Avg Rent', 'Revenue'],
        rows: data.propertyPerformance.map(prop => [
          prop.propertyName,
          prop.totalUnits.toString(),
          formatPercentage(prop.occupancyRate),
          formatCurrency(prop.monthlyRentPotential),
          formatCurrency(prop.monthlyRentActual),
          formatPercentage(prop.collectionRate),
          formatCurrency(prop.averageRent),
          formatCurrency(prop.totalRevenue)
        ])
      }
      yPosition = addTableToPDF(doc, performanceTable, yPosition, 'Property Performance')

      // Check if we need a new page
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      // Unit Analysis table
      const unitTable: TableData = {
        headers: ['Property', 'Unit', 'Status', 'Tenant', 'Rent', 'Last Payment', 'Balance'],
        rows: data.unitAnalysis.map(unit => [
          unit.propertyName,
          unit.unitLabel,
          unit.status,
          unit.tenantName || 'Vacant',
          formatCurrency(unit.monthlyRent),
          unit.lastPayment ? formatDate(unit.lastPayment) : 'N/A',
          formatCurrency(unit.balance)
        ])
      }
      yPosition = addTableToPDF(doc, unitTable, yPosition, 'Unit Analysis')

      // Revenue Comparison table
      if (data.revenueComparison.length > 0) {
        if (yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        const revenueTable: TableData = {
          headers: ['Property', 'Current Month', 'Previous Month', 'Growth %', 'Year to Date'],
          rows: data.revenueComparison.map(rev => [
            rev.propertyName,
            formatCurrency(rev.currentMonth),
            formatCurrency(rev.previousMonth),
            formatPercentage(rev.growth),
            formatCurrency(rev.yearToDate)
          ])
        }
        addTableToPDF(doc, revenueTable, yPosition, 'Revenue Comparison')
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

    try {
      setIsExporting(true)

      const selectedPropertyName = selectedProperty === 'all'
        ? 'All Properties'
        : properties.find(p => p.id === selectedProperty)?.name || 'Unknown Property'

      const exportOptions: ExportOptions = {
        title: 'Property Reports',
        subtitle: `Performance Analysis for ${selectedPropertyName}`,
        dateRange: customDateRange,
        filters: {
          'Property': selectedPropertyName,
          'Period': selectedPeriod === 'custom' ? 'Custom Range' : selectedPeriod
        },
        data,
        filename: generateFilename('property-report', customDateRange)
      }

      const workbook = createExcelWorkbook(exportOptions)

      // Property Performance sheet
      const performanceTable: TableData = {
        headers: ['Property', 'Total Units', 'Occupied Units', 'Occupancy Rate', 'Monthly Rent Potential', 'Monthly Rent Actual', 'Collection Rate', 'Average Rent', 'Total Revenue'],
        rows: data.propertyPerformance.map(prop => [
          prop.propertyName,
          prop.totalUnits,
          prop.occupiedUnits,
          prop.occupancyRate,
          prop.monthlyRentPotential,
          prop.monthlyRentActual,
          prop.collectionRate,
          prop.averageRent,
          prop.totalRevenue
        ])
      }
      addTableToExcel(workbook, performanceTable, 'Property Performance')

      // Unit Analysis sheet
      const unitTable: TableData = {
        headers: ['Property', 'Unit', 'Status', 'Tenant', 'Monthly Rent', 'Last Payment', 'Balance'],
        rows: data.unitAnalysis.map(unit => [
          unit.propertyName,
          unit.unitLabel,
          unit.status,
          unit.tenantName || 'Vacant',
          unit.monthlyRent,
          unit.lastPayment || 'N/A',
          unit.balance
        ])
      }
      addTableToExcel(workbook, unitTable, 'Unit Analysis')

      // Revenue Comparison sheet
      if (data.revenueComparison.length > 0) {
        const revenueTable: TableData = {
          headers: ['Property', 'Current Month', 'Previous Month', 'Growth %', 'Year to Date'],
          rows: data.revenueComparison.map(rev => [
            rev.propertyName,
            rev.currentMonth,
            rev.previousMonth,
            rev.growth,
            rev.yearToDate
          ])
        }
        addTableToExcel(workbook, revenueTable, 'Revenue Comparison')
      }

      saveExcelFile(workbook, exportOptions.filename)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Failed to export Excel file. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const calculatePropertyPerformance = async (landlordId: string, propertyFilter: string, startDate: Date, endDate: Date) => {
    console.log('calculatePropertyPerformance called with:', { landlordId, propertyFilter, startDate, endDate })

    const propertiesToAnalyze = propertyFilter === 'all'
      ? properties
      : properties.filter(p => p.id === propertyFilter)

    console.log('Properties to analyze:', propertiesToAnalyze)

    // If no properties to analyze, return empty array
    if (propertiesToAnalyze.length === 0) {
      console.log('No properties to analyze, returning empty performance array')
      return []
    }

    const performance = []

    for (const property of propertiesToAnalyze) {
      console.log('Processing property:', property)

      // Get property stats
      const { data: stats, error: statsError } = await clientBusinessFunctions.getPropertyStats(property.id)

      if (statsError) {
        console.error('Error getting property stats for', property.id, ':', statsError)
        continue
      }
      
      if (stats && stats.length > 0) {
        const stat = stats[0]
        
        // Get revenue for this property
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            amount_kes,
            payment_date,
            tenants (
              units (
                properties (
                  id
                )
              )
            )
          `)
          .eq('tenants.units.properties.id', property.id)
          .gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])

        const totalRevenue = payments?.reduce((sum, p) => sum + p.amount_kes, 0) || 0

        // Calculate collection rate
        const { data: invoices } = await supabase
          .from('rent_invoices')
          .select(`
            amount_due_kes,
            amount_paid_kes,
            units (
              properties (
                id
              )
            )
          `)
          .eq('units.properties.id', property.id)
          .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])

        const totalDue = invoices?.reduce((sum, inv) => sum + inv.amount_due_kes, 0) || 0
        const totalPaid = invoices?.reduce((sum, inv) => sum + inv.amount_paid_kes, 0) || 0
        const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0

        const averageRent = stat.total_units > 0 ? stat.monthly_rent_potential / stat.total_units : 0

        performance.push({
          propertyName: property.name,
          totalUnits: stat.total_units,
          occupiedUnits: stat.occupied_units,
          occupancyRate: stat.occupancy_rate,
          monthlyRentPotential: stat.monthly_rent_potential,
          monthlyRentActual: stat.monthly_rent_actual,
          collectionRate,
          averageRent,
          totalRevenue
        })
      }
    }

    return performance
  }

  const calculateUnitAnalysis = async (landlordId: string, propertyFilter: string) => {
    console.log('calculateUnitAnalysis called with:', { landlordId, propertyFilter })

    const propertiesToAnalyze = propertyFilter === 'all'
      ? properties
      : properties.filter(p => p.id === propertyFilter)

    // If no properties to analyze, return empty array
    if (propertiesToAnalyze.length === 0) {
      console.log('No properties for unit analysis, returning empty array')
      return []
    }

    const units = []

    for (const property of propertiesToAnalyze) {
      const { data: propertyData } = await supabase
        .from('properties')
        .select(`
          name,
          units (
            id,
            unit_label,
            monthly_rent_kes,
            tenants (
              id,
              full_name,
              status,
              end_date
            )
          )
        `)
        .eq('id', property.id)
        .single()

      if (propertyData) {
        for (const unit of propertyData.units) {
          const activeTenant = unit.tenants?.find(t => t.status === 'ACTIVE')
          
          // Get last payment if tenant exists
          let lastPayment = null
          let balance = 0
          
          if (activeTenant) {
            const { data: payments } = await supabase
              .from('payments')
              .select('payment_date')
              .eq('tenant_id', activeTenant.id)
              .order('payment_date', { ascending: false })
              .limit(1)

            lastPayment = payments?.[0]?.payment_date || null

            // Get balance
            const { data: invoices } = await supabase
              .from('rent_invoices')
              .select('amount_due_kes, amount_paid_kes')
              .eq('tenant_id', activeTenant.id)
              .in('status', ['PENDING', 'PARTIAL', 'OVERDUE'])

            balance = invoices?.reduce(
              (sum, inv) => sum + (inv.amount_due_kes - inv.amount_paid_kes), 0
            ) || 0
          }

          // Calculate days vacant
          let daysVacant = 0
          if (!activeTenant) {
            const lastTenant = unit.tenants
              ?.filter(t => t.end_date)
              .sort((a, b) => new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime())[0]

            if (lastTenant?.end_date) {
              daysVacant = Math.floor(
                (new Date().getTime() - new Date(lastTenant.end_date).getTime()) / (1000 * 60 * 60 * 24)
              )
            }
          }

          units.push({
            propertyName: propertyData.name,
            unitLabel: unit.unit_label,
            monthlyRent: unit.monthly_rent_kes,
            status: activeTenant ? 'OCCUPIED' : 'VACANT',
            tenantName: activeTenant?.full_name || null,
            lastPayment,
            balance,
            daysVacant
          })
        }
      }
    }

    return units
  }

  const calculateRevenueComparison = async (landlordId: string, propertyFilter: string, startDate: Date, endDate: Date) => {
    console.log('calculateRevenueComparison called with:', { landlordId, propertyFilter, startDate, endDate })

    const propertiesToAnalyze = propertyFilter === 'all'
      ? properties
      : properties.filter(p => p.id === propertyFilter)

    // If no properties to analyze, return empty array
    if (propertiesToAnalyze.length === 0) {
      console.log('No properties for revenue comparison, returning empty array')
      return []
    }

    const comparison = []

    for (const property of propertiesToAnalyze) {
      // Current month
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)

      // Previous month
      const previousMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
      const previousMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0)

      // Year to date
      const yearStart = new Date(new Date().getFullYear(), 0, 1)

      // Get current month revenue
      const { data: currentPayments } = await supabase
        .from('payments')
        .select(`
          amount_kes,
          tenants (
            units (
              properties (
                id
              )
            )
          )
        `)
        .eq('tenants.units.properties.id', property.id)
        .gte('payment_date', currentMonthStart.toISOString().split('T')[0])
        .lte('payment_date', currentMonthEnd.toISOString().split('T')[0])

      const currentMonth = currentPayments?.reduce((sum, p) => sum + p.amount_kes, 0) || 0

      // Get previous month revenue
      const { data: previousPayments } = await supabase
        .from('payments')
        .select(`
          amount_kes,
          tenants (
            units (
              properties (
                id
              )
            )
          )
        `)
        .eq('tenants.units.properties.id', property.id)
        .gte('payment_date', previousMonthStart.toISOString().split('T')[0])
        .lte('payment_date', previousMonthEnd.toISOString().split('T')[0])

      const previousMonth = previousPayments?.reduce((sum, p) => sum + p.amount_kes, 0) || 0

      // Get year to date revenue
      const { data: ytdPayments } = await supabase
        .from('payments')
        .select(`
          amount_kes,
          tenants (
            units (
              properties (
                id
              )
            )
          )
        `)
        .eq('tenants.units.properties.id', property.id)
        .gte('payment_date', yearStart.toISOString().split('T')[0])

      const yearToDate = ytdPayments?.reduce((sum, p) => sum + p.amount_kes, 0) || 0

      // Calculate growth
      const growth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0

      comparison.push({
        propertyName: property.name,
        currentMonth,
        previousMonth,
        growth,
        yearToDate
      })
    }

    return comparison
  }

  const calculateMaintenanceOverview = async (landlordId: string, propertyFilter: string) => {
    console.log('calculateMaintenanceOverview called with:', { landlordId, propertyFilter })

    // Placeholder for maintenance data - would need maintenance requests table
    const propertiesToAnalyze = propertyFilter === 'all'
      ? properties
      : properties.filter(p => p.id === propertyFilter)

    // If no properties to analyze, return empty array
    if (propertiesToAnalyze.length === 0) {
      console.log('No properties for maintenance overview, returning empty array')
      return []
    }

    return propertiesToAnalyze.map(property => ({
      propertyName: property.name,
      totalRequests: Math.floor(Math.random() * 20),
      pendingRequests: Math.floor(Math.random() * 5),
      completedRequests: Math.floor(Math.random() * 15),
      averageResolutionTime: Math.floor(Math.random() * 7) + 1,
      maintenanceCosts: Math.floor(Math.random() * 50000) + 10000
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return <LoadingCard title="Loading property reports..." />
  }

  if (error) {
    return <ErrorCard title="Failed to load property reports" message={error} onRetry={loadPropertyReports} />
  }

  if (!data) {
    return <div>No property reports data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Property Selector */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Property Reports</h3>
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
                Generating report...
              </div>
            )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                disabled={isGeneratingReport}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="all">All Properties</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>{property.name}</option>
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
                      handleCustomDateRangeChange(ranges.last6Months)
                    }}
                    disabled={isGeneratingReport}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                  >
                    Last 6 Months
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

      {/* Property Performance */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Property Performance</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent Potential</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Rent</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.propertyPerformance.map((property, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {property.propertyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {property.occupiedUnits}/{property.totalUnits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      property.occupancyRate >= 90 ? 'text-green-600' :
                      property.occupancyRate >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {property.occupancyRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(property.monthlyRentPotential)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(property.monthlyRentActual)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      property.collectionRate >= 95 ? 'text-green-600' :
                      property.collectionRate >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {property.collectionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(property.averageRent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Comparison */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Revenue Comparison</h4>
        <div className="space-y-4">
          {data.revenueComparison.map((property, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{property.propertyName}</div>
                <div className="text-sm text-gray-500">
                  Current: {formatCurrency(property.currentMonth)} | 
                  Previous: {formatCurrency(property.previousMonth)}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-medium ${
                  property.growth > 0 ? 'text-green-600' :
                  property.growth < 0 ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {property.growth > 0 ? '+' : ''}{property.growth.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">
                  YTD: {formatCurrency(property.yearToDate)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unit Analysis */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Unit Analysis</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property/Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.unitAnalysis.slice(0, 20).map((unit, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{unit.propertyName}</div>
                    <div className="text-sm text-gray-500">{unit.unitLabel}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(unit.monthlyRent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      unit.status === 'OCCUPIED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {unit.status}
                      {unit.status === 'VACANT' && unit.daysVacant > 0 && ` (${unit.daysVacant}d)`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.tenantName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(unit.lastPayment)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={unit.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {formatCurrency(unit.balance)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.unitAnalysis.length > 20 && (
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 text-center">
            Showing 20 of {data.unitAnalysis.length} units
          </div>
        )}
      </div>
    </div>
  )
}
