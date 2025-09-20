import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Validation schema for handover marketplace status updates
const handoverMarketplaceStatusSchema = z.object({
  marketplace_status: z.enum(['NOT_LISTED', 'AVAILABLE', 'RESERVED', 'UNDER_CONTRACT', 'SOLD']),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const handoverId = params.id

    // Validate handover ID
    if (!handoverId || typeof handoverId !== 'string') {
      return NextResponse.json({ error: 'Invalid handover ID' }, { status: 400 })
    }

    // Get request body
    const body = await request.json()

    // Validate request data
    const validationResult = handoverMarketplaceStatusSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { marketplace_status } = validationResult.data

    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient()

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // TODO: Add admin role verification
    // For now, allow any authenticated user to update marketplace status

    // Get current handover to validate the update
    const { data: currentHandover, error: fetchError } = await supabase
      .from('handover_pipeline')
      .select('id, property_name, marketplace_status, handover_status')
      .eq('id', handoverId)
      .single()

    if (fetchError || !currentHandover) {
      return NextResponse.json({ error: 'Handover record not found' }, { status: 404 })
    }

    // Prepare update data with automatic stage completion
    const updateData: any = {
      marketplace_status,
      updated_at: new Date().toISOString(),
    }

    // Set timestamps based on status
    if (marketplace_status === 'AVAILABLE' && !currentHandover.marketplace_listed_at) {
      updateData.marketplace_listed_at = new Date().toISOString()
    }

    if (marketplace_status === 'RESERVED') {
      updateData.marketplace_reserved_at = new Date().toISOString()
    }

    if (marketplace_status === 'SOLD') {
      updateData.marketplace_sold_at = new Date().toISOString()
    }

    // The trigger function will handle automatic stage completion
    // Update the handover record
    const { data: updatedHandover, error: updateError } = await supabase
      .from('handover_pipeline')
      .update(updateData)
      .eq('id', handoverId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating handover marketplace status:', updateError)
      return NextResponse.json({ error: 'Failed to update marketplace status' }, { status: 500 })
    }

    // Log the status change
    console.log(`🏪 Handover marketplace status updated for ${handoverId}:`, {
      property_name: currentHandover.property_name,
      old_status: currentHandover.marketplace_status,
      new_status: marketplace_status,
      updated_by: user.email,
    })

    // Auto-completion messages based on status
    const autoCompletionMessages = []
    if (marketplace_status === 'RESERVED') {
      autoCompletionMessages.push('Property reserved - client has expressed interest')
    }
    if (marketplace_status === 'UNDER_CONTRACT') {
      autoCompletionMessages.push('Auto-completed: Handover Agreement stage')
    }
    if (marketplace_status === 'SOLD') {
      autoCompletionMessages.push('Auto-completed: Final Payment and Title Transfer stages')
      autoCompletionMessages.push('Handover status updated to COMPLETED')
    }

    // Return success response
    return NextResponse.json({
      success: true,
      handover: updatedHandover,
      message: `Marketplace status updated to ${marketplace_status}`,
      autoCompletions: autoCompletionMessages,
    })
  } catch (error) {
    console.error('Unexpected error in handover marketplace status update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
