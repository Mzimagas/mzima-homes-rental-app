import getSupabaseClient from '../supabase-client'

const supabase = getSupabaseClient()

// Helper function to get CSRF token
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') return decodeURIComponent(value)
  }
  return null
}

export interface SubdivisionHistoryEntry {
  id: string
  action_type: 'PLAN_CREATED' | 'PLAN_MODIFIED' | 'PLAN_CANCELLED' | 'STATUS_CHANGED'
  previous_status: string | null
  new_status: string | null
  subdivision_name: string | null
  total_plots_planned: number | null
  change_reason: string
  changed_by_name: string
  changed_at: string
  details: any
}

export interface RecordSubdivisionHistoryParams {
  propertyId: string
  subdivisionId?: string
  actionType: 'PLAN_CREATED' | 'PLAN_MODIFIED' | 'PLAN_CANCELLED' | 'STATUS_CHANGED'
  previousStatus?: string
  newStatus?: string
  subdivisionName?: string
  totalPlotsPlanned?: number
  changeReason: string
  details?: any
}

export class SubdivisionHistoryService {
  /**
   * Get subdivision history for a property
   */
  static async getSubdivisionHistory(propertyId: string): Promise<SubdivisionHistoryEntry[]> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page and try again.')
      }

      const response = await fetch(`/api/properties/${propertyId}/subdivision-history`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error fetching subdivision history:', error)
      throw error
    }
  }

  /**
   * Record a subdivision history entry
   */
  static async recordSubdivisionHistory(params: RecordSubdivisionHistoryParams): Promise<string> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page and try again.')
      }

      const response = await fetch(`/api/properties/${params.propertyId}/subdivision-history`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          subdivision_id: params.subdivisionId,
          action_type: params.actionType,
          previous_status: params.previousStatus,
          new_status: params.newStatus,
          subdivision_name: params.subdivisionName,
          total_plots_planned: params.totalPlotsPlanned,
          change_reason: params.changeReason,
          details: params.details || {},
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data.id
    } catch (error) {
      console.error('Error recording subdivision history:', error)
      throw error
    }
  }

  /**
   * Record subdivision plan creation
   */
  static async recordPlanCreation(
    propertyId: string,
    subdivisionId: string,
    subdivisionName: string,
    totalPlotsPlanned: number,
    changeReason: string,
    details?: any
  ): Promise<string> {
    return this.recordSubdivisionHistory({
      propertyId,
      subdivisionId,
      actionType: 'PLAN_CREATED',
      newStatus: 'PLANNING',
      subdivisionName,
      totalPlotsPlanned,
      changeReason,
      details,
    })
  }

  /**
   * Record subdivision status change
   */
  static async recordStatusChange(
    propertyId: string,
    subdivisionId: string,
    previousStatus: string,
    newStatus: string,
    changeReason: string,
    details?: any
  ): Promise<string> {
    return this.recordSubdivisionHistory({
      propertyId,
      subdivisionId,
      actionType: 'STATUS_CHANGED',
      previousStatus,
      newStatus,
      changeReason,
      details,
    })
  }

  /**
   * Record subdivision plan modification
   */
  static async recordPlanModification(
    propertyId: string,
    subdivisionId: string,
    changeReason: string,
    details?: any
  ): Promise<string> {
    return this.recordSubdivisionHistory({
      propertyId,
      subdivisionId,
      actionType: 'PLAN_MODIFIED',
      changeReason,
      details,
    })
  }

  /**
   * Record subdivision plan cancellation
   */
  static async recordPlanCancellation(
    propertyId: string,
    subdivisionId: string,
    changeReason: string,
    details?: any
  ): Promise<string> {
    return this.recordSubdivisionHistory({
      propertyId,
      subdivisionId,
      actionType: 'PLAN_CANCELLED',
      newStatus: 'CANCELLED',
      changeReason,
      details,
    })
  }
}
