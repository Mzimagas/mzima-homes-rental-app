import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '../../../../lib/supabase-server'
import { z } from 'zod'
import { 
  initializeHandoverPipelineStages, 
  getCurrentHandoverStage, 
  calculateHandoverProgress 
} from '../../../../components/properties/utils/handover-pipeline.utils'

const transitionSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  clientId: z.string().uuid('Invalid client ID'),
  triggerEvent: z.enum(['deposit_paid', 'agreement_signed', 'admin_manual']),
  interestId: z.string().uuid('Invalid interest ID').optional(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = transitionSchema.parse(body)

    console.log('🔄 Auto-Transition API - Request:', {
      propertyId: validatedData.propertyId,
      clientId: validatedData.clientId,
      triggerEvent: validatedData.triggerEvent,
      userId: user.id,
    })

    // 1. Verify property exists and is eligible for handover transition
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', validatedData.propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Check if property is already in handover process
    if (property.handover_status === 'IN_PROGRESS' || property.handover_status === 'COMPLETED') {
      // Check if handover pipeline record already exists
      const { data: existingHandover } = await supabase
        .from('handover_pipeline')
        .select('id')
        .eq('property_id', validatedData.propertyId)
        .single()

      if (existingHandover) {
        return NextResponse.json(
          { error: 'Property is already in handover process with existing pipeline record' },
          { status: 400 }
        )
      }
      // If no pipeline record exists but status is IN_PROGRESS, we can create one
    }

    // 2. Verify client exists and has valid interest in property
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', validatedData.clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // 3. Get client interest record (preferably CONVERTED status)
    let interestQuery = supabase
      .from('client_property_interests')
      .select('*')
      .eq('property_id', validatedData.propertyId)
      .eq('client_id', validatedData.clientId)

    if (validatedData.interestId) {
      interestQuery = interestQuery.eq('id', validatedData.interestId)
    }

    const { data: interests, error: interestError } = await interestQuery
      .order('updated_at', { ascending: false })

    if (interestError || !interests || interests.length === 0) {
      return NextResponse.json({ error: 'No client interest found for this property' }, { status: 404 })
    }

    // Prefer CONVERTED status, but allow other statuses for manual transitions
    const interest = interests.find(i => i.status === 'CONVERTED') || interests[0]

    // 4. Determine handover stage and progress based on trigger event and interest data
    let currentStage = 'Initial Handover Preparation'
    let overallProgress = 10

    switch (validatedData.triggerEvent) {
      case 'deposit_paid':
        if (interest.deposit_paid_at) {
          currentStage = 'Deposit Collection'
          overallProgress = 40
        }
        break
      case 'agreement_signed':
        if (interest.agreement_signed_at) {
          currentStage = 'Agreement Execution'
          overallProgress = 60
        } else if (interest.deposit_paid_at) {
          currentStage = 'Deposit Collection'
          overallProgress = 40
        }
        break
      case 'admin_manual':
        // Use current interest status to determine stage
        if (interest.agreement_signed_at) {
          currentStage = 'Agreement Execution'
          overallProgress = 60
        } else if (interest.deposit_paid_at) {
          currentStage = 'Deposit Collection'
          overallProgress = 40
        }
        break
    }

    // 5. Initialize handover pipeline stages
    const initialStages = initializeHandoverPipelineStages()
    const currentStageNum = getCurrentHandoverStage(initialStages)

    // Start transaction-like operations
    try {
      // 6. Update property handover status to IN_PROGRESS (if not already)
      if (property.handover_status !== 'IN_PROGRESS') {
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
      }

      // 7. Create handover pipeline record
      const handoverData = {
        property_id: validatedData.propertyId,
        property_name: property.name,
        property_address: property.physical_address || 'Address not available',
        property_type: property.property_type,
        client_id: validatedData.clientId,
        buyer_name: client.full_name,
        buyer_contact: client.phone || '',
        buyer_email: client.email || '',
        buyer_address: '', // Not available in current client schema
        pipeline_stages: initialStages,
        current_stage: currentStageNum,
        overall_progress: overallProgress,
        handover_status: 'IN_PROGRESS',
        asking_price_kes: property.asking_price_kes || property.sale_price_kes || 0,
        negotiated_price_kes: interest.payment_data?.propertyPrice || null,
        deposit_received_kes: interest.deposit_amount_kes || null,
        target_completion_date: null, // Can be set later
        legal_representative: 'To be assigned',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Additional tracking fields
        client_interest_id: interest.id,
        transition_trigger: validatedData.triggerEvent,
        marketplace_source: true,
        // Client portal specific data
        reservation_date: interest.reservation_date,
        deposit_paid_at: interest.deposit_paid_at,
        agreement_signed_at: interest.agreement_signed_at,
        payment_reference: interest.payment_reference,
        payment_verified_at: interest.payment_verified_at,
      }

      const { data: handover, error: handoverError } = await supabase
        .from('handover_pipeline')
        .insert([handoverData])
        .select()
        .single()

      if (handoverError) {
        // Rollback property status if it was changed
        if (property.handover_status !== 'IN_PROGRESS') {
          await supabase
            .from('properties')
            .update({ handover_status: property.handover_status })
            .eq('id', validatedData.propertyId)
        }
        throw new Error(`Failed to create handover pipeline: ${handoverError.message}`)
      }

      // 8. Update client interest status to IN_HANDOVER
      const { error: interestUpdateError } = await supabase
        .from('client_property_interests')
        .update({
          status: 'IN_HANDOVER',
          updated_at: new Date().toISOString(),
          notes: `${interest.notes || ''}\n\nTransitioned to handover on ${new Date().toISOString()} via ${validatedData.triggerEvent}`.trim()
        })
        .eq('id', interest.id)

      if (interestUpdateError) {
        console.warn('Failed to update interest status:', interestUpdateError)
        // Don't fail the entire operation for this
      }

      // 9. Create notification for admin
      await createAdminNotification(supabase, validatedData.clientId, validatedData.propertyId, validatedData.triggerEvent)

      console.log('✅ Auto-Transition API - Success:', {
        handoverId: handover.id,
        propertyId: validatedData.propertyId,
        clientId: validatedData.clientId,
        triggerEvent: validatedData.triggerEvent,
        currentStage,
        overallProgress,
      })

      return NextResponse.json({
        success: true,
        handover,
        message: `Property successfully transitioned to handover pipeline via ${validatedData.triggerEvent}`,
        details: {
          currentStage,
          overallProgress,
          triggerEvent: validatedData.triggerEvent,
        }
      })

    } catch (transactionError) {
      console.error('Auto-transition transaction error:', transactionError)
      return NextResponse.json(
        { error: transactionError instanceof Error ? transactionError.message : 'Transaction failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Auto-Transition API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to create admin notification
async function createAdminNotification(
  supabase: any,
  clientId: string,
  propertyId: string,
  triggerEvent: string
) {
  try {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', clientId)
      .single()

    const { data: property } = await supabase
      .from('properties')
      .select('name')
      .eq('id', propertyId)
      .single()

    const clientName = client?.full_name || 'Unknown Client'
    const propertyName = property?.name || 'Unknown Property'

    const notificationData = {
      type: 'HANDOVER_TRANSITION',
      title: 'Property Transitioned to Handover',
      message: `${clientName} - ${propertyName} has been automatically transitioned to handover pipeline via ${triggerEvent}`,
      data: {
        client_id: clientId,
        property_id: propertyId,
        trigger_event: triggerEvent,
        client_name: clientName,
        property_name: propertyName,
      },
      created_at: new Date().toISOString(),
      is_read: false,
      priority: 'HIGH',
    }

    const { error } = await supabase.from('admin_notifications').insert([notificationData])

    if (error) {
      console.warn('Failed to create admin notification:', error)
    }
  } catch (error) {
    console.warn('Error creating admin notification:', error)
  }
}
