'use client'

import { useState, useMemo } from 'react'
import { Button } from '../../ui'
import Modal from '../../ui/Modal'
import PropertyList from './PropertyList'
import PropertySearch from './PropertySearch'
import PropertyForm from '../property-form'
import { PropertyWithLifecycle, PendingChanges } from '../types/property-management.types'

interface PropertiesTabProps {
  properties: PropertyWithLifecycle[]
  loading: boolean
  pendingChanges: PendingChanges
  savingChanges: { [propertyId: string]: boolean }
  searchTerm: string
  onSearchChange: (searchTerm: string) => void
  onPropertyCreated: (propertyId: string) => void
  onSubdivisionChange: (propertyId: string, value: string) => void
  onHandoverChange: (propertyId: string, value: string) => void
  onSaveChanges: (propertyId: string) => void
  onCancelChanges: (propertyId: string) => void
  onNavigateToTabs: (tab: string) => void
  onRefresh?: () => void
}

export default function PropertiesTab({
  properties,
  loading,
  pendingChanges,
  savingChanges,
  searchTerm,
  onSearchChange,
  onPropertyCreated,
  onSubdivisionChange,
  onHandoverChange,
  onSaveChanges,
  onCancelChanges,
  onNavigateToTabs,
  onRefresh,
}: PropertiesTabProps) {
  // Filter properties based on search term and lifecycle status
  const filteredProperties = useMemo(() => {
    // Filter out properties that are back in the purchase pipeline or fully subdivided
    // Keep properties that are just starting subdivision (they may not complete the process)
    const activeProperties = properties.filter((property) => {
      const lifecycleStatus = property.lifecycle_status
      const subdivisionStatus = property.subdivision_status

      // Filter out properties moved back to purchase pipeline
      if (lifecycleStatus === 'PENDING_PURCHASE') {
        return false
      }

      // Filter out properties that are fully subdivided (completed the process)
      // Use subdivision_status as the primary indicator since it's more specific
      if (subdivisionStatus === 'Subdivided') {
        return false
      }

      // Keep all other properties (including those starting subdivision)
      return true
    })

    if (!searchTerm.trim()) return activeProperties

    const lower = searchTerm.toLowerCase()
    return activeProperties.filter((property) => {
      return (
        property.name.toLowerCase().includes(lower) ||
        (property.physical_address?.toLowerCase().includes(lower) ?? false) ||
        (property.property_type?.toLowerCase().includes(lower) ?? false) ||
        (property.notes?.toLowerCase().includes(lower) ?? false) ||
        (property.acquisition_notes?.toLowerCase().includes(lower) ?? false)
      )
    })
  }, [properties, searchTerm])

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
          <p className="text-gray-600">Primary repository for all properties from all creation pathways</p>
        </div>
        <Button onClick={handleAddProperty} variant="primary">
          <span className="mr-2">🏠</span>
          Add Property Directly
        </Button>
      </div>



      {/* Search */}
      <PropertySearch
        onSearchChange={onSearchChange}
        placeholder="Search properties by name, address, type, or notes..."
        resultsCount={filteredProperties.length}
        totalCount={filteredProperties.length}
      />

      {/* Properties List */}
      <PropertyList
        properties={filteredProperties}
        loading={loading}
        pendingChanges={pendingChanges}
        savingChanges={savingChanges}
        onAddProperty={handleAddProperty}
        onEditProperty={handleEditProperty}
        onSubdivisionChange={onSubdivisionChange}
        onHandoverChange={onHandoverChange}
        onSaveChanges={onSaveChanges}
        onCancelChanges={onCancelChanges}
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

      {/* Workflow Warning Modal */}
      <Modal
        isOpen={showWorkflowWarning}
        onClose={cancelDirectAddition}
        title="Property Creation Workflow"
        size="lg"
      >
        <div className="p-6 space-y-6">
          {/* Warning Icon and Header */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-amber-800">
                Recommended Property Creation Workflow
              </h3>
              <p className="text-sm text-amber-600 mt-1">
                Please consider the recommended approach for new properties
              </p>
            </div>
          </div>

          {/* Recommended Workflows */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">🏢 Purchase Pipeline</h4>
              <p className="text-sm text-blue-700">
                For properties being acquired through purchase. Includes comprehensive workflow management,
                document tracking, financial management, and legal compliance.
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">📐 Subdivision Pipeline</h4>
              <p className="text-sm text-purple-700">
                For properties created through land subdivision. Manages subdivision processes,
                regulatory approvals, and proper documentation.
              </p>
            </div>
          </div>

          {/* Direct Addition Use Cases */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">✅ When to Use Direct Addition</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Managing existing properties already in your portfolio</li>
              <li>• Properties inherited or gifted (not purchased)</li>
              <li>• Emergency situations requiring immediate property entry</li>
              <li>• Properties with completed acquisition processes</li>
            </ul>
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
              >
                🏢 Use Purchase Pipeline
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowWorkflowWarning(false)
                  onNavigateToTabs('subdivision')
                }}
              >
                📐 Use Subdivision Pipeline
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={cancelDirectAddition}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={proceedWithDirectAddition}
              >
                Proceed with Direct Addition
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
