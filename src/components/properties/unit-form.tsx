'use client'

import { useState } from 'react'
import { supabase, handleSupabaseError } from '../../lib/supabase-client'

interface UnitFormData {
  unitLabel: string
  monthlyRent: number
  deposit: number
  meterType: 'PREPAID' | 'POSTPAID' | 'NONE'
  amenities: string[]
  notes?: string
}

interface UnitFormProps {
  propertyId: string
  onSuccess?: (unitId: string) => void
  onCancel?: () => void
  isOpen: boolean
}

const AMENITY_OPTIONS = [
  'Water',
  'Electricity',
  'Internet',
  'Parking',
  'Security',
  'Garden',
  'Balcony',
  'Air Conditioning',
  'Furnished',
  'Kitchen Appliances'
]

export default function UnitForm({ propertyId, onSuccess, onCancel, isOpen }: UnitFormProps) {
  const [formData, setFormData] = useState<UnitFormData>({
    unitLabel: '',
    monthlyRent: 0,
    deposit: 0,
    meterType: 'PREPAID',
    amenities: [],
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'monthlyRent' || name === 'deposit' ? parseFloat(value) || 0 : value
    }))
  }

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: checked 
        ? [...prev.amenities, amenity]
        : prev.amenities.filter(a => a !== amenity)
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
      const { data, error: createError } = await supabase
        .from('units')
        .insert({
          property_id: propertyId,
          unit_label: formData.unitLabel.trim(),
          monthly_rent_kes: formData.monthlyRent,
          deposit_kes: formData.deposit,
          meter_type: formData.meterType,
          amenities: formData.amenities,
          notes: formData.notes?.trim() || null,
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        setError(handleSupabaseError(createError))
        return
      }

      // Reset form
      setFormData({
        unitLabel: '',
        monthlyRent: 0,
        deposit: 0,
        meterType: 'PREPAID',
        amenities: [],
        notes: ''
      })

      onSuccess?.(data.id)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Unit creation error:', err)
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
            <h3 className="text-lg font-medium text-gray-900">Add New Unit</h3>
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
                <option value="PREPAID">Prepaid</option>
                <option value="POSTPAID">Postpaid</option>
                <option value="NONE">None</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenities
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label key={amenity} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={(e) => handleAmenityChange(amenity, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about the unit..."
              />
            </div>

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
                    Creating...
                  </div>
                ) : (
                  'Create Unit'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
