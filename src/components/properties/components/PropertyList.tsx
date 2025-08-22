'use client'
import ReverseTransferAction from './ReverseTransferAction'


import { useState } from 'react'
import { Button } from '../../ui'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import InlinePropertyView from './InlinePropertyView'
import {
  PropertyWithLifecycle,
  PendingChanges
} from '../types/property-management.types'
import {
  getSourceIcon,
  getSourceLabel,
  getLifecycleStatusColor,
  hasPendingChanges,
  getPendingSubdivisionValue,
  getPendingHandoverValue
} from '../utils/property-management.utils'

interface PropertyListProps {
  properties: PropertyWithLifecycle[]
  loading: boolean
  pendingChanges: PendingChanges
  savingChanges: { [propertyId: string]: boolean }
  onAddProperty: () => void
  onEditProperty: (property: PropertyWithLifecycle) => void
  onSubdivisionChange: (propertyId: string, value: string) => void
  onHandoverChange: (propertyId: string, value: string) => void
  onRefresh?: () => void
  onSaveChanges: (propertyId: string) => void
  onCancelChanges: (propertyId: string) => void
  onNavigateToTabs: (tab: string) => void
  onDeleteProperty?: (propertyId: string) => void
}

export default function PropertyList({
  properties,
  loading,
  pendingChanges,
  savingChanges,
  onAddProperty,
  onEditProperty,
  onSubdivisionChange,
  onHandoverChange,
  onRefresh,
  onSaveChanges,
  onCancelChanges,
  onNavigateToTabs,
  onDeleteProperty
}: PropertyListProps) {
  const [viewingPropertyId, setViewingPropertyId] = useState<string | null>(null)
  const [propertiesWithPipelineIssues, setPropertiesWithPipelineIssues] = useState<Set<string>>(new Set())

  // Handle pipeline status changes for properties
  const handlePipelineStatusChange = (propertyId: string, hasIssues: boolean) => {
    setPropertiesWithPipelineIssues(prev => {
      const newSet = new Set(prev)
      if (hasIssues) {
        newSet.add(propertyId)
      } else {
        newSet.delete(propertyId)
      }
      return newSet
    })
  }
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading properties...</p>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🏠</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Yet</h3>
        <p className="text-gray-600 mb-6">Start by adding properties through any of the three pathways above.</p>
        <div className="flex justify-center space-x-3">
          <Button onClick={onAddProperty} variant="primary">
            Add Property Directly
          </Button>
          <Button onClick={() => onNavigateToTabs('purchase')} variant="secondary">
            Start Purchase Process
          </Button>
          <Button onClick={() => onNavigateToTabs('subdivision')} variant="secondary">
            Subdivide Property
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {properties.map((property) => (
        <div key={property.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-4">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                <span className="text-lg">{getSourceIcon(property.property_source)}</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {getSourceLabel(property.property_source)}
                </span>
                {property.lifecycle_status && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLifecycleStatusColor(property.lifecycle_status)}`}>
                    {property.lifecycle_status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-2">{property.physical_address}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>Type: {property.property_type?.replace('_', ' ') || 'Unknown'}</span>
                {property.total_area_acres && <span>Area: {property.total_area_acres} acres</span>}
                {property.expected_rental_income_kes && (
                  <span>Expected Rent: KES {property.expected_rental_income_kes.toLocaleString()}/month</span>
                )}
                {property.purchase_completion_date && (
                  <span>Purchased: {new Date(property.purchase_completion_date).toLocaleDateString()}</span>
                )}
                {property.subdivision_date && <span>Subdivided: {new Date(property.subdivision_date).toLocaleDateString()}</span>}
              </div>
            </div>

            <div className="flex justify-end">
              <ViewOnGoogleMapsButton
                lat={(property as any).lat ?? null}
                lng={(property as any).lng ?? null}
                address={property.physical_address ?? property.name}
                propertyName={property.name}
              />
            </div>
          </div>

          {/* Status Dropdowns */}
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subdivision Status */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Subdivision Status
                  {propertiesWithPipelineIssues.has(property.id) && (
                    <span className="text-red-500 text-xs ml-1">(Disabled - Pipeline Issues)</span>
                  )}
                </label>
                <select
                  className={`text-sm border rounded px-2 py-1 w-full ${
                    propertiesWithPipelineIssues.has(property.id)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : ''
                  }`}
                  value={getPendingSubdivisionValue(property, pendingChanges)}
                  onChange={(e) => onSubdivisionChange(property.id, e.target.value)}
                  disabled={savingChanges[property.id] || propertiesWithPipelineIssues.has(property.id)}
                >
                  <option>Not Started</option>
                  <option>Sub-Division Started</option>
                  <option>Subdivided</option>
                </select>
                {property.subdivision_date && (
                  <div className="text-xs text-gray-500 mt-1">on {new Date(property.subdivision_date).toLocaleDateString()}</div>
                )}
              </div>

              {/* Handover Status */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Handover Status
                  {propertiesWithPipelineIssues.has(property.id) && (
                    <span className="text-red-500 text-xs ml-1">(Disabled - Pipeline Issues)</span>
                  )}
                </label>
                <select
                  className={`text-sm border rounded px-2 py-1 w-full ${
                    propertiesWithPipelineIssues.has(property.id)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : ''
                  }`}
                  value={getPendingHandoverValue(property, pendingChanges)}
                  onChange={(e) => onHandoverChange(property.id, e.target.value)}
                  disabled={savingChanges[property.id] || propertiesWithPipelineIssues.has(property.id)}
                >
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Handed Over</option>
                </select>
                {property.handover_date && (
                  <div className="text-xs text-gray-500 mt-1">on {new Date(property.handover_date).toLocaleDateString()}</div>
                )}
              </div>
            </div>

            {/* Save/Cancel */}
            {hasPendingChanges(property.id, pendingChanges) && (
              <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <Button
                  onClick={() => onSaveChanges(property.id)}
                  disabled={savingChanges[property.id]}
                  variant="primary"
                  size="sm"
                >
                  {savingChanges[property.id] ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button
                  onClick={() => onCancelChanges(property.id)}
                  disabled={savingChanges[property.id]}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
                <div className="text-xs text-amber-600">You have unsaved changes</div>
              </div>
            )}
          </div>

          {property.acquisition_notes && (
            <p className="text-sm text-gray-600 mt-2 italic">{property.acquisition_notes}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-4 items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEditProperty(property)}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewingPropertyId(
                  viewingPropertyId === property.id ? null : property.id
                )}
              >
                {viewingPropertyId === property.id ? 'Hide Details' : 'View Details'}
              </Button>
            </div>

            {/* Reverse transfer action for items that came from Purchase Pipeline */}
            {property.property_source === 'PURCHASE_PIPELINE' && (
              <ReverseTransferAction
                propertyId={property.id}
                sourceReferenceId={property.source_reference_id as any}
                onSuccess={onRefresh}
                onPipelineStatusChange={(hasIssues) => handlePipelineStatusChange(property.id, hasIssues)}
              />
            )}
          </div>

          {/* Inline Property View */}
          {viewingPropertyId === property.id && (
            <InlinePropertyView
              property={property}
              onClose={() => setViewingPropertyId(null)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
