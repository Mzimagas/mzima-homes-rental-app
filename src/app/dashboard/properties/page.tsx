'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import supabase, { clientBusinessFunctions, clientQueries } from '../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../components/ui/loading'
import { ErrorCard, EmptyState } from '../../../components/ui/error'
import { Property, Unit } from '../../../lib/types/database'
import PropertyForm from '../../../components/properties/property-form'
import Link from 'next/link'

interface PropertyWithStats extends Property {
  units: Unit[]
  stats?: {
    total_units: number
    occupied_units: number
    vacant_units: number
    occupancy_rate: number
    monthly_rent_potential: number
    monthly_rent_actual: number
  }
}

export default function PropertiesPage() {
  const { user, loading: authLoading } = useAuth()
  const [properties, setProperties] = useState<PropertyWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'high' | 'medium' | 'low'>('all')
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

      console.log('Loading properties for user:', user.email, '- Version 2.1 with authentication fix')

      // Double-check authentication with Supabase
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !currentUser) {
        console.log('Properties: Authentication verification failed:', authError?.message || 'No current user')
        setError('Authentication expired. Please log in again.')
        return
      }

      if (currentUser.id !== user.id) {
        console.log('Properties: User ID mismatch - session may be stale')
        setError('Session expired. Please refresh and log in again.')
        return
      }

      // Use the new helper function to get accessible properties (avoiding RLS recursion and type mismatch)
      const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_properties_simple')

      if (accessError) {
        // Enhanced error handling to prevent empty error objects
        let errorMessage = 'Unknown error occurred'
        let errorDetails = {}

        try {
          if (accessError?.message) {
            errorMessage = accessError.message
          } else if (accessError?.details) {
            errorMessage = accessError.details
          } else if (typeof accessError === 'string') {
            errorMessage = accessError
          } else if (accessError && typeof accessError === 'object') {
            errorMessage = JSON.stringify(accessError)
            if (errorMessage === '{}') {
              errorMessage = 'Empty error object from database'
            }
          }

          errorDetails = {
            errorType: typeof accessError,
            hasMessage: !!accessError?.message,
            hasDetails: !!accessError?.details,
            errorKeys: accessError ? Object.keys(accessError) : [],
            userEmail: user.email,
            timestamp: new Date().toISOString()
          }
        } catch (parseError) {
          errorMessage = 'Error parsing database error'
          if (parseError && typeof parseError === 'object' && 'message' in parseError) {
            errorDetails = { ...errorDetails, parseMessage: (parseError as any).message }
          }
        }

        console.error('PROPERTIES PAGE ERROR - Accessible properties loading failed:', {
          message: errorMessage,
          details: errorDetails,
          originalError: accessError
        })

        setError(`Failed to load your properties: ${errorMessage}`)
        return
      }

      if (!accessibleProperties || accessibleProperties.length === 0) {
        console.log('No accessible properties found for user')
        setProperties([])
        return
      }

      console.log(`Found ${accessibleProperties.length} accessible properties`)

      // Get property IDs
      const propertyIds = accessibleProperties.map((p: { property_id: string }) => p.property_id)

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
        // Enhanced error handling to prevent empty error objects
        let errorMessage = 'Unknown error occurred'
        let errorDetails = {}

        try {
          if (propertiesError?.message) {
            errorMessage = propertiesError.message
          } else if (propertiesError?.details) {
            errorMessage = propertiesError.details
          } else if (typeof propertiesError === 'string') {
            errorMessage = propertiesError
          } else if (propertiesError && typeof propertiesError === 'object') {
            errorMessage = JSON.stringify(propertiesError)
            if (errorMessage === '{}') {
              errorMessage = 'Empty error object from database'
            }
          }

          errorDetails = {
            errorType: typeof propertiesError,
            hasMessage: !!propertiesError?.message,
            hasDetails: !!propertiesError?.details,
            errorKeys: propertiesError ? Object.keys(propertiesError) : [],
            propertyIds: propertyIds,
            userEmail: user.email,
            timestamp: new Date().toISOString()
          }
        } catch (parseError) {
          errorMessage = 'Error parsing database error'
          if (parseError && typeof parseError === 'object' && 'message' in parseError) {
            errorDetails = { ...errorDetails, parseMessage: (parseError as any).message }
          }
        }

        console.error('PROPERTIES PAGE ERROR - Property details loading failed:', {
          message: errorMessage,
          details: errorDetails,
          originalError: propertiesError
        })

        setError(`Failed to load property details: ${errorMessage}`)
        return
      }

      // Calculate stats for each property
      const propertiesWithStats: PropertyWithStats[] = []

      if (propertiesData) {
        for (const property of propertiesData) {
          const units = property.units || []
          const activeUnits = units.filter((unit: any) => unit.is_active)
          const occupiedUnits = activeUnits.filter((unit: any) =>
            unit.tenants?.some((tenant: any) => tenant.status === 'ACTIVE')
          )

          const totalRentPotential = activeUnits.reduce((sum: number, unit: any) => sum + (unit.monthly_rent_kes || 0), 0)
          const totalRentActual = occupiedUnits.reduce((sum: number, unit: any) => sum + (unit.monthly_rent_kes || 0), 0)
          const occupancyRate = activeUnits.length > 0 ? (occupiedUnits.length / activeUnits.length) * 100 : 0

          propertiesWithStats.push({
            ...property,
            stats: {
              total_units: activeUnits.length,
              occupied_units: occupiedUnits.length,
              vacant_units: activeUnits.length - occupiedUnits.length,
              occupancy_rate: occupancyRate,
              monthly_rent_potential: totalRentPotential,
              monthly_rent_actual: totalRentActual
            }
          })
        }
      }

      console.log(`Loaded ${propertiesWithStats.length} properties with details`)
      setProperties(propertiesWithStats)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err))
      console.error('PROPERTIES PAGE ERROR - General loading failure:', {
        error: err,
        message: errorMessage,
        user: user?.email,
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString()
      })
      setError(`Failed to load properties: ${errorMessage}`)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getOccupancyStatus = (rate: number) => {
    if (rate >= 80) return 'high'
    if (rate >= 60) return 'medium'
    return 'low'
  }

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (property.physical_address || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false
    
    if (filterStatus === 'all') return true
    
    const occupancyStatus = getOccupancyStatus(property.stats?.occupancy_rate || 0)
    return occupancyStatus === filterStatus
  })

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
            onClick={() => setShowPropertyForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
          onClick={() => setShowPropertyForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Property
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search properties by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Properties</option>
              <option value="high">High Occupancy (80%+)</option>
              <option value="medium">Medium Occupancy (60-79%)</option>
              <option value="low">Low Occupancy (&lt;60%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        // Empty State
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm || filterStatus !== 'all' ? 'No properties found' : 'No properties'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? "No properties match your search criteria. Try adjusting your filters."
              : "Get started by adding your first property."
            }
          </p>
          {(!searchTerm && filterStatus === 'all') && (
            <div className="mt-6">
              <button
                onClick={() => setShowPropertyForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Property
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {property.name}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOccupancyColor(property.stats?.occupancy_rate || 0)}`}>
                    {Math.round(property.stats?.occupancy_rate || 0)}%
                  </span>
                </div>
                
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {property.physical_address}
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Units</span>
                    <span className="font-medium">
                      {property.stats?.occupied_units || 0} / {property.stats?.total_units || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monthly Revenue</span>
                    <span className="font-medium">
                      {formatCurrency(property.stats?.monthly_rent_actual || 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Potential Revenue</span>
                    <span className="font-medium">
                      {formatCurrency(property.stats?.monthly_rent_potential || 0)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <Link
                    href={`/dashboard/properties/${property.id}`}
                    className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/dashboard/properties/${property.id}`}
                    className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-3 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Manage Units
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {properties.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{properties.length}</div>
              <div className="text-sm text-gray-500">Total Properties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {properties.reduce((sum, p) => sum + (p.stats?.total_units || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">Total Units</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(properties.reduce((sum, p) => sum + (p.stats?.occupancy_rate || 0), 0) / properties.length)}%
              </div>
              <div className="text-sm text-gray-500">Avg Occupancy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(properties.reduce((sum, p) => sum + (p.stats?.monthly_rent_actual || 0), 0))}
              </div>
              <div className="text-sm text-gray-500">Monthly Revenue</div>
            </div>
          </div>
        </div>
      )}

      {/* Property Form Modal */}
      {showPropertyForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <PropertyForm
              isOpen={showPropertyForm}
              onSuccess={(propertyId) => {
                setShowPropertyForm(false)
                loadProperties() // Reload properties list
              }}
              onCancel={() => setShowPropertyForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
