'use client'

import { useState } from 'react'
import { supabase, handleSupabaseError, clientBusinessFunctions } from '../../lib/supabase-client'

interface PropertyFormData {
  name: string
  physicalAddress: string
  lat?: number
  lng?: number
  notes?: string
}

interface PropertyFormProps {
  onSuccess?: (propertyId: string) => void
  onCancel?: () => void
  isOpen: boolean
}

export default function PropertyForm({ onSuccess, onCancel, isOpen }: PropertyFormProps) {
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    physicalAddress: '',
    lat: undefined,
    lng: undefined,
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'lat' || name === 'lng' ? (value ? parseFloat(value) : undefined) : value
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Property name is required'
    }
    if (!formData.physicalAddress.trim()) {
      return 'Physical address is required'
    }
    if (formData.lat && (formData.lat < -90 || formData.lat > 90)) {
      return 'Latitude must be between -90 and 90'
    }
    if (formData.lng && (formData.lng < -180 || formData.lng > 180)) {
      return 'Longitude must be between -180 and 180'
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
      // Ensure user is authenticated
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        setError('Please log in to create a property')
        setLoading(false)
        return
      }

      // Use the new helper function to create property with owner
      const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
        property_name: formData.name.trim(),
        property_address: formData.physicalAddress.trim(),
        property_type: 'APARTMENT', // Default type since table doesn't have type column
        owner_user_id: user.user.id
      })

      if (createError) {
        setError(`Failed to create property: ${createError.message}`)
        setLoading(false)
        return
      }

      // If we have lat/lng or notes, update the property with those details
      if (formData.lat || formData.lng || formData.notes?.trim()) {
        const updateData: any = {}
        if (formData.lat) updateData.lat = formData.lat
        if (formData.lng) updateData.lng = formData.lng
        if (formData.notes?.trim()) updateData.notes = formData.notes.trim()

        const { error: updateError } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', propertyId)

        if (updateError) {
          console.warn('Failed to update property details:', updateError.message)
          // Don't throw error here since property was created successfully
        }
      }

      // Reset form
      setFormData({
        name: '',
        physicalAddress: '',
        lat: undefined,
        lng: undefined,
        notes: ''
      })

      onSuccess?.(propertyId)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Property creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Property</h3>
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Property Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Sunset Apartments"
              />
            </div>

            <div>
              <label htmlFor="physicalAddress" className="block text-sm font-medium text-gray-700">
                Physical Address *
              </label>
              <input
                type="text"
                id="physicalAddress"
                name="physicalAddress"
                value={formData.physicalAddress}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 123 Main Street, Nairobi"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="lat" className="block text-sm font-medium text-gray-700">
                  Latitude
                </label>
                <input
                  type="number"
                  id="lat"
                  name="lat"
                  value={formData.lat || ''}
                  onChange={handleChange}
                  step="any"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="-1.2921"
                />
              </div>
              <div>
                <label htmlFor="lng" className="block text-sm font-medium text-gray-700">
                  Longitude
                </label>
                <input
                  type="number"
                  id="lng"
                  name="lng"
                  value={formData.lng || ''}
                  onChange={handleChange}
                  step="any"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="36.8219"
                />
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
                placeholder="Additional notes about the property..."
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
                  'Create Property'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
