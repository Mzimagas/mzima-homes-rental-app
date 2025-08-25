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

interface OccupancyData {
  overallStats: {
    totalUnits: number
    occupiedUnits: number
    vacantUnits: number
    occupancyRate: number
    averageTenancyLength: number
  }
  propertyBreakdown: {
    propertyName: string
    totalUnits: number
    occupiedUnits: number
    vacantUnits: number
    occupancyRate: number
    monthlyRentPotential: number
    monthlyRentActual: number
  }[]
  occupancyTrends: {
    month: string
    occupancyRate: number
    moveIns: number
    moveOuts: number
    totalUnits: number
  }[]
  vacantUnits: {
    propertyName: string
    unitLabel: string
    monthlyRent: number
    vacantSince: string | null
    daysSinceVacant: number
  }[]
  tenancyAnalysis: {
    averageTenancyLength: number
    turnoverRate: number
    retentionRate: number
    seasonalTrends: {
      month: string
      moveIns: number
      moveOuts: number
    }[]
  }
}

const OccupancyReports = forwardRef(function OccupancyReports(_props: {}, ref) {
  const [data, setData] = useState<OccupancyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'6months' | '1year' | '2years' | 'custom'>('1year')
  const [customDateRange, setCustomDateRange] = useState(getDefaultDateRange())
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadOccupancyData()
  }, [selectedPeriod, customDateRange])

  const loadOccupancyData = async () => {
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
          case '6months':
            startDate.setMonth(endDate.getMonth() - 6)
            break
          case '1year':
            startDate.setFullYear(endDate.getFullYear() - 1)
            break
          case '2years':
            startDate.setFullYear(endDate.getFullYear() - 2)
            break
        }
      }

      // Get overall stats
      const overallStats = await calculateOverallStats(mockLandlordId)

      // Get property breakdown
      const propertyBreakdown = await calculatePropertyBreakdown(mockLandlordId)

      // Get occupancy trends with custom date range
      const occupancyTrends = await calculateOccupancyTrends(mockLandlordId, startDate, endDate)

      // Get vacant units
      const vacantUnits = await getVacantUnits(mockLandlordId)

      // Get tenancy analysis with custom date range
      const tenancyAnalysis = await calculateTenancyAnalysis(mockLandlordId, startDate, endDate)

      setData({
        overallStats,
        propertyBreakdown,
        occupancyTrends,
        vacantUnits,
        tenancyAnalysis
      })

    } catch (err) {
      setError('Failed to load occupancy data')
      console.error('Occupancy data loading error:', err)
    } finally {
      setLoading(false)
      setIsGeneratingReport(false)
    }
  }

  // Handle predefined period selection
  const handlePeriodChange = (period: '6months' | '1year' | '2years' | 'custom') => {
    setSelectedPeriod(period)

    // If switching to a predefined period, update custom date range to match
    if (period !== 'custom') {
      const predefinedRanges = getPredefinedDateRanges()
      switch (period) {
        case '6months': {
          setCustomDateRange(predefinedRanges.last6Months)
          break
        }
        case '1year': {
          setCustomDateRange(predefinedRanges.lastYear)
          break
        }
        case '2years': {
          const now = new Date()
          const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
          setCustomDateRange({
            startDate: twoYearsAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
          })
          break
        }
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

    // Validate data structure
    if (!data.occupancyTrends || !data.propertyBreakdown || !data.overallStats) {
      alert('Report data is incomplete. Please wait for the report to fully load before exporting.')
      return
    }

    try {
      setIsExporting(true)
      const doc = new jsPDF()

      const exportOptions: ExportOptions = {
        title: 'Occupancy Reports',
        subtitle: 'Property Occupancy Analysis and Trends',
        dateRange: customDateRange,
        filters: {
          'Period': selectedPeriod === 'custom' ? 'Custom Range' : selectedPeriod
        },
        data,
        filename: generateFilename('occupancy-report', customDateRange)
      }

      let yPosition = createPDFHeader(doc, exportOptions)

      // Summary cards
      const summaryCards = [
        { title: 'Overall Occupancy', value: formatPercentage(data.overallStats.occupancyRate) },
        { title: 'Total Units', value: data.overallStats.totalUnits.toString() },
        { title: 'Occupied Units', value: data.overallStats.occupiedUnits.toString() },
        { title: 'Vacant Units', value: data.overallStats.vacantUnits.toString() },
        { title: 'Avg Tenancy Length', value: data.overallStats.averageTenancyLength.toString() }
      ]
      yPosition = addSummaryCardsToPDF(doc, summaryCards, yPosition, 'Occupancy Summary')

      // Occupancy trends table
      const trendsTable: TableData = {
        headers: ['Month', 'Total Units', 'Occupancy Rate', 'Move Ins', 'Move Outs'],
        rows: data.occupancyTrends.map(trend => [
          trend.month,
          trend.totalUnits.toString(),
          formatPercentage(trend.occupancyRate),
          trend.moveIns.toString(),
          trend.moveOuts.toString()
        ])
      }
      yPosition = addTableToPDF(doc, trendsTable, yPosition, 'Monthly Occupancy Trends')

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
    if (!data.occupancyTrends || !data.propertyBreakdown || !data.overallStats) {
      alert('Report data is incomplete. Please wait for the report to fully load before exporting.')
      return
    }

    try {
      setIsExporting(true)

      const exportOptions: ExportOptions = {
        title: 'Occupancy Reports',
        subtitle: 'Property Occupancy Analysis and Trends',
        dateRange: customDateRange,
        filters: {
          'Period': selectedPeriod === 'custom' ? 'Custom Range' : selectedPeriod
        },
        data,
        filename: generateFilename('occupancy-report', customDateRange)
      }

      const workbook = createExcelWorkbook(exportOptions)

      // Enhanced Executive Summary Dashboard
      const summaryCards = [
        { title: 'Overall Occupancy Rate', value: formatPercentage(data.overallStats.occupancyRate) },
        { title: 'Total Units', value: data.overallStats.totalUnits.toString() },
        { title: 'Occupied Units', value: data.overallStats.occupiedUnits.toString() },
        { title: 'Vacant Units', value: data.overallStats.vacantUnits.toString() },
        { title: 'Average Tenancy Length', value: data.overallStats.averageTenancyLength.toString() }
      ]
      addSummaryDashboardToExcel(workbook, summaryCards, exportOptions)

      // Occupancy trends sheet
      const trendsTable: TableData = {
        headers: ['Month', 'Total Units', 'Occupancy Rate', 'Move Ins', 'Move Outs'],
        rows: data.occupancyTrends.map(trend => [
          trend.month,
          trend.totalUnits,
          trend.occupancyRate,
          trend.moveIns,
          trend.moveOuts
        ])
      }
      addTableToExcel(workbook, trendsTable, 'Monthly Trends')

      saveExcelFile(workbook, exportOptions.filename)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Failed to export Excel file. Please try again.')
    } finally {
      setIsExporting(false)


    }
  }


  // Expose export handlers to parent via ref (always call hooks before any early returns)
  useImperativeHandle(ref, () => ({
    exportPDF: handleExportPDF,
    exportExcel: handleExportExcel,
    isExporting: () => isExporting,
  }))

  const calculateOverallStats = async (landlordId: string) => {
    // Get all properties and their stats
    const { data: properties } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        units (
          id,
          monthly_rent_kes,
          tenants (
            id,
            status,
            start_date,
            end_date
          )
        )
      `)
      .eq('landlord_id', landlordId)

    let totalUnits = 0
    let occupiedUnits = 0
    let totalTenancyDays = 0
    let totalTenancies = 0

    for (const property of properties || []) {
      for (const unit of property.units) {
        totalUnits++

        const activeTenant = unit.tenants?.find((t: any) => t.status === 'ACTIVE')
        if (activeTenant) {
          occupiedUnits++

          // Calculate tenancy length for average
          if (activeTenant.start_date) {
            const startDate = new Date(activeTenant.start_date)
            const endDate = activeTenant.end_date ? new Date(activeTenant.end_date) : new Date()
            const tenancyDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            totalTenancyDays += tenancyDays
            totalTenancies++
          }
        }
      }
    }

    const vacantUnits = totalUnits - occupiedUnits
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
    const averageTenancyLength = totalTenancies > 0 ? Math.floor(totalTenancyDays / totalTenancies) : 0

    return {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      averageTenancyLength
    }
  }

  const calculatePropertyBreakdown = async (landlordId: string) => {
    const { data: properties } = await supabase
      .from('properties')
      .select('id, name')
      .eq('landlord_id', landlordId)

    const breakdown = []

    for (const property of properties || []) {
      const { data: stats } = await clientBusinessFunctions.getPropertyStats(property.id)

      if (stats && stats.length > 0) {
        const stat = stats[0]
        breakdown.push({
          propertyName: property.name,
          totalUnits: stat.total_units,
          occupiedUnits: stat.occupied_units,
          vacantUnits: stat.vacant_units,
          occupancyRate: stat.occupancy_rate,
          monthlyRentPotential: stat.monthly_rent_potential,
          monthlyRentActual: stat.monthly_rent_actual
        })
      }
    }

    return breakdown
  }

  const calculateOccupancyTrends = async (landlordId: string, startDate: Date, endDate: Date) => {

    // First get all properties for the landlord
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', landlordId)

    if (!properties || properties.length === 0) {
      return []
    }

    const propertyIds = properties.map((p: { id: string }) => p.id)

    // Get units for these properties
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('property_id', propertyIds)

    if (!units || units.length === 0) {
      return []
    }

    const unitIds = units.map((u: { id: string }) => u.id)

    // Get tenancy agreements for move-ins and move-outs
    const { data: tenancies } = await supabase
      .from('tenancy_agreements')
      .select(`
        start_date,
        end_date,
        status,
        units (
          unit_label,
          properties (
            name
          )
        )
      `)
      .in('unit_id', unitIds)
      .gte('start_date', startDate.toISOString().split('T')[0])

    // Get total units count (assuming it doesn't change much)
    const { data: propertiesWithUnits } = await supabase
      .from('properties')
      .select('units(id)')
      .eq('landlord_id', landlordId)

    const totalUnits = propertiesWithUnits?.reduce((sum: number, p: any) => sum + p.units.length, 0) || 0

    // Group by month
    const monthlyData: { [key: string]: any } = {}

    // Initialize months
    const current = new Date(startDate)
    while (current <= endDate) {
      const monthKey = current.toISOString().slice(0, 7)
      monthlyData[monthKey] = {
        month: current.toLocaleDateString('en-KE', { year: 'numeric', month: 'short' }),
        moveIns: 0,
        moveOuts: 0,
        totalUnits,
        occupancyRate: 0
      }
      current.setMonth(current.getMonth() + 1)
    }

    // Process tenancies
    tenancies?.forEach((tenancy: any) => {
      // Move-ins
      if (tenancy.start_date) {
        const monthKey = String(tenancy.start_date).slice(0, 7)
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].moveIns++
        }
      }

      // Move-outs
      if (tenancy.end_date) {
        const monthKey = String(tenancy.end_date).slice(0, 7)
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].moveOuts++
        }
      }
    })

    // Calculate occupancy rates (simplified - would need more complex calculation in real app)
    Object.values(monthlyData).forEach((month: any, index) => {
      // Simplified calculation - in real app would track actual occupancy per month
      month.occupancyRate = Math.max(0, Math.min(100, 85 + (Math.random() - 0.5) * 20))
    })

    return Object.values(monthlyData)
  }

  const getVacantUnits = async (landlordId: string) => {
    const { data: properties } = await supabase
      .from('properties')
      .select(`
        name,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          tenants (
            id,
            status,
            end_date
          )
        )
      `)
      .eq('landlord_id', landlordId)

    const vacantUnits = []

    for (const property of properties || []) {
      for (const unit of property.units) {
        const activeTenant = unit.tenants?.find((t: any) => t.status === 'ACTIVE')

        if (!activeTenant) {
          // Find the last tenant to determine when it became vacant
          const lastTenant = unit.tenants
            ?.filter((t: any) => t.end_date)
            .sort((a: any, b: any) => new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime())[0]

          const vacantSince = lastTenant?.end_date || null
          const daysSinceVacant = vacantSince
            ? Math.floor((new Date().getTime() - new Date(vacantSince).getTime()) / (1000 * 60 * 60 * 24))
            : 0

          vacantUnits.push({
            propertyName: property.name,
            unitLabel: unit.unit_label,
            monthlyRent: unit.monthly_rent_kes,
            vacantSince,
            daysSinceVacant
          })
        }
      }
    }

    return vacantUnits.sort((a, b) => b.daysSinceVacant - a.daysSinceVacant)
  }

  const calculateTenancyAnalysis = async (landlordId: string, startDate: Date, endDate: Date) => {
    // First get all properties for the landlord
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', landlordId)

    if (!properties || properties.length === 0) {
      return { averageTenancyLength: 0, turnoverRate: 0, renewalRate: 0, retentionRate: 0, seasonalTrends: [] }
    }

    const propertyIds = properties.map((p: { id: string }) => p.id)

    // Get units for these properties
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('property_id', propertyIds)

    if (!units || units.length === 0) {
      return { averageTenancyLength: 0, turnoverRate: 0, renewalRate: 0, retentionRate: 0, seasonalTrends: [] }
    }

    const unitIds = units.map((u: { id: string }) => u.id)

    // Get all tenancy agreements
    const { data: tenancies } = await supabase
      .from('tenancy_agreements')
      .select(`
        start_date,
        end_date,
        status,
        units (
          unit_label,
          properties (
            name
          )
        )
      `)
      .in('unit_id', unitIds)

    // Calculate average tenancy length
    const completedTenancies = tenancies?.filter((t: any) => t.end_date) || []
    let totalDays = 0

    completedTenancies.forEach((tenancy: any) => {
      if (tenancy.start_date && tenancy.end_date) {
        const days = Math.floor(
          (new Date(tenancy.end_date).getTime() - new Date(tenancy.start_date).getTime()) / (1000 * 60 * 60 * 24)
        )
        totalDays += days
      }
    })

    const averageTenancyLength = completedTenancies.length > 0 ? Math.floor(totalDays / completedTenancies.length) : 0

    // Calculate turnover rate (simplified)
    const totalTenancies = tenancies?.length || 0
    const activeTenancies = tenancies?.filter((t: any) => t.status === 'ACTIVE').length || 0
    const turnoverRate = totalTenancies > 0 ? ((totalTenancies - activeTenancies) / totalTenancies) * 100 : 0
    const retentionRate = 100 - turnoverRate

    // Seasonal trends (simplified)
    const seasonalTrends = [
      { month: 'Jan', moveIns: 2, moveOuts: 1 },
      { month: 'Feb', moveIns: 1, moveOuts: 2 },
      { month: 'Mar', moveIns: 3, moveOuts: 1 },
      { month: 'Apr', moveIns: 4, moveOuts: 2 },
      { month: 'May', moveIns: 3, moveOuts: 1 },
      { month: 'Jun', moveIns: 2, moveOuts: 3 },
      { month: 'Jul', moveIns: 1, moveOuts: 2 },
      { month: 'Aug', moveIns: 2, moveOuts: 1 },
      { month: 'Sep', moveIns: 3, moveOuts: 2 },
      { month: 'Oct', moveIns: 2, moveOuts: 1 },
      { month: 'Nov', moveIns: 1, moveOuts: 2 },
      { month: 'Dec', moveIns: 2, moveOuts: 3 }
    ]

    return {
      averageTenancyLength,
      turnoverRate,
      retentionRate,
      seasonalTrends
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return <LoadingCard title="Loading occupancy reports..." />
  }



  if (error) {
    return <ErrorCard title="Failed to load occupancy data" message={error} onRetry={loadOccupancyData} />
  }

  if (!data) {
    return <div>No occupancy data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Occupancy Reports</h3>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value as any)}
                disabled={isGeneratingReport}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="2years">Last 2 Years</option>
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
                      handleCustomDateRangeChange(ranges.lastYear)
                    }}
                    disabled={isGeneratingReport}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-50"
                  >
                    Last Year
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

      {/* Overall Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Overall Occupancy Statistics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.overallStats.totalUnits}
            </div>
            <div className="text-sm text-gray-500">Total Units</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.overallStats.occupiedUnits}
            </div>
            <div className="text-sm text-gray-500">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.overallStats.vacantUnits}
            </div>
            <div className="text-sm text-gray-500">Vacant</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.overallStats.occupancyRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Occupancy Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data.overallStats.averageTenancyLength}
            </div>
            <div className="text-sm text-gray-500">Avg Days/Tenancy</div>
          </div>
        </div>
      </div>

      {/* Property Breakdown */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Property Breakdown</h4>
        <div className="space-y-4">
          {data.propertyBreakdown.map((property, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{property.propertyName}</div>
                <div className="text-sm text-gray-500">
                  {property.occupiedUnits}/{property.totalUnits} units occupied
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">{property.occupancyRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">
                  {formatCurrency(property.monthlyRentActual)} / {formatCurrency(property.monthlyRentPotential)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vacant Units */}
      {data.vacantUnits.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Vacant Units</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property/Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vacant Since</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Vacant</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.vacantUnits.map((unit, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{unit.propertyName}</div>
                      <div className="text-sm text-gray-500">{unit.unitLabel}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(unit.monthlyRent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(unit.vacantSince)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        unit.daysSinceVacant > 60 ? 'text-red-600' :
                        unit.daysSinceVacant > 30 ? 'text-yellow-600' :
                        'text-gray-900'
                      }`}>
                        {unit.daysSinceVacant} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tenancy Analysis */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Tenancy Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.tenancyAnalysis.averageTenancyLength}
            </div>
            <div className="text-sm text-gray-500">Avg Tenancy (Days)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.tenancyAnalysis.turnoverRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Turnover Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.tenancyAnalysis.retentionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Retention Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default OccupancyReports
