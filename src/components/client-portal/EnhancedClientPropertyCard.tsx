'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { formatCurrency } from '../../lib/export-utils'
import { useTabState, TabNavigation, TabContent, PROPERTY_TABS } from '../properties/utils/tab-utils'
import ClientHandoverView from './ClientHandoverView'

interface ClientProperty {
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
  interest_date?: string
  status?: 'INTERESTED' | 'IN_HANDOVER' | 'COMPLETED'
  current_stage?: string
  handover_progress?: number
}

interface EnhancedClientPropertyCardProps {
  property: ClientProperty
  onViewDetails?: (propertyId: string) => void
  expanded?: boolean
  onToggleExpanded?: () => void
}

export default function EnhancedClientPropertyCard({
  property,
  onViewDetails,
  expanded = false,
  onToggleExpanded
}: EnhancedClientPropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const [hasHandoverData, setHasHandoverData] = useState(false)
  const [checkingHandover, setCheckingHandover] = useState(false)
  const hasImage = property.main_image || (property.images && property.images.length > 0)

  const { activeTab, setActiveTab } = useTabState({
    defaultTab: 'details',
    persistKey: `client-property-${property.id}`
  })

  // Check if property has handover data when expanded
  useEffect(() => {
    if (expanded && !checkingHandover) {
      checkHandoverData()
    }
  }, [expanded])

  const checkHandoverData = async () => {
    try {
      setCheckingHandover(true)
      const response = await fetch(`/api/clients/property/${property.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      setHasHandoverData(response.ok)
    } catch (error) {
      console.log('No handover data available for this property')
      setHasHandoverData(false)
    } finally {
      setCheckingHandover(false)
    }
  }

  const getStatusColor = (status?: string): string => {
    const colors = {
      INTERESTED: 'bg-blue-100 text-blue-800',
      IN_HANDOVER: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
    } as const
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status?: string): string => {
    const labels = {
      INTERESTED: 'Interested',
      IN_HANDOVER: 'In Progress',
      COMPLETED: 'Completed',
    } as const
    return labels[status as keyof typeof labels] || 'Unknown'
  }

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(property.id)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Property Image and Header */}
      <div className="relative h-48 bg-gray-200 flex items-center justify-center">
        {hasImage && !imageError ? (
          <Image
            src={property.main_image || property.images?.[0] || ''}
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
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(property.status)}`}>
            {getStatusLabel(property.status)}
          </span>
        </div>

        {/* Property Type Badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
            {property.property_type_display || property.property_type || 'Property'}
          </span>
        </div>
      </div>

      {/* Property Summary */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
          <button
            onClick={onToggleExpanded}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {expanded ? 'Hide Details' : 'View Details'}
          </button>
        </div>
        
        <p className="text-gray-600 text-sm mb-2">
          📍 {property.physical_address || property.location || 'Location not specified'}
        </p>

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xl font-bold text-green-600">
              {property.asking_price_kes ? formatCurrency(property.asking_price_kes) : 'Price on request'}
            </p>
            <p className="text-sm text-gray-500">
              {property.property_type_display || 'Property for sale'}
            </p>
          </div>
        </div>

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

        {/* Interest Date */}
        {property.interest_date && (
          <div className="text-sm text-gray-600 mb-3">
            <span className="font-medium">Interest expressed:</span>{' '}
            {new Date(property.interest_date).toLocaleDateString()}
          </div>
        )}

        {/* Progress Bar for In-Progress Properties */}
        {property.status === 'IN_HANDOVER' && property.handover_progress !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{property.handover_progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${property.handover_progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200">
          {checkingHandover ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Checking for handover details...</span>
            </div>
          ) : hasHandoverData ? (
            <ClientHandoverView
              propertyId={property.id}
              onClose={() => onToggleExpanded?.()}
            />
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 px-4">
                <TabNavigation
                  tabs={PROPERTY_TABS}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  variant="underline"
                />
              </div>

          {/* Tab Content */}
          <div className="p-4 space-y-6">
            <TabContent activeTab={activeTab} tabId="details">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Property Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <p className="text-gray-600">{property.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Type:</span>
                      <p className="text-gray-600">{property.property_type_display || property.property_type}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Address:</span>
                      <p className="text-gray-600">{property.physical_address || property.location}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <p className="text-gray-600">{property.handover_status_display || property.handover_status}</p>
                    </div>
                  </div>
                </div>

                {property.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600 text-sm">{property.description}</p>
                  </div>
                )}

                {property.current_stage && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Current Stage</h4>
                    <p className="text-gray-600 text-sm">{property.current_stage}</p>
                  </div>
                )}
              </div>
            </TabContent>

            <TabContent activeTab={activeTab} tabId="documents">
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📄</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Documents</h4>
                <p className="text-gray-600">Document access will be available as your property progresses through the handover process.</p>
              </div>
            </TabContent>

            <TabContent activeTab={activeTab} tabId="financial">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Financial Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Asking Price:</span>
                      <p className="text-gray-600">
                        {property.asking_price_kes ? formatCurrency(property.asking_price_kes) : 'Price on request'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm">Detailed financial information will be available as your purchase progresses.</p>
                </div>
              </div>
            </TabContent>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
