/**
 * Property Status Update Service
 * Handles property status updates through proper API endpoints that bypass RLS
 */

export type SubdivisionStatusUpdate = 'NOT_STARTED' | 'SUB_DIVISION_STARTED' | 'SUBDIVIDED'
export type HandoverStatusUpdate = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface StatusUpdateResult {
  success: boolean
  error?: string
  warnings?: string[]
  new_state?: any
}

export class PropertyStatusUpdateService {
  /**
   * Update subdivision status using the proper API endpoint
   */
  static async updateSubdivisionStatus(
    propertyId: string,
    status: SubdivisionStatusUpdate,
    subdivisionDate?: string
  ): Promise<StatusUpdateResult> {
    try {
      // For subdivision completion, use the dedicated completion endpoint
      if (status === 'SUBDIVIDED') {
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
      }

      // For other subdivision status changes, use the subdivision endpoint
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
        new_state: {
          subdivision_status: status,
          subdivision_date: subdivisionDate,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error updating subdivision status: ${error}`,
      }
    }
  }

  /**
   * Update handover status using the proper API endpoint
   */
  static async updateHandoverStatus(
    propertyId: string,
    status: HandoverStatusUpdate,
    handoverDate?: string
  ): Promise<StatusUpdateResult> {
    try {
      // For handover completion, use the dedicated completion endpoint
      if (status === 'COMPLETED') {
        const response = await fetch(`/api/properties/${propertyId}/handover/complete`, {
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
      }

      // For other handover status changes, use the handover endpoint
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
   * Update both subdivision and handover status in a single call
   * This ensures mutual exclusivity is properly enforced
   */
  static async updatePropertyStatus(
    propertyId: string,
    updates: {
      subdivision_status?: SubdivisionStatusUpdate
      subdivision_date?: string
      handover_status?: HandoverStatusUpdate
      handover_date?: string
    }
  ): Promise<StatusUpdateResult> {
    try {
      // If updating subdivision to completed, use the dedicated endpoint
      if (updates.subdivision_status === 'SUBDIVIDED') {
        return this.updateSubdivisionStatus(propertyId, 'SUBDIVIDED', updates.subdivision_date)
      }

      // If updating handover, use the handover endpoint
      if (updates.handover_status) {
        return this.updateHandoverStatus(propertyId, updates.handover_status, updates.handover_date)
      }

      // If updating subdivision to other statuses, use subdivision endpoint
      if (updates.subdivision_status) {
        return this.updateSubdivisionStatus(
          propertyId,
          updates.subdivision_status,
          updates.subdivision_date
        )
      }

      return {
        success: false,
        error: 'No valid status updates provided',
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error updating property status: ${error}`,
      }
    }
  }

  /**
   * Map UI status values to internal status values
   */
  static mapUIStatusToInternal(uiStatus: string, type: 'subdivision' | 'handover'): string {
    if (type === 'subdivision') {
      const subdivisionMap: Record<string, string> = {
        'Not Started': 'NOT_STARTED',
        'Sub-Division Started': 'SUB_DIVISION_STARTED',
        Subdivided: 'SUBDIVIDED',
      }
      return subdivisionMap[uiStatus] || uiStatus
    } else {
      const handoverMap: Record<string, string> = {
        'Not Started': 'PENDING',
        'In Progress': 'IN_PROGRESS',
        'Handed Over': 'COMPLETED',
      }
      return handoverMap[uiStatus] || uiStatus
    }
  }

  /**
   * Update property status from UI dropdown values
   */
  static async updatePropertyStatusFromUI(
    propertyId: string,
    subdivisionUI?: string,
    handoverUI?: string
  ): Promise<StatusUpdateResult> {
    const updates: any = {}

    if (subdivisionUI) {
      updates.subdivision_status = this.mapUIStatusToInternal(
        subdivisionUI,
        'subdivision'
      ) as SubdivisionStatusUpdate
    }

    if (handoverUI) {
      updates.handover_status = this.mapUIStatusToInternal(
        handoverUI,
        'handover'
      ) as HandoverStatusUpdate
    }

    return this.updatePropertyStatus(propertyId, updates)
  }

  /**
   * Get current property status
   */
  static async getPropertyStatus(propertyId: string): Promise<{
    subdivision_status: string
    handover_status: string
    subdivision_date?: string
    handover_date?: string
    can_change_subdivision: boolean
    can_change_handover: boolean
  } | null> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/handover`, {
        method: 'GET',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        console.error('Failed to get property status:', response.statusText)
        return null
      }

      const result = await response.json()
      return {
        subdivision_status: result.subdivision_status || 'NOT_STARTED',
        handover_status: result.handover_status || 'PENDING',
        subdivision_date: result.subdivision_date,
        handover_date: result.handover_date,
        can_change_subdivision: result.can_change_handover, // Inverse relationship
        can_change_handover: result.can_change_handover,
      }
    } catch (error) {
      console.error('Error getting property status:', error)
      return null
    }
  }
}
