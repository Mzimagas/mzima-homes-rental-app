'use client'

import { useState, useEffect } from 'react'
import { supabase, handleSupabaseError } from '../../lib/supabase-client'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'
import { validateEmailSimple } from '../../lib/email-validation'

interface TenantFormData {
  fullName: string
  phone: string
  email?: string
  nationalId?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelationship?: string
  emergencyContactEmail?: string
  unitId?: string
}

interface TenantFormProps {
  onSuccess?: (tenantId: string) => void
  onCancel?: () => void
  isOpen: boolean
}

interface Unit {
  id: string
  unit_label: string
  monthly_rent_kes: number
  properties: {
    name: string
  }[]
}

export default function TenantForm({ onSuccess, onCancel, isOpen }: TenantFormProps) {
  const [formData, setFormData] = useState<TenantFormData>({
    fullName: '',
    phone: '',
    email: '',
    nationalId: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    emergencyContactEmail: '',
    unitId: ''
  })
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use multi-user property access
  const { properties, currentProperty, canManageTenants } = usePropertyAccess()

  const loadAvailableUnits = async () => {
    try {
      setLoadingUnits(true)

      if (!currentProperty) {
        setAvailableUnits([])
        return
      }

      // Get units for the current property only
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          unit_label,
          monthly_rent_kes,
          property_id
        `)
        .eq('property_id', currentProperty.property_id)
        .eq('is_active', true)

      if (unitsError) {
        console.error('Error loading units:', unitsError)
        return
      }

      // Filter out units that have active tenants by checking tenancy agreements
      const { data: activeTenancies, error: tenancyError } = await supabase
        .from('tenancy_agreements')
        .select('unit_id')
        .eq('status', 'ACTIVE')

      if (tenancyError) {
        console.error('Error loading tenancies:', tenancyError)
        // Continue anyway, just don't filter
      }

      const occupiedUnitIds = activeTenancies?.map(t => t.unit_id).filter(Boolean) || []

      // Filter available units and add property names
      const availableUnitsFiltered = (unitsData || []).filter(unit =>
        !occupiedUnitIds.includes(unit.id)
      )

      // Add property names to units
      const availableUnitsWithProperties = availableUnitsFiltered.map(unit => ({
        ...unit,
        properties: [{
          name: currentProperty.property_name
        }]
      }))

      setAvailableUnits(availableUnitsWithProperties)
    } catch (err) {
      console.error('Error loading available units:', err)
    } finally {
      setLoadingUnits(false)
    }
  }

  useEffect(() => {
    if (isOpen && currentProperty) {
      loadAvailableUnits()
    }
  }, [isOpen, currentProperty])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.fullName.trim()) {
      return 'Full name is required'
    }
    if (!formData.phone.trim()) {
      return 'Phone number is required'
    }
    if (formData.email) {
      const emailError = validateEmailSimple(formData.email)
      if (emailError) {
        return emailError
      }
    }

    // Emergency contact validation
    if (formData.emergencyContactName && !formData.emergencyContactPhone) {
      return 'Emergency contact phone is required when emergency contact name is provided'
    }
    if (formData.emergencyContactPhone && !formData.emergencyContactName) {
      return 'Emergency contact name is required when emergency contact phone is provided'
    }
    if (formData.emergencyContactPhone && !/^\+?[0-9\s\-\(\)]+$/.test(formData.emergencyContactPhone)) {
      return 'Please enter a valid emergency contact phone number'
    }
    if (formData.emergencyContactEmail) {
      const emailError = validateEmailSimple(formData.emergencyContactEmail)
      if (emailError) {
        return `Emergency contact email: ${emailError}`
      }
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
      // Create tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email?.trim() || null,
          national_id: formData.nationalId?.trim() || null,
          emergency_contact_name: formData.emergencyContactName?.trim() || null,
          emergency_contact_phone: formData.emergencyContactPhone?.trim() || null,
          emergency_contact_relationship: formData.emergencyContactRelationship?.trim() || null,
          emergency_contact_email: formData.emergencyContactEmail?.trim() || null,
          status: 'ACTIVE'
        })
        .select()
        .single()

      if (tenantError) {
        setError(handleSupabaseError(tenantError))
        return
      }

      // If a unit is selected, create tenancy agreement
      if (formData.unitId) {
        const selectedUnit = availableUnits.find(u => u.id === formData.unitId)
        if (selectedUnit) {
          const { error: tenancyError } = await supabase
            .from('tenancy_agreements')
            .insert({
              tenant_id: tenantData.id,
              unit_id: formData.unitId,
              rent_kes: selectedUnit.monthly_rent_kes,
              start_date: new Date().toISOString().split('T')[0], // Today
              billing_day: 1, // Default to 1st of month
              status: 'ACTIVE'
            })

          if (tenancyError) {
            console.error('Error creating tenancy agreement:', tenancyError)
            // Don't fail the whole operation, just log the error
          }
        }
      }

      // Reset form
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        nationalId: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        emergencyContactEmail: '',
        unitId: ''
      })

      onSuccess?.(tenantData.id)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Tenant creation error:', err)
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
            <h3 className="text-lg font-medium text-gray-900">Add New Tenant</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Permission check */}
          {!currentProperty && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please select a property to add tenants to.
              </p>
            </div>
          )}

          {currentProperty && !canManageTenants(currentProperty.property_id) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                You don't have permission to manage tenants for this property.
                Contact the property owner to request access.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+254 700 000 000"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700">
                National ID
              </label>
              <input
                type="text"
                id="nationalId"
                name="nationalId"
                value={formData.nationalId}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="12345678"
              />
            </div>

            {/* Emergency Contact Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact / Next of Kin</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="emergencyContactName"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+254 700 000 001"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700">
                    Relationship
                  </label>
                  <select
                    id="emergencyContactRelationship"
                    name="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select relationship</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Sister">Sister</option>
                    <option value="Brother">Brother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="emergencyContactEmail" className="block text-sm font-medium text-gray-700">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    id="emergencyContactEmail"
                    name="emergencyContactEmail"
                    value={formData.emergencyContactEmail}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="unitId" className="block text-sm font-medium text-gray-700">
                Assign Unit (Optional)
              </label>
              <select
                id="unitId"
                name="unitId"
                value={formData.unitId}
                onChange={handleChange}
                disabled={loadingUnits}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a unit (optional)</option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.properties[0]?.name} - {unit.unit_label} (KES {unit.monthly_rent_kes.toLocaleString()}/month)
                  </option>
                ))}
              </select>
              {loadingUnits && (
                <p className="mt-1 text-sm text-gray-500">Loading available units...</p>
              )}
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
                disabled={loading || !currentProperty || !canManageTenants(currentProperty?.property_id || '')}
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
                  'Create Tenant'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
