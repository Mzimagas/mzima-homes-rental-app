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
  // Categorize properties by their handover status
  const { committedProperties, inHandoverProperties, completedProperties } = useMemo(() => {
    const committed = properties.filter((p) => p.status === 'COMMITTED')
    const inHandover = properties.filter((p) => p.status === 'IN_HANDOVER')
    const completed = properties.filter((p) => p.status === 'COMPLETED')

    return {
      committedProperties: committed,
      inHandoverProperties: inHandover,
      completedProperties: completed,
    }
  }, [properties])

  const totalProperties = properties.length

  if (totalProperties === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">⚡</div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">No Properties In Progress</h3>
        <p className="text-gray-600 mb-4">
          You don&apos;t have any properties currently in the handover process. Check your reserved
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
          <h2 className="text-xl font-semibold text-gray-900">Properties In Progress</h2>
          <p className="text-gray-600 text-sm">
            Properties currently going through the handover process
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            {totalProperties} propert{totalProperties !== 1 ? 'ies' : 'y'} in progress
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Committed</p>
              <p className="text-xl font-bold text-gray-900">{committedProperties.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">In Handover</p>
              <p className="text-xl font-bold text-gray-900">{inHandoverProperties.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-xl font-bold text-gray-900">{completedProperties.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Sections */}
      <div className="space-y-8">
        {/* Committed Properties Section */}
        {committedProperties.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Committed Properties</h3>
                <p className="text-sm text-gray-600">
                  Properties you&apos;ve committed to - ready to start handover process
                </p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {committedProperties.length}
              </span>
            </div>
            <div className="space-y-6">
              {committedProperties.map((property) => (
                <ClientPropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        )}

        {/* In Handover Properties Section */}
        {inHandoverProperties.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">In Handover Process</h3>
                <p className="text-sm text-gray-600">
                  Properties currently going through the handover process
                </p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {inHandoverProperties.length}
              </span>
            </div>
            <div className="space-y-6">
              {inHandoverProperties.map((property) => (
                <ClientPropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Properties Section */}
        {completedProperties.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Completed Properties</h3>
                <p className="text-sm text-gray-600">
                  Properties that have completed the handover process
                </p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {completedProperties.length}
              </span>
            </div>
            <div className="space-y-6">
              {completedProperties.map((property) => (
                <ClientPropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
