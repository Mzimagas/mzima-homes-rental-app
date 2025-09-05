'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ReceiptPercentIcon,
  ScaleIcon,
  CalendarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import {
  TaxManagementService,
  TaxComplianceSummary,
  EnhancedLandRates,
  PropertyTaxSummary,
  TaxComplianceCalendar,
} from '../../../lib/services/tax-management.service'
import LoadingSpinner from '../../ui/LoadingSpinner'
import ErrorDisplay from '../../ui/ErrorDisplay'

interface TaxManagementTabProps {
  className?: string
  onAddTaxRecord?: () => void
  onGenerateReport?: () => void
}

export default function TaxManagementTab({
  className = '',
  onAddTaxRecord,
  onGenerateReport,
}: TaxManagementTabProps) {
  const [complianceSummary, setComplianceSummary] = useState<TaxComplianceSummary | null>(null)
  const [landRates, setLandRates] = useState<EnhancedLandRates[]>([])
  const [propertyTaxSummary, setPropertyTaxSummary] = useState<PropertyTaxSummary[]>([])
  const [complianceCalendar, setComplianceCalendar] = useState<TaxComplianceCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  // Load tax management data
  const loadTaxData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [summaryResult, landRatesResult, propertyTaxResult, calendarResult] =
        await Promise.allSettled([
          TaxManagementService.getTaxComplianceSummary(),
          TaxManagementService.getEnhancedLandRates({ limit: 10 }),
          TaxManagementService.getPropertyTaxSummary(),
          TaxManagementService.getTaxComplianceCalendar({ upcomingDays: 30 }),
        ])

      if (summaryResult.status === 'fulfilled') {
        setComplianceSummary(summaryResult.value)
      }

      if (landRatesResult.status === 'fulfilled') {
        setLandRates(landRatesResult.value.data)
      }

      if (propertyTaxResult.status === 'fulfilled') {
        setPropertyTaxSummary(propertyTaxResult.value.slice(0, 5)) // Top 5 properties
      }

      if (calendarResult.status === 'fulfilled') {
        setComplianceCalendar(calendarResult.value.slice(0, 5)) // Next 5 obligations
      }

      // Check for any errors
      const errors = [summaryResult, landRatesResult, propertyTaxResult, calendarResult]
        .filter((result) => result.status === 'rejected')
        .map((result) => (result as PromiseRejectedResult).reason.message)

      if (errors.length > 0) {
        setError(`Some tax data could not be loaded: ${errors.join(', ')}`)
      }
    } catch (err) {
      console.error('Error loading tax data:', err)
      setError('Failed to load tax data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTaxData()
  }, [loadTaxData])

  const toggleCard = (cardId: string) => {
    setActiveCard(activeCard === cardId ? null : cardId)
  }

  const formatCurrency = (amount: number) => TaxManagementService.formatCurrency(amount)
  const formatPercentage = (value: number) => TaxManagementService.formatPercentage(value)
  const getStatusColor = (status: string) => TaxManagementService.getStatusColor(status)

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error && !complianceSummary) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ErrorDisplay title="Failed to Load Tax Data" message={error} onRetry={loadTaxData} />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tax Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Kenyan tax compliance including land rates, VAT management, and withholding tax
            calculations
          </p>
        </div>
        <button
          onClick={onAddTaxRecord}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Tax Record
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tax Compliance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Land Rates Outstanding Card */}
        <div className="bg-white border-2 border-orange-200 rounded-xl p-6 hover:border-orange-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Land Rates Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(complianceSummary?.outstanding_land_rates_kes || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {complianceSummary?.pending_land_rates || 0} properties pending
              </p>
            </div>
          </div>
        </div>

        {/* VAT Outstanding Card */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ReceiptPercentIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">VAT Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(complianceSummary?.outstanding_vat_kes || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {complianceSummary?.pending_vat_returns || 0} returns pending
              </p>
            </div>
          </div>
        </div>

        {/* Withholding Tax Outstanding Card */}
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 hover:border-purple-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ScaleIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Withholding Tax Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(complianceSummary?.outstanding_withholding_kes || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {complianceSummary?.pending_withholding_returns || 0} returns pending
              </p>
            </div>
          </div>
        </div>

        {/* Total Penalties Card */}
        <div className="bg-white border-2 border-red-200 rounded-xl p-6 hover:border-red-300 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Penalties & Interest</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  (complianceSummary?.total_penalties_kes || 0) +
                    (complianceSummary?.total_interest_kes || 0)
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {complianceSummary?.upcoming_obligations || 0} upcoming obligations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Land Rates Management Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Land Rates Management</h3>
              </div>
              <button
                onClick={() => toggleCard('land_rates')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'land_rates' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Assessed Value</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(
                    propertyTaxSummary.reduce((sum, prop) => sum + prop.total_assessed_value_kes, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Annual Rates Due</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(
                    propertyTaxSummary.reduce((sum, prop) => sum + prop.total_annual_rates_kes, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Outstanding Balance</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(
                    propertyTaxSummary.reduce(
                      (sum, prop) => sum + prop.total_land_rates_outstanding_kes,
                      0
                    )
                  )}
                </span>
              </div>
            </div>

            {activeCard === 'land_rates' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Recent Land Rates</h4>
                  {landRates.slice(0, 5).map((landRate) => (
                    <div key={landRate.id} className="flex justify-between items-center py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {landRate.property_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {landRate.financial_year} • {landRate.county}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(landRate.balance_kes)}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(landRate.status)}`}
                        >
                          {landRate.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax Compliance Calendar Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Compliance Calendar</h3>
              </div>
              <button
                onClick={() => toggleCard('calendar')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {activeCard === 'calendar' ? 'Collapse' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Upcoming Obligations</span>
                <span className="font-medium text-gray-900">
                  {complianceCalendar.filter((cal) => cal.status === 'PENDING').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">This Month</span>
                <span className="font-medium text-yellow-600">
                  {
                    complianceCalendar.filter((cal) => {
                      const dueDate = new Date(cal.filing_due_date)
                      const now = new Date()
                      return (
                        dueDate.getMonth() === now.getMonth() &&
                        dueDate.getFullYear() === now.getFullYear()
                      )
                    }).length
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Overdue</span>
                <span className="font-medium text-red-600">
                  {
                    complianceCalendar.filter((cal) => {
                      const dueDate = new Date(cal.filing_due_date)
                      const now = new Date()
                      return dueDate < now && cal.status === 'PENDING'
                    }).length
                  }
                </span>
              </div>
            </div>

            {activeCard === 'calendar' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Upcoming Deadlines</h4>
                  {complianceCalendar.slice(0, 5).map((obligation) => (
                    <div key={obligation.id} className="flex justify-between items-center py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {obligation.obligation_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {TaxManagementService.getTaxTypeDisplayName(obligation.tax_type)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(obligation.filing_due_date).toLocaleDateString()}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(obligation.status)}`}
                        >
                          {obligation.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Tax Summary */}
      {propertyTaxSummary.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Tax Burden Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propertyTaxSummary.slice(0, 6).map((property) => (
              <div key={property.property_id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">{property.property_name}</h4>
                  <span className="text-sm text-gray-500">
                    {formatCurrency(property.total_tax_burden_kes)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Land Rates</span>
                    <span className="font-medium">
                      {formatCurrency(property.total_land_rates_outstanding_kes)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">VAT Impact</span>
                    <span className="font-medium">
                      {formatCurrency(
                        property.property_vat_on_sales_kes - property.property_vat_on_purchases_kes
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Withholding Tax</span>
                    <span className="font-medium">
                      {formatCurrency(property.property_withholding_tax_kes)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
