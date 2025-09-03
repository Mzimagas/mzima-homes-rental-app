/**
 * Property State Service
 * Manages property state transitions and mutual exclusivity between subdivision and handover processes
 */

import supabase from '../lib/supabase-client'

// Service role client for admin operations (bypasses RLS)
const getServiceRoleClient = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use regular client (RLS applies)
    return supabase
  }

  // Server-side: try to use service role if available
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    const { createClient } = require('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    return createClient(supabaseUrl, serviceKey)
  }

  // Fallback to regular client
  return supabase
}

export type SubdivisionStatus = 'NOT_STARTED' | 'SUB_DIVISION_STARTED' | 'SUBDIVIDED'
export type HandoverStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface PropertyState {
  id: string
  name: string
  subdivision_status: SubdivisionStatus
  handover_status: HandoverStatus
  can_start_subdivision: boolean
  can_start_handover: boolean
  is_subdivision_active: boolean
  is_handover_active: boolean
  is_subdivision_completed: boolean
  is_handover_completed: boolean
  state_conflicts: string[]
}

export interface StateTransitionResult {
  success: boolean
  error?: string
  warnings?: string[]
  new_state?: any
}

export interface CanStartResult {
  canStart: boolean
  reason?: string
}

export class PropertyStateService {
  /**
   * Get comprehensive state summary for a property
   */
  static async getPropertyState(propertyId: string): Promise<PropertyState | null> {
    try {
      // Validate input
      if (!propertyId || typeof propertyId !== 'string') {
        console.error('Invalid propertyId provided to getPropertyState:', propertyId)
        return null
      }

      // Validate supabase client
      if (!supabase) {
        console.error('Supabase client not initialized')
        return null
      }

      // Reduced logging to prevent console spam
      if (process.env.NODE_ENV === 'development') {
        console.debug('Getting property state for:', propertyId)
      }

      const { data, error } = await supabase
        .from('properties')
        .select('id, name, subdivision_status, handover_status')
        .eq('id', propertyId)
        .single()

      if (error) {
        console.error('Error getting property state:', {
          error,
          propertyId,
          message: error?.message || 'Unknown error',
          details: error?.details || 'No details available',
          hint: error?.hint || 'No hint available',
          code: error?.code || 'No code available'
        })
        return null
      }

      if (!data) {
        return null
      }

      // Normalize status values
      const subdivisionStatus = (data.subdivision_status || 'NOT_STARTED') as SubdivisionStatus
      const handoverStatus = (data.handover_status || 'PENDING') as HandoverStatus

      // Calculate state flags
      const isSubdivisionActive = subdivisionStatus === 'SUB_DIVISION_STARTED'
      const isHandoverActive = handoverStatus === 'IN_PROGRESS'
      const isSubdivisionCompleted = subdivisionStatus === 'SUBDIVIDED'
      const isHandoverCompleted = handoverStatus === 'COMPLETED'

      // Calculate availability
      const canStartSubdivision =
        subdivisionStatus === 'NOT_STARTED' &&
        handoverStatus !== 'IN_PROGRESS' &&
        handoverStatus !== 'COMPLETED'

      const canStartHandover =
        handoverStatus === 'PENDING' &&
        subdivisionStatus !== 'SUB_DIVISION_STARTED' &&
        subdivisionStatus !== 'SUBDIVIDED'

      // Detect conflicts (should not occur with proper validation)
      const stateConflicts: string[] = []
      if (isSubdivisionActive && isHandoverActive) {
        stateConflicts.push(
          'Both subdivision and handover are active - mutual exclusivity violated'
        )
      }

      return {
        id: data.id,
        name: data.name,
        subdivision_status: subdivisionStatus,
        handover_status: handoverStatus,
        can_start_subdivision: canStartSubdivision,
        can_start_handover: canStartHandover,
        is_subdivision_active: isSubdivisionActive,
        is_handover_active: isHandoverActive,
        is_subdivision_completed: isSubdivisionCompleted,
        is_handover_completed: isHandoverCompleted,
        state_conflicts: stateConflicts,
      }
    } catch (error) {
      console.error('Unexpected error in getPropertyState:', {
        error,
        propertyId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error type',
        errorStack: error instanceof Error ? error.stack : 'No stack trace available'
      })
      return null
    }
  }

  /**
   * Check if subdivision can be started
   */
  static async canStartSubdivision(propertyId: string): Promise<CanStartResult> {
    const state = await this.getPropertyState(propertyId)

    if (!state) {
      return { canStart: false, reason: 'Property not found' }
    }

    if (state.subdivision_status !== 'NOT_STARTED') {
      return { canStart: false, reason: 'Subdivision already started or completed' }
    }

    if (state.handover_status === 'IN_PROGRESS') {
      return { canStart: false, reason: 'Cannot start subdivision while handover is in progress' }
    }

    if (state.handover_status === 'COMPLETED') {
      return { canStart: false, reason: 'Cannot start subdivision after handover is completed' }
    }

    return { canStart: true }
  }

