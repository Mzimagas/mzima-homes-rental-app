/**
 * Hook for managing property mutual exclusivity in UI components
 * Provides disabled states and validation for subdivision and handover controls
 */

import { useState, useEffect, useCallback } from 'react'
import { PropertyStateService, PropertyState } from '../services/propertyStateService'

export interface MutualExclusivityState {
  // Loading states
  loading: boolean

  // Current property state
  propertyState: PropertyState | null

  // Subdivision controls
  subdivisionDisabled: boolean
  subdivisionDisabledReason: string | null
  canStartSubdivision: boolean
  canChangeSubdivisionStatus: boolean

  // Handover controls
  handoverDisabled: boolean
  handoverDisabledReason: string | null
  canStartHandover: boolean
  canChangeHandoverStatus: boolean

  // Document and financial editing controls
  documentsReadOnly: boolean
  documentsReadOnlyReason: string | null
  financialsReadOnly: boolean
  financialsReadOnlyReason: string | null
  canEditDocuments: boolean
  canEditFinancials: boolean
  canUploadDocuments: boolean
  canDeleteDocuments: boolean
  canAddCosts: boolean
  canEditCosts: boolean
  canDeleteCosts: boolean

  // General state
  hasConflicts: boolean
  conflictMessages: string[]
  isPropertyLocked: boolean
  lockReason: string | null

  // Actions
  refreshState: () => Promise<void>
  validateSubdivisionChange: (newStatus: string) => { allowed: boolean; reason?: string }
  validateHandoverChange: (newStatus: string) => { allowed: boolean; reason?: string }
  validateDocumentAction: (action: 'upload' | 'edit' | 'delete') => {
    allowed: boolean
    reason?: string
  }
  validateFinancialAction: (action: 'add' | 'edit' | 'delete') => {
    allowed: boolean
    reason?: string
  }
}

