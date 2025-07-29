'use client'

import { useState, useEffect } from 'react'
import { supabase, handleSupabaseError } from '../../lib/supabase-client'

interface UnitFormData {
  unitLabel: string
  monthlyRent: number
  deposit: number
  meterType: 'PREPAID' | 'POSTPAID_ANALOGUE'
  kplcAccount?: string
  waterIncluded: boolean
  waterMeterType?: 'DIRECT_TAVEVO' | 'INTERNAL_SUBMETER'
  waterMeterNumber?: string
}

interface UnitFormProps {
  propertyId: string
  unit?: {
    id: string
    unit_label: string
    monthly_rent_kes: number
    deposit_kes: number
    meter_type: 'PREPAID' | 'POSTPAID_ANALOGUE'
    kplc_account?: string
    water_included: boolean
    water_meter_type?: 'DIRECT_TAVEVO' | 'INTERNAL_SUBMETER' | null
    water_meter_number?: string | null
  }
  onSuccess?: (unitId: string) => void
  onCancel?: () => void
  isOpen: boolean
}

const METER_TYPE_OPTIONS = [
  { value: 'PREPAID', label: 'Prepaid' },
  { value: 'POSTPAID_ANALOGUE', label: 'Postpaid (Analogue)' }
]

const WATER_METER_TYPE_OPTIONS = [
  { value: 'DIRECT_TAVEVO', label: 'Direct Tavevo Meter' },
  { value: 'INTERNAL_SUBMETER', label: 'Internal Submeter' }
]

