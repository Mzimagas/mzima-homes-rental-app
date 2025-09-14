'use client'

import { useMemo } from 'react'
import ClientPropertyCard from './ClientPropertyCard'

interface Property {
  id: string
  name: string
  location?: string
  physical_address?: string
  lat?: number | null
  lng?: number | null
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
  current_stage?: string
}

interface InProgressTabProps {
  properties: Property[]
  onRefresh?: () => void
}

export default function InProgressTab({ properties, onRefresh }: InProgressTabProps) {
  // Unified list: show COMMITTED, CONVERTED, and IN_HANDOVER; exclude COMPLETED
  const inPipeline = useMemo(() => {
    return properties.filter(
      (p) => p.status === 'COMMITTED' || p.status === 'CONVERTED' || p.status === 'IN_HANDOVER'
    )
  }, [properties])

  if (inPipeline.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">⚡</div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">No Properties In Pipeline</h3>
        <p className="text-gray-600 mb-4">
          You don&apos;t have any properties currently in the handover pipeline. Check your reserved
          properties to start the handover process.
        </p>
        <button
          onClick={() => (window.location.href = '/client-portal?tab=reserved')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Reserved Properties
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Handover Pipeline</h2>
          <p className="text-gray-600 text-sm">These will move to My Properties once completed</p>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            Refresh
          </button>
        )}
      </div>

      {/* Unified list */}
      <div className="space-y-6">
        {inPipeline.map((property) => (
          <ClientPropertyCard key={property.id} property={property as any} />
        ))}
      </div>
    </div>
  )
}
