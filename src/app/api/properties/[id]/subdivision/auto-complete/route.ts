import { NextRequest, NextResponse } from 'next/server'
import { ProcessCompletionService } from '../../../../../../services/processCompletionService'

/**
 * Check and potentially auto-complete subdivision process
 * This endpoint checks if all requirements are met and automatically completes the subdivision
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const propertyId = params.id

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Check if subdivision can be completed
    const completionCheck = await ProcessCompletionService.checkSubdivisionCompletion(propertyId)

    if (!completionCheck.canComplete) {
      return NextResponse.json({
        success: false,
        canComplete: false,
        reason: completionCheck.reason,
        progress: completionCheck.progress,
        requirements: completionCheck.requirements,
        message: `Subdivision cannot be auto-completed: ${completionCheck.reason}`
      })
    }

    // Auto-complete the subdivision
    const result = await ProcessCompletionService.autoCompleteSubdivision(propertyId)

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
        subdivision_status: 'SUBDIVIDED',
        is_subdivision_completed: true,
        is_subdivision_active: false,
        can_start_handover: false,
        documents_read_only: true,
        financials_read_only: true,
      },
      warnings: [
        'Property is now locked for document and financial editing',
        'Handover process is now permanently disabled',
      ]
    })
  } catch (error) {
    console.error('Subdivision auto-completion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get subdivision completion status without triggering completion
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const propertyId = params.id

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Check completion status
    const completionCheck = await ProcessCompletionService.checkSubdivisionCompletion(propertyId)

    return NextResponse.json({
      canComplete: completionCheck.canComplete,
      reason: completionCheck.reason,
      progress: completionCheck.progress,
      requirements: completionCheck.requirements,
      ready_for_completion: completionCheck.canComplete
    })
  } catch (error) {
    console.error('Subdivision completion check API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