export default function UnitForm({ propertyId, unit, onSuccess, onCancel, isOpen }: UnitFormProps) {
  const [formData, setFormData] = useState<UnitFormData>({
    unitLabel: unit?.unit_label || '',
    monthlyRent: unit?.monthly_rent_kes || 0,
    deposit: unit?.deposit_kes || 0,
    meterType: unit?.meter_type || 'PREPAID',
    kplcAccount: unit?.kplc_account || '',
    waterIncluded: unit?.water_included || false,
    waterMeterType: unit?.water_meter_type || undefined,
    waterMeterNumber: unit?.water_meter_number || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update form data when unit prop changes
  useEffect(() => {
    if (unit) {
      setFormData({
        unitLabel: unit.unit_label,
        monthlyRent: unit.monthly_rent_kes,
        deposit: unit.deposit_kes,
        meterType: unit.meter_type,
        kplcAccount: unit.kplc_account || '',
        waterIncluded: unit.water_included,
        waterMeterType: unit.water_meter_type || undefined,
        waterMeterNumber: unit.water_meter_number || ''
      })
    } else {
      setFormData({
        unitLabel: '',
        monthlyRent: 0,
        deposit: 0,
        meterType: 'PREPAID',
        kplcAccount: '',
        waterIncluded: false,
        waterMeterType: undefined,
        waterMeterNumber: ''
      })
    }
  }, [unit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'monthlyRent' || name === 'deposit' ? parseFloat(value) || 0 : value)
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.unitLabel.trim()) {
      return 'Unit label is required'
    }
    if (formData.monthlyRent <= 0) {
      return 'Monthly rent must be greater than 0'
    }
    if (formData.deposit < 0) {
      return 'Deposit cannot be negative'
    }
    // Validate water meter requirements
    if (!formData.waterIncluded && !formData.waterMeterType) {
      return 'Water meter type is required when water is not included in rent'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      if (unit) {
        // Update existing unit
        const { data, error: updateError } = await supabase
          .from('units')
          .update({
            unit_label: formData.unitLabel.trim(),
            monthly_rent_kes: formData.monthlyRent,
            deposit_kes: formData.deposit,
            meter_type: formData.meterType,
            kplc_account: formData.kplcAccount?.trim() || null,
            water_included: formData.waterIncluded,
            water_meter_type: formData.waterIncluded ? null : formData.waterMeterType,
            water_meter_number: formData.waterIncluded ? null : formData.waterMeterNumber?.trim() || null
          })
          .eq('id', unit.id)
          .select()
          .single()

        if (updateError) {
          setError(handleSupabaseError(updateError))
          return
        }

        onSuccess?.(data.id)
      } else {
        // Create new unit
        const { data, error: createError } = await supabase
          .from('units')
          .insert({
            property_id: propertyId,
            unit_label: formData.unitLabel.trim(),
            monthly_rent_kes: formData.monthlyRent,
            deposit_kes: formData.deposit,
            meter_type: formData.meterType,
            kplc_account: formData.kplcAccount?.trim() || null,
            water_included: formData.waterIncluded,
            water_meter_type: formData.waterIncluded ? null : formData.waterMeterType,
            water_meter_number: formData.waterIncluded ? null : formData.waterMeterNumber?.trim() || null,
            is_active: true
          })
          .select()
          .single()

        if (createError) {
          setError(handleSupabaseError(createError))
          return
        }

        // Reset form only for new units
        setFormData({
          unitLabel: '',
          monthlyRent: 0,
          deposit: 0,
          meterType: 'PREPAID',
          kplcAccount: '',
          waterIncluded: false,
          waterMeterType: undefined,
          waterMeterNumber: ''
        })

        onSuccess?.(data.id)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Unit operation error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {unit ? 'Edit Unit' : 'Add New Unit'}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="unitLabel" className="block text-sm font-medium text-gray-700">
                Unit Label *
              </label>
              <input
                type="text"
                id="unitLabel"
                name="unitLabel"
                value={formData.unitLabel}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., A1, Unit 101, House 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="monthlyRent" className="block text-sm font-medium text-gray-700">
                  Monthly Rent (KES) *
                </label>
                <input
                  type="number"
                  id="monthlyRent"
                  name="monthlyRent"
                  value={formData.monthlyRent || ''}
                  onChange={handleChange}
                  required
                  min="0"
                  step="100"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="25000"
                />
              </div>
              <div>
                <label htmlFor="deposit" className="block text-sm font-medium text-gray-700">
                  Deposit (KES)
                </label>
                <input
                  type="number"
                  id="deposit"
                  name="deposit"
                  value={formData.deposit || ''}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="50000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="meterType" className="block text-sm font-medium text-gray-700">
                Meter Type
              </label>
              <select
                id="meterType"
                name="meterType"
                value={formData.meterType}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {METER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="kplcAccount" className="block text-sm font-medium text-gray-700">
                KPLC Account Number (Optional)
              </label>
              <input
                type="text"
                id="kplcAccount"
                name="kplcAccount"
                value={formData.kplcAccount}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 12345678"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="waterIncluded"
                  checked={formData.waterIncluded}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Water included in rent</span>
              </label>
            </div>

            {/* Water Meter Management - Show only when water is NOT included */}
            {!formData.waterIncluded && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900">Water Meter Configuration</h4>

                <div>
                  <label htmlFor="waterMeterType" className="block text-sm font-medium text-gray-700">
                    Water Meter Type *
                  </label>
                  <select
                    id="waterMeterType"
                    name="waterMeterType"
                    value={formData.waterMeterType || ''}
                    onChange={handleChange}
                    required={!formData.waterIncluded}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select water meter type</option>
                    {WATER_METER_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.waterMeterType === 'DIRECT_TAVEVO'
                      ? 'Direct utility company water meter with individual billing'
                      : formData.waterMeterType === 'INTERNAL_SUBMETER'
                      ? 'Landlord-managed internal water meter for cost allocation'
                      : 'Choose the type of water meter for this unit'
                    }
                  </p>
                </div>

                {formData.waterMeterType && (
                  <div>
                    <label htmlFor="waterMeterNumber" className="block text-sm font-medium text-gray-700">
                      Water Meter Number (Optional)
                    </label>
                    <input
                      type="text"
                      id="waterMeterNumber"
                      name="waterMeterNumber"
                      value={formData.waterMeterNumber || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={formData.waterMeterType === 'DIRECT_TAVEVO' ? 'e.g., WM123456' : 'e.g., SUB-001'}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the meter identification number for tracking and billing purposes
                    </p>
                  </div>
                )}
              </div>
            )}



            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {unit ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  unit ? 'Update Unit' : 'Create Unit'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
