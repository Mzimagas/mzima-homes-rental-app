'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import supabase, { clientBusinessFunctions, clientQueries } from '../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../components/ui/loading'
import { ErrorCard } from '../../../components/ui/error'
import FinancialReports from '../../../components/reports/financial-reports'
import OccupancyReports from '../../../components/reports/occupancy-reports'
import TenantAnalytics from '../../../components/reports/tenant-analytics'
import PropertyReports from '../../../components/reports/property-reports'
import { useRef } from 'react'

export default function ReportsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'financial' | 'occupancy' | 'tenants' | 'properties'>('financial')

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
      case 'financial': return financialRef.current
      case 'occupancy': return occupancyRef.current
      case 'tenants': return tenantsRef.current
      case 'properties': return propertiesRef.current
      default: return null
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


  const tabs = [
    { key: 'financial', label: 'Financial Reports', icon: 'chart-bar' },
    { key: 'occupancy', label: 'Occupancy Reports', icon: 'home' },
    { key: 'tenants', label: 'Tenant Analytics', icon: 'users' },
    { key: 'properties', label: 'Property Reports', icon: 'building' }
  ]

  const icons = {
    'chart-bar': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    'home': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    'users': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    'building': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
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
        <ErrorCard
          title="Failed to load reports"
          message={error}
          onRetry={() => setError(null)}
        />
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
          <button onClick={handleExportPDF} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button onClick={handleExportExcel} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              {icons[tab.icon as keyof typeof icons]}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'financial' && <FinancialReports ref={financialRef} />}
        {activeTab === 'occupancy' && <OccupancyReports ref={occupancyRef} />}
        {activeTab === 'tenants' && <TenantAnalytics ref={tenantsRef} />}
        {activeTab === 'properties' && <PropertyReports ref={propertiesRef} />}
      </div>
    </div>
  )
}
