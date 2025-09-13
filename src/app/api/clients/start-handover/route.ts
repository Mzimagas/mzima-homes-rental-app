import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { z } from 'zod'
import {
  initializeHandoverPipelineStages,
  calculateHandoverProgress,
  getCurrentHandoverStage,
} from '../../../../components/properties/utils/property-management.utils'

// Validation schema for client start handover request
const startHandoverSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  buyerName: z.string().min(1, 'Buyer name is required'),
  buyerContact: z.string().optional(),
  buyerEmail: z.string().email('Enter a valid email').optional(),
  buyerAddress: z.string().optional(),
  targetCompletionDate: z.string().optional(),
  preferredLegalRep: z.enum(['inhouse', 'external', 'undecided']),
  externalLegalRepName: z.string().optional(),
  propertyConditionNotes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Client Start Handover API - Processing request')

    const supabase = await createServerSupabaseClient()

    // Get current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = startHandoverSchema.parse(body)

    console.log('📝 Validated data:', {
      propertyId: validatedData.propertyId,
      buyerName: validatedData.buyerName,
      preferredLegalRep: validatedData.preferredLegalRep,
    })

    // Get client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, email, phone, address')
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      console.error('Client lookup error:', clientError)
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Verify property exists and client has interest
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select(
        `
        id,
        property_id,
        status,
        properties!inner (
          id,
          name,
          handover_status,
          asking_price_kes
        )
      `
      )
      .eq('client_id', client.id)
      .eq('property_id', validatedData.propertyId)
      .eq('status', 'ACTIVE')
      .single()

    if (interestError || !interest) {
      console.error('Interest lookup error:', interestError)
      return NextResponse.json(
        { error: 'Property interest not found or inactive' },
        { status: 404 }
      )
    }

    const property = interest.properties

    // Verify property is in correct state for handover start
    if (property.handover_status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Property is not available for handover start' },
        { status: 400 }
      )
    }

    // Start transaction-like operations
    try {
      // 1. Update property handover status to IN_PROGRESS
      const { error: propertyUpdateError } = await supabase
        .from('properties')
        .update({
          handover_status: 'IN_PROGRESS',
          updated_at: new Date().toISOString(),
        })
        .eq('id', validatedData.propertyId)

      if (propertyUpdateError) {
        throw new Error(`Failed to update property status: ${propertyUpdateError.message}`)
      }

      // 2. Initialize handover pipeline stages
      const initialStages = initializeHandoverPipelineStages()
      const currentStageNum = getCurrentHandoverStage(initialStages)
      const overallProgress = calculateHandoverProgress(initialStages)

      // 3. Create handover pipeline record
      const handoverData = {
        property_id: validatedData.propertyId,
        buyer_name: validatedData.buyerName,
        buyer_contact: validatedData.buyerContact || client.phone || '',
        buyer_email: validatedData.buyerEmail || client.email || '',
        buyer_address: validatedData.buyerAddress || client.address || '',
        target_completion_date: validatedData.targetCompletionDate || null,
        legal_representative:
          validatedData.preferredLegalRep === 'inhouse'
            ? 'In-house Legal Team'
            : validatedData.preferredLegalRep === 'external'
              ? validatedData.externalLegalRepName || 'External Legal Representative'
              : 'To be decided',
        property_condition_notes: validatedData.propertyConditionNotes || '',
        asking_price_kes: property.asking_price_kes,
        handover_status: 'IN_PROGRESS',
        current_stage: currentStageNum,
        overall_progress: overallProgress,
        pipeline_stages: initialStages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: handover, error: handoverError } = await supabase
        .from('handover_pipeline')
        .insert(handoverData)
        .select()
        .single()

      if (handoverError) {
        // Rollback property status change
        await supabase
          .from('properties')
          .update({ handover_status: 'PENDING' })
          .eq('id', validatedData.propertyId)

        throw new Error(`Failed to create handover pipeline: ${handoverError.message}`)
      }

      // 4. Update client interest status to reflect handover start
      const { error: interestUpdateError } = await supabase
        .from('client_property_interests')
        .update({
          status: 'IN_HANDOVER',
          updated_at: new Date().toISOString(),
        })
        .eq('id', interest.id)

      if (interestUpdateError) {
        console.warn('Failed to update interest status:', interestUpdateError)
        // Don't fail the entire operation for this
      }

      console.log('✅ Client Start Handover API - Success:', {
        handoverId: handover.id,
        propertyId: validatedData.propertyId,
        clientId: client.id,
      })

      return NextResponse.json({
        success: true,
        message: 'Handover process started successfully',
        handover: {
          id: handover.id,
          property_id: validatedData.propertyId,
          current_stage: currentStageNum,
          overall_progress: overallProgress,
        },
      })
    } catch (transactionError) {
      console.error('Transaction error:', transactionError)
      return NextResponse.json(
        { error: `Failed to start handover: ${transactionError.message}` },
        { status: 500 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Unexpected error in client start handover API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
