'use client'

import { useState, useEffect, useCallback } from 'react'
import { PropertyStateService, PropertyState } from '../../../services/propertyStateService'

interface PropertyStateIndicatorProps {
  propertyId: string
  variant?: 'compact' | 'detailed'
  className?: string
}

/**
 * Property State Indicator Component
 * Shows current subdivision and handover status with mutual exclusivity awareness
 */
export default function PropertyStateIndicator({
  propertyId,
  variant = 'detailed',
  className = '',
}: PropertyStateIndicatorProps) {
  const [propertyState, setPropertyState] = useState<PropertyState | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPropertyState = useCallback(async () => {
    setLoading(true)
    try {
      const state = await PropertyStateService.getPropertyState(propertyId)
      setPropertyState(state)
    } catch (error) {
      console.error('Error loading property state:', error)
      setPropertyState(null)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    loadPropertyState()
  }, [loadPropertyState])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
    )
  }

  if (!propertyState) {
    return <div className={`text-gray-400 text-sm ${className}`}>State unknown</div>
  }

  if (variant === 'compact') {
    return <PropertyStateCompactInternal propertyState={propertyState} className={className} />
  }

  return <PropertyStateDetailedInternal propertyState={propertyState} className={className} />
}

/**
 * Compact version for property cards (internal)
 */
function PropertyStateCompactInternal({
  propertyState,
  className,
}: {
  propertyState: PropertyState
  className?: string
}) {
  // Determine primary state to display
  let primaryIndicator = null

  if (propertyState.state_conflicts.length > 0) {
    // Show conflict warning
    primaryIndicator = (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800">
        ⚠️ State Conflict
      </span>
    )
  } else if (propertyState.is_subdivision_completed) {
    // Subdivision completed
    primaryIndicator = (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
        ✅ Subdivision Complete
      </span>
    )
  } else if (propertyState.is_handover_completed) {
    // Handover completed
    primaryIndicator = (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
        ✅ Handover Complete
      </span>
    )
  } else if (propertyState.is_subdivision_active) {
    // Subdivision active
    primaryIndicator = (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
        🏗️ Subdivision Active
      </span>
    )
  } else if (propertyState.is_handover_active) {
    // Handover active
    primaryIndicator = (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
        📋 Handover Active
      </span>
    )
  } else {
    // Available for processes
    primaryIndicator = (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
        ⭕ Available
      </span>
    )
  }

  return <div className={className}>{primaryIndicator}</div>
}

/**
 * Detailed version for management pages (internal)
 */
function PropertyStateDetailedInternal({
  propertyState,
  className,
}: {
  propertyState: PropertyState
  className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* State Conflicts */}
      {propertyState.state_conflicts.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="font-medium text-red-800 text-sm">State Conflicts Detected</span>
          </div>
          <ul className="mt-2 text-sm text-red-700">
            {propertyState.state_conflicts.map((conflict, index) => (
              <li key={index} className="ml-4">
                • {conflict}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Current Status */}
      <div className="grid grid-cols-2 gap-4">
        {/* Subdivision Status */}
        <div className="p-3 border rounded-md">
          <h4 className="font-medium text-gray-900 text-sm mb-2">Subdivision</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {propertyState.is_subdivision_completed ? (
                <span className="text-green-600">✅</span>
              ) : propertyState.is_subdivision_active ? (
                <span className="text-blue-600">🏗️</span>
              ) : (
                <span className="text-gray-400">⭕</span>
              )}
              <span className="text-sm">{propertyState.subdivision_status.replace('_', ' ')}</span>
            </div>
            <div className="text-xs text-gray-500">
              {propertyState.can_start_subdivision ? 'Can start' : 'Cannot start'}
            </div>
          </div>
        </div>

        {/* Handover Status */}
        <div className="p-3 border rounded-md">
          <h4 className="font-medium text-gray-900 text-sm mb-2">Handover</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {propertyState.is_handover_completed ? (
                <span className="text-green-600">✅</span>
              ) : propertyState.is_handover_active ? (
                <span className="text-blue-600">📋</span>
              ) : (
                <span className="text-gray-400">⭕</span>
              )}
              <span className="text-sm">{propertyState.handover_status.replace('_', ' ')}</span>
            </div>
            <div className="text-xs text-gray-500">
              {propertyState.can_start_handover ? 'Can start' : 'Cannot start'}
            </div>
          </div>
        </div>
      </div>

      {/* Mutual Exclusivity Info */}
      {(propertyState.is_subdivision_active || propertyState.is_handover_active) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">ℹ️</span>
            <span className="font-medium text-blue-800 text-sm">Mutual Exclusivity Active</span>
          </div>
          <p className="mt-1 text-sm text-blue-700">
            {propertyState.is_subdivision_active
              ? 'Handover is disabled while subdivision is in progress.'
              : 'Subdivision is disabled while handover is in progress.'}
          </p>
        </div>
      )}

      {/* Completion Lock Info */}
      {(propertyState.is_subdivision_completed || propertyState.is_handover_completed) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center">
            <span className="text-amber-600 mr-2">🔒</span>
            <span className="font-medium text-amber-800 text-sm">Property Locked</span>
          </div>
          <p className="mt-1 text-sm text-amber-700">
            {propertyState.is_subdivision_completed
              ? 'Property is locked after subdivision completion. Documents and financials are read-only.'
              : 'Property is locked after handover completion. Documents and financials are read-only.'}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Compact version component for easy import
 */
export function PropertyStateCompact({ propertyId }: { propertyId: string }) {
  return <PropertyStateIndicator propertyId={propertyId} variant="compact" />
}

/**
 * Detailed version component for easy import
 */
export function PropertyStateDetailed({ propertyId }: { propertyId: string }) {
  return <PropertyStateIndicator propertyId={propertyId} variant="detailed" />
}
