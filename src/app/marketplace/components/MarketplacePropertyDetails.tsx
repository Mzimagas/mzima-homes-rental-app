'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { formatCurrency } from '../../../lib/export-utils'
import { GoogleMapsCardButton } from '../../../components/ui/GoogleMapsButton'
import { useClickOutside } from '../../../hooks/useAutoClose'

interface MarketplaceProperty {
  id: string
  name: string
  images?: string[]
  main_image?: string
  property_type_display?: string
  location_display?: string
  location?: string
  description?: string
  notes?: string
  asking_price_kes?: number
  area_display?: string
  total_area_acres?: number
  total_area_sqm?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  physical_address?: string
  lat?: number
  lng?: number
  is_new?: boolean
  interest_count?: number
  property_type?: string
}

interface MarketplacePropertyDetailsProps {
  property: MarketplaceProperty
  isOpen: boolean
  onClose: () => void
}

export default function MarketplacePropertyDetails({
  property,
  isOpen,
  onClose,
}: MarketplacePropertyDetailsProps) {
  const [imageError, setImageError] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // Auto-close functionality
  const { containerRef } = useClickOutside(isOpen, onClose, {
    enabled: isOpen,
  })

  if (!isOpen) return null

  const hasImages = property.images && property.images.length > 0
  const displayImages = hasImages ? property.images : (property.main_image ? [property.main_image] : [])
  const hasMultipleImages = displayImages && displayImages.length > 1

  // Create compelling property description from available data
  const getPropertyHighlights = () => {
    const highlights = []
    
    if (property.is_new) {
      highlights.push("🆕 Brand New Property")
    }
    
    if (property.area_display) {
      highlights.push(`📐 ${property.area_display}`)
    }
    
    if (property.bedrooms) {
      highlights.push(`🛏️ ${property.bedrooms} Bedroom${property.bedrooms > 1 ? 's' : ''}`)
    }
    
    if (property.bathrooms) {
      highlights.push(`🚿 ${property.bathrooms} Bathroom${property.bathrooms > 1 ? 's' : ''}`)
    }
    
    if (property.parking_spaces) {
      highlights.push(`🚗 ${property.parking_spaces} Parking Space${property.parking_spaces > 1 ? 's' : ''}`)
    }
    
    return highlights
  }

  const getPropertyDescription = () => {
    // Prioritize notes field for marketing description, fallback to description
    const marketingText = property.notes || property.description
    
    if (marketingText && marketingText.trim()) {
      return marketingText
    }
    
    // Generate a basic description from available data
    const type = property.property_type_display || property.property_type || 'Property'
    const location = property.location_display || property.location || 'Prime location'
    
    return `Beautiful ${type.toLowerCase()} located in ${location}. This property offers excellent value and potential for the discerning buyer.`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={containerRef}
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{property.name}</h2>
              <p className="text-sm text-gray-600 flex items-center mt-1">
                <span className="mr-1">📍</span>
                {property.location_display || property.location || 'Location not specified'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-full"
              aria-label="Close details"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            
            {/* Image Gallery */}
            {displayImages && displayImages.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Property Images</h3>
                <div className="relative">
                  <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                    {!imageError ? (
                      <Image
                        src={displayImages[currentImageIndex]}
                        alt={`${property.name} - Image ${currentImageIndex + 1}`}
                        fill
                        className="object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                          <div className="text-6xl mb-2">🏠</div>
                          <span>Image not available</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Image Navigation */}
                  {hasMultipleImages && !imageError && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(prev => 
                          prev === 0 ? displayImages.length - 1 : prev - 1
                        )}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(prev => 
                          prev === displayImages.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                      >
                        →
                      </button>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {displayImages.length}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Thumbnail Navigation */}
                {hasMultipleImages && displayImages.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {displayImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Property Highlights */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Highlights</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {getPropertyHighlights().map((highlight, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            {/* Property Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Property</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">
                  {getPropertyDescription()}
                </p>
              </div>
            </div>

            {/* Key Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property Type:</span>
                    <span className="font-medium">{property.property_type_display || property.property_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-bold text-blue-600">
                      {property.asking_price_kes ? formatCurrency(property.asking_price_kes) : 'Price on request'}
                    </span>
                  </div>
                  {property.total_area_acres && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Area:</span>
                      <span className="font-medium">{property.total_area_acres} acres</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {property.physical_address && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium text-right">{property.physical_address}</span>
                    </div>
                  )}
                  {typeof property.interest_count === 'number' && property.interest_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest Level:</span>
                      <span className="font-medium">👥 {property.interest_count} interested</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location & Maps */}
            {(property.lat && property.lng) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="text-gray-700">View this property's exact location on Google Maps</p>
                    <p className="text-sm text-gray-500 mt-1">Get directions and explore the neighborhood</p>
                  </div>
                  <GoogleMapsCardButton property={property} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Interested in this property? Express your interest to get updates.
            </div>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
