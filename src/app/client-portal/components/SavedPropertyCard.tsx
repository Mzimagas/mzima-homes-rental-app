'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatCurrency } from '../../../lib/export-utils'
import DueDiligenceInline from './DueDiligenceInline'

interface ClientProperty {
  id: string
  name: string
  location: string
  physical_address?: string
  lat?: number | null
  lng?: number | null
  property_type: string
  property_type_display?: string
  asking_price_kes: number
  description?: string
  total_area_acres?: number
  total_area_sqm?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  handover_status: string
  handover_status_display?: string
  handover_progress: number
  current_stage: string
  images: string[]
  main_image?: string
  interest_date: string
  status: 'INTERESTED' | 'RESERVED' | 'COMMITTED' | 'IN_HANDOVER' | 'COMPLETED'
}

interface SavedPropertyCardProps {
  property: ClientProperty
  onMoveToMyProperties: (propertyId: string) => void
  onRemoveFromSaved: (propertyId: string) => void
  loading: boolean
}

export default function SavedPropertyCard({
  property,
  onMoveToMyProperties,
  onRemoveFromSaved,
  loading,
}: SavedPropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const [showDueDiligence, setShowDueDiligence] = useState(false)
  const [dueDiligenceCompleted, setDueDiligenceCompleted] = useState(false)
  const hasImage = property.images && property.images.length > 0

  const handleMoveToMyProperties = () => {
    if (!dueDiligenceCompleted) {
      const proceed = confirm(
        'We recommend completing due diligence before committing to this property. ' +
          'Would you like to proceed without due diligence, or would you prefer to complete it first?\n\n' +
          'Click OK to proceed without due diligence, or Cancel to complete due diligence first.'
      )
      if (!proceed) {
        setShowDueDiligence(true)
        return
      }
    }
    onMoveToMyProperties(property.id)
  }

  return (
    <div className="bg-gradient-to-r from-white via-blue-50/50 to-blue-100/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 border-blue-200 hover:border-blue-300">
      {/* Horizontal Layout Container */}
      <div className="flex flex-col lg:flex-row">
        {/* Property Image Section */}
        <div className="relative lg:w-80 h-64 lg:h-auto bg-gray-100 flex items-center justify-center">
          {hasImage && !imageError ? (
            <Image
              src={property.images?.[0] || ''}
              alt={property.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl mb-2">🏠</div>
              <span className="text-sm font-medium">No Image Available</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Saved
            </span>
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-2 rounded-lg shadow-md">
              <p className="text-lg font-semibold">{formatCurrency(property.asking_price_kes)}</p>
            </div>
          </div>
        </div>

        {/* Property Details Section - Horizontal Layout */}
        <div className="flex-1 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
            {/* Property Info */}
            <div className="flex-1 mb-4 lg:mb-0">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                {property.name}
              </h3>

              <div className="flex items-center text-gray-600 mb-3">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">{property.location}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {property.property_type}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  Saved on:{' '}
                  {new Date(property.interest_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="lg:w-80 lg:pl-6">
              <div className="space-y-4">
                {/* Primary Action - Move to My Properties (Top, Blue) */}
                <button
                  onClick={handleMoveToMyProperties}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-blue-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center space-x-2">
                    {loading ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span className="text-sm">Move to My Properties</span>
                  </div>
                </button>

                {/* Secondary Actions - Due Diligence and View Maps (Middle, Green) */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Due Diligence Button */}
                  <button
                    onClick={() => setShowDueDiligence(!showDueDiligence)}
                    className="bg-gradient-to-r from-emerald-50 to-green-100 hover:from-emerald-100 hover:to-green-200 text-emerald-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-emerald-200 hover:border-emerald-300 relative"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Due Diligence</span>
                      {dueDiligenceCompleted && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  </button>

                  {/* View Maps Button */}
                  <button
                    onClick={() => {
                      if (property.lat && property.lng) {
                        const url = `https://www.google.com/maps?q=${property.lat},${property.lng}`
                        window.open(url, '_blank')
                      } else {
                        alert('Location coordinates not available for this property')
                      }
                    }}
                    className="bg-gradient-to-r from-emerald-50 to-green-100 hover:from-emerald-100 hover:to-green-200 text-emerald-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-emerald-200 hover:border-emerald-300"
                    title="View on Maps"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">View Maps</span>
                    </div>
                  </button>
                </div>

                {/* Small referral button - only shows when property is saved */}
                <button
                  onClick={() => {
                    // Navigate to marketplace with this property highlighted
                    window.location.href = `/marketplace?property=${property.id}&highlight=saved`
                  }}
                  className="mt-2 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200 transition-colors duration-200 flex items-center gap-1"
                  title="View this property in the marketplace"
                >
                  📋 View in Marketplace
                </button>

                {/* Remove Action */}
                <button
                  onClick={() => onRemoveFromSaved(property.id)}
                  disabled={loading}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm">Remove from Saved</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Due Diligence Section */}
      {showDueDiligence && (
        <div className="border-t border-blue-200 bg-blue-50/50 p-6">
          <DueDiligenceInline
            propertyId={property.id}
            propertyName={property.name}
            onComplete={(completed) => setDueDiligenceCompleted(completed)}
            onMoveToMyProperties={() => onMoveToMyProperties(property.id)}
          />
        </div>
      )}
    </div>
  )
}
