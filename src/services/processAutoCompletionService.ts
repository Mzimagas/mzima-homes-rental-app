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
   * Verifies all documents, financials, and approvals are complete
   */
  static async checkSubdivisionCompletion(propertyId: string): Promise<CompletionCheckResult> {
    try {
      const missingRequirements: string[] = []

      // 1. Check Document Completion
      const documentCheck = await this.checkSubdivisionDocuments(propertyId)
      if (!documentCheck.complete) {
        missingRequirements.push(...documentCheck.missing)
      }

      // 2. Check Financial Requirements
      const financialCheck = await this.checkSubdivisionFinancials(propertyId)
      if (!financialCheck.complete) {
        missingRequirements.push(...financialCheck.missing)
      }

      // 3. Check Survey and Approval Status
      const approvalCheck = await this.checkSubdivisionApprovals(propertyId)
      if (!approvalCheck.complete) {
        missingRequirements.push(...approvalCheck.missing)
      }

      // 4. Check Plot Creation Status
      const plotCheck = await this.checkPlotCreation(propertyId)
      if (!plotCheck.complete) {
        missingRequirements.push(...plotCheck.missing)
      }

      const canComplete = missingRequirements.length === 0

      return {
        canComplete,
        reason: canComplete ? 'All requirements met' : 'Missing required items',
        missingRequirements: canComplete ? undefined : missingRequirements
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
   * Verifies all handover documents, inspections, and sign-offs are complete
   */
  static async checkHandoverCompletion(propertyId: string): Promise<CompletionCheckResult> {
    try {
      const missingRequirements: string[] = []

      // 1. Check Handover Document Completion
      const documentCheck = await this.checkHandoverDocuments(propertyId)
      if (!documentCheck.complete) {
        missingRequirements.push(...documentCheck.missing)
      }

      // 2. Check Property Inspection Status
      const inspectionCheck = await this.checkPropertyInspection(propertyId)
      if (!inspectionCheck.complete) {
        missingRequirements.push(...inspectionCheck.missing)
      }

      // 3. Check Final Payments
      const paymentCheck = await this.checkFinalPayments(propertyId)
      if (!paymentCheck.complete) {
        missingRequirements.push(...paymentCheck.missing)
      }

      // 4. Check Key Handover and Sign-offs
      const signoffCheck = await this.checkHandoverSignoffs(propertyId)
      if (!signoffCheck.complete) {
        missingRequirements.push(...signoffCheck.missing)
      }

      const canComplete = missingRequirements.length === 0

      return {
        canComplete,
        reason: canComplete ? 'All requirements met' : 'Missing required items',
        missingRequirements: canComplete ? undefined : missingRequirements
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

  // ==================== SUBDIVISION COMPLETION CHECKS ====================

  /**
   * Check subdivision document completion
   */
  private static async checkSubdivisionDocuments(propertyId: string): Promise<{complete: boolean, missing: string[]}> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/documents/subdivision/status`)
      if (!response.ok) throw new Error('Failed to fetch subdivision documents')

      const { data } = await response.json()
      const missing: string[] = []

      // Required subdivision documents
      const requiredDocs = [
        'title_copy', 'search_certificate', 'survey_plan', 'subdivision_approval',
        'plot_beacons', 'mutation_forms', 'title_registration_subdivision'
      ]

      requiredDocs.forEach(docKey => {
        const doc = data?.find((d: any) => d.document_type === docKey)
        if (!doc || doc.status !== 'APPROVED') {
          missing.push(`${docKey.replace('_', ' ').toUpperCase()} document`)
        }
      })

      return { complete: missing.length === 0, missing }
    } catch (error) {
      console.error('Error checking subdivision documents:', error)
      return { complete: false, missing: ['Document verification failed'] }
    }
  }

  /**
   * Check subdivision financial requirements
   */
  private static async checkSubdivisionFinancials(propertyId: string): Promise<{complete: boolean, missing: string[]}> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/financials/subdivision`)
      if (!response.ok) throw new Error('Failed to fetch subdivision financials')

      const { data } = await response.json()
      const missing: string[] = []

      // Check required financial items
      if (!data?.survey_cost_paid) missing.push('Survey cost payment')
      if (!data?.approval_fees_paid) missing.push('Approval fees payment')
      if (!data?.registration_fees_paid) missing.push('Registration fees payment')
      if (!data?.legal_fees_paid) missing.push('Legal fees payment')

      return { complete: missing.length === 0, missing }
    } catch (error) {
      console.error('Error checking subdivision financials:', error)
      return { complete: false, missing: ['Financial verification failed'] }
    }
  }

  /**
   * Check subdivision approvals and survey completion
   */
  private static async checkSubdivisionApprovals(propertyId: string): Promise<{complete: boolean, missing: string[]}> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/subdivision/approvals`)
      if (!response.ok) throw new Error('Failed to fetch subdivision approvals')

      const { data } = await response.json()
      const missing: string[] = []

      if (!data?.survey_completed) missing.push('Survey completion')
      if (!data?.county_approval) missing.push('County approval')
      if (!data?.lands_ministry_approval) missing.push('Lands Ministry approval')
      if (!data?.environmental_clearance) missing.push('Environmental clearance')

      return { complete: missing.length === 0, missing }
    } catch (error) {
      console.error('Error checking subdivision approvals:', error)
      return { complete: false, missing: ['Approval verification failed'] }
    }
  }

  /**
   * Check plot creation completion
   */
  private static async checkPlotCreation(propertyId: string): Promise<{complete: boolean, missing: string[]}> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/subdivision/plots`)
      if (!response.ok) throw new Error('Failed to fetch plot creation status')

      const { data } = await response.json()
      const missing: string[] = []

      if (!data?.all_plots_created) missing.push('All plots creation')
      if (!data?.title_deeds_issued) missing.push('Title deeds issuance')
      if (!data?.plot_numbers_assigned) missing.push('Plot numbers assignment')

      return { complete: missing.length === 0, missing }
    } catch (error) {
      console.error('Error checking plot creation:', error)
      return { complete: false, missing: ['Plot creation verification failed'] }
    }
  }

  // ==================== HANDOVER COMPLETION CHECKS ====================

  /**
   * Check handover document completion
   */
  private static async checkHandoverDocuments(propertyId: string): Promise<{complete: boolean, missing: string[]}> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/documents/handover/status`)
      if (!response.ok) throw new Error('Failed to fetch handover documents')

      const { data } = await response.json()
      const missing: string[] = []

      // Required handover documents
      const requiredDocs = [
        'property_inspection_report', 'defects_list', 'warranty_documents',
        'user_manuals', 'keys_inventory', 'handover_certificate'
      ]

      requiredDocs.forEach(docKey => {
        const doc = data?.find((d: any) => d.document_type === docKey)
        if (!doc || doc.status !== 'APPROVED') {
          missing.push(`${docKey.replace('_', ' ').toUpperCase()} document`)
        }
      })

      return { complete: missing.length === 0, missing }
    } catch (error) {
      console.error('Error checking handover documents:', error)
      return { complete: false, missing: ['Handover document verification failed'] }
    }
  }

  /**
   * Check property inspection completion
   */
  private static async checkPropertyInspection(propertyId: string): Promise<{complete: boolean, missing: string[]}> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/inspections/status`)
      if (!response.ok) throw new Error('Failed to fetch inspection status')

      const { data } = await response.json()
      const missing: string[] = []

      if (!data?.pre_handover_inspection_completed) missing.push('Pre-handover inspection')
      if (!data?.defects_resolved) missing.push('All defects resolution')
      if (!data?.final_inspection_approved) missing.push('Final inspection approval')
      if (!data?.buyer_walkthrough_completed) missing.push('Buyer walkthrough')

      return { complete: missing.length === 0, missing }
    } catch (error) {
      console.error('Error checking property inspection:', error)
      return { complete: false, missing: ['Inspection verification failed'] }
    }
  }

  /**
   * Check final payments completion
   */
  private static async checkFinalPayments(propertyId: string): Promise<{complete: boolean, missing: string[]}> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/payments/final-status`)
      if (!response.ok) throw new Error('Failed to fetch payment status')

      const { data } = await response.json()
      const missing: string[] = []

      if (!data?.final_payment_received) missing.push('Final payment')
      if (!data?.legal_fees_paid) missing.push('Legal fees payment')
      if (!data?.registration_fees_paid) missing.push('Registration fees payment')
      if (!data?.outstanding_balances_cleared) missing.push('Outstanding balances clearance')

      return { complete: missing.length === 0, missing }
    } catch (error) {
      console.error('Error checking final payments:', error)
      return { complete: false, missing: ['Payment verification failed'] }
    }
  }

  /**
   * Check handover sign-offs and key delivery
   */
  private static async checkHandoverSignoffs(propertyId: string): Promise<{complete: boolean, missing: string[]}> {
    try {
      const response = await fetch(`/api/properties/${propertyId}/handover/signoffs`)
      if (!response.ok) throw new Error('Failed to fetch handover sign-offs')

      const { data } = await response.json()
      const missing: string[] = []

      if (!data?.buyer_acceptance_signed) missing.push('Buyer acceptance signature')
      if (!data?.seller_handover_signed) missing.push('Seller handover signature')
      if (!data?.keys_delivered) missing.push('Keys delivery confirmation')
      if (!data?.possession_transferred) missing.push('Possession transfer confirmation')
      if (!data?.warranty_activated) missing.push('Warranty activation')

      return { complete: missing.length === 0, missing }
    } catch (error) {
      console.error('Error checking handover sign-offs:', error)
      return { complete: false, missing: ['Sign-off verification failed'] }
    }
  }
}

// ==================== EVENT-DRIVEN AUTO-COMPLETION SYSTEM ====================

/**
 * Event types that can trigger auto-completion checks
 */
export enum CompletionTriggerEvent {
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_APPROVED = 'document_approved',
  PAYMENT_COMPLETED = 'payment_completed',
  INSPECTION_COMPLETED = 'inspection_completed',
  APPROVAL_RECEIVED = 'approval_received',
  SURVEY_COMPLETED = 'survey_completed',
  PLOT_CREATED = 'plot_created',
  KEYS_DELIVERED = 'keys_delivered',
  SIGNOFF_COMPLETED = 'signoff_completed',
  MANUAL_CHECK = 'manual_check'
}

/**
 * Event-driven auto-completion trigger
 * This is called when specific events occur that might complete a process
 */
export async function triggerAutoCompletionCheck(
  propertyId: string,
  triggerEvent: CompletionTriggerEvent,
  eventData?: any
): Promise<void> {
  console.log(`🔄 Auto-completion check triggered for property ${propertyId} by event: ${triggerEvent}`)

  try {
    // Only check processes that are currently active
    const propertyStatus = await getPropertyProcessStatus(propertyId)

    const results: any[] = []

    // Check subdivision completion if subdivision is active
    if (propertyStatus.subdivision_status === 'SUB_DIVISION_STARTED') {
      const subdivisionResult = await ProcessAutoCompletionService.attemptSubdivisionCompletion(propertyId)
      results.push(subdivisionResult)

      if (subdivisionResult.completed) {
        console.log(`✅ Subdivision auto-completed for property ${propertyId}`)
        dispatchCompletionEvent(propertyId, 'subdivision', subdivisionResult)
      }
    }

    // Check handover completion if handover is active
    if (propertyStatus.handover_status === 'IN_PROGRESS') {
      const handoverResult = await ProcessAutoCompletionService.attemptHandoverCompletion(propertyId)
      results.push(handoverResult)

      if (handoverResult.completed) {
        console.log(`✅ Handover auto-completed for property ${propertyId}`)
        dispatchCompletionEvent(propertyId, 'handover', handoverResult)
      }
    }

    // Log completion check results
    console.log(`📊 Auto-completion check results for property ${propertyId}:`, results)

  } catch (error) {
    console.error('❌ Error in auto-completion check:', error)
  }
}

/**
 * Get current property process status
 */
async function getPropertyProcessStatus(propertyId: string): Promise<{
  subdivision_status: string
  handover_status: string
}> {
  try {
    const response = await fetch(`/api/properties/${propertyId}/status`)
    if (!response.ok) throw new Error('Failed to fetch property status')

    const { data } = await response.json()
    return {
      subdivision_status: data.subdivision_status || 'NOT_STARTED',
      handover_status: data.handover_status || 'PENDING'
    }
  } catch (error) {
    console.error('Error fetching property status:', error)
    return {
      subdivision_status: 'NOT_STARTED',
      handover_status: 'PENDING'
    }
  }
}

/**
 * Dispatch completion event for UI updates
 */
function dispatchCompletionEvent(
  propertyId: string,
  processType: 'subdivision' | 'handover',
  result: any
): void {
  // Browser environment
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('processAutoCompleted', {
      detail: {
        propertyId,
        processType,
        message: result.message,
        warnings: result.warnings,
        timestamp: new Date().toISOString()
      }
    }))
  }

  // Also dispatch specific process completion events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`${processType}Completed`, {
      detail: {
        propertyId,
        result,
        timestamp: new Date().toISOString()
      }
    }))
  }
}

// ==================== EVENT TRIGGER HELPERS ====================

/**
 * Trigger auto-completion when a document is uploaded/approved
 */
export async function onDocumentEvent(
  propertyId: string,
  documentType: string,
  status: 'uploaded' | 'approved'
): Promise<void> {
  const event = status === 'approved' ?
    CompletionTriggerEvent.DOCUMENT_APPROVED :
    CompletionTriggerEvent.DOCUMENT_UPLOADED

  await triggerAutoCompletionCheck(propertyId, event, { documentType, status })
}

/**
 * Trigger auto-completion when a payment is completed
 */
export async function onPaymentCompleted(
  propertyId: string,
  paymentType: string,
  amount: number
): Promise<void> {
  await triggerAutoCompletionCheck(propertyId, CompletionTriggerEvent.PAYMENT_COMPLETED, {
    paymentType,
    amount,
    timestamp: new Date().toISOString()
  })
}

/**
 * Trigger auto-completion when an inspection is completed
 */
export async function onInspectionCompleted(
  propertyId: string,
  inspectionType: string,
  result: 'passed' | 'failed' | 'conditional'
): Promise<void> {
  await triggerAutoCompletionCheck(propertyId, CompletionTriggerEvent.INSPECTION_COMPLETED, {
    inspectionType,
    result,
    timestamp: new Date().toISOString()
  })
}

/**
 * Trigger auto-completion when an approval is received
 */
export async function onApprovalReceived(
  propertyId: string,
  approvalType: string,
  authority: string
): Promise<void> {
  await triggerAutoCompletionCheck(propertyId, CompletionTriggerEvent.APPROVAL_RECEIVED, {
    approvalType,
    authority,
    timestamp: new Date().toISOString()
  })
}

/**
 * Trigger auto-completion when survey is completed
 */
export async function onSurveyCompleted(
  propertyId: string,
  surveyType: string
): Promise<void> {
  await triggerAutoCompletionCheck(propertyId, CompletionTriggerEvent.SURVEY_COMPLETED, {
    surveyType,
    timestamp: new Date().toISOString()
  })
}

/**
 * Trigger auto-completion when keys are delivered
 */
export async function onKeysDelivered(
  propertyId: string,
  recipientName: string
): Promise<void> {
  await triggerAutoCompletionCheck(propertyId, CompletionTriggerEvent.KEYS_DELIVERED, {
    recipientName,
    timestamp: new Date().toISOString()
  })
}

/**
 * Trigger auto-completion when a sign-off is completed
 */
export async function onSignoffCompleted(
  propertyId: string,
  signoffType: string,
  signerName: string
): Promise<void> {
  await triggerAutoCompletionCheck(propertyId, CompletionTriggerEvent.SIGNOFF_COMPLETED, {
    signoffType,
    signerName,
    timestamp: new Date().toISOString()
  })
}
