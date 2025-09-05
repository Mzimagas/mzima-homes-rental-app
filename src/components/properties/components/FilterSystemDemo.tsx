'use client'

import { useState } from 'react'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { usePropertyFilters } from '../../../hooks/usePropertyFilters'
import { useFilterPanel } from '../../../hooks/useFilterPanel'
import { useSavedFilters } from '../../../hooks/useSavedFilters'
import PropertySearch from './PropertySearch'
import PropertyFilterPanel from './PropertyFilterPanel'
import SavedFiltersPanel from './SavedFiltersPanel'

// Demo data
const demoProperties: PropertyWithLifecycle[] = [
  {
    id: '1',
    name: 'Westlands Apartment Complex',
    physical_address: '123 Westlands Road, Nairobi',
    property_type: 'APARTMENT',
    property_source: 'DIRECT_ADDITION',
    lifecycle_status: 'RENTAL_READY',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Modern apartment complex with 50 units'
  },
  {
    id: '2',
    name: 'Karen Family House',
    physical_address: '456 Karen Estate, Nairobi',
    property_type: 'HOUSE',
    property_source: 'PURCHASE_PIPELINE',
    lifecycle_status: 'ACQUISITION',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Single family house in Karen'
  },
  {
    id: '3',
    name: 'Kiambu Land Subdivision',
    physical_address: '789 Kiambu County',
    property_type: 'LAND',
    property_source: 'DIRECT_ADDITION',
    lifecycle_status: 'SUBDIVISION',
    subdivision_status: 'SUB_DIVISION_STARTED',
    handover_status: 'NOT_STARTED',
    notes: '10-acre land being subdivided into plots'
  },
  {
    id: '4',
    name: 'CBD Commercial Building',
    physical_address: '321 CBD, Nairobi',
    property_type: 'COMMERCIAL',
    property_source: 'DIRECT_ADDITION',
    lifecycle_status: 'HANDOVER',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'IN_PROGRESS',
    notes: 'Office building in the CBD'
  },
  {
    id: '5',
    name: 'Lavington Townhouse',
    physical_address: '654 Lavington, Nairobi',
    property_type: 'TOWNHOUSE',
    property_source: 'PURCHASE_PIPELINE',
    lifecycle_status: 'ACQUISITION',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Luxury townhouse in Lavington'
  },
  {
    id: '6',
    name: 'Completed Subdivision Plot',
    physical_address: '987 Machakos County',
    property_type: 'LAND',
    property_source: 'SUBDIVISION_PROCESS',
    lifecycle_status: 'RENTAL_READY',
    subdivision_status: 'SUBDIVIDED',
    handover_status: 'COMPLETED',
    notes: 'Completed subdivision plot ready for sale'
  }
] as PropertyWithLifecycle[]

export default function FilterSystemDemo() {
  // Initialize filter system
  const {
    filters,
    filteredProperties,
    filterCounts,
    totalCount,
    filteredCount,
    setPipelineFilter,
    setStatusFilter,
    setPropertyTypesFilter,
    setSearchTerm,
    clearFilters,
    hasActiveFilters,
    applyPreset
  } = usePropertyFilters(demoProperties, {
    persistKey: 'demo-property-filters'
  })

  // Filter panel state
  const { isCollapsed, toggleCollapse } = useFilterPanel({
    defaultCollapsed: false,
    persistKey: 'demo-filter-panel'
  })

  // Saved filters
  const {
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter
  } = useSavedFilters({
    persistKey: 'demo-saved-filters'
  })

  // Handle loading saved filters
  const handleLoadSavedFilter = (id: string) => {
    const savedFilterData = loadFilter(id)
    if (savedFilterData) {
      setPipelineFilter(savedFilterData.pipeline)
      setStatusFilter(savedFilterData.status)
      setPropertyTypesFilter(savedFilterData.propertyTypes)
      setSearchTerm(savedFilterData.searchTerm)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Filter System Demo</h1>
        <p className="text-gray-600">
          Explore the comprehensive property filtering capabilities with live demo data
        </p>
      </div>

      {/* Filter System */}
      <div className="space-y-4">
        {/* Search */}
        <PropertySearch
          onSearchChange={setSearchTerm}
          placeholder="Search demo properties by name, address, type, or notes..."
          resultsCount={filteredCount}
          totalCount={totalCount}
          showFilterToggle={true}
          onFilterToggle={toggleCollapse}
          hasActiveFilters={hasActiveFilters}
          filterCount={[
            filters.pipeline !== 'all' ? 1 : 0,
            filters.status !== 'all' ? 1 : 0,
            filters.propertyTypes.length
          ].reduce((a, b) => a + b, 0)}
        />

        {/* Filter and Saved Filters Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Filter Panel */}
          <div className="lg:col-span-2">
            <PropertyFilterPanel
              pipelineFilter={filters.pipeline}
              statusFilter={filters.status}
              propertyTypes={filters.propertyTypes}
              filterCounts={filterCounts}
              onPipelineChange={setPipelineFilter}
              onStatusChange={setStatusFilter}
              onPropertyTypesChange={setPropertyTypesFilter}
              onClearFilters={clearFilters}
              onApplyPreset={applyPreset}
              isCollapsed={isCollapsed}
              onToggleCollapse={toggleCollapse}
            />
          </div>

          {/* Saved Filters Panel */}
          <div className="lg:col-span-1">
            <SavedFiltersPanel
              savedFilters={savedFilters}
              currentFilters={filters}
              onLoadFilter={handleLoadSavedFilter}
              onSaveFilter={saveFilter}
              onDeleteFilter={deleteFilter}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Filtered Results ({filteredCount} of {totalCount})
          </h2>
        </div>
        <div className="p-6">
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProperties.map(property => (
                <div key={property.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">{property.name}</h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {property.property_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{property.physical_address}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>Source: {property.property_source}</div>
                    <div>Lifecycle: {property.lifecycle_status}</div>
                    {property.subdivision_status !== 'NOT_STARTED' && (
                      <div>Subdivision: {property.subdivision_status}</div>
                    )}
                    {property.handover_status !== 'NOT_STARTED' && (
                      <div>Handover: {property.handover_status}</div>
                    )}
                  </div>
                  {property.notes && (
                    <p className="text-xs text-gray-500 mt-2 italic">{property.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No properties found</h3>
              <p className="text-gray-500">Try adjusting your filters to see more results.</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Current Filter Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Pipeline:</span>
            <span className="ml-1 text-gray-600">{filters.pipeline}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className="ml-1 text-gray-600">{filters.status}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Types:</span>
            <span className="ml-1 text-gray-600">
              {filters.propertyTypes.length > 0 ? filters.propertyTypes.join(', ') : 'All'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Search:</span>
            <span className="ml-1 text-gray-600">
              {filters.searchTerm || 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
