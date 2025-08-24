'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import { FinancialReport } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'

interface FinancialReportsProps {
  onDataChange?: () => void
}

export default function FinancialReports({ onDataChange }: FinancialReportsProps) {
  const [reportType, setReportType] = useState('rent_roll')
  const [dateRange, setDateRange] = useState('current_month')
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>(null)

  useEffect(() => {
    loadProperties()
    loadDashboardStats()
  }, [])

  const loadProperties = async () => {
    try {
      const propertiesData = await RentalManagementService.getRentalProperties()
      setProperties(propertiesData)
    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  const loadDashboardStats = async () => {
    try {
      const stats = await RentalManagementService.getDashboardStats()
      setDashboardStats(stats)
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    }
  }

  const generateReport = async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Implement actual report generation based on type
      if (reportType === 'rent_roll' && selectedProperty !== 'all') {
        const rentRoll = await RentalManagementService.getRentRoll(selectedProperty)
        setReportData({ type: 'rent_roll', data: rentRoll })
      } else {
        // For now, show a placeholder
        alert(`${reportType.replace('_', ' ')} report generation will be implemented in the next phase`)
      }
    } catch (error) {
      console.error('Error generating report:', error)
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Financial Reports</h2>
          <p className="text-sm text-gray-500">Generate comprehensive financial reports</p>
        </div>
        <Button
          variant="primary"
          onClick={generateReport}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {/* Report Options */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Report Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={[
                { value: 'rent_roll', label: 'Rent Roll' },
                { value: 'income_statement', label: 'Income Statement' },
                { value: 'cash_flow', label: 'Cash Flow Report' },
                { value: 'vacancy_report', label: 'Vacancy Report' },
                { value: 'collection_report', label: 'Collection Report' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: 'current_month', label: 'Current Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'current_quarter', label: 'Current Quarter' },
                { value: 'last_quarter', label: 'Last Quarter' },
                { value: 'current_year', label: 'Current Year' },
                { value: 'custom', label: 'Custom Range' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
            <Select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              options={[
                { value: 'all', label: 'All Properties' },
                ...properties.map(property => ({
                  value: property.id,
                  label: property.name
                }))
              ]}
            />
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Financial Reports</h3>
        <p className="text-gray-500 mb-4">
          This feature will include comprehensive financial reporting with rent rolls, income statements, and analytics.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Available Reports:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Rent Roll Reports</li>
              <li>• Income Statements</li>
              <li>• Cash Flow Analysis</li>
              <li>• Vacancy Reports</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Export Options:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• PDF export</li>
              <li>• Excel spreadsheets</li>
              <li>• CSV data files</li>
              <li>• Email delivery</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Analytics:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Performance trends</li>
              <li>• Comparative analysis</li>
              <li>• ROI calculations</li>
              <li>• Forecasting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-lg p-3 text-white text-2xl mr-4">
              💰
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Income</p>
              <p className="text-2xl font-bold text-gray-900">
                KES {dashboardStats ? dashboardStats.monthlyIncome.toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-lg p-3 text-white text-2xl mr-4">
              📊
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats ? dashboardStats.occupancyRate.toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-500 rounded-lg p-3 text-white text-2xl mr-4">
              ⚠️
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding Rent</p>
              <p className="text-2xl font-bold text-gray-900">
                KES {dashboardStats ? dashboardStats.outstandingRent.toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3 text-white text-2xl mr-4">
              🏠
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats ? dashboardStats.totalProperties : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Preview</h3>
          {reportData.type === 'rent_roll' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-600">Total Units</p>
                  <p className="text-2xl font-bold text-blue-800">{reportData.data.total_units}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600">Occupied</p>
                  <p className="text-2xl font-bold text-green-800">{reportData.data.occupied_units}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-yellow-600">Vacancy Rate</p>
                  <p className="text-2xl font-bold text-yellow-800">{reportData.data.vacancy_rate.toFixed(1)}%</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-purple-600">Collection Rate</p>
                  <p className="text-2xl font-bold text-purple-800">{reportData.data.collection_rate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Financial Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Monthly Rent</p>
                    <p className="text-lg font-semibold text-gray-900">
                      KES {reportData.data.total_monthly_rent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collected Rent</p>
                    <p className="text-lg font-semibold text-green-600">
                      KES {reportData.data.collected_rent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Outstanding Rent</p>
                    <p className="text-lg font-semibold text-red-600">
                      KES {reportData.data.outstanding_rent.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
