'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Button } from '../../ui'
import Modal from '../../ui/Modal'
import PropertyList from './PropertyList'
import PropertySearch from './PropertySearch'
import PropertyFilterPanel from './PropertyFilterPanel'
import PropertyForm from '../property-form'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { usePropertyFilters } from '../../../hooks/usePropertyFilters'
import { useFilterPanel } from '../../../hooks/useFilterPanel'
import supabase from '../../../lib/supabase-client'

interface PropertiesTabProps {
  properties: PropertyWithLifecycle[]
  loading: boolean
  savingChanges: { [propertyId: string]: boolean }
  searchTerm: string
  onSearchChange: (searchTerm: string) => void
  onPropertyCreated: (propertyId: string) => void
  onSubdivisionChange: (propertyId: string, value: string) => void
  onHandoverChange: (propertyId: string, value: string) => void
  onNavigateToTabs: (tab: string) => void
  onRefresh?: () => void
}

export default function PropertiesTab({
  properties,
  loading,
  savingChanges,
  searchTerm,
  onSearchChange,
  onPropertyCreated,
  onSubdivisionChange,
  onHandoverChange,
  onNavigateToTabs,
  onRefresh,
}: PropertiesTabProps) {
  // Track user interaction to prevent auto-hide during active use
  const [lastInteraction, setLastInteraction] = useState<number>(Date.now())
  // Filter out properties that are back in the purchase pipeline or fully subdivided
  const activeProperties = useMemo(() => {
    return properties.filter((property) => {
      const lifecycleStatus = property.lifecycle_status
      const subdivisionStatus = property.subdivision_status

      // Filter out properties moved back to purchase pipeline
      if (lifecycleStatus === 'PENDING_PURCHASE') {
        return false
      }

      // Filter out properties that are fully subdivided (completed the process)
      if (subdivisionStatus === 'Subdivided') {
        return false
      }

      // Keep all other properties (including those starting subdivision)
      return true
    })
  }, [properties])

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
    applyPreset,
  } = usePropertyFilters(activeProperties, {
    initialFilters: { searchTerm },
    persistKey: 'properties-tab-filters',
  })

  // Ref for search component to exclude from click-outside detection
  const searchRef = useRef<HTMLDivElement>(null)

  // Filter panel state - auto-hide by default with click-outside detection
  const { isCollapsed, toggleCollapse, setCollapsed, panelRef } = useFilterPanel({
    defaultCollapsed: true,
    persistKey: 'properties-filter-panel',
    autoCollapseOnMobile: true,
    enableClickOutside: true,
    excludeRefs: [searchRef],
  })

  // Enhanced filter setters with interaction tracking (memoized to prevent infinite loops)
  const handlePipelineFilter = useCallback(
    (pipeline: PropertyPipelineFilter) => {
      setPipelineFilter(pipeline)
      setLastInteraction(Date.now())
    },
    [setPipelineFilter]
  )

  const handleStatusFilter = useCallback(
    (status: PropertyStatusFilter) => {
      setStatusFilter(status)
      setLastInteraction(Date.now())
    },
    [setStatusFilter]
  )

  const handlePropertyTypesFilter = useCallback(
    (types: string[]) => {
      setPropertyTypesFilter(types)
      setLastInteraction(Date.now())
    },
    [setPropertyTypesFilter]
  )

  const handleSearchTerm = useCallback(
    (term: string) => {
      setSearchTerm(term)
      setLastInteraction(Date.now())
    },
    [setSearchTerm]
  )

  const handleApplyPreset = useCallback(
    (preset: 'active' | 'subdivision' | 'handover' | 'completed') => {
      applyPreset(preset)
      setLastInteraction(Date.now())
    },
    [applyPreset]
  )

  const handleClearFilters = useCallback(() => {
    clearFilters()
    setLastInteraction(Date.now())
  }, [clearFilters])

  // Note: Search term sync removed to prevent infinite loops
  // PropertySearch component manages its own internal state

  // Auto-hide filter panel with intelligent timing based on user interaction
  useEffect(() => {
    if (!hasActiveFilters && !isCollapsed) {
      // Only auto-hide if user hasn't interacted recently
      const timeSinceLastInteraction = Date.now() - lastInteraction
      const minInteractionDelay = 3000 // Wait at least 3 seconds after last interaction

      if (timeSinceLastInteraction >= minInteractionDelay) {
        const timer = setTimeout(() => {
          // Double-check that user still hasn't interacted and no filters are active
          const currentTimeSinceInteraction = Date.now() - lastInteraction
          if (currentTimeSinceInteraction >= minInteractionDelay && !hasActiveFilters) {
            setCollapsed(true)
          }
        }, 2000) // Give users 2 more seconds to interact with filters
        return () => clearTimeout(timer)
      }
    }
  }, [hasActiveFilters, isCollapsed, setCollapsed, lastInteraction])

  // State for property form modal
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<PropertyWithLifecycle | null>(null)
  const [showWorkflowWarning, setShowWorkflowWarning] = useState(false)

  const handleAddProperty = () => {
    // Show workflow guidance modal first
    setShowWorkflowWarning(true)
  }

  const proceedWithDirectAddition = () => {
    setShowWorkflowWarning(false)
    setEditingProperty(null)
    setShowPropertyForm(true)
  }

  const proceedWithSuccessionProperty = () => {
    setShowWorkflowWarning(false)
    setEditingProperty(null)
    setShowPropertyForm(true)
  }

  const cancelDirectAddition = () => {
    setShowWorkflowWarning(false)
  }

  const handleEditProperty = (property: PropertyWithLifecycle) => {
    setEditingProperty(property)
    setShowPropertyForm(true)
  }

  const handlePropertyFormClose = () => {
    setShowPropertyForm(false)
    setEditingProperty(null)
  }

  const handlePropertyFormSuccess = (propertyId: string) => {
    setShowPropertyForm(false)
    setEditingProperty(null)
    onPropertyCreated(propertyId)
  }

  return (
    <div className="space-y-6">
      {/* Properties Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Properties Repository</h3>
          <p className="text-gray-600">
            Primary repository for all properties from all creation pathways
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={handleAddProperty} variant="primary">
            <span className="mr-2">🏠</span>
            Add Property Directly
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div ref={searchRef}>
          <PropertySearch
            onSearchChange={handleSearchTerm}
            placeholder="Search properties by name, address, type, or notes..."
            resultsCount={filteredCount}
            totalCount={totalCount}
            showFilterToggle={true}
            onFilterToggle={() => {
              toggleCollapse()
              setLastInteraction(Date.now())
            }}
            hasActiveFilters={hasActiveFilters}
            filterCount={[
              filters.pipeline !== 'all' ? 1 : 0,
              filters.status !== 'all' ? 1 : 0,
              filters.propertyTypes.length,
            ].reduce((a, b) => a + b, 0)}
            showQuickFilters={true}
            onQuickFilter={handleApplyPreset}
          />
        </div>

        {/* Filter and Saved Filters Panels - Only show when expanded */}
        {!isCollapsed && (
          <div ref={panelRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Filter Panel */}
            <div className="lg:col-span-2">
              <PropertyFilterPanel
                pipelineFilter={filters.pipeline}
                statusFilter={filters.status}
                propertyTypes={filters.propertyTypes}
                filterCounts={filterCounts}
                onPipelineChange={handlePipelineFilter}
                onStatusChange={handleStatusFilter}
                onPropertyTypesChange={handlePropertyTypesFilter}
                onClearFilters={handleClearFilters}
                onApplyPreset={handleApplyPreset}
                isCollapsed={false}
                onToggleCollapse={() => {
                  toggleCollapse()
                  setLastInteraction(Date.now())
                }}
                onUserInteraction={() => setLastInteraction(Date.now())}
              />
            </div>
          </div>
        )}

        {/* Collapsed Filter Summary */}
        {isCollapsed && hasActiveFilters && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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
                  onClick={handleClearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    toggleCollapse()
                    setLastInteraction(Date.now())
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Properties List */}
      <PropertyList
        properties={filteredProperties}
        loading={loading}
        savingChanges={savingChanges}
        onAddProperty={handleAddProperty}
        onEditProperty={handleEditProperty}
        onSubdivisionChange={onSubdivisionChange}
        onHandoverChange={onHandoverChange}
        onNavigateToTabs={onNavigateToTabs}
        onRefresh={onRefresh}
      />

      {/* Property Form Modal */}
      <PropertyForm
        isOpen={showPropertyForm}
        onClose={handlePropertyFormClose}
        property={editingProperty}
        onSuccess={handlePropertyFormSuccess}
      />

      {/* Property Type Selection Modal */}
      <Modal
        isOpen={showWorkflowWarning}
        onClose={cancelDirectAddition}
        title="Add Property Directly"
        size="md"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">🏠</span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Direct Property Addition
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Add a property that you already own or have clear title to. This is for properties where ownership is established.
              </p>
            </div>
          </div>

          {/* Information Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Need Other Workflows?</h4>
            <p className="text-sm text-blue-700">
              For purchase acquisitions, use the Purchase Pipeline. For land subdivision, use the Subdivision Pipeline.
              These specialized workflows provide comprehensive tracking and management features.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowWorkflowWarning(false)
                  onNavigateToTabs('purchase')
                }}
                className="text-sm"
              >
                🏢 Purchase Pipeline
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowWorkflowWarning(false)
                  onNavigateToTabs('subdivision')
                }}
                className="text-sm"
              >
                📐 Subdivision Pipeline
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={cancelDirectAddition}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={proceedWithDirectAddition}
              >
                🏠 Add Property
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
