import React, { useState, useMemo, Suspense } from 'react'
import { Property, SubdivisionItem } from '../../../types/subdivision'
import { formatKES, formatDate } from '../../../lib/utils/subdivision'
import { Button } from '../../ui'
import PropertyCard, { PropertyCardHeader, PropertyCardContent } from './PropertyCard'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import InlinePropertyView from './InlinePropertyView'
import InlineSubdivisionPlots from './InlineSubdivisionPlots'
import { useAutoCloseWithCountdown } from '../../../hooks/useAutoClose'
import SkeletonLoader from '../../ui/SkeletonLoader'

interface SubdivisionPropertyCardProps {
  property: Property
  subdivision?: SubdivisionItem | null
  canEdit: boolean
  onStartSubdivision: (property: Property) => void
  onEditSubdivision: (subdivision: SubdivisionItem) => void
  onViewHistory: (subdivisionId: string) => void
  onPropertyCreated?: (propertyId: string) => void
  loading?: boolean
  skeleton?: boolean
}

// Skeleton component for loading state
const SubdivisionPropertyCardSkeleton: React.FC = () => (
  <PropertyCard theme="subdivision" interactive={false}>
    <PropertyCardHeader>
      <div className="grid grid-cols-3 gap-4 items-start">
        <div className="col-span-2">
          <div className="flex items-center space-x-3 mb-2">
            <SkeletonLoader height="1.5rem" width="60%" />
            <SkeletonLoader variant="circular" width="2rem" height="2rem" />
          </div>
          <SkeletonLoader height="1rem" width="80%" className="mb-3" />
          <div className="space-y-1">
            <SkeletonLoader height="0.75rem" width="70%" />
            <SkeletonLoader height="0.75rem" width="60%" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <SkeletonLoader height="2rem" width="8rem" />
          <SkeletonLoader height="2rem" width="6rem" />
        </div>
      </div>
    </PropertyCardHeader>
  </PropertyCard>
)

const SubdivisionPropertyCardComponent: React.FC<SubdivisionPropertyCardProps> = ({
  property,
  subdivision,
  canEdit,
  onStartSubdivision,
  onEditSubdivision,
  onViewHistory,
  onPropertyCreated,
  loading = false,
  skeleton = false
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [showPlots, setShowPlots] = useState(false)

  // Memoized computed values for performance
  const hasSubdivision = useMemo(() => Boolean(subdivision), [subdivision])

  const propertyMetadata = useMemo(() => ({
    type: property.property_type,
    area: property.area_acres,
    expectedRent: property.expected_rent_kes,
    purchaseDate: property.purchase_date,
    subdivisionDate: subdivision?.subdivision_date
  }), [property, subdivision])

  // Always call hooks - Click-outside functionality for property details
  const { containerRef: detailsContainerRef } = useAutoCloseWithCountdown(
    showDetails,
    () => setShowDetails(false)
  )

  // Always call hooks - Click-outside functionality for plots view
  const { containerRef: plotsContainerRef } = useAutoCloseWithCountdown(
    showPlots,
    () => setShowPlots(false)
  )

  // Show skeleton while loading (after all hooks are called)
  if (skeleton || loading) {
    return <SubdivisionPropertyCardSkeleton />
  }

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

            {/* Meta Information - Optimized with memoized data */}
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center space-x-4">
                {propertyMetadata.type && (
                  <span>Type: {propertyMetadata.type}</span>
                )}
                {propertyMetadata.area && (
                  <span>Area: {propertyMetadata.area} acres</span>
                )}
                {propertyMetadata.expectedRent && (
                  <span>Expected Rent: {formatKES(propertyMetadata.expectedRent)}/month</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {propertyMetadata.purchaseDate && (
                  <span>Purchased: {formatDate(propertyMetadata.purchaseDate)}</span>
                )}
                {propertyMetadata.subdivisionDate && (
                  <span>Subdivided: {formatDate(propertyMetadata.subdivisionDate)}</span>
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

      {/* Expandable Details Section - Lazy loaded */}
      {showDetails && (
        <PropertyCardContent>
          <div ref={detailsContainerRef}>
            <Suspense fallback={<SkeletonLoader variant="card" height="200px" />}>
              <InlinePropertyView
                property={property}
                canEdit={canEdit}
                onPropertyUpdated={() => {
                  // Refresh property data if needed
                }}
              />
            </Suspense>
          </div>
        </PropertyCardContent>
      )}

      {/* Expandable Plots Section - Lazy loaded */}
      {hasSubdivision && subdivision && showPlots && (
        <PropertyCardContent>
          <div ref={plotsContainerRef}>
            <Suspense fallback={<SkeletonLoader variant="card" height="300px" />}>
              <InlineSubdivisionPlots
                property={property}
                subdivision={subdivision}
                isExpanded={showPlots}
                onToggle={() => setShowPlots(!showPlots)}
                onPropertyCreated={onPropertyCreated}
                canEdit={canEdit}
              />
            </Suspense>
          </div>
        </PropertyCardContent>
      )}
    </PropertyCard>
  )
}

// Memoized export for performance optimization
export const SubdivisionPropertyCard = React.memo(SubdivisionPropertyCardComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.property.id === nextProps.property.id &&
    prevProps.property.name === nextProps.property.name &&
    prevProps.property.subdivision_status === nextProps.property.subdivision_status &&
    prevProps.subdivision?.id === nextProps.subdivision?.id &&
    prevProps.subdivision?.subdivision_status === nextProps.subdivision?.subdivision_status &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.loading === nextProps.loading &&
    prevProps.skeleton === nextProps.skeleton
  )
})
