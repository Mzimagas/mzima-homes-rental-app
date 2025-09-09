'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatCurrency } from '../../../lib/export-utils'

interface ClientProperty {
  id: string
  name: string
  location: string
  property_type: string
  asking_price_kes: number
  handover_status: string
  handover_progress: number
  current_stage: string
  images: string[]
  interest_date: string
  status: 'INTERESTED' | 'IN_HANDOVER' | 'COMPLETED'
}

interface ClientPropertyCardProps {
  property: ClientProperty
}

export default function ClientPropertyCard({ property }: ClientPropertyCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [imageError, setImageError] = useState(false)
  const hasImage = property.images && property.images.length > 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INTERESTED':
        return 'bg-blue-100 text-blue-800'
      case 'IN_HANDOVER':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'INTERESTED':
        return 'Interest Expressed'
      case 'IN_HANDOVER':
        return 'In Progress'
      case 'COMPLETED':
        return 'Completed'
      default:
        return status
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Property Image */}
      <div className="relative h-48 bg-gray-200 flex items-center justify-center">
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
            <span className="text-sm">No Image Available</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(property.status)}`}>
            {getStatusLabel(property.status)}
          </span>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.name}</h3>
        
        <p className="text-gray-600 text-sm mb-2">
          📍 {property.location}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(property.asking_price_kes)}
            </p>
            <p className="text-sm text-gray-500">{property.property_type}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {property.status === 'IN_HANDOVER' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-500">{property.handover_progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${property.handover_progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Current: {property.current_stage}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-center hover:bg-gray-200 transition-colors text-sm"
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>
          
          {property.status === 'IN_HANDOVER' && (
            <button
              onClick={() => window.location.href = `/client-portal/property/${property.id}`}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Track Progress
            </button>
          )}
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Interest Date:</span>
                <span className="text-gray-900">
                  {new Date(property.interest_date).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-gray-900">{property.handover_status}</span>
              </div>
              
              {property.status === 'IN_HANDOVER' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Stage:</span>
                  <span className="text-gray-900">{property.current_stage}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