export function usePropertyMutualExclusivity(propertyId: string): MutualExclusivityState {
  const [loading, setLoading] = useState(true)
  const [propertyState, setPropertyState] = useState<PropertyState | null>(null)

  const refreshState = useCallback(async () => {
    if (!propertyId) return

    setLoading(true)
    try {
      const state = await PropertyStateService.getPropertyState(propertyId)
      setPropertyState(state)
    } catch (error) {
      console.error('Error loading property state for mutual exclusivity:', error)
      setPropertyState(null)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    refreshState()
  }, [refreshState])

  // Calculate subdivision control states
  const subdivisionDisabled =
    !propertyState ||
    propertyState.is_handover_active ||
    propertyState.is_handover_completed ||
    propertyState.is_subdivision_completed

  const subdivisionDisabledReason = !propertyState
    ? 'Loading property state...'
    : propertyState.is_handover_active
      ? 'Subdivision is disabled while handover is in progress'
      : propertyState.is_handover_completed
        ? 'Subdivision is permanently disabled after handover completion'
        : propertyState.is_subdivision_completed
          ? 'Subdivision is already completed and cannot be changed'
          : null

  const canStartSubdivision = propertyState?.can_start_subdivision || false
  const canChangeSubdivisionStatus = !subdivisionDisabled

  // Calculate handover control states
  const handoverDisabled =
    !propertyState ||
    propertyState.is_subdivision_active ||
    propertyState.is_subdivision_completed ||
    propertyState.is_handover_completed

  const handoverDisabledReason = !propertyState
    ? 'Loading property state...'
    : propertyState.is_subdivision_active
      ? 'Handover is disabled while subdivision is in progress'
      : propertyState.is_subdivision_completed
        ? 'Handover is permanently disabled after subdivision completion'
        : propertyState.is_handover_completed
          ? 'Handover is already completed and cannot be changed'
          : null

  const canStartHandover = propertyState?.can_start_handover || false
  const canChangeHandoverStatus = !handoverDisabled

  // Calculate document and financial editing permissions
  const isPropertyLocked =
    !propertyState || propertyState.is_subdivision_completed || propertyState.is_handover_completed

  const lockReason = !propertyState
    ? 'Loading property state...'
    : propertyState.is_subdivision_completed
      ? 'Property is locked after subdivision completion'
      : propertyState.is_handover_completed
        ? 'Property is locked after handover completion'
        : null

  // Document controls
  const documentsReadOnly = isPropertyLocked
  const documentsReadOnlyReason = lockReason
  const canEditDocuments = !documentsReadOnly
  const canUploadDocuments = !documentsReadOnly
  const canDeleteDocuments = !documentsReadOnly

  // Financial controls
  const financialsReadOnly = isPropertyLocked
  const financialsReadOnlyReason = lockReason
  const canEditFinancials = !financialsReadOnly
  const canAddCosts = !financialsReadOnly
  const canEditCosts = !financialsReadOnly
  const canDeleteCosts = !financialsReadOnly

  // Conflict detection
  const hasConflicts = propertyState?.state_conflicts.length > 0 || false
  const conflictMessages = propertyState?.state_conflicts || []

  // Validation functions
  const validateSubdivisionChange = useCallback(
    (newStatus: string) => {
      if (!propertyState) {
        return { allowed: false, reason: 'Property state not loaded' }
      }

      // Map UI values to internal status values
      const statusMap: Record<string, string> = {
        'Not Started': 'NOT_STARTED',
        'Sub-Division Started': 'SUB_DIVISION_STARTED',
        Subdivided: 'SUBDIVIDED',
      }

      const internalStatus = statusMap[newStatus] || newStatus

      // Check if change is allowed
      if (propertyState.is_handover_active && internalStatus !== 'NOT_STARTED') {
        return {
          allowed: false,
          reason: 'Cannot start or advance subdivision while handover is in progress',
        }
      }

      if (propertyState.is_handover_completed) {
        return {
          allowed: false,
          reason: 'Cannot change subdivision status after handover is completed',
        }
      }

      if (propertyState.is_subdivision_completed && internalStatus !== 'SUBDIVIDED') {
        return {
          allowed: false,
          reason: 'Cannot revert subdivision status from completed state',
        }
      }

      return { allowed: true }
    },
    [propertyState]
  )

  const validateHandoverChange = useCallback(
    (newStatus: string) => {
      if (!propertyState) {
        return { allowed: false, reason: 'Property state not loaded' }
      }

      // Map UI values to internal status values
      const statusMap: Record<string, string> = {
        'Not Started': 'PENDING',
        'In Progress': 'IN_PROGRESS',
        'Handed Over': 'COMPLETED',
      }

      const internalStatus = statusMap[newStatus] || newStatus

      // Check if change is allowed
      if (propertyState.is_subdivision_active && internalStatus !== 'PENDING') {
        return {
          allowed: false,
          reason: 'Cannot start or advance handover while subdivision is in progress',
        }
      }

      if (propertyState.is_subdivision_completed) {
        return {
          allowed: false,
          reason: 'Cannot change handover status after subdivision is completed',
        }
      }

      if (propertyState.is_handover_completed && internalStatus !== 'COMPLETED') {
        return {
          allowed: false,
          reason: 'Cannot revert handover status from completed state',
        }
      }

      return { allowed: true }
    },
    [propertyState]
  )

  const validateDocumentAction = useCallback(
    (action: 'upload' | 'edit' | 'delete') => {
      if (!propertyState) {
        return { allowed: false, reason: 'Property state not loaded' }
      }

      if (propertyState.is_subdivision_completed) {
        return {
          allowed: false,
          reason: `Cannot ${action} documents after subdivision completion. Property is now read-only.`,
        }
      }

      if (propertyState.is_handover_completed) {
        return {
          allowed: false,
          reason: `Cannot ${action} documents after handover completion. Property is now read-only.`,
        }
      }

      return { allowed: true }
    },
    [propertyState]
  )

  const validateFinancialAction = useCallback(
    (action: 'add' | 'edit' | 'delete') => {
      if (!propertyState) {
        return { allowed: false, reason: 'Property state not loaded' }
      }

      if (propertyState.is_subdivision_completed) {
        return {
          allowed: false,
          reason: `Cannot ${action} financial data after subdivision completion. Property is now read-only.`,
        }
      }

      if (propertyState.is_handover_completed) {
        return {
          allowed: false,
          reason: `Cannot ${action} financial data after handover completion. Property is now read-only.`,
        }
      }

      return { allowed: true }
    },
    [propertyState]
  )

  return {
    loading,
    propertyState,
    subdivisionDisabled,
    subdivisionDisabledReason,
    canStartSubdivision,
    canChangeSubdivisionStatus,
    handoverDisabled,
    handoverDisabledReason,
    canStartHandover,
    canChangeHandoverStatus,
    documentsReadOnly,
    documentsReadOnlyReason,
    financialsReadOnly,
    financialsReadOnlyReason,
    canEditDocuments,
    canEditFinancials,
    canUploadDocuments,
    canDeleteDocuments,
    canAddCosts,
    canEditCosts,
    canDeleteCosts,
    hasConflicts,
    conflictMessages,
    isPropertyLocked,
    lockReason,
    refreshState,
    validateSubdivisionChange,
    validateHandoverChange,
    validateDocumentAction,
    validateFinancialAction,
  }
}

/**
 * Utility function to get disabled option styles
 */
export function getDisabledOptionStyles(disabled: boolean): string {
  return disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
}

/**
 * Utility function to get disabled select styles
 */
export function getDisabledSelectStyles(disabled: boolean): string {
  return disabled
    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
    : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
}

/**
 * Utility function to get disabled button styles
 */
export function getDisabledButtonStyles(disabled: boolean): string {
  return disabled
    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-200'
}
