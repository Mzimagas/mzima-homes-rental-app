'use client'

import React, { useState, useEffect, Suspense, lazy, useRef } from 'react'
import { useAuth } from '../../../lib/auth-context'
import supabase from '../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../components/ui/loading'
import { ErrorCard } from '../../../components/ui/error'
import ErrorBoundary from '../../../components/ui/ErrorBoundary'
import ReportsWorkflowNavigation, { ReportsTab } from '../../../components/reports/components/ReportsWorkflowNavigation'

// Lazy load heavy report components
const FinancialReports = lazy(() => import('../../../components/reports/financial-reports'))
const OccupancyReports = lazy(() => import('../../../components/reports/occupancy-reports'))
const TenantAnalytics = lazy(() => import('../../../components/reports/tenant-analytics'))
const PropertyReports = lazy(() => import('../../../components/reports/property-reports'))

// Loading component for report tabs - memoized to prevent unnecessary re-renders
const ReportTabLoading = React.memo(function ReportTabLoading() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading report...</p>
      </div>
    </div>
  )
})

const ReportsPage: React.FC = function ReportsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ReportsTab>('financial')

  useEffect(() => {
    // Initialize any required data
    setLoading(false)
  }, [])

  // Refs to child report components
  const financialRef = useRef<any>(null)
  const occupancyRef = useRef<any>(null)
  const tenantsRef = useRef<any>(null)
  const propertiesRef = useRef<any>(null)

  const [isExporting, setIsExporting] = useState(false)

  const activeExporters = () => {
    switch (activeTab) {
      case 'financial':
        return financialRef.current
      case 'occupancy':
        return occupancyRef.current
      case 'tenants':
        return tenantsRef.current
      case 'properties':
        return propertiesRef.current
      default:
        return null
    }
  }

  const handleExportPDF = async () => {
    const exp = activeExporters()
    if (exp && exp.exportPDF) {
      setIsExporting(true)
      try {
        await exp.exportPDF()
      } finally {
        setIsExporting(false)
      }
    }
  }

  const handleExportExcel = async () => {
    const exp = activeExporters()
    if (exp && exp.exportExcel) {
      setIsExporting(true)
      try {
        await exp.exportExcel()
      } finally {
        setIsExporting(false)
      }
    }
  }



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading reports..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
        </div>
        <ErrorCard title="Failed to load reports" message={error} onRetry={() => setError(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights into your rental business performance
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Workflow Navigation */}
      <ReportsWorkflowNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content with Lazy Loading */}
      <div className="min-h-[600px]">
        <ErrorBoundary>
          <Suspense fallback={<ReportTabLoading />}>
            {activeTab === 'financial' && <FinancialReports ref={financialRef} />}
            {activeTab === 'occupancy' && <OccupancyReports ref={occupancyRef} />}
            {activeTab === 'tenants' && <TenantAnalytics ref={tenantsRef} />}
            {activeTab === 'properties' && <PropertyReports ref={propertiesRef} />}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default ReportsPage
