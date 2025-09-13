'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { formatCurrency } from '../../../lib/export-utils'
import InlineHandoverView from '../../../components/properties/components/InlineHandoverView'
import { HandoverItem } from '../../../components/properties/types/property-management.types'

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

interface ReservedPropertyCardProps {
  property: ClientProperty
  onCancelReservation: (propertyId: string) => void
  loading: boolean
}

export default function ReservedPropertyCard({
  property,
  onCancelReservation,
  loading,
}: ReservedPropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [handoverData, setHandoverData] = useState<HandoverItem | null>(null)
  const [handoverLoading, setHandoverLoading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasImage = property.images && property.images.length > 0

  // Calculate reservation expiry (72 hours from interest date)
  const reservationExpiry = new Date(property.interest_date)
  reservationExpiry.setHours(reservationExpiry.getHours() + 72)
  const isExpired = new Date() > reservationExpiry
  const timeRemaining = reservationExpiry.getTime() - new Date().getTime()
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)))

  // Fetch handover data when details are shown
  const fetchHandoverData = async () => {
    if (!showDetails || handoverData) return

    try {
      setHandoverLoading(true)
      const response = await fetch(`/api/handover-pipeline?property_id=${property.id}`)

      if (response.ok) {
        const data = await response.json()
        if (data.handovers && data.handovers.length > 0) {
          setHandoverData(data.handovers[0])
        }
      }
    } catch (error) {
      console.error('Error fetching handover data:', error)
    } finally {
      setHandoverLoading(false)
    }
  }

  // Fetch handover data when details are shown
  React.useEffect(() => {
    if (showDetails) {
      fetchHandoverData()
    }
  }, [showDetails])

  // Dummy handlers for InlineHandoverView (read-only mode)
  const handleStageClick = () => {}
  const handleStageUpdate = async () => {}
  const handleClose = () => setShowDetails(false)

  return (
    <div className="bg-gradient-to-r from-white via-orange-50/50 to-orange-100/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 border-orange-200 hover:border-orange-300">
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
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Reserved
            </span>
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-2 rounded-lg shadow-md">
              <p className="text-lg font-semibold">{formatCurrency(property.asking_price_kes)}</p>
            </div>
          </div>
        </div>

        {/* Property Details Section */}
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

              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2">
                  Reserved on:{' '}
                  {new Date(property.interest_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-orange-800 font-medium text-sm">
                    ⏰ Reservation expires in 72 hours
                  </p>
                  <p className="text-orange-600 text-xs mt-1">
                    Make a deposit to secure this property permanently
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="lg:w-80 lg:pl-6">
              <div className="space-y-4">
                {/* Reservation Status */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-800">Reserved</span>
                    <span className="text-xs text-orange-600">
                      {isExpired ? 'Expired' : `${hoursRemaining}h remaining`}
                    </span>
                  </div>
                  <p className="text-xs text-orange-700">
                    {isExpired
                      ? 'Reservation has expired. Contact support to renew.'
                      : 'Complete handover process within 72 hours to secure this property.'
                    }
                  </p>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    <span>{showDetails ? 'Hide Details' : 'View Details'}</span>
                  </div>
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3">
                  {/* View Maps */}
                  <button
                    onClick={() => {
                      if (property.lat && property.lng) {
                        const url = `https://www.google.com/maps?q=${property.lat},${property.lng}`
                        window.open(url, '_blank')
                      } else {
                        alert('Location coordinates not available for this property')
                      }
                    }}
                    className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-blue-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Pin Location</span>
                    </div>
                  </button>

                  {/* Cancel Reservation */}
                  <button
                    onClick={() => onCancelReservation(property.id)}
                    disabled={loading}
                    className="bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Cancel</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Handover View (when details are shown) */}
      {showDetails && (
        <div ref={cardRef} className="border-t border-orange-200 bg-white">
          {handoverLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading handover details...</span>
            </div>
          ) : handoverData ? (
            <InlineHandoverView
              handover={handoverData}
              onClose={handleClose}
              onStageClick={handleStageClick}
              onStageUpdate={handleStageUpdate}
              readOnly={true}
            />
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>Handover process not yet started for this property.</p>
              <p className="text-sm mt-2">Details will be available once the handover begins.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
