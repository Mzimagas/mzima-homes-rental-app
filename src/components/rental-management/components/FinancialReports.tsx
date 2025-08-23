'use client'

import { useState } from 'react'
import { Button, TextField, Select } from '../../ui'

interface FinancialReportsProps {
  onDataChange?: () => void
}

export default function FinancialReports({ onDataChange }: FinancialReportsProps) {
  const [reportType, setReportType] = useState('rent_roll')
  const [dateRange, setDateRange] = useState('current_month')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Financial Reports</h2>
          <p className="text-sm text-gray-500">Generate comprehensive financial reports</p>
        </div>
        <Button variant="primary">
          Generate Report
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
              options={[
                { value: 'all', label: 'All Properties' },
                { value: 'property1', label: 'Property 1' },
                { value: 'property2', label: 'Property 2' },
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
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">KES 0</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-lg p-3 text-white text-2xl mr-4">
              📊
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Collection Rate</p>
              <p className="text-2xl font-bold text-gray-900">0%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-500 rounded-lg p-3 text-white text-2xl mr-4">
              ⚠️
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">KES 0</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3 text-white text-2xl mr-4">
              🏠
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Occupancy</p>
              <p className="text-2xl font-bold text-gray-900">0%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
