'use client'

import React, { useMemo, useCallback, memo, useState, useRef, useEffect } from 'react'
import { FixedSizeList as List, VariableSizeList } from 'react-window'
import { Button } from '../../ui'
import ViewOnGoogleMapsButton, { useMapLinkTelemetry } from '../../ui/ViewOnGoogleMapsButton'
import InlinePropertyView from './InlinePropertyView'
import PropertyCard, { PropertyCardHeader, PropertyCardContent, PropertyCardFooter } from './PropertyCard'
import ReverseTransferAction from './ReverseTransferAction'
import {
  PropertyWithLifecycle,
} from '../types/property-management.types'
import {
  getSourceIcon,
  getSourceLabel,
  getLifecycleStatusColor,
  getSubdivisionValue,
  getHandoverValue,
} from '../utils/property-management.utils'

interface VirtualizedPropertyListProps {
  properties: PropertyWithLifecycle[]
  loading: boolean
  savingChanges: { [propertyId: string]: boolean }
  onAddProperty: () => void
  onEditProperty: (property: PropertyWithLifecycle) => void
  onSubdivisionChange: (propertyId: string, value: string) => void
  onHandoverChange: (propertyId: string, value: string) => void
  onRefresh?: () => void
  onNavigateToTabs?: (tab: string) => void
  onDeleteProperty?: (propertyId: string) => void
  itemHeight?: number
  overscan?: number
}

interface PropertyItemData {
  properties: PropertyWithLifecycle[]
  savingChanges: { [propertyId: string]: boolean }
  propertiesWithPipelineIssues: Set<string>
  handlers: {
    onEditProperty: (property: PropertyWithLifecycle) => void
    onSubdivisionChange: (propertyId: string, value: string) => void
    onHandoverChange: (propertyId: string, value: string) => void
    onNavigateToTabs?: (tab: string) => void
    onDeleteProperty?: (propertyId: string) => void
    onViewProperty: (propertyId: string) => void
    onPipelineStatusChange: (propertyId: string, hasIssues: boolean) => void
    onMapInvalid: (reason: string) => void
  }
}

