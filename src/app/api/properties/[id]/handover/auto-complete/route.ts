import { NextRequest, NextResponse } from 'next/server'
import { ProcessCompletionService } from '../../../../../../services/processCompletionService'

/**
 * Check and potentially auto-complete handover process
 * This endpoint checks if all requirements are met and automatically completes the handover
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const propertyId = params.id

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Check if handover can be completed
    const completionCheck = await ProcessCompletionService.checkHandoverCompletion(propertyId)

    if (!completionCheck.canComplete) {
      return NextResponse.json({
        success: false,
        canComplete: false,
        reason: completionCheck.reason,
        progress: completionCheck.progress,
        requirements: completionCheck.requirements,
        message: `Handover cannot be auto-completed: ${completionCheck.reason}`
      })
    }

    // Auto-complete the handover
    const result = await ProcessCompletionService.autoCompleteHandover(propertyId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      completed: true,
      message: result.message,
      new_state: {
        handover_status: 'COMPLETED',
        is_handover_completed: true,
        is_handover_active: false,
        can_start_subdivision: false,
        documents_read_only: true,
        financials_read_only: true,
      },
      warnings: [
        'Property is now locked for document and financial editing',
      ]
    })
  } catch (error) {
    console.error('Handover auto-completion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get handover completion status without triggering completion
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const propertyId = params.id

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Check completion status
    const completionCheck = await ProcessCompletionService.checkHandoverCompletion(propertyId)

    return NextResponse.json({
      canComplete: completionCheck.canComplete,
      reason: completionCheck.reason,
      progress: completionCheck.progress,
      requirements: completionCheck.requirements,
      ready_for_completion: completionCheck.canComplete
    })
  } catch (error) {
    console.error('Handover completion check API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
