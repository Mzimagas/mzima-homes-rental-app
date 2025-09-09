'use client'

import { useCallback, useState, useEffect } from 'react'
import { PropertyWithLifecycle, PendingChanges } from '../types/property-management.types'
import {
  getPendingSubdivisionValue,
  getPendingHandoverValue,
} from '../utils/property-management.utils'
import {
  usePropertyMutualExclusivity,
  getDisabledSelectStyles,
} from '../../../hooks/usePropertyMutualExclusivity'
import { PropertyStatusUpdateService } from '../../../services/propertyStatusUpdateService'
import StartHandoverForm from './StartHandoverForm'
import { supabase } from '@/lib/supabase-client'

interface PropertyStatusDropdownsProps {
  property: PropertyWithLifecycle
  pendingChanges: PendingChanges
  savingChanges: Record<string, boolean>
  propertiesWithPipelineIssues: Set<string>
  onSubdivisionChange: (propertyId: string, value: string) => void
  onHandoverChange: (propertyId: string, value: string) => void
  onRefresh?: () => void
  onNavigateToTabs?: (tab: string) => void
}

/**
 * Property Status Dropdowns Component
 * Handles subdivision and handover status changes with mutual exclusivity validation
 */
export default function PropertyStatusDropdowns({
  property,
  pendingChanges,
  savingChanges,
  propertiesWithPipelineIssues,
  onSubdivisionChange,
  onHandoverChange,
  onRefresh,
  onNavigateToTabs,
}: PropertyStatusDropdownsProps) {
  // State for confirmation dialogs
  const [pendingSubdivisionChange, setPendingSubdivisionChange] = useState<string | null>(null)
  const [pendingHandoverChange, setPendingHandoverChange] = useState<string | null>(null)
  const [showSubdivisionConfirm, setShowSubdivisionConfirm] = useState(false)
  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false)
  const [showStartHandoverForm, setShowStartHandoverForm] = useState(false)
  const [hasHandoverPipeline, setHasHandoverPipeline] = useState<boolean | null>(null)

  // Check if property has an active handover pipeline record
  useEffect(() => {
    const checkHandoverPipeline = async () => {
      if (property.handover_status !== 'IN_PROGRESS') {
        setHasHandoverPipeline(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('handover_pipeline')
          .select('id')
          .eq('property_id', property.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking handover pipeline:', error)
          setHasHandoverPipeline(false)
          return
        }

        setHasHandoverPipeline(!!data)
      } catch (error) {
        console.error('Error checking handover pipeline:', error)
        setHasHandoverPipeline(false)
      }
    }

    checkHandoverPipeline()
  }, [property.id, property.handover_status])

  // Get mutual exclusivity state
  const {
    subdivisionDisabled,
    subdivisionDisabledReason,
    handoverDisabled,
    handoverDisabledReason,
    validateSubdivisionChange,
    validateHandoverChange,
  } = usePropertyMutualExclusivity(property.id)

  // Enhanced change handlers with confirmation before saving
  const handleSubdivisionChange = useCallback(
    (value: string) => {
      const validation = validateSubdivisionChange(value)

      if (!validation.allowed) {
        alert(`Cannot change subdivision status: ${validation.reason}`)
        return
      }

      // Show confirmation dialog instead of immediately saving
      setPendingSubdivisionChange(value)
      setShowSubdivisionConfirm(true)
    },
    [validateSubdivisionChange]
  )

  // Actual subdivision save function
  const confirmSubdivisionChange = useCallback(async () => {
    if (!pendingSubdivisionChange) return

    try {
      const result = await PropertyStatusUpdateService.updatePropertyStatusFromUI(
        property.id,
        pendingSubdivisionChange,
        undefined
      )

      if (!result.success) {
        alert(`Failed to update subdivision status: ${result.error}`)
        return
      }

      if (result.warnings && result.warnings.length > 0) {
        console.log('Subdivision update warnings:', result.warnings)
      }

      // Close confirmation dialog
      setShowSubdivisionConfirm(false)
      setPendingSubdivisionChange(null)

      // Refresh the UI
      if (onRefresh) {
        onRefresh()
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error updating subdivision status:', error)
      alert('Failed to update subdivision status. Please try again.')
    }
  }, [property.id, pendingSubdivisionChange, onRefresh])

  const handleHandoverChange = useCallback(
    (value: string) => {
      const validation = validateHandoverChange(value)

      if (!validation.allowed) {
        alert(`Cannot change handover status: ${validation.reason}`)
        return
      }

      // Show confirmation dialog instead of immediately saving
      setPendingHandoverChange(value)
      setShowHandoverConfirm(true)
    },
    [validateHandoverChange]
  )

  // Actual handover save function
  const confirmHandoverChange = useCallback(async () => {
    if (!pendingHandoverChange) return

    try {
      const result = await PropertyStatusUpdateService.updatePropertyStatusFromUI(
        property.id,
        undefined,
        pendingHandoverChange
      )

      if (!result.success) {
        alert(`Failed to update handover status: ${result.error}`)
        return
      }

      if (result.warnings && result.warnings.length > 0) {
        console.log('Handover update warnings:', result.warnings)
        // Show important warnings to user
        if (result.warnings.some((w) => w.includes('locked'))) {
          alert(`Handover updated successfully. ${result.warnings.join(' ')}`)
        }
      }

      // Close confirmation dialog
      setShowHandoverConfirm(false)
      setPendingHandoverChange(null)

      // Refresh the UI
      if (onRefresh) {
        onRefresh()
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error updating handover status:', error)
      alert('Failed to update handover status. Please try again.')
    }
  }, [property.id, pendingHandoverChange, onRefresh])

  // Calculate if dropdowns should be disabled
  const isSubdivisionDisabled =
    savingChanges[property.id] ||
    propertiesWithPipelineIssues.has(property.id) ||
    subdivisionDisabled

  const isHandoverDisabled =
    savingChanges[property.id] || propertiesWithPipelineIssues.has(property.id) || handoverDisabled

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Subdivision Status */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Subdivision Status
          {propertiesWithPipelineIssues.has(property.id) && (
            <span className="text-red-500 text-xs ml-1">(Disabled - Pipeline Issues)</span>
          )}
          {subdivisionDisabled && subdivisionDisabledReason && (
            <span className="text-amber-500 text-xs ml-1" title={subdivisionDisabledReason}>
              (Mutual Exclusivity)
            </span>
          )}
        </label>
        <select
          className={`text-sm border rounded px-2 py-1 w-full ${
            isSubdivisionDisabled ? getDisabledSelectStyles(true) : getDisabledSelectStyles(false)
          }`}
          value={getPendingSubdivisionValue(property, pendingChanges)}
          onChange={(e) => handleSubdivisionChange(e.target.value)}
          disabled={isSubdivisionDisabled}
          title={subdivisionDisabledReason || undefined}
        >
          <option value="Not Started">Not Started</option>
          <option value="Sub-Division Started">Sub-Division Started</option>
          {/* Subdivided option only shown if already completed - prevents manual completion */}
          {property.subdivision_status === 'SUBDIVIDED' && (
            <option value="Subdivided">Subdivided</option>
          )}
        </select>
        {subdivisionDisabled && subdivisionDisabledReason && (
          <div className="text-xs text-amber-600 mt-1">{subdivisionDisabledReason}</div>
        )}
        {property.subdivision_status === 'SUB_DIVISION_STARTED' && (
          <div className="text-xs text-blue-600 mt-1">
            ℹ️ Completion will be automatic when all requirements are met
          </div>
        )}

        {/* Navigation button for active subdivision */}
        {property.subdivision_status === 'SUB_DIVISION_STARTED' && onNavigateToTabs && (
          <button
            onClick={() => onNavigateToTabs('subdivision')}
            className="mt-2 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 px-2 py-1 rounded border border-orange-200 transition-colors duration-200 flex items-center gap-1"
            title="Go to Subdivision Pipeline to manage this property"
          >
            🏗️ Manage in Pipeline
          </button>
        )}
      </div>

      {/* Handover Status */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Handover Status
          {propertiesWithPipelineIssues.has(property.id) && (
            <span className="text-red-500 text-xs ml-1">(Disabled - Pipeline Issues)</span>
          )}
          {handoverDisabled && handoverDisabledReason && (
            <span className="text-amber-500 text-xs ml-1" title={handoverDisabledReason}>
              (Mutual Exclusivity)
            </span>
          )}
        </label>
        <select
          className={`text-sm border rounded px-2 py-1 w-full ${
            isHandoverDisabled ? getDisabledSelectStyles(true) : getDisabledSelectStyles(false)
          }`}
          value={getPendingHandoverValue(property, pendingChanges)}
          onChange={(e) => handleHandoverChange(e.target.value)}
          disabled={isHandoverDisabled}
          title={handoverDisabledReason || undefined}
        >
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          {/* Completed option only shown if already completed - prevents manual completion */}
          {property.handover_status === 'COMPLETED' && (
            <option value="Handed Over">Handed Over</option>
          )}
        </select>
        {handoverDisabled && handoverDisabledReason && (
          <div className="text-xs text-amber-600 mt-1">{handoverDisabledReason}</div>
        )}
        {property.handover_status === 'IN_PROGRESS' && (
          <div className="text-xs text-blue-600 mt-1">
            ℹ️ Completion will be automatic when all requirements are met
          </div>
        )}

        {/* Navigation button for active handover with pipeline */}
        {property.handover_status === 'IN_PROGRESS' &&
          hasHandoverPipeline === true &&
          onNavigateToTabs && (
            <button
              onClick={() => onNavigateToTabs('handover')}
              className="mt-2 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200 transition-colors duration-200 flex items-center gap-1"
              title="Go to Handover Pipeline to manage this property"
            >
              🤝 Manage in Pipeline
            </button>
          )}

        {/* Start Handover button for properties marked as IN_PROGRESS but not yet in pipeline */}
        {property.handover_status === 'IN_PROGRESS' && hasHandoverPipeline === false && (
          <button
            onClick={() => setShowStartHandoverForm(true)}
            className="mt-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 transition-colors duration-200 flex items-center gap-1"
            title="Complete handover setup to start the pipeline stages"
          >
            🚀 Start Handover
          </button>
        )}
      </div>

      {/* Subdivision Confirmation Dialog */}
      {showSubdivisionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Subdivision Status Change</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to change the subdivision status to{' '}
              <strong>&quot;{pendingSubdivisionChange}&quot;</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action will update the property status and may affect related processes.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSubdivisionConfirm(false)
                  setPendingSubdivisionChange(null)
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubdivisionChange}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Confirmation Dialog */}
      {showHandoverConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Handover Status Change</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to change the handover status to{' '}
              <strong>&quot;{pendingHandoverChange}&quot;</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action will update the property status and may affect related processes.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowHandoverConfirm(false)
                  setPendingHandoverChange(null)
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmHandoverChange}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Handover Form */}
      {showStartHandoverForm && (
        <StartHandoverForm
          isOpen={showStartHandoverForm}
          onClose={() => setShowStartHandoverForm(false)}
          property={property}
          onSuccess={() => {
            setShowStartHandoverForm(false)
            setHasHandoverPipeline(true) // Update state to show pipeline is now active
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}

/**
 * Compact version for smaller spaces
 */
export function PropertyStatusDropdownsCompact({
  property,
  pendingChanges,
  savingChanges,
  propertiesWithPipelineIssues,
  onSubdivisionChange,
  onHandoverChange,
  onRefresh,
  onNavigateToTabs,
}: PropertyStatusDropdownsProps) {
  return (
    <div className="space-y-2">
      <PropertyStatusDropdowns
        property={property}
        pendingChanges={pendingChanges}
        savingChanges={savingChanges}
        propertiesWithPipelineIssues={propertiesWithPipelineIssues}
        onSubdivisionChange={onSubdivisionChange}
        onHandoverChange={onHandoverChange}
        onRefresh={onRefresh}
        onNavigateToTabs={onNavigateToTabs}
      />
    </div>
  )
}
