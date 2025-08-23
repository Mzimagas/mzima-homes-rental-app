'use client'

import React, { useEffect } from 'react'
import { usePropertySelection } from '../hooks/usePropertySelection'

interface PropertySelectorProps {
  onPropertySelect?: (propertyId: string) => void
  className?: string
}

export default function PropertySelector({ onPropertySelect, className = '' }: PropertySelectorProps) {
  const {
    selectedProperty,
    showDropdown,
    searchTerm,
    loadingProperties,
    properties,
    handlePropertySelect,
    toggleDropdown,
    setSearchTerm,
    getSelectedPropertyDisplay,
    searchPropertiesDebounced,
    isLifecycleStage
  } = usePropertySelection()

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchPropertiesDebounced(searchTerm)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, searchPropertiesDebounced])

  // Notify parent of property selection
  useEffect(() => {
    if (onPropertySelect) {
      onPropertySelect(selectedProperty)
    }
  }, [selectedProperty, onPropertySelect])

  // Filter properties based on search term
  const filteredProperties = properties.filter(property => {
    if (!searchTerm.trim()) return true
    return property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           property.address.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleInternalPropertySelect = (propertyId: string) => {
    handlePropertySelect(propertyId)
  }

  return (
    <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
      <h4 className="font-medium text-gray-900 mb-3">Permission Scope</h4>
      <div className="relative property-dropdown">
        <button
          type="button"
          onClick={toggleDropdown}
          className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {getSelectedPropertyDisplay()}
            </span>
            <span className={`text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder={`Search ${properties.length} properties...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingProperties}
                autoFocus
              />
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {/* Global Option - Always First */}
              <button
                type="button"
                onClick={() => handleInternalPropertySelect('global')}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedProperty === 'global' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">🌐 Global Permissions (All Properties)</span>
                  {selectedProperty === 'global' && (
                    <span className="text-blue-600 text-sm">✓</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Apply permissions across all properties</p>
              </button>

              {/* Lifecycle Filters Section */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Lifecycle Filters</span>
              </div>

              {/* Purchase Pipeline Filter */}
              <button
                type="button"
                onClick={() => handleInternalPropertySelect('purchase_pipeline')}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedProperty === 'purchase_pipeline' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">🏗️ Purchase Pipeline Properties</span>
                  {selectedProperty === 'purchase_pipeline' && (
                    <span className="text-blue-600 text-sm">✓</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Properties in purchase pipeline or recently purchased</p>
              </button>

              {/* Subdivision Filter */}
              <button
                type="button"
                onClick={() => handleInternalPropertySelect('subdivision')}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedProperty === 'subdivision' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">📐 Subdivision Properties</span>
                  {selectedProperty === 'subdivision' && (
                    <span className="text-blue-600 text-sm">✓</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Properties undergoing subdivision process</p>
              </button>

              {/* Handover Filter */}
              <button
                type="button"
                onClick={() => handleInternalPropertySelect('handover')}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedProperty === 'handover' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">🤝 Handover Properties</span>
                  {selectedProperty === 'handover' && (
                    <span className="text-blue-600 text-sm">✓</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Properties actively in handover process (in progress or completed)</p>
              </button>

              {/* Filtered Properties Section Header */}
              {properties.length > 0 && isLifecycleStage(selectedProperty) && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {selectedProperty === 'purchase_pipeline' ? `Purchase Pipeline Properties (${properties.length})` :
                     selectedProperty === 'subdivision' ? `Subdivision Properties (${properties.length})` :
                     selectedProperty === 'handover' ? `Handover Properties (${properties.length})` : `Filtered Properties (${properties.length})`}
                  </span>
                </div>
              )}

              {/* Individual Properties Section */}
              {properties.length > 0 && !isLifecycleStage(selectedProperty) && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Individual Properties</span>
                </div>
              )}

              {/* Loading State */}
              {loadingProperties ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Loading properties...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Filtered Properties */}
                  {filteredProperties.length > 0 ? (
                    filteredProperties.map(property => (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => handleInternalPropertySelect(property.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          selectedProperty === property.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">🏠 {property.name}</span>
                              {property.property_type && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  {property.property_type}
                                </span>
                              )}
                              {/* Show lifecycle status for filtered properties */}
                              {isLifecycleStage(selectedProperty) && (
                                <>
                                  {property.lifecycle_status && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                      {property.lifecycle_status}
                                    </span>
                                  )}
                                  {property.subdivision_status && selectedProperty === 'subdivision' && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                      {property.subdivision_status}
                                    </span>
                                  )}
                                  {property.handover_status && selectedProperty === 'handover' && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                      {property.handover_status}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{property.address}</p>
                            {property.size_acres && (
                              <p className="text-xs text-gray-400">📏 {property.size_acres} acres</p>
                            )}
                          </div>
                          {selectedProperty === property.id && (
                            <span className="text-blue-600 text-sm">✓</span>
                          )}
                        </div>
                      </button>
                    ))
                  ) : searchTerm && !loadingProperties ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No properties found matching "{searchTerm}"
                      <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                    </div>
                  ) : !loadingProperties && properties.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No properties available for {selectedProperty}
                      <p className="text-xs text-gray-400 mt-1">
                        {selectedProperty === 'purchase_pipeline' ? 'No properties in purchase pipeline' :
                         selectedProperty === 'subdivision' ? 'No properties in subdivision' :
                         selectedProperty === 'handover' ? 'No properties in handover' :
                         'Contact your administrator for access'}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Property Overview */}
      {!loadingProperties && properties.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">
                {selectedProperty === 'purchase_pipeline' ? '🏗️ Purchase Pipeline Properties' :
                 selectedProperty === 'subdivision' ? '📐 Subdivision Properties' :
                 selectedProperty === 'handover' ? '🤝 Handover Properties' :
                 'Property Access Overview'}
              </h4>
              <p className="text-sm text-blue-700">
                {selectedProperty === 'purchase_pipeline' ?
                  `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} in purchase pipeline` :
                 selectedProperty === 'subdivision' ?
                  `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} in subdivision process` :
                 selectedProperty === 'handover' ?
                  `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} in handover stages` :
                  `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} available for permission assignment`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
