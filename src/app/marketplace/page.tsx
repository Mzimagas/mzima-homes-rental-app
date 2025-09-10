'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Property } from '../../lib/types/database'
import { formatCurrency } from '../../lib/export-utils'
import { LoadingCard } from '../../components/ui/loading'
import { ErrorCard } from '../../components/ui/error'
import { useAuth } from '../../components/auth/AuthProvider'

interface MarketplaceProperty extends Property {
  images?: string[]
  main_image?: string
  property_type_display?: string
  location_display?: string
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
  // Sale status information
  sale_status?: 'NOT_FOR_SALE' | 'LISTED_FOR_SALE' | 'UNDER_CONTRACT' | 'SOLD'
  deposit_received?: boolean
}

export default function MarketplacePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [properties, setProperties] = useState<MarketplaceProperty[]>([])
  const [interests, setInterests] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<string>('all')

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/public/properties', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load properties')
      }

      const data = await response.json()
      console.log('🏠 Marketplace: API response:', data)
      const loadedProperties = data.properties || []
      console.log('🏠 Marketplace: Loaded properties:', loadedProperties.length)
      setProperties(loadedProperties)

      // Load interests for loaded properties if user is authenticated
      if (user && loadedProperties.length > 0) {
        try {
          await loadInterests(loadedProperties)
        } catch (error) {
          console.warn('Failed to load interests, continuing without them:', error)
          // Don't fail the entire property loading if interests fail
        }
      }
    } catch (err) {
      console.error('Error loading properties:', err)
      setError(err instanceof Error ? err.message : 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const loadInterests = async (propertiesToCheck?: MarketplaceProperty[]) => {
    // Skip loading interests if user is not authenticated
    // This is normal for public marketplace access
    if (!user) {
      console.log('Skipping interest loading - user not authenticated')
      return
    }

    try {
      const propertyIds = (propertiesToCheck || properties).map(p => p.id)
      if (propertyIds.length === 0) return

      const response = await fetch('/api/clients/interest-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyIds,
        }),
      })

      if (!response.ok) {
        // If authentication fails, just skip loading interests
        // Don't throw an error since this is expected for unauthenticated users
        if (response.status === 401) {
          console.log('Authentication required for interest status - skipping')
          return
        }
        throw new Error('Failed to load interests')
      }

      const data = await response.json()

      // Update interests state based on response
      const newInterests: { [key: string]: boolean } = {}
      if (data.interests) {
        // Handle the response format from the API
        Object.keys(data.interests).forEach(propertyId => {
          newInterests[propertyId] = data.interests[propertyId].hasInterest
        })
      } else if (Array.isArray(data)) {
        // Handle array format
        data.forEach((item: any) => {
          newInterests[item.property_id] = item.has_interest
        })
      }
      setInterests(newInterests)
    } catch (error) {
      console.error('Error loading interests:', error)
      // Don't throw the error to prevent breaking the marketplace for unauthenticated users
    }
  }

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = 
      property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === 'all' || property.property_type === selectedType

    const matchesPrice = (() => {
      if (priceRange === 'all') return true
      const price = property.asking_price_kes || 0
      switch (priceRange) {
        case 'under-5m': return price < 5000000
        case '5m-10m': return price >= 5000000 && price < 10000000
        case '10m-20m': return price >= 10000000 && price < 20000000
        case 'over-20m': return price >= 20000000
        default: return true
      }
    })()

    return matchesSearch && matchesType && matchesPrice
  })

  const handleExpressInterest = async (propertyId: string) => {
    console.log('Express Interest - User state:', {
      user: !!user,
      userId: user?.id,
      userType: typeof user,
      userKeys: user ? Object.keys(user) : 'null',
      hasId: !!(user?.id)
    })

    // More explicit authentication check
    if (!user || !user.id) {
      console.log('User not authenticated, redirecting to login')
      // Redirect to login with property context
      router.push(`/auth/login?redirectTo=/marketplace&property=${propertyId}&action=express-interest`)
      return
    }

    try {
      // User is authenticated, express interest directly via API
      const response = await fetch('/api/clients/express-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          interestType: 'express-interest',
        }),
      })

      let responseData
      try {
        responseData = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError)
        responseData = { error: 'Invalid server response' }
      }

      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      })

      if (!response.ok) {
        console.error('API Error Response:', responseData)

        // If authentication fails, redirect to login
        if (response.status === 401) {
          router.push(`/auth/login?redirectTo=/marketplace`)
          return
        }

        // Show user-friendly error message
        const errorMessage = responseData?.error || `HTTP ${response.status}: ${response.statusText}`
        alert(`Error: ${errorMessage}`)
        return
      }

      // Success - update the UI
      await loadInterests()
      console.log('Interest expressed successfully!')

      // Show success toast/message
      alert('🎉 Interest expressed successfully! Property added to your portfolio. You can view it in the client portal.')

      // Don't redirect automatically - let user stay on marketplace
      // They can navigate to client portal if they want

    } catch (error) {
      console.error('Error expressing interest:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to express interest'}`)
    }
  }

  const handleRemoveInterest = async (propertyId: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/clients/remove-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove interest')
      }

      // Refresh the interests state to update button states
      await loadInterests()
      console.log('Interest removed successfully!')
    } catch (error) {
      console.error('Error removing interest:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <LoadingCard message="Loading available properties..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <ErrorCard message={error} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mzima Homes Marketplace</h1>
              <p className="text-gray-600 mt-1">Properties ready for handover • Discover your dream property</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Properties
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="LAND">Land</option>
                <option value="APARTMENT">Apartment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Prices</option>
                <option value="under-5m">Under KES 5M</option>
                <option value="5m-10m">KES 5M - 10M</option>
                <option value="10m-20m">KES 10M - 20M</option>
                <option value="over-20m">Over KES 20M</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadProperties}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredProperties.length} of {properties.length} properties
          </p>
        </div>

        {/* Property Grid */}
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onExpressInterest={handleExpressInterest}
                onRemoveInterest={handleRemoveInterest}
                hasInterest={interests[property.id]?.hasInterest || false}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface PropertyCardProps {
  property: MarketplaceProperty
  onExpressInterest: (propertyId: string) => void
  onRemoveInterest: (propertyId: string) => void
  hasInterest: boolean
  isAuthenticated: boolean
}

function PropertyCard({
  property,
  onExpressInterest,
  onRemoveInterest,
  hasInterest,
  isAuthenticated
}: PropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const hasImage = property.main_image || (property.images && property.images.length > 0)

  // Determine if property is sold (has deposit or marked as sold)
  const isSold = property.sale_status === 'SOLD' ||
                 property.sale_status === 'UNDER_CONTRACT' ||
                 property.deposit_received ||
                 property.handover_status === 'COMPLETED'

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Property Image */}
      <div className="relative h-48 bg-gray-200 flex items-center justify-center">
        {hasImage && !imageError ? (
          <Image
            src={property.main_image || property.images?.[0] || ''}
            alt={property.name || 'Property'}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <div className="text-4xl mb-2">🏠</div>
            <span className="text-sm">No Image Available</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
            {property.property_type_display || property.property_type || 'Property'}
          </span>
        </div>

        {/* Handover Status Badge */}
        {property.handover_status_display && (
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              property.handover_status === 'COMPLETED'
                ? 'bg-green-600 text-white'
                : property.handover_status === 'IN_PROGRESS'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-600 text-white'
            }`}>
              {property.handover_status_display}
            </span>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {property.name || 'Unnamed Property'}
        </h3>
        
        <p className="text-gray-600 text-sm mb-2">
          📍 {property.location_display || property.location || 'Location not specified'}
        </p>

        {/* Property Features */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
          {property.area_display && (
            <span className="flex items-center">
              <span className="mr-1">📐</span>
              {property.area_display}
            </span>
          )}
          {property.bedrooms && (
            <span className="flex items-center">
              <span className="mr-1">🛏️</span>
              {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
            </span>
          )}
          {property.bathrooms && (
            <span className="flex items-center">
              <span className="mr-1">🚿</span>
              {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {property.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {property.description}
          </p>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-green-600">
              {property.asking_price_kes ? formatCurrency(property.asking_price_kes) : 'Price on request'}
            </p>
            <p className="text-sm text-gray-500">
              {property.property_type_display || 'Property for sale'}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Link
            href={`/marketplace/property/${property.id}`}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-center hover:bg-gray-200 transition-colors"
          >
            View Details
          </Link>

          {isSold ? (
            <button
              disabled
              className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed"
            >
              Sold
            </button>
          ) : isAuthenticated ? (
            hasInterest ? (
              <div className="flex-1 flex space-x-1">
                <Link
                  href="/client-portal?tab=properties"
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-center hover:bg-green-700 transition-colors text-sm"
                >
                  View Property
                </Link>
                <button
                  onClick={() => onRemoveInterest(property.id)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  title="Remove Interest"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => onExpressInterest(property.id)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Express Interest
              </button>
            )
          ) : (
            <button
              onClick={() => onExpressInterest(property.id)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Express Interest
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
