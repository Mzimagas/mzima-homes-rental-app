/**
 * Process Auto-Completion Service
 * Handles automatic completion of subdivision and handover processes
 * when all requirements are met, preventing manual manipulation
 */

export interface CompletionCheckResult {
  canComplete: boolean
  reason?: string
  missingRequirements?: string[]
}

export interface AutoCompletionResult {
  completed: boolean
  processType: 'subdivision' | 'handover'
  message: string
  warnings?: string[]
}

export class ProcessAutoCompletionService {
  /**
   * Check if subdivision process can be auto-completed
   * This would typically check document completion, financial requirements, etc.
   */
  static async checkSubdivisionCompletion(propertyId: string): Promise<CompletionCheckResult> {
    try {
      // TODO: Implement actual completion criteria checking
      // This could include:
      // - All required documents uploaded and approved
      // - All financial requirements met
      // - Survey completion
      // - Approval authority sign-off
      // - Plot creation completed
      
      // For now, return a placeholder that can be extended
      return {
        canComplete: false,
        reason: 'Auto-completion criteria not yet implemented',
        missingRequirements: [
          'Document completion check',
          'Financial requirements verification',
          'Survey completion verification',
          'Authority approval verification'
        ]
      }
    } catch (error) {
      console.error('Error checking subdivision completion:', error)
      return {
        canComplete: false,
        reason: 'Error checking completion criteria'
      }
    }
  }

  /**
   * Check if handover process can be auto-completed
   * This would typically check handover document completion, inspections, etc.
   */
  static async checkHandoverCompletion(propertyId: string): Promise<CompletionCheckResult> {
    try {
      // TODO: Implement actual completion criteria checking
      // This could include:
      // - All handover documents completed
      // - Property inspection completed
      // - Keys handed over
      // - Final payments received
      // - Buyer/tenant sign-off
      
      // For now, return a placeholder that can be extended
      return {
        canComplete: false,
        reason: 'Auto-completion criteria not yet implemented',
        missingRequirements: [
          'Handover document completion check',
          'Property inspection verification',
          'Key handover confirmation',
          'Final payment verification',
          'Buyer/tenant sign-off verification'
        ]
      }
    } catch (error) {
      console.error('Error checking handover completion:', error)
      return {
        canComplete: false,
        reason: 'Error checking completion criteria'
      }
    }
  }

  /**
   * Attempt to auto-complete subdivision process
   * Only completes if all criteria are met
   */
  static async attemptSubdivisionCompletion(propertyId: string): Promise<AutoCompletionResult> {
    try {
      const completionCheck = await this.checkSubdivisionCompletion(propertyId)
      
      if (!completionCheck.canComplete) {
        return {
          completed: false,
          processType: 'subdivision',
          message: `Subdivision cannot be completed: ${completionCheck.reason}`,
        }
      }

      // Call the completion endpoint
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
          completed: false,
          processType: 'subdivision',
          message: `Failed to complete subdivision: ${errorData.error}`,
        }
      }

      const result = await response.json()
      return {
        completed: true,
        processType: 'subdivision',
        message: 'Subdivision completed automatically',
        warnings: result.warnings,
      }
    } catch (error) {
      console.error('Error in subdivision auto-completion:', error)
      return {
        completed: false,
        processType: 'subdivision',
        message: 'Error during subdivision auto-completion',
      }
    }
  }

  /**
   * Attempt to auto-complete handover process
   * Only completes if all criteria are met
   */
  static async attemptHandoverCompletion(propertyId: string): Promise<AutoCompletionResult> {
    try {
      const completionCheck = await this.checkHandoverCompletion(propertyId)
      
      if (!completionCheck.canComplete) {
        return {
          completed: false,
          processType: 'handover',
          message: `Handover cannot be completed: ${completionCheck.reason}`,
        }
      }

      // Call the completion endpoint
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
          completed: false,
          processType: 'handover',
          message: `Failed to complete handover: ${errorData.error}`,
        }
      }

      const result = await response.json()
      return {
        completed: true,
        processType: 'handover',
        message: 'Handover completed automatically',
        warnings: result.warnings,
      }
    } catch (error) {
      console.error('Error in handover auto-completion:', error)
      return {
        completed: false,
        processType: 'handover',
        message: 'Error during handover auto-completion',
      }
    }
  }

  /**
   * Check and attempt auto-completion for both processes
   * This can be called periodically or triggered by events
   */
  static async checkAndCompleteProcesses(propertyId: string): Promise<AutoCompletionResult[]> {
    const results: AutoCompletionResult[] = []

    // Check subdivision completion
    try {
      const subdivisionResult = await this.attemptSubdivisionCompletion(propertyId)
      results.push(subdivisionResult)
    } catch (error) {
      console.error('Error checking subdivision:', error)
    }

    // Check handover completion
    try {
      const handoverResult = await this.attemptHandoverCompletion(propertyId)
      results.push(handoverResult)
    } catch (error) {
      console.error('Error checking handover:', error)
    }

    return results
  }

  /**
   * Get completion status for both processes
   * Useful for UI to show progress and requirements
   */
  static async getCompletionStatus(propertyId: string): Promise<{
    subdivision: CompletionCheckResult
    handover: CompletionCheckResult
  }> {
    const [subdivision, handover] = await Promise.all([
      this.checkSubdivisionCompletion(propertyId),
      this.checkHandoverCompletion(propertyId)
    ])

    return { subdivision, handover }
  }
}

/**
 * Event-driven auto-completion trigger
 * This can be called when documents are uploaded, payments are made, etc.
 */
export async function triggerAutoCompletionCheck(
  propertyId: string,
  triggerEvent: string
): Promise<void> {
  console.log(`Auto-completion check triggered for property ${propertyId} by event: ${triggerEvent}`)
  
  try {
    const results = await ProcessAutoCompletionService.checkAndCompleteProcesses(propertyId)
    
    results.forEach(result => {
      if (result.completed) {
        console.log(`✅ ${result.processType} auto-completed for property ${propertyId}`)
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('processAutoCompleted', {
          detail: {
            propertyId,
            processType: result.processType,
            message: result.message,
            warnings: result.warnings
          }
        }))
      }
    })
  } catch (error) {
    console.error('Error in auto-completion check:', error)
  }
}
