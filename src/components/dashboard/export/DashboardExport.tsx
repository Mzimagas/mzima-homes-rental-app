/**
 * Dashboard Export Functionality
 * Comprehensive PDF and Excel export features using existing export-utils.ts patterns
 * Supports dashboard reports, analytics, and customizable export options
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { 
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  Cog6ToothIcon,
  CalendarIcon,
  FunnelIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useDashboardContext } from '../../../contexts/DashboardContextProvider'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'
import { LoadingSpinner } from '../../ui/loading'
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
} from '../../../lib/export-utils'

// Export configuration interfaces
export interface DashboardExportConfig {
  format: 'pdf' | 'excel' | 'both'
  sections: {
    overview: boolean
    properties: boolean
    financial: boolean
    tenants: boolean
    charts: boolean
  }
  dateRange: {
    startDate: string
    endDate: string
  }
  includeFilters: boolean
  includeCharts: boolean
  customTitle?: string
  customSubtitle?: string
}

export interface ExportSection {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  enabled: boolean
  required?: boolean
}

// Component props
export interface DashboardExportProps {
  onExportStart?: () => void
  onExportComplete?: (success: boolean) => void
  onExportError?: (error: string) => void
  className?: string
}

// Export button component
interface ExportButtonProps {
  format: 'pdf' | 'excel'
  loading: boolean
  onClick: () => void
  disabled?: boolean
}

const ExportButton: React.FC<ExportButtonProps> = ({ format, loading, onClick, disabled }) => {
  const config = {
    pdf: {
      icon: DocumentTextIcon,
      label: 'Export PDF',
      color: 'bg-red-600 hover:bg-red-700',
      description: 'Generate PDF report with charts and tables'
    },
    excel: {
      icon: TableCellsIcon,
      label: 'Export Excel',
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Export data to Excel spreadsheet'
    }
  }

  const { icon: Icon, label, color, description } = config[format]

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors
        ${disabled ? 'bg-gray-400 cursor-not-allowed' : color}
      `}
      title={description}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span>{label}</span>
    </button>
  )
}

// Export configuration modal
interface ExportConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (config: DashboardExportConfig) => void
  loading: boolean
}

const ExportConfigModal: React.FC<ExportConfigModalProps> = ({
  isOpen,
  onClose,
  onExport,
  loading
}) => {
  const [config, setConfig] = useState<DashboardExportConfig>({
    format: 'pdf',
    sections: {
      overview: true,
      properties: true,
      financial: true,
      tenants: true,
      charts: true
    },
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    includeFilters: true,
    includeCharts: true,
    customTitle: '',
    customSubtitle: ''
  })

  const sections: ExportSection[] = [
    {
      id: 'overview',
      title: 'Dashboard Overview',
      description: 'Key metrics and summary cards',
      icon: DocumentTextIcon,
      enabled: config.sections.overview,
      required: true
    },
    {
      id: 'properties',
      title: 'Property Analytics',
      description: 'Property performance and occupancy data',
      icon: DocumentTextIcon,
      enabled: config.sections.properties
    },
    {
      id: 'financial',
      title: 'Financial Dashboard',
      description: 'Revenue, expenses, and payment analytics',
      icon: DocumentTextIcon,
      enabled: config.sections.financial
    },
    {
      id: 'tenants',
      title: 'Tenant Management',
      description: 'Tenant analytics and lease information',
      icon: DocumentTextIcon,
      enabled: config.sections.tenants
    },
    {
      id: 'charts',
      title: 'Charts & Visualizations',
      description: 'Include charts and graphs in export',
      icon: DocumentTextIcon,
      enabled: config.sections.charts
    }
  ]

  const handleSectionToggle = (sectionId: string) => {
    setConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: !prev.sections[sectionId as keyof typeof prev.sections]
      }
    }))
  }

  const handleExport = () => {
    onExport(config)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Export Dashboard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Export Format */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
            <div className="flex space-x-4">
              {(['pdf', 'excel', 'both'] as const).map(format => (
                <label key={format} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    checked={config.format === format}
                    onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as any }))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{format}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Date Range</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={config.dateRange.startDate}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, startDate: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={config.dateRange.endDate}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, endDate: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Custom Titles */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Custom Titles (Optional)</label>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Custom report title"
                value={config.customTitle}
                onChange={(e) => setConfig(prev => ({ ...prev, customTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Custom subtitle"
                value={config.customSubtitle}
                onChange={(e) => setConfig(prev => ({ ...prev, customSubtitle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sections to Include */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Sections to Include</label>
            <div className="space-y-3">
              {sections.map(section => (
                <label key={section.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => handleSectionToggle(section.id)}
                    disabled={section.required}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{section.title}</div>
                    <div className="text-sm text-gray-600">{section.description}</div>
                  </div>
                  {section.required && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Required</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Additional Options</label>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.includeFilters}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeFilters: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include current filters and search criteria</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.includeCharts}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include charts and visualizations (PDF only)</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              <span>Export Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Main Dashboard Export Component
 */
export const DashboardExport: React.FC<DashboardExportProps> = ({
  onExportStart,
  onExportComplete,
  onExportError,
  className = ''
}) => {
  const { state } = useDashboardContext()
  const store = useDashboardStore()
  
  const [loading, setLoading] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | null>(null)

  // Get current dashboard data
  const dashboardData = useMemo(() => {
    return {
      metrics: store.metrics,
      properties: store.properties,
      tenants: store.tenants,
      financial: store.financial,
      filters: state.searchFilters,
      searchQuery: state.searchQuery
    }
  }, [store, state])

  // Quick export handlers
  const handleQuickExport = useCallback(async (format: 'pdf' | 'excel') => {
    const defaultConfig: DashboardExportConfig = {
      format,
      sections: {
        overview: true,
        properties: true,
        financial: true,
        tenants: true,
        charts: format === 'pdf'
      },
      dateRange: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      includeFilters: true,
      includeCharts: format === 'pdf'
    }

    await handleExport(defaultConfig)
  }, [])

  // Main export handler
  const handleExport = useCallback(async (config: DashboardExportConfig) => {
    try {
      setLoading(true)
      onExportStart?.()

      const exportOptions: ExportOptions = {
        title: config.customTitle || 'Property Management Dashboard Report',
        subtitle: config.customSubtitle || `Comprehensive Analytics Report`,
        dateRange: config.dateRange,
        filters: config.includeFilters ? {
          'Search Query': state.searchQuery || 'None',
          'Active Filters': state.searchFilters?.length > 0 ? 
            state.searchFilters.map(f => `${f.id}: ${f.value}`).join(', ') : 'None',
          'Generated On': new Date().toLocaleString()
        } : undefined,
        data: dashboardData,
        filename: generateFilename('dashboard-report', config.dateRange)
      }

      if (config.format === 'pdf' || config.format === 'both') {
        await exportToPDF(exportOptions, config)
      }

      if (config.format === 'excel' || config.format === 'both') {
        await exportToExcel(exportOptions, config)
      }

      onExportComplete?.(true)
      setShowConfigModal(false)
    } catch (error) {
      console.error('Export failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      onExportError?.(errorMessage)
      onExportComplete?.(false)
    } finally {
      setLoading(false)
    }
  }, [state, dashboardData, onExportStart, onExportComplete, onExportError])

  // PDF export implementation
  const exportToPDF = async (options: ExportOptions, config: DashboardExportConfig) => {
    const jsPDF = (await import('jspdf')).default
    await import('jspdf-autotable')

    const doc = new jsPDF()
    let yPosition = await createPDFHeader(doc, options)

    // Add summary metrics if overview is enabled
    if (config.sections.overview && dashboardData.metrics) {
      const summaryData = [
        { title: 'Total Properties', value: dashboardData.metrics.totalProperties || 0 },
        { title: 'Active Tenants', value: dashboardData.metrics.activeTenants || 0 },
        { title: 'Monthly Revenue', value: formatCurrency(dashboardData.metrics.monthlyRevenue || 0) },
        { title: 'Occupancy Rate', value: formatPercentage(dashboardData.metrics.occupancyRate || 0) }
      ]
      
      yPosition = addSummaryCardsToPDF(doc, summaryData, yPosition)
    }

    // Add property data if enabled
    if (config.sections.properties && dashboardData.properties) {
      const propertyTableData: TableData = {
        headers: ['Property Name', 'Location', 'Units', 'Occupancy', 'Monthly Revenue'],
        rows: dashboardData.properties.map(property => [
          property.name || '',
          property.location || '',
          property.units?.toString() || '0',
          formatPercentage(property.occupancyRate || 0),
          formatCurrency(property.monthlyRevenue || 0)
        ])
      }
      
      yPosition = addTableToPDF(doc, propertyTableData, yPosition, 'Property Performance')
    }

    // Add financial data if enabled
    if (config.sections.financial && dashboardData.financial) {
      const financialTableData: TableData = {
        headers: ['Category', 'Amount', 'Percentage', 'Trend'],
        rows: dashboardData.financial.map(item => [
          item.category || '',
          formatCurrency(item.amount || 0),
          formatPercentage(item.percentage || 0),
          item.trend || ''
        ])
      }
      
      yPosition = addTableToPDF(doc, financialTableData, yPosition, 'Financial Summary')
    }

    savePDFFile(doc, options.filename)
  }

  // Excel export implementation
  const exportToExcel = async (options: ExportOptions, config: DashboardExportConfig) => {
    const workbook = createExcelWorkbook(options)

    // Add summary dashboard if overview is enabled
    if (config.sections.overview && dashboardData.metrics) {
      const summaryData = [
        { title: 'Total Properties', value: dashboardData.metrics.totalProperties || 0 },
        { title: 'Active Tenants', value: dashboardData.metrics.activeTenants || 0 },
        { title: 'Monthly Revenue', value: dashboardData.metrics.monthlyRevenue || 0 },
        { title: 'Occupancy Rate', value: dashboardData.metrics.occupancyRate || 0 }
      ]
      
      addSummaryDashboardToExcel(workbook, summaryData, options)
    }

    // Add property data if enabled
    if (config.sections.properties && dashboardData.properties) {
      const propertyTableData: TableData = {
        headers: ['Property Name', 'Location', 'Units', 'Occupancy Rate', 'Monthly Revenue'],
        rows: dashboardData.properties.map(property => [
          property.name || '',
          property.location || '',
          property.units || 0,
          property.occupancyRate || 0,
          property.monthlyRevenue || 0
        ])
      }
      
      addTableToExcel(workbook, propertyTableData, 'Properties')
    }

    // Add financial data if enabled
    if (config.sections.financial && dashboardData.financial) {
      const financialTableData: TableData = {
        headers: ['Category', 'Amount', 'Percentage', 'Trend'],
        rows: dashboardData.financial.map(item => [
          item.category || '',
          item.amount || 0,
          item.percentage || 0,
          item.trend || ''
        ])
      }
      
      addTableToExcel(workbook, financialTableData, 'Financial')
    }

    // Add tenant data if enabled
    if (config.sections.tenants && dashboardData.tenants) {
      const tenantTableData: TableData = {
        headers: ['Tenant Name', 'Property', 'Unit', 'Lease Start', 'Monthly Rent', 'Status'],
        rows: dashboardData.tenants.map(tenant => [
          tenant.name || '',
          tenant.propertyName || '',
          tenant.unitNumber || '',
          tenant.leaseStart || '',
          tenant.monthlyRent || 0,
          tenant.status || ''
        ])
      }
      
      addTableToExcel(workbook, tenantTableData, 'Tenants')
    }

    saveExcelFile(workbook, options.filename)
  }

  return (
    <div className={`dashboard-export ${className}`}>
      {/* Quick Export Buttons */}
      <div className="flex items-center space-x-3">
        <ExportButton
          format="pdf"
          loading={loading && exportFormat === 'pdf'}
          onClick={() => handleQuickExport('pdf')}
          disabled={loading}
        />
        
        <ExportButton
          format="excel"
          loading={loading && exportFormat === 'excel'}
          onClick={() => handleQuickExport('excel')}
          disabled={loading}
        />
        
        <button
          onClick={() => setShowConfigModal(true)}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          <span>Custom Export</span>
        </button>
      </div>

      {/* Export Configuration Modal */}
      <ExportConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onExport={handleExport}
        loading={loading}
      />
    </div>
  )
}

export default DashboardExport
