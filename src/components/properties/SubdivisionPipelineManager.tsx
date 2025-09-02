/**
 * Subdivision Pipeline Manager - Refactored
 * Manages property subdivisions with improved architecture and TypeScript compliance
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Property, 
  SubdivisionItem, 
  SubdivisionPipelineProps,
  SubdivisionFormData 
} from '../../types/subdivision'
import { SubdivisionService } from '../../lib/services/subdivision'
import { isTableNotFoundError } from '../../lib/utils/subdivision'
import { useMultipleErrors } from '../../hooks/useErrorHandler'
import { useMultipleLoading } from '../../hooks/useLoadingState'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'

// Components
import PropertySearch from './components/PropertySearch'
import { SubdivisionPropertyCard } from './components/SubdivisionPropertyCard'
import SubdivisionForm from './components/SubdivisionForm'
import SubdivisionHistoryModal from './SubdivisionHistoryModal'
import ErrorDisplay from '../ui/ErrorDisplay'
import LoadingSpinner from '../ui/LoadingSpinner'

/**
 * Main Subdivision Pipeline Manager Component
 */
const SubdivisionPipelineManager: React.FC<SubdivisionPipelineProps> = ({
  properties,
  onSearchChange,
  searchTerm = '',
}) => {


  // State management with improved organization
  const [subdivisions, setSubdivisions] = useState<SubdivisionItem[]>([])
  const [tablesExist, setTablesExist] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedSubdivision, setSelectedSubdivision] = useState<SubdivisionItem | null>(null)
  const [showSubdivisionForm, setShowSubdivisionForm] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historySubdivisionId, setHistorySubdivisionId] = useState<string | null>(null)

  // Error and loading state management
  const { errors, setError, clearError } = useMultipleErrors(['subdivisions', 'form'])
  const { loadingStates, withLoading } = useMultipleLoading(['subdivisions', 'form'])
  
  // Property access control
  const { canEditProperty } = usePropertyAccess()

  /**
   * Load subdivisions data
   */
  const loadSubdivisions = useCallback(async () => {
    try {
      clearError('subdivisions')
      
      // Check if tables exist first
      const tablesExist = await SubdivisionService.checkTablesExist()
      setTablesExist(tablesExist)
      
      if (!tablesExist) {
        setSubdivisions([])
        return
      }

      const data = await withLoading('subdivisions', async () => {
        return await SubdivisionService.loadSubdivisions()
      })
      
      setSubdivisions(data)
    } catch (error) {
      if (isTableNotFoundError(error)) {
        setTablesExist(false)
        setSubdivisions([])
      } else {
        setError('subdivisions', {
          message: 'Failed to load subdivisions',
          details: error
        })
      }
    }
  }, [withLoading, setError, clearError])

  /**
   * Initialize component
   */
  useEffect(() => {
    loadSubdivisions()
  }, [loadSubdivisions])

  /**
   * Filter properties with subdivision status (both active and completed)
   */
  const filteredProperties = useMemo(() => {
    // Guard against undefined properties
    if (!properties || !Array.isArray(properties)) {
      return []
    }

    return properties.filter(property => {
      const matchesSearch = !searchTerm ||
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.physical_address.toLowerCase().includes(searchTerm.toLowerCase())

      // Include both active and completed subdivisions
      const hasSubdivisionStatus =
        property.subdivision_status === 'SUB_DIVISION_STARTED' ||
        property.subdivision_status === 'SUBDIVIDED'

      return matchesSearch && hasSubdivisionStatus
    })
  }, [properties, searchTerm])

  /**
   * Get subdivision for a property
   */
  const getSubdivisionForProperty = useCallback((propertyId: string): SubdivisionItem | undefined => {
    return subdivisions.find(sub => sub.original_property_id === propertyId)
  }, [subdivisions])

  /**
   * Handle starting subdivision for a property
   */
  const handleStartSubdivision = useCallback((property: Property) => {
    setSelectedProperty(property)
    setSelectedSubdivision(null)
    setShowSubdivisionForm(true)
  }, [])

  /**
   * Handle editing subdivision
   */
  const handleEditSubdivision = useCallback((property: Property, subdivision: SubdivisionItem) => {
    setSelectedProperty(property)
    setSelectedSubdivision(subdivision)
    setShowSubdivisionForm(true)
  }, [])

  /**
   * Handle viewing subdivision history
   */
  const handleViewHistory = useCallback((subdivisionId: string) => {
    setHistorySubdivisionId(subdivisionId)
    setShowHistoryModal(true)
  }, [])

  /**
   * Handle subdivision form submission
   */
  const handleSubdivisionSubmit = useCallback(async (formData: SubdivisionFormData) => {
    if (!selectedProperty) return

    try {
      clearError('form')
      
      await withLoading('form', async () => {
        if (selectedSubdivision) {
          // Update existing subdivision
          await SubdivisionService.updateSubdivision(
            selectedSubdivision.id,
            formData,
            selectedSubdivision
          )
        } else {
          // Create new subdivision
          await SubdivisionService.createSubdivision(selectedProperty.id, formData)
        }
      })

      // Reload subdivisions and close form
      await loadSubdivisions()
      setShowSubdivisionForm(false)
      setSelectedProperty(null)
      setSelectedSubdivision(null)
    } catch (error) {
      setError('form', {
        message: selectedSubdivision 
          ? 'Failed to update subdivision' 
          : 'Failed to create subdivision',
        details: error
      })
    }
  }, [selectedProperty, selectedSubdivision, withLoading, setError, clearError, loadSubdivisions])

  /**
   * Handle property created from plot
   */
  const handlePropertyCreated = useCallback(() => {
    // Reload subdivisions to update plot counts
    loadSubdivisions()
  }, [loadSubdivisions])

  /**
   * Close subdivision form
   */
  const handleCloseSubdivisionForm = useCallback(() => {
    setShowSubdivisionForm(false)
    setSelectedProperty(null)
    setSelectedSubdivision(null)
    clearError('form')
  }, [clearError])

  /**
   * Close history modal
   */
  const handleCloseHistoryModal = useCallback(() => {
    setShowHistoryModal(false)
    setHistorySubdivisionId(null)
  }, [])

  // Show tables not found message
  if (!tablesExist) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏗️</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Subdivision Pipeline Not Available
        </h3>
        <p className="text-gray-600 mb-4">
          The subdivision management tables are not set up in your database.
        </p>
        <p className="text-sm text-gray-500">
          Please contact your administrator to set up the subdivision pipeline.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - No more tabs needed */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🏗️</span>
          Subdivision Pipeline
        </h2>
        <p className="text-gray-600 mt-1">
          Manage properties with active or completed subdivisions. Use the inline plots management to create and manage individual plots.
        </p>
      </div>

      {/* Error Display */}
      {errors.subdivisions && (
        <ErrorDisplay
          error={errors.subdivisions}
          title="Failed to Load Subdivisions"
          onRetry={loadSubdivisions}
          onDismiss={() => clearError('subdivisions')}
        />
      )}

      {/* Loading State */}
      {loadingStates.subdivisions && (
        <LoadingSpinner size="lg" message="Loading subdivisions..." />
      )}

      {/* Search */}
      {onSearchChange && (
        <PropertySearch
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          placeholder="Search properties in subdivision pipeline..."
        />
      )}

      {/* Main Content - Properties with Inline Plots */}
      <div className="space-y-4">
        {!loadingStates.subdivisions && filteredProperties.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-4">🏗️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Properties in Subdivision Pipeline
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'No properties match your search criteria.' 
                : 'No properties have started the subdivision process yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProperties.map((property) => {
              const subdivision = getSubdivisionForProperty(property.id)
              const canEdit = canEditProperty(property.id)

              // Create wrapper functions to match component signatures
              const handleEditForProperty = (subdivisionToEdit: SubdivisionItem) => {
                handleEditSubdivision(property, subdivisionToEdit)
              }

              return (
                <SubdivisionPropertyCard
                  key={property.id}
                  property={property}
                  subdivision={subdivision}
                  onStartSubdivision={handleStartSubdivision}
                  onEditSubdivision={handleEditForProperty}
                  onViewHistory={handleViewHistory}
                  onPropertyCreated={handlePropertyCreated}
                  canEdit={canEdit}
                />
              )
            })}
          </div>
        )}

        {/* Redundant plots tab removed - now using inline plots management */}
      </div>

      {/* Subdivision Form Modal */}
      <SubdivisionForm
        isOpen={showSubdivisionForm}
        onClose={handleCloseSubdivisionForm}
        onSubmit={handleSubdivisionSubmit}
        property={selectedProperty}
        subdivision={selectedSubdivision}
        isLoading={loadingStates.form}
        error={errors.form}
      />

      {/* History Modal */}
      {showHistoryModal && historySubdivisionId && (
        <SubdivisionHistoryModal
          isOpen={showHistoryModal}
          onClose={handleCloseHistoryModal}
          subdivisionId={historySubdivisionId}
        />
      )}
    </div>
  )
}

export default SubdivisionPipelineManager
