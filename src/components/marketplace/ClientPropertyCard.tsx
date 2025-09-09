'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatCurrency } from '../../lib/export-utils'

interface Property {
  id: string
  name: string
  location?: string
  physical_address?: string
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
}

interface ClientPropertyCardProps {
  property: Property
  isClient?: boolean
  onExpressInterest?: (propertyId: string) => void
  onViewDetails?: (propertyId: string) => void
}

export default function ClientPropertyCard({ 
  property, 
  isClient = false,
  onExpressInterest,
  onViewDetails 
}: ClientPropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const hasImage = property.main_image || (property.images && property.images.length > 0)

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(property.id)
    }
  }

  const handleExpressInterest = () => {
    if (onExpressInterest) {
      onExpressInterest(property.id)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
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
        
        {/* Status Badge */}
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
        
        <p className="text-gray-600 text-sm mb-2 flex items-center">
          <span className="mr-1">📍</span>
          {property.location || property.physical_address || 'Location not specified'}
        </p>

        {/* Property Features */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
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
          {property.area_display && (
            <span className="flex items-center">
              <span className="mr-1">📐</span>
              {property.area_display}
            </span>
          )}
        </div>

        {property.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {property.description}
          </p>
        )}

        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-green-600">
            {property.asking_price_kes ? formatCurrency(property.asking_price_kes) : 'Price on request'}
          </p>
          <p className="text-sm text-gray-500">
            {property.property_type_display || 'Property for sale'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {isClient ? (
            // Client view - view-only with limited actions
            <>
              <button
                onClick={handleViewDetails}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-center hover:bg-gray-200 transition-colors font-medium"
              >
                View Details
              </button>
              <button
                onClick={handleExpressInterest}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Express Interest
              </button>
            </>
          ) : (
            // Public marketplace view
            <>
              <Link
                href={`/marketplace/property/${property.id}`}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-center hover:bg-gray-200 transition-colors font-medium"
              >
                View Details
              </Link>
              <button
                onClick={handleExpressInterest}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Express Interest
              </button>
            </>
          )}
        </div>

        {/* Client-only information */}
        {isClient && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              🔒 View-only access • Contact us for more information
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
