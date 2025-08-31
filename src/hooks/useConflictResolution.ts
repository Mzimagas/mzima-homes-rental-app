import { useState, useEffect, useCallback } from 'react'
import ConflictResolutionService, { ConflictData, ConflictResolutionStrategy } from '../services/conflict-resolution.service'

interface ConflictResolutionState {
  pendingConflicts: ConflictData[]
  loading: boolean
  error: string | null
}

interface UseConflictResolutionOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  userId?: string
}

export const useConflictResolution = (options: UseConflictResolutionOptions = {}) => {
  const { autoRefresh = true, refreshInterval = 30000, userId } = options

  const [state, setState] = useState<ConflictResolutionState>({
    pendingConflicts: [],
    loading: false,
    error: null
  })

  // Load pending conflicts
  const loadPendingConflicts = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const conflicts = await ConflictResolutionService.getPendingConflicts(userId)
      setState(prev => ({
        ...prev,
        pendingConflicts: conflicts,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load conflicts',
        loading: false
      }))
    }
  }, [userId])

  // Resolve a single conflict
  const resolveConflict = useCallback(async (
    conflictId: string,
    strategy: ConflictResolutionStrategy
  ): Promise<boolean> => {
    try {
      const success = await ConflictResolutionService.resolveConflict(conflictId, strategy)
      
      if (success) {
        // Remove resolved conflict from state
        setState(prev => ({
          ...prev,
          pendingConflicts: prev.pendingConflicts.filter(c => c.id !== conflictId)
        }))
      }
      
      return success
    } catch (error) {
      console.error('Error resolving conflict:', error)
      return false
    }
  }, [])

  // Bulk resolve conflicts
  const bulkResolveConflicts = useCallback(async (
    conflictIds: string[],
    strategy: ConflictResolutionStrategy
  ): Promise<{ resolved: number; failed: number }> => {
    try {
      const result = await ConflictResolutionService.bulkResolveConflicts(conflictIds, strategy)
      
      // Remove resolved conflicts from state
      setState(prev => ({
        ...prev,
        pendingConflicts: prev.pendingConflicts.filter(c => !conflictIds.includes(c.id))
      }))
      
      return result
    } catch (error) {
      console.error('Error bulk resolving conflicts:', error)
      return { resolved: 0, failed: conflictIds.length }
    }
  }, [])

  // Get resolution suggestions for a conflict
  const getResolutionSuggestions = useCallback((conflict: ConflictData): ConflictResolutionStrategy[] => {
    return ConflictResolutionService.getResolutionSuggestions(conflict)
  }, [])

  // Optimistic update with conflict detection
  const optimisticUpdate = useCallback(async (
    tableName: string,
    recordId: string,
    updates: Record<string, any>,
    lastKnownTimestamp: Date
  ): Promise<{ success: boolean; conflicts?: ConflictData[] }> => {
    const result = await ConflictResolutionService.optimisticUpdate(
      tableName,
      recordId,
      updates,
      lastKnownTimestamp
    )

    // If conflicts were detected, add them to our state
    if (result.conflicts && result.conflicts.length > 0) {
      setState(prev => ({
        ...prev,
        pendingConflicts: [...prev.pendingConflicts, ...result.conflicts!]
      }))
    }

    return result
  }, [])

  // Auto-refresh pending conflicts
  useEffect(() => {
    loadPendingConflicts()

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(loadPendingConflicts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [loadPendingConflicts, autoRefresh, refreshInterval])

  // Group conflicts by table and record for better UX
  const groupedConflicts = useCallback(() => {
    const groups: Record<string, Record<string, ConflictData[]>> = {}

    state.pendingConflicts.forEach(conflict => {
      if (!groups[conflict.table_name]) {
        groups[conflict.table_name] = {}
      }
      if (!groups[conflict.table_name][conflict.record_id]) {
        groups[conflict.table_name][conflict.record_id] = []
      }
      groups[conflict.table_name][conflict.record_id].push(conflict)
    })

    return groups
  }, [state.pendingConflicts])

  // Get conflicts for a specific record
  const getConflictsForRecord = useCallback((tableName: string, recordId: string): ConflictData[] => {
    return state.pendingConflicts.filter(
      conflict => conflict.table_name === tableName && conflict.record_id === recordId
    )
  }, [state.pendingConflicts])

  // Check if a record has conflicts
  const hasConflicts = useCallback((tableName: string, recordId: string): boolean => {
    return state.pendingConflicts.some(
      conflict => conflict.table_name === tableName && conflict.record_id === recordId
    )
  }, [state.pendingConflicts])

  // Get conflict count for a record
  const getConflictCount = useCallback((tableName: string, recordId: string): number => {
    return state.pendingConflicts.filter(
      conflict => conflict.table_name === tableName && conflict.record_id === recordId
    ).length
  }, [state.pendingConflicts])

  // Ignore a conflict (mark as resolved without applying changes)
  const ignoreConflict = useCallback(async (conflictId: string): Promise<boolean> => {
    try {
      // Mark as resolved with server value (no actual change)
      const conflict = state.pendingConflicts.find(c => c.id === conflictId)
      if (!conflict) return false

      const success = await resolveConflict(conflictId, {
        strategy: 'KEEP_SERVER',
        reason: 'Conflict ignored by user'
      })

      return success
    } catch (error) {
      console.error('Error ignoring conflict:', error)
      return false
    }
  }, [state.pendingConflicts, resolveConflict])

  // Auto-resolve conflicts using smart strategies
  const autoResolveConflicts = useCallback(async (conflictIds?: string[]): Promise<number> => {
    const targetConflicts = conflictIds 
      ? state.pendingConflicts.filter(c => conflictIds.includes(c.id))
      : state.pendingConflicts

    let resolvedCount = 0

    for (const conflict of targetConflicts) {
      const suggestions = getResolutionSuggestions(conflict)
      
      // Use the first suggestion (usually the smartest auto-merge)
      if (suggestions.length > 0) {
        const success = await resolveConflict(conflict.id, suggestions[0])
        if (success) {
          resolvedCount++
        }
      }
    }

    return resolvedCount
  }, [state.pendingConflicts, getResolutionSuggestions, resolveConflict])

  return {
    // State
    pendingConflicts: state.pendingConflicts,
    loading: state.loading,
    error: state.error,
    conflictCount: state.pendingConflicts.length,

    // Actions
    loadPendingConflicts,
    resolveConflict,
    bulkResolveConflicts,
    ignoreConflict,
    autoResolveConflicts,
    optimisticUpdate,

    // Utilities
    getResolutionSuggestions,
    groupedConflicts: groupedConflicts(),
    getConflictsForRecord,
    hasConflicts,
    getConflictCount
  }
}
