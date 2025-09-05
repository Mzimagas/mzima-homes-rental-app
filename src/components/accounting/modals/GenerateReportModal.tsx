'use client'

import React, { useState } from 'react'
import { XMarkIcon, DocumentArrowDownIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { FinancialReportingService } from '../../../lib/services/financial-reporting.service'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type ReportType =
  | 'PROFIT_LOSS'
  | 'CASH_FLOW'
  | 'BALANCE_SHEET'
  | 'PORTFOLIO_PERFORMANCE'
  | 'MEMBER_CONTRIBUTIONS'
  | 'TAX_SUMMARY'
type ReportFormat = 'PDF' | 'EXCEL' | 'CSV'
type DateRange =
  | 'CURRENT_MONTH'
  | 'LAST_MONTH'
  | 'CURRENT_QUARTER'
  | 'LAST_QUARTER'
  | 'CURRENT_YEAR'
  | 'LAST_YEAR'
  | 'CUSTOM'

export default function GenerateReportModal({
  isOpen,
  onClose,
  onSuccess,
}: GenerateReportModalProps) {
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState<ReportType>('PROFIT_LOSS')
  const [reportFormat, setReportFormat] = useState<ReportFormat>('PDF')
  const [dateRange, setDateRange] = useState<DateRange>('CURRENT_MONTH')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [includeDetails, setIncludeDetails] = useState(true)
  const [includeCharts, setIncludeCharts] = useState(true)

  const reportTypes = [
    {
      value: 'PROFIT_LOSS',
      label: 'Profit & Loss Statement',
      description: 'Income and expenses summary',
    },
    { value: 'CASH_FLOW', label: 'Cash Flow Statement', description: 'Cash inflows and outflows' },
    {
      value: 'BALANCE_SHEET',
      label: 'Balance Sheet',
      description: 'Assets, liabilities, and equity',
    },
    {
      value: 'PORTFOLIO_PERFORMANCE',
      label: 'Portfolio Performance',
      description: 'Property performance analysis',
    },
    {
      value: 'MEMBER_CONTRIBUTIONS',
      label: 'Member Contributions',
      description: 'Member contribution summary',
    },
    { value: 'TAX_SUMMARY', label: 'Tax Summary', description: 'Tax obligations and compliance' },
  ]

  const dateRanges = [
    { value: 'CURRENT_MONTH', label: 'Current Month' },
    { value: 'LAST_MONTH', label: 'Last Month' },
    { value: 'CURRENT_QUARTER', label: 'Current Quarter' },
    { value: 'LAST_QUARTER', label: 'Last Quarter' },
    { value: 'CURRENT_YEAR', label: 'Current Year' },
    { value: 'LAST_YEAR', label: 'Last Year' },
    { value: 'CUSTOM', label: 'Custom Range' },
  ]

  const getDateRangeValues = (range: DateRange) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    switch (range) {
      case 'CURRENT_MONTH':
        return {
          startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
        }
      case 'LAST_MONTH':
        return {
          startDate: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0],
        }
      case 'CURRENT_QUARTER':
        const quarterStart = Math.floor(currentMonth / 3) * 3
        return {
          startDate: new Date(currentYear, quarterStart, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, quarterStart + 3, 0).toISOString().split('T')[0],
        }
      case 'LAST_QUARTER':
        const lastQuarterStart = Math.floor(currentMonth / 3) * 3 - 3
        return {
          startDate: new Date(currentYear, lastQuarterStart, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, lastQuarterStart + 3, 0).toISOString().split('T')[0],
        }
      case 'CURRENT_YEAR':
        return {
          startDate: new Date(currentYear, 0, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, 11, 31).toISOString().split('T')[0],
        }
      case 'LAST_YEAR':
        return {
          startDate: new Date(currentYear - 1, 0, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear - 1, 11, 31).toISOString().split('T')[0],
        }
      case 'CUSTOM':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        }
      default:
        return {
          startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
        }
    }
  }

  const handleGenerate = async () => {
    setLoading(true)

    try {
      const { startDate, endDate } = getDateRangeValues(dateRange)

      const reportOptions = {
        reportType,
        format: reportFormat,
        startDate,
        endDate,
        includeDetails,
        includeCharts: includeCharts && reportFormat === 'PDF',
      }

      let reportData

      switch (reportType) {
        case 'PROFIT_LOSS':
          reportData = await FinancialReportingService.generateProfitLossStatement(
            startDate,
            endDate
          )
          break
        case 'CASH_FLOW':
          reportData = await FinancialReportingService.generateCashFlowStatement(startDate, endDate)
          break
        case 'PORTFOLIO_PERFORMANCE':
          reportData = await FinancialReportingService.generatePortfolioPerformance(
            startDate,
            endDate
          )
          break
        case 'MEMBER_CONTRIBUTIONS':
          reportData = await FinancialReportingService.generateMemberContributionReport(
            startDate,
            endDate
          )
          break
        default:
          throw new Error('Report type not implemented yet')
      }

      // Generate and download the report
      await downloadReport(reportData, reportOptions)

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async (data: any, options: any) => {
    // Create a simple report content
    const reportContent = generateReportContent(data, options)

    if (options.format === 'PDF') {
      // For PDF, we'll create a simple HTML version and trigger print
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(reportContent)
        printWindow.document.close()
        printWindow.print()
      }
    } else {
      // For CSV/Excel, create a downloadable file
      const blob = new Blob([reportContent], {
        type: options.format === 'CSV' ? 'text/csv' : 'application/vnd.ms-excel',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${options.reportType}_${options.startDate}_${options.endDate}.${options.format.toLowerCase()}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const generateReportContent = (data: any, options: any) => {
    const { reportType, startDate, endDate } = options

    if (options.format === 'PDF') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${reportTypes.find((r) => r.value === reportType)?.label}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .period { color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .amount { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Mzima Homes</h1>
            <h2>${reportTypes.find((r) => r.value === reportType)?.label}</h2>
            <p class="period">Period: ${startDate} to ${endDate}</p>
          </div>
          <div class="content">
            ${JSON.stringify(data, null, 2)}
          </div>
        </body>
        </html>
      `
    } else {
      // Simple CSV format
      return `Report Type,${reportType}\nPeriod,${startDate} to ${endDate}\nData,${JSON.stringify(data)}`
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <ChartBarIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Generate Financial Report</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Report Type *</label>
            <div className="grid grid-cols-1 gap-3">
              {reportTypes.map((type) => (
                <label
                  key={type.value}
                  className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    value={type.value}
                    checked={reportType === type.value}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range *</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Report Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format *</label>
            <div className="flex space-x-4">
              {(['PDF', 'EXCEL', 'CSV'] as ReportFormat[]).map((format) => (
                <label key={format} className="flex items-center">
                  <input
                    type="radio"
                    value={format}
                    checked={reportFormat === format}
                    onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
                    className="mr-2"
                  />
                  {format}
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="mr-2"
                />
                Include detailed transactions
              </label>
              {reportFormat === 'PDF' && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    className="mr-2"
                  />
                  Include charts and graphs
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || (dateRange === 'CUSTOM' && (!customStartDate || !customEndDate))}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
