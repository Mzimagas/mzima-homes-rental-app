'use client'

import { useState, useMemo } from 'react'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'
import PropertySearch from './PropertySearch'
// UnitForm removed - using workflow-based unit creation
import { Button } from '../../ui'

interface Property {
  id: string
  name: string
  physical_address?: string | null
  property_type?: string | null
  notes?: string | null
  acquisition_notes?: string | null
}

interface UnitAdditionCardProps {
  onUnitCreated?: (unitId: string, propertyId: string) => void
  onClose?: () => void
  className?: string
}

export default function UnitAdditionCard({
  onUnitCreated,
  onClose,
  className = '',
}: UnitAdditionCardProps) {
  const { properties: userProperties } = usePropertyAccess()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  // Unit form removed - using workflow-based unit creation

  // Convert user properties to the expected format
  const properties: Property[] = useMemo(() => {
    return userProperties.map((prop) => ({
      id: prop.property_id,
      name: prop.property_name,
      physical_address: prop.physical_address,
      property_type: prop.property_type,
      notes: prop.notes,
      acquisition_notes: prop.acquisition_notes,
    }))
  }, [userProperties])

  // Filter properties based on search term
  const filteredProperties = useMemo(() => {
    if (!searchTerm.trim()) return properties

    const lower = searchTerm.toLowerCase()
    return properties.filter((property) => {
      return (
        property.name.toLowerCase().includes(lower) ||
        (property.physical_address?.toLowerCase().includes(lower) ?? false) ||
        (property.property_type?.toLowerCase().includes(lower) ?? false) ||
        (property.notes?.toLowerCase().includes(lower) ?? false) ||
        (property.acquisition_notes?.toLowerCase().includes(lower) ?? false)
      )
    })
  }, [properties, searchTerm])

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property)
    // Unit creation is handled through workflows
    console.log('Property selected for unit creation:', property.name)
  }

  const handleUnitCreated = (unitId: string) => {
    setSelectedProperty(null)
    setSearchTerm('')
    onUnitCreated?.(unitId, selectedProperty?.id || '')
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Add Units to Property</h3>
              <p className="text-gray-600">Search for a property and add new units to it</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <PropertySearch
            onSearchChange={setSearchTerm}
            placeholder="Search properties by name, address, type, or notes..."
            resultsCount={filteredProperties.length}
            totalCount={properties.length}
            compact={true}
          />
        </div>

        {/* Property Selection */}
        {searchTerm && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Select a property to add units:</h4>

            {filteredProperties.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🔍</div>
                <p>No properties found matching "{searchTerm}"</p>
                <p className="text-sm mt-1">Try adjusting your search terms</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredProperties.map((property) => (
                  <div
                    key={property.id}
                    onClick={() => handlePropertySelect(property)}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{property.name}</h5>
                        {property.physical_address && (
                          <p className="text-sm text-gray-600 mt-1">{property.physical_address}</p>
                        )}
                        {property.property_type && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                            {property.property_type}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePropertySelect(property)
                        }}
                      >
                        Add Unit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchTerm && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🏠</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Search for Properties</h4>
            <p className="text-gray-600">
              Use the search bar above to find properties where you want to add new units
            </p>
          </div>
        )}
      </div>

      {/* Unit form removed - using workflow-based unit creation */}
    </div>
  )
}