// Memoized property item component for virtualization
const VirtualPropertyItem = memo(function VirtualPropertyItem({
  index,
  style,
  data,
}: {
  index: number
  style: React.CSSProperties
  data: PropertyItemData
}) {
  const { properties, savingChanges, propertiesWithPipelineIssues, handlers } = data
  const property = properties[index]

  // Memoize computed values (must be called before any conditional returns)
  const isSaving = useMemo(() => property ? savingChanges[property.id] : false, [savingChanges, property?.id])
  const subdivisionValue = useMemo(() => property ? getSubdivisionValue(property) : '', [property])
  const handoverValue = useMemo(() => property ? getHandoverValue(property) : '', [property])

  // Memoized handlers (must be called before any conditional returns)
  const handleEdit = useCallback(() => property && handlers.onEditProperty(property), [handlers.onEditProperty, property])
  const handleView = useCallback(() => property && handlers.onViewProperty(property.id), [handlers.onViewProperty, property?.id])
  const handleSubdivisionChange = useCallback((value: string) => property && handlers.onSubdivisionChange(property.id, value), [handlers.onSubdivisionChange, property?.id])
  const handleHandoverChange = useCallback((value: string) => property && handlers.onHandoverChange(property.id, value), [handlers.onHandoverChange, property?.id])
  const handleDelete = useCallback(() => property && handlers.onDeleteProperty?.(property.id), [handlers.onDeleteProperty, property?.id])

  if (!property) {
    return <div style={style} />
  }

  return (
    <div style={style} className="px-4 py-2">
      <PropertyCard
        lifecycle={property.lifecycle_status}
        hasErrors={false}
        interactive={true}
        theme="direct-addition"
        aria-label={`Property: ${property.name}`}
      >
        <PropertyCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getSourceIcon(property.property_source)}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                <p className="text-sm text-gray-600">
                  {getSourceLabel(property.property_source)} • {property.property_type || 'Unknown Type'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getLifecycleStatusColor(
                  property.lifecycle_status
                )}`}
              >
                {property.lifecycle_status?.replace('_', ' ') || 'Unknown'}
              </span>
            </div>
          </div>
        </PropertyCardHeader>

        <PropertyCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <p className="text-sm text-gray-900">{property.physical_address || 'No address provided'}</p>
              <ViewOnGoogleMapsButton
                source="Property List"
                name={property.name}
                lat={property.lat}
                lng={property.lng}
                onInvalid={handlers.onMapInvalid}
                className="mt-1"
                compact
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subdivision Status</label>
              <select
                value={subdivisionValue}
                onChange={(e) => handleSubdivisionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handover Status</label>
              <select
                value={handoverValue}
                onChange={(e) => handleHandoverChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING_DOCUMENTATION">Pending Documentation</option>
              </select>
            </div>
          </div>

          {property.total_area_acres && (
            <div className="mt-4">
              <span className="text-sm text-gray-600">
                Total Area: {property.total_area_acres} acres
              </span>
            </div>
          )}
        </PropertyCardContent>

        <PropertyCardFooter>
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                disabled={isSaving}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleView}
                disabled={isSaving}
              >
                View Details
              </Button>
              {handlers.onDeleteProperty && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              )}
            </div>

            {/* Immediate persistence in effect — Save/Cancel removed in virtualized list */}

            {property.property_source === 'REVERSE_TRANSFER' && (
              <ReverseTransferAction
                propertyId={property.id}
                currentStatus={property.lifecycle_status}
                onStatusChange={(status) => {
                  // Handle reverse transfer status change
                }}
              />
            )}
          </div>
        </PropertyCardFooter>
      </PropertyCard>
    </div>
  )
})

export default function VirtualizedPropertyList({
  properties,
  loading,
  savingChanges,
  onAddProperty,
  onEditProperty,
  onSubdivisionChange,
  onHandoverChange,
  onRefresh,
  onNavigateToTabs,
  onDeleteProperty,
  itemHeight = 280,
  overscan = 5,
}: VirtualizedPropertyListProps) {
  const [viewingPropertyId, setViewingPropertyId] = useState<string | null>(null)
  const [propertiesWithPipelineIssues, setPropertiesWithPipelineIssues] = useState<Set<string>>(new Set())
  const listRef = useRef<List>(null)

  // Map link telemetry to replace console spam
  const { onInvalid, logSummary } = useMapLinkTelemetry()

  // Individual memoized handlers to prevent unnecessary re-renders
  const handleViewProperty = useCallback((propertyId: string) => {
    setViewingPropertyId(propertyId)
  }, [])

  const handlePipelineStatusChange = useCallback((propertyId: string, hasIssues: boolean) => {
    setPropertiesWithPipelineIssues((prev) => {
      const newSet = new Set(prev)
      if (hasIssues) {
        newSet.add(propertyId)
      } else {
        newSet.delete(propertyId)
      }
      return newSet
    })
  }, [])

  // Memoized handlers object
  const handlers = useMemo(() => ({
    onEditProperty,
    onSubdivisionChange,
    onHandoverChange,
    onNavigateToTabs,
    onDeleteProperty,
    onViewProperty: handleViewProperty,
    onPipelineStatusChange: handlePipelineStatusChange,
    onMapInvalid: onInvalid,
  }), [onEditProperty, onSubdivisionChange, onHandoverChange, onNavigateToTabs, onDeleteProperty, handleViewProperty, handlePipelineStatusChange, onInvalid])

  // Memoized item data to prevent unnecessary re-renders
  const itemData = useMemo<PropertyItemData>(() => ({
    properties,
    savingChanges,
    propertiesWithPipelineIssues,
    handlers,
  }), [properties, savingChanges, propertiesWithPipelineIssues, handlers])

  const handleCloseView = useCallback(() => {
    setViewingPropertyId(null)
  }, [])

  // Auto-scroll to top when properties change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, 'start')
    }
  }, [properties.length])

  // Log coordinate validation summary
  useEffect(() => {
    if (properties.length > 0) {
      const timer = setTimeout(() => logSummary('Property List'), 100)
      return () => clearTimeout(timer)
    }
  }, [properties.length, logSummary])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading properties...</span>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
        <p className="text-gray-500 mb-4">Get started by adding your first property.</p>
        <Button onClick={onAddProperty}>Add Property</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Properties ({properties.length})
          </h2>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
        <Button onClick={onAddProperty}>Add Property</Button>
      </div>

      {/* Virtualized list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <List
          ref={listRef}
          height={Math.min(600, properties.length * itemHeight)} // Max height of 600px
          itemCount={properties.length}
          itemSize={itemHeight}
          itemData={itemData}
          overscanCount={overscan}
          className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        >
          {VirtualPropertyItem}
        </List>
      </div>

      {/* Inline property view modal */}
      {viewingPropertyId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <InlinePropertyView
              property={properties.find(p => p.id === viewingPropertyId)!}
              onClose={handleCloseView}
            />
          </div>
        </div>
      )}
    </div>
  )
}
