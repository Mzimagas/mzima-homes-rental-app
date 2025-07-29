'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { supabase } from '../../lib/supabase-client'
import { LoadingCard } from '../ui/loading'
import { ErrorCard } from '../ui/error'
import PropertyForm from './property-form'

interface Property {
  id: string
  name: string
  physical_address: string
  landlord_id: string
  lat?: number
  lng?: number
  notes?: string
  created_at: string
  updated_at: string
  units?: Unit[]
}

interface Unit {
  id: string
  unit_label: string
  monthly_rent_kes: number
  is_active: boolean
  tenants?: Tenant[]
}

interface Tenant {
  id: string
  full_name: string
  status: string
}

export default function CorrectedPropertiesPage() {
  const { user, loading: authLoading } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPropertyForm, setShowPropertyForm] = useState(false)

  const loadProperties = async () => {
    try {
      setLoading(true)
      setError(null)

      // Ensure user is authenticated
      if (!user?.id) {
        setError('Please log in to view your properties')
        return
      }

      console.log('Loading properties for user:', user.email)

      // Use the new helper function to get accessible properties
      const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')

      if (accessError) {
        console.error('Error getting accessible properties:', accessError)
        setError('Failed to load your properties. Please check your permissions.')
        return
      }

      if (!accessibleProperties || accessibleProperties.length === 0) {
        console.log('No accessible properties found for user')
        setProperties([])
        return
      }

      console.log(`Found ${accessibleProperties.length} accessible properties`)

      // Get property IDs
      const propertyIds = accessibleProperties.map(p => p.property_id)

      // Get full property details with units and tenants
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          physical_address,
          landlord_id,
          lat,
          lng,
          notes,
          created_at,
          updated_at,
          units (
            id,
            unit_label,
            monthly_rent_kes,
            is_active,
            tenants (
              id,
              full_name,
              status
            )
          )
        `)
        .in('id', propertyIds)
        .order('name')

      if (propertiesError) {
        console.error('Error loading property details:', propertiesError)
        setError('Failed to load property details')
        return
      }

      console.log(`Loaded ${propertiesData?.length || 0} properties with details`)
      setProperties(propertiesData || [])

    } catch (err) {
      console.error('Properties loading error:', err)
      setError('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadProperties()
    } else if (!authLoading && !user) {
      setError('Please log in to view your properties')
      setLoading(false)
    }
  }, [user, authLoading])

  const handleAddProperty = () => {
    setShowPropertyForm(true)
  }

  const handlePropertyFormSuccess = () => {
    setShowPropertyForm(false)
    loadProperties() // Refresh the properties list
  }

  const handlePropertyFormCancel = () => {
    setShowPropertyForm(false)
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingCard title="Loading properties..." />
          <LoadingCard title="Loading properties..." />
          <LoadingCard title="Loading properties..." />
        </div>
      </div>
    )
  }

  // Show authentication error
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
        </div>
        <ErrorCard 
          title="Authentication Required"
          message="Please log in to view your properties"
          onRetry={() => window.location.href = '/auth/login'}
        />
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
          <button
            disabled
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
          >
            Add Property
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingCard title="Loading properties..." />
          <LoadingCard title="Loading properties..." />
          <LoadingCard title="Loading properties..." />
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
          <button
            onClick={handleAddProperty}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Property
          </button>
        </div>
        <ErrorCard 
          title="Failed to load properties"
          message={error}
          onRetry={loadProperties}
        />
      </div>
    )
  }

  // Show properties list
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
          <p className="mt-1 text-sm text-gray-500">
            {properties.length === 0 
              ? 'No properties found' 
              : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`
            }
          </p>
        </div>
        <button
          onClick={handleAddProperty}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Property
        </button>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        // Empty State
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first property.</p>
          <div className="mt-6">
            <button
              onClick={handleAddProperty}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Property
            </button>
          </div>
        </div>
      ) : (
        // Properties Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const activeUnits = property.units?.filter(unit => unit.is_active) || []
            const occupiedUnits = activeUnits.filter(unit => 
              unit.tenants?.some(tenant => tenant.status === 'ACTIVE')
            )
            const totalRent = activeUnits.reduce((sum, unit) => sum + (unit.monthly_rent_kes || 0), 0)
            const occupancyRate = activeUnits.length > 0 ? (occupiedUnits.length / activeUnits.length) * 100 : 0

            return (
              <div key={property.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                      {property.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      occupancyRate >= 80 
                        ? 'bg-green-100 text-green-800'
                        : occupancyRate >= 50
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {occupancyRate.toFixed(0)}% occupied
                    </span>
                  </div>
                  
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    {property.physical_address}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Units</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {occupiedUnits.length} / {activeUnits.length}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Monthly Rent</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        KES {totalRent.toLocaleString()}
                      </dd>
                    </div>
                  </div>

                  {property.notes && (
                    <div className="mt-4">
                      <dt className="text-sm font-medium text-gray-500">Notes</dt>
                      <dd className="mt-1 text-sm text-gray-900 line-clamp-2">
                        {property.notes}
                      </dd>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Added {new Date(property.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => {
                        // Navigate to property details
                        window.location.href = `/dashboard/properties/${property.id}`
                      }}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Property Form Modal */}
      {showPropertyForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <PropertyForm
              onSuccess={handlePropertyFormSuccess}
              onCancel={handlePropertyFormCancel}
            />
          </div>
        </div>
      )}
    </div>
  )
}
