import React, { useState } from 'react'
import { Property, SubdivisionItem } from '../../../types/subdivision'
import { formatKES, formatDate } from '../../../lib/utils/subdivision'
import { Button } from '../../ui'
import PropertyCard, { PropertyCardHeader, PropertyCardContent } from './PropertyCard'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import InlinePropertyView from './InlinePropertyView'
import InlineSubdivisionPlots from './InlineSubdivisionPlots'
import { useAutoCloseWithCountdown } from '../../../hooks/useAutoClose'

interface SubdivisionPropertyCardProps {
  property: Property
  subdivision?: SubdivisionItem | null
  canEdit: boolean
  onStartSubdivision: (property: Property) => void
  onEditSubdivision: (subdivision: SubdivisionItem) => void
  onViewHistory: (subdivisionId: string) => void
  onPropertyCreated?: (propertyId: string) => void
}

export const SubdivisionPropertyCard: React.FC<SubdivisionPropertyCardProps> = ({
  property,
  subdivision,
  canEdit,
  onStartSubdivision,
  onEditSubdivision,
  onViewHistory,
  onPropertyCreated
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [showPlots, setShowPlots] = useState(false)

  const hasSubdivision = Boolean(subdivision)

  // Click-outside functionality for property details
  const { containerRef: detailsContainerRef } = useAutoCloseWithCountdown(
    showDetails,
    () => setShowDetails(false)
  )

  // Click-outside functionality for plots view
  const { containerRef: plotsContainerRef } = useAutoCloseWithCountdown(
    showPlots,
    () => setShowPlots(false)
  )

  const handleStartSubdivision = () => {
    onStartSubdivision(property)
  }

  const handleEditSubdivision = () => {
    if (subdivision) {
      onEditSubdivision(subdivision)
    }
  }

  const handleViewHistory = () => {
    if (subdivision) {
      onViewHistory(subdivision.id)
    }
  }

  return (
    <PropertyCard theme="subdivision" interactive lifecycle={property.lifecycle_status}>
      <PropertyCardHeader>
        {/* Header: grid cols-3 layout */}
        <div className="grid grid-cols-3 gap-4 items-start">
          {/* Left 2/3: Property info */}
          <div className="col-span-2">
            {/* Property Name and Status */}
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {property.name}
              </h3>
              <span className="text-2xl">🏗️</span>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                Subdivision Pipeline
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                {property.subdivision_status || 'Not Started'}
              </span>
            </div>

            {/* Address */}
            <p className="text-sm text-gray-600 mb-3">
              {property.physical_address}
            </p>

            {/* Meta Information */}
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center space-x-4">
                {property.property_type && (
                  <span>Type: {property.property_type}</span>
                )}
                {property.area_acres && (
                  <span>Area: {property.area_acres} acres</span>
                )}
                {property.expected_rent_kes && (
                  <span>Expected Rent: {formatKES(property.expected_rent_kes)}/month</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {property.purchase_date && (
                  <span>Purchased: {formatDate(property.purchase_date)}</span>
                )}
                {subdivision?.subdivision_date && (
                  <span>Subdivided: {formatDate(subdivision.subdivision_date)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right 1/3: Google Maps button */}
          <div className="flex justify-end">
            {(property.lat && property.lng) || property.physical_address ? (
              <ViewOnGoogleMapsButton
                lat={property.lat}
                lng={property.lng}
                address={property.physical_address}
                label={property.name}
                size="sm"
              />
            ) : null}
          </div>
        </div>
      </PropertyCardHeader>

      {/* Footer: actions with left/right alignment */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        {/* Left side: View Details toggle */}
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            📋 {showDetails ? 'Hide Details' : 'View Details'}
          </Button>
        </div>

        {/* Right side: Primary actions */}
        <div className="flex items-center space-x-2">
          {hasSubdivision && subdivision ? (
            <>
              <Button
                variant={canEdit ? "primary" : "secondary"}
                size="sm"
                onClick={canEdit ? handleEditSubdivision : undefined}
                disabled={!canEdit}
                className={!canEdit ? "opacity-50 cursor-not-allowed" : ""}
                title={!canEdit ? "Subdivision is completed and cannot be edited" : "Edit subdivision plan"}
              >
                ✏️ Edit Subdivision Plan
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPlots(!showPlots)}
              >
                📐 {showPlots ? 'Hide Plots ▲' : 'View Plots ▼'}
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewHistory}
              >
                📋 View History
              </Button>
            </>
          ) : (
            canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartSubdivision}
              >
                Create Subdivision Plan
              </Button>
            )
          )}
        </div>
      </div>

      {/* Expandable Details Section */}
      {showDetails && (
        <PropertyCardContent>
          <div ref={detailsContainerRef}>
            <InlinePropertyView
              property={property}
              canEdit={canEdit}
              onPropertyUpdated={() => {
                // Refresh property data if needed
              }}
            />
          </div>
        </PropertyCardContent>
      )}

      {/* Expandable Plots Section */}
      {hasSubdivision && subdivision && showPlots && (
        <PropertyCardContent>
          <div ref={plotsContainerRef}>
            <InlineSubdivisionPlots
              property={property}
              subdivision={subdivision}
              isExpanded={showPlots}
              onToggle={() => setShowPlots(!showPlots)}
              onPropertyCreated={onPropertyCreated}
              canEdit={canEdit}
            />
          </div>
        </PropertyCardContent>
      )}
    </PropertyCard>
  )
}
