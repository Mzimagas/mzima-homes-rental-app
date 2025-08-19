'use client'

import { useState, useMemo } from 'react'
import { Button } from '../../ui'
import PropertyList from './PropertyList'
import PropertySearch from './PropertySearch'
import PropertyForm from '../property-form'
import {
  PropertyWithLifecycle,
  PendingChanges
} from '../types/property-management.types'

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
  onRefresh
}: PropertiesTabProps) {
  // Filter properties based on search term and lifecycle status
  const filteredProperties = useMemo(() => {
    // First filter out properties that are back in the purchase pipeline
    const activeProperties = properties.filter(property =>
      property.lifecycle_status !== 'PENDING_PURCHASE'
    )

    if (!searchTerm.trim()) return activeProperties

    const lower = searchTerm.toLowerCase()
    return activeProperties.filter(property => {
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

  const handleAddProperty = () => {
    setEditingProperty(null)
    setShowPropertyForm(true)
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
          <h3 className="text-2xl font-bold text-gray-900">Properties Management</h3>
          <p className="text-gray-600">All properties from all creation pathways</p>
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
        totalCount={properties.length}
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
        onRefresh={onRefresh}
      />

      {/* Property Form Modal */}
      <PropertyForm
        isOpen={showPropertyForm}
        onClose={handlePropertyFormClose}
        property={editingProperty}
        onSuccess={handlePropertyFormSuccess}
      />
    </div>
  )
}
