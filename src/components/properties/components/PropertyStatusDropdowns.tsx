'use client'

import { useCallback } from 'react'
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

interface PropertyStatusDropdownsProps {
  property: PropertyWithLifecycle
  pendingChanges: PendingChanges
  savingChanges: Record<string, boolean>
  propertiesWithPipelineIssues: Set<string>
  onSubdivisionChange: (propertyId: string, value: string) => void
  onHandoverChange: (propertyId: string, value: string) => void
  onRefresh?: () => void
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
}: PropertyStatusDropdownsProps) {
  // Get mutual exclusivity state
  const {
    subdivisionDisabled,
    subdivisionDisabledReason,
    handoverDisabled,
    handoverDisabledReason,
    validateSubdivisionChange,
    validateHandoverChange,
  } = usePropertyMutualExclusivity(property.id)

  // Enhanced change handlers with validation and direct API calls
  const handleSubdivisionChange = useCallback(
    async (value: string) => {
      const validation = validateSubdivisionChange(value)

      if (!validation.allowed) {
        alert(`Cannot change subdivision status: ${validation.reason}`)
        return
      }

      // Use the new status update service instead of the property management service
      try {
        const result = await PropertyStatusUpdateService.updatePropertyStatusFromUI(
          property.id,
          value,
          undefined
        )

        if (!result.success) {
          alert(`Failed to update subdivision status: ${result.error}`)
          return
        }

        if (result.warnings && result.warnings.length > 0) {
          console.log('Subdivision update warnings:', result.warnings)
        }

        // Don't call onSubdivisionChange since we've already handled the API call
        // The old system would trigger another API call which causes the 403 error
        // onSubdivisionChange(property.id, value)

        // Instead, trigger a refresh to update the UI with the new data
        if (onRefresh) {
          onRefresh()
        } else {
          window.location.reload()
        }
      } catch (error) {
        console.error('Error updating subdivision status:', error)
        alert('Failed to update subdivision status. Please try again.')
      }
    },
    [property.id, validateSubdivisionChange, onSubdivisionChange]
  )

  const handleHandoverChange = useCallback(
    async (value: string) => {
      const validation = validateHandoverChange(value)

      if (!validation.allowed) {
        alert(`Cannot change handover status: ${validation.reason}`)
        return
      }

      // Use the new status update service instead of the property management service
      try {
        const result = await PropertyStatusUpdateService.updatePropertyStatusFromUI(
          property.id,
          undefined,
          value
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

        // Don't call onHandoverChange since we've already handled the API call
        // The old system would trigger another API call which causes the 403 error
        // onHandoverChange(property.id, value)

        // Instead, trigger a refresh to update the UI with the new data
        if (onRefresh) {
          onRefresh()
        } else {
          window.location.reload()
        }
      } catch (error) {
        console.error('Error updating handover status:', error)
        alert('Failed to update handover status. Please try again.')
      }
    },
    [property.id, validateHandoverChange, onHandoverChange]
  )

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
          <option value="Subdivided">Subdivided</option>
        </select>
        {subdivisionDisabled && subdivisionDisabledReason && (
          <div className="text-xs text-amber-600 mt-1">{subdivisionDisabledReason}</div>
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
          <option value="Handed Over">Handed Over</option>
        </select>
        {handoverDisabled && handoverDisabledReason && (
          <div className="text-xs text-amber-600 mt-1">{handoverDisabledReason}</div>
        )}
      </div>
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
      />
    </div>
  )
}
