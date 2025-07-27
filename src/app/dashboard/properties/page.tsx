'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { supabase, clientBusinessFunctions, clientQueries } from '../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../components/ui/loading'
import { ErrorCard, EmptyState } from '../../../components/ui/error'
import { Property, Unit } from '../../../../lib/types/database'
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
  const { user } = useAuth()
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

      // Get the user's landlord IDs with auto-setup enabled
      const { data: landlordIds, error: landlordError } = await clientBusinessFunctions.getUserLandlordIds(true)

      if (landlordError || !landlordIds || landlordIds.length === 0) {
        setError('Unable to load properties. Please ensure you have proper landlord permissions.')
        setLoading(false)
        return
      }

      // For now, use the first landlord ID (most users will have only one)
      const landlordId = landlordIds[0]

      const { data: propertiesData, error: propertiesError } = await clientQueries.getPropertiesByLandlord(landlordId)
      
      if (propertiesError) {
        setError('Failed to load properties')
        return
      }

      // Load stats for each property
      const propertiesWithStats: PropertyWithStats[] = []
      
      if (propertiesData) {
        for (const property of propertiesData) {
          const { data: stats } = await clientBusinessFunctions.getPropertyStats(property.id)
          
          propertiesWithStats.push({
            ...property,
            stats: stats?.[0] || {
              total_units: 0,
              occupied_units: 0,
              vacant_units: 0,
              occupancy_rate: 0,
              monthly_rent_potential: 0,
              monthly_rent_actual: 0
            }
          })
        }
      }
      
      setProperties(propertiesWithStats)
    } catch (err) {
      setError('Failed to load properties')
      console.error('Properties loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProperties()
  }, [])

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
                         property.physical_address.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (filterStatus === 'all') return true
    
    const occupancyStatus = getOccupancyStatus(property.stats?.occupancy_rate || 0)
    return occupancyStatus === filterStatus
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading properties..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
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
        <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
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
        <EmptyState
          title="No properties found"
          description={searchTerm || filterStatus !== 'all' 
            ? "No properties match your search criteria. Try adjusting your filters."
            : "You haven't added any properties yet. Create your first property to get started."
          }
          actionLabel={!searchTerm && filterStatus === 'all' ? "Add Property" : undefined}
          onAction={() => setShowPropertyForm(true)}
        />
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
                  <button className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-3 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    Manage Units
                  </button>
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
      <PropertyForm
        isOpen={showPropertyForm}
        onSuccess={(propertyId) => {
          setShowPropertyForm(false)
          loadProperties() // Reload properties list
        }}
        onCancel={() => setShowPropertyForm(false)}
      />
    </div>
  )
}
