'use client'
import OptimizedImage from '../../rent/components/OptimizedImage'
import { FavoriteButton, ShareButton } from '../../rent/components/InteractiveFeatures'

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

interface LandCardProps {
  land: LandProperty
  highlight?: (text: string) => React.ReactNode
}

export default function LandCard({ land, highlight }: LandCardProps) {
  const formatPrice = (price: number | null | undefined) => {
    if (!price) return 'Price on request'
    if (price >= 1000000) return `KES ${(price / 1000000).toFixed(1)}M`
    if (price >= 1000) return `KES ${(price / 1000).toFixed(0)}K`
    return `KES ${price.toLocaleString()}`
  }

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      RESIDENTIAL_LAND: 'Residential Land',
      COMMERCIAL_LAND: 'Commercial Land',
      AGRICULTURAL_LAND: 'Agricultural Land',
      MIXED_USE_LAND: 'Mixed-Use Land',
    }
    return labels[type] || type
  }

  const getPermitStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700 border border-green-200'
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 border border-amber-200'
      case 'DENIED':
        return 'bg-red-100 text-red-700 border border-red-200'
      case 'NOT_REQUIRED':
        return 'bg-gray-100 text-gray-700 border border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  const getPermitStatusText = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Development Approved'
      case 'PENDING':
        return 'Permit Pending'
      case 'DENIED':
        return 'Permit Denied'
      case 'NOT_REQUIRED':
        return 'No Permit Required'
      default:
        return 'Permit Status Unknown'
    }
  }

  const getUtilityIcons = () => {
    const utilities = []
    if (land.electricity_available) utilities.push({ icon: '⚡', label: 'Electricity' })
    if (land.water_available) utilities.push({ icon: '💧', label: 'Water' })
    return utilities
  }

  return (
    <a
      href={`/land/${land.property_id}`}
      className="group bg-elevated rounded-xl shadow-sm border border-light overflow-hidden hover:shadow-xl hover:border-medium transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 block"
    >
      {/* Image Container */}
      <div className="relative aspect-video bg-tertiary overflow-hidden">
        {land.thumbnail_url ? (
          <OptimizedImage
            src={land.thumbnail_url}
            alt={`${land.property_name} - ${getPropertyTypeLabel(land.property_type)}`}
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-quaternary">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
        )}

        {/* Property Type Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1.5 text-xs font-medium rounded-full backdrop-blur-sm bg-primary-600 text-inverse border border-primary-700">
            {getPropertyTypeLabel(land.property_type)}
          </span>
        </div>

        {/* Development Permit Status */}
        {land.development_permit_status && (
          <div className="absolute top-3 right-3">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full backdrop-blur-sm ${getPermitStatusColor(land.development_permit_status)}`}
            >
              {getPermitStatusText(land.development_permit_status)}
            </span>
          </div>
        )}

        {/* Interactive Buttons */}
        <div className="absolute bottom-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <FavoriteButton unitId={land.property_id} />
          <ShareButton
            unit={{
              unit_id: land.property_id,
              unit_label: land.property_name,
              property_name: getPropertyTypeLabel(land.property_type),
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col h-full">
        {/* Property Name and Location */}
        <div className="mb-4">
          <h3 className="font-semibold text-primary text-lg group-hover:text-brand transition-colors">
            {highlight ? highlight(land.property_name) : land.property_name}
          </h3>
          {land.physical_address && (
            <p className="text-tertiary text-sm mt-1 flex items-center">
              <svg
                className="w-3 h-3 mr-1 text-quaternary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {highlight ? highlight(land.physical_address) : land.physical_address}
            </p>
          )}
        </div>

        {/* Area and Zoning */}
        <div className="mb-4 space-y-2">
          {land.area_display && (
            <div className="flex items-center justify-between">
              <span className="text-secondary text-sm">Area:</span>
              <span className="font-medium text-primary">{land.area_display}</span>
            </div>
          )}
          {land.zoning_classification && (
            <div className="flex items-center justify-between">
              <span className="text-secondary text-sm">Zoning:</span>
              <span className="font-medium text-primary">{land.zoning_classification}</span>
            </div>
          )}
          {land.road_access_type && (
            <div className="flex items-center justify-between">
              <span className="text-secondary text-sm">Road Access:</span>
              <span className="font-medium text-primary">{land.road_access_type}</span>
            </div>
          )}
        </div>

        {/* Utilities */}
        {getUtilityIcons().length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-secondary text-sm">Utilities:</span>
              <div className="flex space-x-2">
                {getUtilityIcons().map((utility, index) => (
                  <span key={index} className="text-lg" title={utility.label}>
                    {utility.icon}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Amenities Preview */}
        {land.amenities && land.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {land.amenities.slice(0, 3).map((amenity) => (
                <span
                  key={amenity.code}
                  className="px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded-full border border-primary-200"
                >
                  {amenity.label}
                </span>
              ))}
              {land.amenities.length > 3 && (
                <span className="px-2 py-1 text-xs bg-tertiary text-tertiary rounded-full border border-light">
                  +{land.amenities.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="space-y-1 mb-4 mt-auto">
          {land.sale_price_kes && (
            <div className="text-xl font-bold text-primary">
              {formatPrice(land.sale_price_kes)}
              <span className="text-sm font-normal text-tertiary"> for sale</span>
            </div>
          )}
          {land.lease_price_per_sqm_kes && (
            <div className="text-lg font-semibold text-secondary">
              {formatPrice(land.lease_price_per_sqm_kes)}/sqm
              <span className="text-sm font-normal text-tertiary"> lease</span>
            </div>
          )}
          {land.total_lease_price_kes && (
            <div className="text-sm text-tertiary">
              Total: {formatPrice(land.total_lease_price_kes)}
            </div>
          )}
          {!land.sale_price_kes && !land.lease_price_per_sqm_kes && (
            <div className="text-lg font-semibold text-secondary">Price on request</div>
          )}
        </div>

        {/* View Details Button */}
        <div className="pt-4 border-t border-light">
          <span className="text-brand text-sm font-medium group-hover:text-primary-800 flex items-center">
            View Details
            <svg
              className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  )
}
