'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { TaxManagementService } from '../../../lib/services/tax-management.service'
import SearchableDropdown, { DropdownOption } from '../../ui/SearchableDropdown'

interface AddTaxRecordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Property {
  id: string
  name: string
}

interface TaxConfiguration {
  id: string
  tax_name: string
  tax_type: string
  tax_rate: number
}

export default function AddTaxRecordModal({ isOpen, onClose, onSuccess }: AddTaxRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [taxConfigs, setTaxConfigs] = useState<TaxConfiguration[]>([])
  const [recordType, setRecordType] = useState<'LAND_RATES' | 'COMPLIANCE'>('LAND_RATES')

  const [landRatesData, setLandRatesData] = useState({
    property_id: '',
    parcel_number: '',
    financial_year: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
    assessed_value_kes: '',
    rate_percentage: '0.0015',
    annual_rate_kes: '',
    due_date: '',
    county: '',
    sub_county: '',
  })

  const [complianceData, setComplianceData] = useState({
    tax_type: 'VAT',
    obligation_name: '',
    description: '',
    frequency: 'MONTHLY',
    filing_due_date: '',
    payment_due_date: '',
    period_start: '',
    period_end: '',
  })

  useEffect(() => {
    if (isOpen) {
      loadFormData()
    }
  }, [isOpen])

  const loadFormData = async () => {
    try {
      const [propertiesData, taxConfigsData] = await Promise.allSettled([
        TaxManagementService.getProperties(),
        TaxManagementService.getTaxConfigurations(),
      ])

      if (propertiesData.status === 'fulfilled') {
        setProperties(propertiesData.value)
      }
      if (taxConfigsData.status === 'fulfilled') {
        setTaxConfigs(taxConfigsData.value)
      }
    } catch (error) {
      console.error('Error loading form data:', error)
    }
  }

  const calculateAnnualRate = () => {
    const assessedValue = parseFloat(landRatesData.assessed_value_kes)
    const ratePercentage = parseFloat(landRatesData.rate_percentage)

    if (assessedValue && ratePercentage) {
      const annualRate = assessedValue * (ratePercentage / 100)
      setLandRatesData((prev) => ({
        ...prev,
        annual_rate_kes: annualRate.toFixed(2),
      }))
    }
  }

  useEffect(() => {
    calculateAnnualRate()
  }, [landRatesData.assessed_value_kes, landRatesData.rate_percentage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (recordType === 'LAND_RATES') {
        const data = {
          ...landRatesData,
          assessed_value_kes: parseFloat(landRatesData.assessed_value_kes),
          rate_percentage: parseFloat(landRatesData.rate_percentage),
          annual_rate_kes: parseFloat(landRatesData.annual_rate_kes),
        }
        await TaxManagementService.createLandRatesRecord(data)
      } else {
        await TaxManagementService.createComplianceRecord(complianceData)
      }

      // Reset forms
      setLandRatesData({
        property_id: '',
        parcel_number: '',
        financial_year: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
        assessed_value_kes: '',
        rate_percentage: '0.0015',
        annual_rate_kes: '',
        due_date: '',
        county: '',
        sub_county: '',
      })

      setComplianceData({
        tax_type: 'VAT',
        obligation_name: '',
        description: '',
        frequency: 'MONTHLY',
        filing_due_date: '',
        payment_due_date: '',
        period_start: '',
        period_end: '',
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating tax record:', error)
      alert('Failed to create tax record. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Add Tax Record</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Record Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Record Type *</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="LAND_RATES"
                  checked={recordType === 'LAND_RATES'}
                  onChange={(e) => setRecordType(e.target.value as 'LAND_RATES')}
                  className="mr-2"
                />
                Land Rates
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="COMPLIANCE"
                  checked={recordType === 'COMPLIANCE'}
                  onChange={(e) => setRecordType(e.target.value as 'COMPLIANCE')}
                  className="mr-2"
                />
                Tax Compliance
              </label>
            </div>
          </div>

          {/* Land Rates Form */}
          {recordType === 'LAND_RATES' && (
            <>
              <SearchableDropdown
                label="Property"
                required
                options={properties.map((property): DropdownOption => ({
                  id: property.id,
                  label: property.name,
                }))}
                value={landRatesData.property_id}
                onChange={(value) => setLandRatesData((prev) => ({ ...prev, property_id: value }))}
                placeholder="Select property"
                emptyMessage="No properties found"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parcel Number
                  </label>
                  <input
                    type="text"
                    value={landRatesData.parcel_number}
                    onChange={(e) =>
                      setLandRatesData((prev) => ({ ...prev, parcel_number: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., NAIROBI/BLOCK1/123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Financial Year *
                  </label>
                  <input
                    type="text"
                    value={landRatesData.financial_year}
                    onChange={(e) =>
                      setLandRatesData((prev) => ({ ...prev, financial_year: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2024/2025"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assessed Value (KES) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={landRatesData.assessed_value_kes}
                    onChange={(e) =>
                      setLandRatesData((prev) => ({ ...prev, assessed_value_kes: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate Percentage (%) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={landRatesData.rate_percentage}
                    onChange={(e) =>
                      setLandRatesData((prev) => ({ ...prev, rate_percentage: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Rate (KES)
                  </label>
                  <input
                    type="text"
                    value={landRatesData.annual_rate_kes}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    placeholder="Calculated automatically"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={landRatesData.due_date}
                    onChange={(e) =>
                      setLandRatesData((prev) => ({ ...prev, due_date: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
                  <input
                    type="text"
                    value={landRatesData.county}
                    onChange={(e) =>
                      setLandRatesData((prev) => ({ ...prev, county: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Nairobi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sub County</label>
                  <input
                    type="text"
                    value={landRatesData.sub_county}
                    onChange={(e) =>
                      setLandRatesData((prev) => ({ ...prev, sub_county: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Westlands"
                  />
                </div>
              </div>
            </>
          )}

          {/* Tax Compliance Form */}
          {recordType === 'COMPLIANCE' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Type *</label>
                  <select
                    value={complianceData.tax_type}
                    onChange={(e) =>
                      setComplianceData((prev) => ({ ...prev, tax_type: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VAT">VAT</option>
                    <option value="WITHHOLDING_TAX">Withholding Tax</option>
                    <option value="INCOME_TAX">Income Tax</option>
                    <option value="LAND_RATES">Land Rates</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={complianceData.frequency}
                    onChange={(e) =>
                      setComplianceData((prev) => ({ ...prev, frequency: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Obligation Name *
                </label>
                <input
                  type="text"
                  value={complianceData.obligation_name}
                  onChange={(e) =>
                    setComplianceData((prev) => ({ ...prev, obligation_name: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Monthly VAT Return"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={complianceData.description}
                  onChange={(e) =>
                    setComplianceData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description of the tax obligation..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filing Due Date *
                  </label>
                  <input
                    type="date"
                    value={complianceData.filing_due_date}
                    onChange={(e) =>
                      setComplianceData((prev) => ({ ...prev, filing_due_date: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={complianceData.payment_due_date}
                    onChange={(e) =>
                      setComplianceData((prev) => ({ ...prev, payment_due_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={complianceData.period_start}
                    onChange={(e) =>
                      setComplianceData((prev) => ({ ...prev, period_start: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period End</label>
                  <input
                    type="date"
                    value={complianceData.period_end}
                    onChange={(e) =>
                      setComplianceData((prev) => ({ ...prev, period_end: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

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
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Tax Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
