'use client'

import { useState, useMemo } from 'react'
import SavedPropertyCard from './SavedPropertyCard'
import ReservedPropertyCard from './ReservedPropertyCard'
import ClientPropertyCard from './ClientPropertyCard'

interface Property {
  id: string
  name: string
  location?: string
  physical_address?: string
  lat?: number | null
  lng?: number | null
  property_type?: string
  property_type_display?: string
  asking_price_kes?: number
  description?: string
  images?: string[]
  main_image?: string
  handover_status?: string
  handover_status_display?: string
  area_display?: string
  total_area_acres?: number
  total_area_sqm?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  is_available_for_sale?: boolean
  status?: string
  current_stage?: string
  interest_date?: string
  reservation_status?: string
}

interface MyPropertiesRepositoryTabProps {
  savedProperties: Property[]
  reservedProperties: Property[]
  myProperties: Property[]
  completedProperties: Property[]
  onRemoveFromSaved: (propertyId: string) => void
  onMoveToMyProperties: (propertyId: string) => void
  onDueDiligence: (propertyId: string) => void
  onViewMaps: (propertyId: string) => void
  onPinLocation: (propertyId: string) => void
  onCancelReservation: (propertyId: string) => void
}

type PropertyStatus = 'all' | 'saved' | 'reserved' | 'purchase-pipeline' | 'completed'

export default function MyPropertiesRepositoryTab({
  savedProperties,
  reservedProperties,
  myProperties,
  completedProperties,
  onRemoveFromSaved,
  onMoveToMyProperties,
  onDueDiligence,
  onViewMaps,
  onPinLocation,
  onCancelReservation,
}: MyPropertiesRepositoryTabProps) {
  const [statusFilter, setStatusFilter] = useState<PropertyStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Combine all properties with their status
  const allProperties = useMemo(() => {
    const combined = [
      ...savedProperties.map((p) => ({ ...p, propertyStatus: 'saved' as const })),
      ...reservedProperties.map((p) => ({ ...p, propertyStatus: 'reserved' as const })),
      ...myProperties.map((p) => ({ ...p, propertyStatus: 'purchase-pipeline' as const })),
      ...completedProperties.map((p) => ({ ...p, propertyStatus: 'completed' as const })),
    ]
    return combined
  }, [savedProperties, reservedProperties, myProperties, completedProperties])

  // Filter properties based on status and search
  const filteredProperties = useMemo(() => {
    let filtered = allProperties

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.propertyStatus === statusFilter)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.location?.toLowerCase().includes(term) ||
          p.physical_address?.toLowerCase().includes(term) ||
          p.property_type_display?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [allProperties, statusFilter, searchTerm])

  // Calculate counts for filter buttons
  const counts = useMemo(
    () => ({
      all: allProperties.length,
      'purchase-pipeline': myProperties.length,
      reserved: reservedProperties.length,
      saved: savedProperties.length,
      completed: completedProperties.length,
    }),
    [
      allProperties.length,
      savedProperties.length,
      reservedProperties.length,
      myProperties.length,
      completedProperties.length,
    ]
  )

  const renderPropertyCard = (property: Property & { propertyStatus: string }) => {
    switch (property.propertyStatus) {
      case 'saved':
        return (
          <SavedPropertyCard
            key={property.id}
            property={property}
            onRemoveFromSaved={onRemoveFromSaved}
            onMoveToMyProperties={onMoveToMyProperties}
            onDueDiligence={onDueDiligence}
            onViewMaps={onViewMaps}
          />
        )
      case 'reserved':
        return (
          <ReservedPropertyCard
            key={property.id}
            property={property}
            onPinLocation={onPinLocation}
            onCancelReservation={onCancelReservation}
          />
        )
      case 'purchase-pipeline':
        return <ClientPropertyCard key={property.id} property={property} />
      case 'completed':
        return <ClientPropertyCard key={property.id} property={property} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Properties Repository</h2>
          <p className="text-gray-600 text-sm">
            Complete property management hub with smart filtering
          </p>
        </div>

        <div className="text-sm text-gray-600">
          {filteredProperties.length} of {allProperties.length} properties
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search properties by name, location, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            {
              key: 'all',
              label: 'All Properties',
              color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            },
            {
              key: 'purchase-pipeline',
              label: 'Purchase Pipeline',
              color: 'bg-green-100 text-green-700 hover:bg-green-200',
            },
            {
              key: 'reserved',
              label: 'Reserved',
              color: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
            },
            {
              key: 'saved',
              label: 'Saved',
              color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
            },
            {
              key: 'completed',
              label: 'Completed',
              color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
            },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key as PropertyStatus)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === filter.key
                  ? filter.color.replace('100', '200').replace('hover:bg-', 'bg-')
                  : filter.color
              }`}
            >
              {filter.label} ({counts[filter.key as keyof typeof counts]})
            </button>
          ))}
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {statusFilter === 'all'
              ? 'No Properties Found'
              : `No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Properties`}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? `No properties match your search "${searchTerm}"`
              : statusFilter === 'all'
                ? "Start by browsing the marketplace to save properties you're interested in."
                : `You don't have any ${statusFilter} properties yet.`}
          </p>
          {statusFilter === 'all' && !searchTerm && (
            <button
              onClick={() => (window.location.href = '/marketplace')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Marketplace
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">{filteredProperties.map(renderPropertyCard)}</div>
      )}
    </div>
  )
}
