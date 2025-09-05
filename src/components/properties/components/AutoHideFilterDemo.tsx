'use client'

import { useState } from 'react'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { usePropertyFilters } from '../../../hooks/usePropertyFilters'
import { useFilterPanel } from '../../../hooks/useFilterPanel'
import PropertySearch from './PropertySearch'
import PropertyFilterPanel from './PropertyFilterPanel'

// Demo data
const demoProperties: PropertyWithLifecycle[] = [
  {
    id: '1',
    name: 'Westlands Apartment',
    physical_address: '123 Westlands Road',
    property_type: 'APARTMENT',
    property_source: 'DIRECT_ADDITION',
    lifecycle_status: 'RENTAL_READY',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Modern apartment complex',
  },
  {
    id: '2',
    name: 'Karen House',
    physical_address: '456 Karen Estate',
    property_type: 'HOUSE',
    property_source: 'PURCHASE_PIPELINE',
    lifecycle_status: 'ACQUISITION',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Family house in Karen',
  },
  {
    id: '3',
    name: 'Subdivision Land',
    physical_address: '789 Kiambu County',
    property_type: 'LAND',
    property_source: 'DIRECT_ADDITION',
    lifecycle_status: 'SUBDIVISION',
    subdivision_status: 'SUB_DIVISION_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Land being subdivided',
  },
] as PropertyWithLifecycle[]

export default function AutoHideFilterDemo() {
  // Initialize filter system with auto-hide
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
    applyPreset,
  } = usePropertyFilters(demoProperties, {
    persistKey: 'auto-hide-demo-filters',
  })

  // Auto-hiding filter panel
  const { isCollapsed, toggleCollapse, setCollapsed } = useFilterPanel({
    defaultCollapsed: true,
    persistKey: 'auto-hide-demo-panel',
    autoCollapseOnMobile: true,
  })

  // Auto-hide when no filters are active
  useState(() => {
    if (!hasActiveFilters && !isCollapsed) {
      const timer = setTimeout(() => setCollapsed(true), 1000)
      return () => clearTimeout(timer)
    }
  })

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Auto-Hide Filter Demo</h1>
        <p className="text-gray-600">
          Filters automatically hide when not in use. Use quick filter buttons or the filter toggle.
        </p>
      </div>

      {/* Search with Quick Filters */}
      <div className="space-y-4">
        <PropertySearch
          onSearchChange={setSearchTerm}
          placeholder="Search demo properties..."
          resultsCount={filteredCount}
          totalCount={totalCount}
          showFilterToggle={true}
          onFilterToggle={toggleCollapse}
          hasActiveFilters={hasActiveFilters}
          filterCount={[
            filters.pipeline !== 'all' ? 1 : 0,
            filters.status !== 'all' ? 1 : 0,
            filters.propertyTypes.length,
          ].reduce((a, b) => a + b, 0)}
          showQuickFilters={true}
          onQuickFilter={applyPreset}
        />

        {/* Auto-hiding Filter Panel */}
        {!isCollapsed && (
          <div className="animate-in slide-in-from-top-2 duration-200">
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
              isCollapsed={false}
              onToggleCollapse={toggleCollapse}
            />
          </div>
        )}

        {/* Compact Filter Summary when collapsed */}
        {isCollapsed && hasActiveFilters && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-900">Active Filters:</span>
                <div className="flex items-center space-x-2">
                  {filters.pipeline !== 'all' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Pipeline: {filters.pipeline}
                    </span>
                  )}
                  {filters.status !== 'all' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Status: {filters.status}
                    </span>
                  )}
                  {filters.propertyTypes.length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Types: {filters.propertyTypes.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear All
                </button>
                <button
                  onClick={toggleCollapse}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Results ({filteredCount} of {totalCount})
          </h2>
        </div>
        <div className="p-6">
          {filteredProperties.length > 0 ? (
            <div className="space-y-3">
              {filteredProperties.map((property) => (
                <div key={property.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{property.name}</h3>
                      <p className="text-sm text-gray-600">{property.physical_address}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {property.property_type}
                        </span>
                        <span className="text-xs text-gray-500">{property.property_source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No properties match your current filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Improved Auto-Hide UX:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • <strong>Smart Timing:</strong> Panel waits 3+ seconds after your last interaction
            before auto-hiding
          </li>
          <li>
            • <strong>Hover Protection:</strong> Panel won&apos;t auto-hide while you&apos;re
            hovering over it
          </li>
          <li>
            • <strong>Quick Filters:</strong> Use colored buttons (🟢 Active, 🏢 Purchase, etc.) for
            instant filtering
          </li>
          <li>
            • <strong>Consistent Behavior:</strong> Same timing whether filters are active or not
          </li>
          <li>
            • <strong>Mobile Optimized:</strong> Automatically collapses on mobile devices
          </li>
          <li>
            • <strong>Visual Feedback:</strong> Active filters shown in compact summary when
            collapsed
          </li>
        </ul>
      </div>
    </div>
  )
}