  /**
   * Check if handover can be started
   */
  static async canStartHandover(propertyId: string): Promise<CanStartResult> {
    const state = await this.getPropertyState(propertyId)

    if (!state) {
      return { canStart: false, reason: 'Property not found' }
    }

    if (state.handover_status !== 'PENDING') {
      return { canStart: false, reason: 'Handover already started or completed' }
    }

    if (state.subdivision_status === 'SUB_DIVISION_STARTED') {
      return { canStart: false, reason: 'Cannot start handover while subdivision is in progress' }
    }

    if (state.subdivision_status === 'SUBDIVIDED') {
      return { canStart: false, reason: 'Cannot start handover after property has been subdivided' }
    }

    return { canStart: true }
  }

  /**
   * Validate state transition
   */
  static validateTransition(
    currentSubdivision: string,
    currentHandover: string,
    newSubdivision?: string,
    newHandover?: string
  ): { valid: boolean; error?: string } {
    const finalSubdivision = newSubdivision || currentSubdivision
    const finalHandover = newHandover || currentHandover

    // Check mutual exclusivity
    if (finalSubdivision === 'SUB_DIVISION_STARTED' && finalHandover === 'IN_PROGRESS') {
      return {
        valid: false,
        error: 'Cannot have both subdivision and handover processes active simultaneously',
      }
    }

    // Check reversion prevention
    if (currentSubdivision === 'SUBDIVIDED' && newSubdivision && newSubdivision !== 'SUBDIVIDED') {
      return {
        valid: false,
        error: 'Cannot revert subdivision status from SUBDIVIDED. Process is irreversible.',
      }
    }

    if (currentHandover === 'COMPLETED' && newHandover && newHandover !== 'COMPLETED') {
      return {
        valid: false,
        error: 'Cannot revert handover status from COMPLETED. Process is irreversible.',
      }
    }

    return { valid: true }
  }

  /**
   * Start subdivision process for a property
   */
  static async startSubdivision(propertyId: string): Promise<StateTransitionResult> {
    return this.updateSubdivisionStatus(propertyId, 'SUB_DIVISION_STARTED')
  }

  /**
   * Start handover process for a property
   */
  static async startHandover(propertyId: string): Promise<StateTransitionResult> {
    return this.updateHandoverStatus(propertyId, 'IN_PROGRESS')
  }

  /**
   * Complete subdivision process (called automatically when all plots are created)
   */
  static async completeSubdivision(propertyId: string): Promise<StateTransitionResult> {
    try {
      // Use API endpoint that has service role access
      const response = await fetch(`/api/properties/${propertyId}/subdivision/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const result = await response.json()

      return {
        success: true,
        warnings: result.warnings || [],
        new_state: result.new_state,
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error completing subdivision: ${error}`,
      }
    }
  }

  /**
   * Complete handover process
   */
  static async completeHandover(propertyId: string): Promise<StateTransitionResult> {
    return this.updateHandoverStatus(propertyId, 'COMPLETED')
  }

  /**
   * Update handover status using API endpoint that bypasses RLS
   */
  static async updateHandoverStatus(
    propertyId: string,
    status: HandoverStatus,
    handoverDate?: string
  ): Promise<StateTransitionResult> {
    try {
      // Use API endpoint that has service role access
      const response = await fetch(`/api/properties/${propertyId}/handover`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          handover_status: status,
          handover_date: handoverDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const result = await response.json()

      return {
        success: true,
        warnings: result.warnings || [],
        new_state: result.new_state,
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error updating handover status: ${error}`,
      }
    }
  }

  /**
   * Update subdivision status using API endpoint that bypasses RLS
   */
  static async updateSubdivisionStatus(
    propertyId: string,
    status: SubdivisionStatus,
    subdivisionDate?: string
  ): Promise<StateTransitionResult> {
    try {
      // For completion, use the dedicated completion endpoint
      if (status === 'SUBDIVIDED') {
        return this.completeSubdivision(propertyId)
      }

      // For other statuses, use the general subdivision endpoint
      const response = await fetch(`/api/properties/${propertyId}/subdivision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          subdivision_status: status,
          subdivision_date: subdivisionDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const result = await response.json()

      return {
        success: true,
        warnings: result.warnings || [],
        new_state: result.new_state,
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error updating subdivision status: ${error}`,
      }
    }
  }

  /**
   * Get all properties with state conflicts
   */
  static async getPropertiesWithConflicts(): Promise<PropertyState[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, subdivision_status, handover_status')
        .eq('subdivision_status', 'SUB_DIVISION_STARTED')
        .eq('handover_status', 'IN_PROGRESS')

      if (error) {
        console.error('Error getting properties with conflicts:', error)
        return []
      }

      // Convert to PropertyState format
      const conflicts: PropertyState[] = (data || []).map((property) => ({
        id: property.id,
        name: property.name,
        subdivision_status: property.subdivision_status as SubdivisionStatus,
        handover_status: property.handover_status as HandoverStatus,
        can_start_subdivision: false,
        can_start_handover: false,
        is_subdivision_active: true,
        is_handover_active: true,
        is_subdivision_completed: false,
        is_handover_completed: false,
        state_conflicts: ['Both subdivision and handover are active - mutual exclusivity violated'],
      }))

      return conflicts
    } catch (error) {
      console.error('Error in getPropertiesWithConflicts:', error)
      return []
    }
  }
}
