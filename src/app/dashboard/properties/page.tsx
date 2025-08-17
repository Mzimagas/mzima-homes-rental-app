'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import supabase from '../../../lib/supabase-client'
import { LoadingCard } from '../../../components/ui/loading'
import { ErrorCard } from '../../../components/ui/error'
import { Property, Unit } from '../../../lib/types/database'
import PropertyForm from '../../../components/properties/property-form'
import BulkLandPropertyCreator from '../../../components/properties/BulkLandPropertyCreator'
import DuplicatePropertyCleaner from '../../../components/properties/DuplicatePropertyCleaner'
import PermanentPropertyDeleter from '../../../components/properties/PermanentPropertyDeleter'
import PropertySizeConverter from '../../../components/properties/PropertySizeConverter'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'
import { PropertyTypeBadgeCompact } from '../../../components/ui/PropertyTypeBadge'
import PropertyTypeFilter from '../../../components/ui/PropertyTypeFilter'
import { type PropertyType, isLandProperty } from '../../../lib/validation/property'
import Tooltip from '../../../components/ui/Tooltip'
import Sparkline from '../../../components/ui/Sparkline'
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
  const { properties: userProperties } = usePropertyAccess()
  const [properties, setProperties] = useState<PropertyWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<PropertyType[]>([])
  const [showPropertyTypeFilter, setShowPropertyTypeFilter] = useState(false)

  // Date range for time-based metrics
  const [dateRange, setDateRange] = useState<'30d' | '90d' | 'ytd' | '12m'>('30d')

  // Check if user has admin permissions (OWNER for properties)
  const hasAdminAccess = userProperties.some(p =>
    p.user_role === 'OWNER'
  )
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [showBulkLandCreator, setShowBulkLandCreator] = useState(false)
  const [showDuplicateCleaner, setShowDuplicateCleaner] = useState(false)
  const [showPermanentDeleter, setShowPermanentDeleter] = useState(false)
  const [showSizeConverter, setShowSizeConverter] = useState(false)

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

      // Get full property details with units and tenants (exclude soft-deleted properties)
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          physical_address,
          property_type,
          landlord_id,
          lat,
          lng,
          notes,
          created_at,
          updated_at,
          disabled_at,
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
        .is('disabled_at', null)
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

    // Property type filter
    const matchesPropertyType = selectedPropertyTypes.length === 0 ||
      selectedPropertyTypes.includes(property.property_type as PropertyType)

    if (!matchesPropertyType) return false

    if (filterStatus === 'all') return true

    // If land property, treat as not applicable for occupancy filters
    if (isLandProperty((property.property_type as any) || 'HOME')) return false

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
        <div className="flex gap-2">
          <button
            onClick={() => setShowPropertyForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Property
          </button>
          <button
            onClick={() => setShowBulkLandCreator(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            title="Bulk create sample land properties"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Bulk Add Land
          </button>
          <button
            onClick={() => setShowDuplicateCleaner(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            title="Remove recent bulk imports"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Recent Imports
          </button>
          <button
            onClick={() => setShowPermanentDeleter(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            title="Permanently delete all soft-deleted properties"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Permanent Delete
          </button>
          <button
            onClick={() => setShowSizeConverter(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Convert hectare values to acres for bulk imported properties"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0V3a1 1 0 00-1 1v1m11-1V3a1 1 0 00-1 1v1m-11 1v16a1 1 0 001 1h10a1 1 0 001-1V5H6z" />
            </svg>
            Convert Sizes
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col gap-4">
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
            <div>
              <button
                onClick={() => setShowPropertyTypeFilter(!showPropertyTypeFilter)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                Property Types
                {selectedPropertyTypes.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedPropertyTypes.length}
                  </span>
                )}
              </button>
            </div>
            {hasAdminAccess && (
              <div>
                <Link
                  href="/dashboard/properties/deleted"
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Deleted Properties
                </Link>
              </div>
            )}
          </div>

          {/* Property Type Filter */}
          {showPropertyTypeFilter && (
            <div className="border-t pt-4">
              <PropertyTypeFilter
                selectedTypes={selectedPropertyTypes}
                onSelectionChange={setSelectedPropertyTypes}
                allowMultiple={true}
                showCategories={true}
                variant="buttons"
                size="sm"
              />
            </div>
          )}
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
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {property.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      {property.physical_address}
                    </p>
                    <div className="mt-2">
                      <PropertyTypeBadgeCompact
                        type={property.property_type as PropertyType}
                        className="mr-2"
                      />
                    </div>
                  </div>
                  {!isLandProperty((property.property_type as any) || 'HOME') && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOccupancyColor(property.stats?.occupancy_rate || 0)}`}>
                      {Math.round(property.stats?.occupancy_rate || 0)}%
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {!isLandProperty((property.property_type as any) || 'HOME') ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Units</span>
                      <span className="font-medium">
                        {property.stats?.occupied_units || 0} / {property.stats?.total_units || 0}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Category</span>
                      <span className="font-medium capitalize">Land</span>
                    </div>
                  )}
                  
                  {!isLandProperty((property.property_type as any) || 'HOME') && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Monthly Revenue</span>
                      <span className="font-medium">
                        {formatCurrency(property.stats?.monthly_rent_actual || 0)}
                      </span>
                    </div>
                  )}
                  
                  {!isLandProperty((property.property_type as any) || 'HOME') && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Potential Revenue</span>
                      <span className="font-medium">
                        {formatCurrency(property.stats?.monthly_rent_potential || 0)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex space-x-3">
                  <Link
                    href={`/dashboard/properties/${property.id}`}
                    className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Details
                  </Link>
                  <a
                    href={property.lat != null && property.lng != null ? `https://www.google.com/maps?q=${property.lat},${property.lng}` : `https://www.google.com/maps?q=${encodeURIComponent(property.physical_address || property.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-3 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    aria-label={`Open ${property.name} in Google Maps`}
                    title="Open in Google Maps"
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Portfolio Summary - Enhanced */}
      {properties.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-light">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Portfolio Summary</h3>
            {/* Date range selector */}
            <div className="flex items-center gap-2 text-xs text-tertiary">
              <label htmlFor="range" className="sr-only">Date range</label>
              <select
                id="range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-2 py-1 border rounded-md bg-secondary hover:bg-elevated"
                title="Change date range"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="ytd">Year to date</option>
                <option value="12m">Last 12 months</option>
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Properties */}
            <button
              type="button"
              onClick={() => {
                setSelectedPropertyTypes([])
              }}
              className="group text-left p-4 rounded-lg border bg-elevated hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
              title="Show all properties"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-tertiary">Total Properties</div>
                  <div className="mt-1 text-2xl font-bold text-primary">{properties.length}</div>
                </div>
                <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">🏢</div>
              </div>
            </button>

            {/* Total Units (rentals only) */}
            <button
              type="button"
              onClick={() => {
                setSelectedPropertyTypes(['HOME','HOSTEL','STALL'] as any)
              }}
              className="group text-left p-4 rounded-lg border bg-elevated hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
              title="Filter to rental properties"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-tertiary">Total Units</div>
                  <div className="mt-1 text-2xl font-bold text-primary">
                    {properties.filter(p => !isLandProperty((p.property_type as any) || 'HOME')).reduce((sum, p) => sum + (p.stats?.total_units || 0), 0)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">🔢</div>
              </div>
            </button>

            {/* Avg Occupancy (rentals) */}
            <div className="p-4 rounded-lg border bg-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-tertiary flex items-center gap-1">
                    <span>Avg Occupancy (rentals)</span>
                    <Tooltip content="Average occupied units across rental properties.">
                      <svg className="w-4 h-4 text-tertiary" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zM9 7h2v2H9V7zm0 3h2v4H9v-4z" clipRule="evenodd" />
                      </svg>
                    </Tooltip>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-primary">
                    {(() => {
                      const rentals = properties.filter(p => !isLandProperty((p.property_type as any) || 'HOME'))
                      const avg = rentals.length > 0 ? Math.round(rentals.reduce((sum, p) => sum + (p.stats?.occupancy_rate || 0), 0) / rentals.length) : 0
                      return `${avg}%`
                    })()}
                  </div>
                </div>
                <div className="w-24">
                  <Sparkline data={properties.filter(p => !isLandProperty((p.property_type as any) || 'HOME')).map(p => p.stats?.occupancy_rate || 0)} stroke="#16a34a" />
                </div>
              </div>
              <div className="mt-2 text-xs text-tertiary">Compared to last period</div>
            </div>

            {/* Monthly Revenue (rentals) */}
            <div className="p-4 rounded-lg border bg-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-tertiary">Monthly Revenue</div>
                  <div className="mt-1 text-2xl font-bold text-primary">
                    {formatCurrency(properties.reduce((sum, p) => sum + (p.stats?.monthly_rent_actual || 0), 0))}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">💰</div>
              </div>
              <div className="mt-2 text-xs text-tertiary">vs. potential {formatCurrency(properties.reduce((sum, p) => sum + (p.stats?.monthly_rent_potential || 0), 0))}</div>
            </div>
          </div>

          {/* Breakdown row */}
          <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Rentals vs Land breakdown */}
            <div className="p-4 rounded-lg border bg-elevated">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-primary">Property Types</h4>
                <div className="text-xs text-tertiary">Tap a chip to filter</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const typeStats = properties.reduce((acc, property) => {
                    const type = property.property_type as PropertyType
                    if (!acc[type]) acc[type] = { count: 0 }
                    acc[type].count++
                    return acc
                  }, {} as Record<PropertyType, { count: number }>)

                  return Object.entries(typeStats).map(([type, stats]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedPropertyTypes([type as PropertyType])}
                      className="px-3 py-1.5 rounded-full border bg-white hover:bg-secondary text-sm"
                      title={`Filter to ${type}`}
                    >
                      <span className="font-medium mr-2">{type}</span>
                      <span className="text-tertiary">{stats.count}</span>
                    </button>
                  ))
                })()}
              </div>
            </div>

            {/* Vacancy rate and trend (rentals) */}
            <div className="p-4 rounded-lg border bg-elevated">
              <h4 className="text-sm font-medium text-primary mb-3">Vacancy Snapshot</h4>
              {(() => {
                const rentals = properties.filter(p => !isLandProperty((p.property_type as any) || 'HOME'))
                const totalUnits = rentals.reduce((sum, p) => sum + (p.stats?.total_units || 0), 0)
                const occupied = rentals.reduce((sum, p) => sum + (p.stats?.occupied_units || 0), 0)
                const vacant = totalUnits - occupied
                const vacancyRate = totalUnits > 0 ? Math.round((vacant / totalUnits) * 100) : 0
                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-primary">{vacancyRate}%</div>
                      <div className="text-xs text-tertiary">Vacancy rate</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-tertiary">Units</div>
                      <div className="text-primary text-sm font-medium">{vacant} vacant / {totalUnits}</div>
                    </div>
                  </div>
                )
              })()}
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
              onSuccess={() => {
                setShowPropertyForm(false)
                loadProperties() // Reload properties list
              }}
              onCancel={() => setShowPropertyForm(false)}
            />
          </div>
        </div>
      )}

      {/* Bulk Land Property Creator Modal */}
      <BulkLandPropertyCreator
        isOpen={showBulkLandCreator}
        onSuccess={() => {
          setShowBulkLandCreator(false)
          loadProperties() // Reload properties list
        }}
        onCancel={() => setShowBulkLandCreator(false)}
      />

      {/* Duplicate Property Cleaner Modal */}
      <DuplicatePropertyCleaner
        isOpen={showDuplicateCleaner}
        onSuccess={() => {
          setShowDuplicateCleaner(false)
          loadProperties() // Reload properties list
        }}
        onCancel={() => setShowDuplicateCleaner(false)}
      />

      {/* Permanent Property Deleter Modal */}
      <PermanentPropertyDeleter
        isOpen={showPermanentDeleter}
        onSuccess={() => {
          setShowPermanentDeleter(false)
          loadProperties() // Reload properties list
        }}
        onCancel={() => setShowPermanentDeleter(false)}
      />

      {/* Property Size Converter Modal */}
      <PropertySizeConverter
        isOpen={showSizeConverter}
        onSuccess={() => {
          setShowSizeConverter(false)
          loadProperties() // Reload properties list
        }}
        onCancel={() => setShowSizeConverter(false)}
      />
    </div>
  )
}
