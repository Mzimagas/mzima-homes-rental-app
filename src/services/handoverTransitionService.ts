/**
 * Handover Transition Service
 * Handles automatic transitions from marketplace to handover pipeline
 */

export type TransitionTrigger = 'deposit_paid' | 'agreement_signed' | 'admin_manual'

export interface TransitionRequest {
  propertyId: string
  clientId: string
  triggerEvent: TransitionTrigger
  interestId?: string
  notes?: string
}

export interface TransitionResult {
  success: boolean
  handoverId?: string
  currentStage?: string
  overallProgress?: number
  error?: string
  message?: string
}

/**
 * Auto-transition a property to handover pipeline
 * This is a client-side service that calls the API endpoint
 */
export async function autoTransitionToHandover(
  request: TransitionRequest,
  authHeaders?: { Authorization?: string; Cookie?: string }
): Promise<TransitionResult> {
  try {
    console.log('🔄 Initiating auto-transition to handover:', {
      propertyId: request.propertyId,
      clientId: request.clientId,
      triggerEvent: request.triggerEvent,
    })

    const response = await fetch('/api/clients/transition-to-handover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeaders?.Authorization && { 'Authorization': authHeaders.Authorization }),
        ...(authHeaders?.Cookie && { 'Cookie': authHeaders.Cookie }),
      },
      body: JSON.stringify(request)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Auto-transition failed:', data)
      return {
        success: false,
        error: data.error || 'Transition failed',
        message: data.message
      }
    }

    console.log('✅ Auto-transition successful:', data)
    return {
      success: true,
      handoverId: data.handover?.id,
      currentStage: data.details?.currentStage,
      overallProgress: data.details?.overallProgress,
      message: data.message
    }

  } catch (error) {
    console.error('❌ Auto-transition error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to transition to handover pipeline'
    }
  }
}

/**
 * Trigger auto-transition when deposit is paid
 */
export async function onDepositPaid(
  propertyId: string,
  clientId: string,
  interestId: string,
  authHeaders?: { Authorization?: string; Cookie?: string }
): Promise<TransitionResult> {
  return autoTransitionToHandover({
    propertyId,
    clientId,
    triggerEvent: 'deposit_paid',
    interestId,
    notes: 'Auto-transition triggered by deposit payment'
  }, authHeaders)
}

/**
 * Trigger auto-transition when agreement is signed
 */
export async function onAgreementSigned(
  propertyId: string,
  clientId: string,
  interestId: string,
  authHeaders?: { Authorization?: string; Cookie?: string }
): Promise<TransitionResult> {
  return autoTransitionToHandover({
    propertyId,
    clientId,
    triggerEvent: 'agreement_signed',
    interestId,
    notes: 'Auto-transition triggered by agreement signing'
  }, authHeaders)
}

/**
 * Trigger manual admin transition
 */
export async function onAdminManualTransition(
  propertyId: string,
  clientId: string,
  interestId?: string,
  notes?: string,
  authHeaders?: { Authorization?: string; Cookie?: string }
): Promise<TransitionResult> {
  return autoTransitionToHandover({
    propertyId,
    clientId,
    triggerEvent: 'admin_manual',
    interestId,
    notes: notes || 'Manual admin transition to handover pipeline'
  }, authHeaders)
}

/**
 * Check if a property is eligible for auto-transition
 */
export async function checkTransitionEligibility(
  propertyId: string,
  clientId: string
): Promise<{
  eligible: boolean
  reason?: string
  suggestedTrigger?: TransitionTrigger
}> {
  try {
    // This could be expanded to check various conditions
    // For now, we'll do basic checks on the client side
    
    // Check if property already has handover pipeline record
    const response = await fetch(`/api/properties/${propertyId}/handover-status`)
    
    if (response.ok) {
      const data = await response.json()
      
      if (data.hasHandoverPipeline) {
        return {
          eligible: false,
          reason: 'Property already has handover pipeline record'
        }
      }
      
      if (data.handoverStatus === 'COMPLETED') {
        return {
          eligible: false,
          reason: 'Property handover is already completed'
        }
      }
      
      // Check client interest status to suggest appropriate trigger
      if (data.clientInterest?.agreement_signed_at) {
        return {
          eligible: true,
          suggestedTrigger: 'agreement_signed'
        }
      } else if (data.clientInterest?.deposit_paid_at) {
        return {
          eligible: true,
          suggestedTrigger: 'deposit_paid'
        }
      } else {
        return {
          eligible: true,
          suggestedTrigger: 'admin_manual'
        }
      }
    }
    
    return {
      eligible: true,
      suggestedTrigger: 'admin_manual'
    }
    
  } catch (error) {
    console.error('Error checking transition eligibility:', error)
    return {
      eligible: false,
      reason: 'Unable to check eligibility'
    }
  }
}

/**
 * Get transition history for a property
 */
export async function getTransitionHistory(propertyId: string): Promise<{
  transitions: Array<{
    id: string
    triggerEvent: TransitionTrigger
    createdAt: string
    clientName: string
    currentStage: string
    progress: number
  }>
  error?: string
}> {
  try {
    const response = await fetch(`/api/properties/${propertyId}/transition-history`)
    
    if (!response.ok) {
      const error = await response.json()
      return {
        transitions: [],
        error: error.message || 'Failed to fetch transition history'
      }
    }
    
    const data = await response.json()
    return {
      transitions: data.transitions || []
    }
    
  } catch (error) {
    console.error('Error fetching transition history:', error)
    return {
      transitions: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Utility to extract auth headers from a request
 */
export function extractAuthHeaders(request: Request): { Authorization?: string; Cookie?: string } {
  return {
    Authorization: request.headers.get('Authorization') || undefined,
    Cookie: request.headers.get('Cookie') || undefined,
  }
}
