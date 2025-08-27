'use client'
import { useState, useEffect } from 'react'
import LandCard from './components/LandCard'
import LandSearchBar from './components/LandSearchBar'

type LandProperty = {
  property_id: string
  property_name: string
  physical_address?: string
  property_type: string
  total_area_sqm?: number
  total_area_acres?: number
  zoning_classification?: string
  development_permit_status?: string
  sale_price_kes?: number
  lease_price_per_sqm_kes?: number
  total_lease_price_kes?: number
  area_display?: string
  thumbnail_url?: string
  road_access_type?: string
  electricity_available?: boolean
  water_available?: boolean
  amenities?: Array<{ code: string; label: string; category: string }>
}

export default function LandPage() {
  const [landProperties, setLandProperties] = useState<LandProperty[]>([])
  const [filteredProperties, setFilteredProperties] = useState<LandProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)
  const [selectedPropertyType, setSelectedPropertyType] = useState('')
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLandProperties()
  }, [])

  const fetchLandProperties = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/public/land')
      if (!response.ok) {
        throw new Error('Failed to fetch land properties')
      }
      const data = await response.json()
      setLandProperties(data.data || [])
      setFilteredProperties(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Search and filter functions
  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query)
    setSearching(true)
    applyFilters(query, selectedPropertyType, selectedUtilities)
    setSearching(false)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
  }

  const handleSearchClear = () => {
    setSearchValue('')
    setSearchQuery('')
    applyFilters('', selectedPropertyType, selectedUtilities)
  }

  const handlePropertyTypeChange = (type: string) => {
    setSelectedPropertyType(type)
    applyFilters(searchQuery, type, selectedUtilities)
  }

  const handleToggleUtility = (utility: string) => {
    const newUtilities = selectedUtilities.includes(utility)
      ? selectedUtilities.filter((u) => u !== utility)
      : [...selectedUtilities, utility]
    setSelectedUtilities(newUtilities)
    applyFilters(searchQuery, selectedPropertyType, newUtilities)
  }

  const handleApplyAreaFilter = (key: 'SMALL' | 'MEDIUM' | 'LARGE') => {
    // Apply area filter logic
    applyFilters(searchQuery, selectedPropertyType, selectedUtilities, key)
  }

  const handleApplyPriceFilter = (key: 'UNDER_1M' | '1M_5M' | '5M_PLUS') => {
    // Apply price filter logic
    applyFilters(searchQuery, selectedPropertyType, selectedUtilities, undefined, key)
  }

  const applyFilters = (
    query: string,
    propertyType: string,
    utilities: string[],
    areaFilter?: 'SMALL' | 'MEDIUM' | 'LARGE',
    priceFilter?: 'UNDER_1M' | '1M_5M' | '5M_PLUS'
  ) => {
    let filtered = [...landProperties]

    // Apply search query
    if (query) {
      const searchTerm = query.toLowerCase()
      filtered = filtered.filter(
        (property) =>
          property.property_name.toLowerCase().includes(searchTerm) ||
          property.physical_address?.toLowerCase().includes(searchTerm) ||
          property.zoning_classification?.toLowerCase().includes(searchTerm)
      )
    }

    // Apply property type filter
    if (propertyType) {
      filtered = filtered.filter((property) => property.property_type === propertyType)
    }

    // Apply utility filters
    if (utilities.length > 0) {
      filtered = filtered.filter((property) => {
        if (utilities.includes('electricity') && !property.electricity_available) return false
        if (utilities.includes('water') && !property.water_available) return false
        // Add more utility checks as needed
        return true
      })
    }

    // Apply area filter
    if (areaFilter) {
      filtered = filtered.filter((property) => {
        const acres = property.total_area_acres || 0
        switch (areaFilter) {
          case 'SMALL':
            return acres < 1
          case 'MEDIUM':
            return acres >= 1 && acres <= 5
          case 'LARGE':
            return acres > 5
          default:
            return true
        }
      })
    }

    // Apply price filter
    if (priceFilter) {
      filtered = filtered.filter((property) => {
        const price = property.sale_price_kes || property.total_lease_price_kes || 0
        switch (priceFilter) {
          case 'UNDER_1M':
            return price < 1000000
          case '1M_5M':
            return price >= 1000000 && price <= 5000000
          case '5M_PLUS':
            return price > 5000000
          default:
            return true
        }
      })
    }

    setFilteredProperties(filtered)
  }

  const highlightText = (text: string) => {
    if (!searchQuery) return text
    const regex = new RegExp(`(${searchQuery})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-secondary">Loading land properties...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <button
              onClick={fetchLandProperties}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Land Properties</h1>
          <p className="text-secondary">Discover available land for sale and lease in Kenya</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <LandSearchBar
            value={searchValue}
            onChange={handleSearchChange}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
            searching={searching}
            landProperties={landProperties}
            selectedPropertyType={selectedPropertyType}
            onPropertyTypeChange={handlePropertyTypeChange}
            selectedUtilities={selectedUtilities}
            onToggleUtility={handleToggleUtility}
            onApplyAreaFilter={handleApplyAreaFilter}
            onApplyPriceFilter={handleApplyPriceFilter}
          />
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-secondary">
            Showing {filteredProperties.length} of {landProperties.length} properties
          </p>
        </div>

        {/* Property Grid */}
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <LandCard
                key={property.property_id}
                land={property}
                highlight={(text) => highlightText(text)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-quaternary mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-secondary mb-2">No properties found</h3>
            <p className="text-tertiary">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
