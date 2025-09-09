import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { z } from 'zod'

const transitionSchema = z.object({
  interestId: z.string().uuid('Invalid interest ID'),
  propertyId: z.string().uuid('Invalid property ID'),
  clientId: z.string().uuid('Invalid client ID')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = transitionSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // TODO: Add admin role verification here

    // Verify the property and client exist
    const [propertyResult, clientResult] = await Promise.all([
      supabase.from('properties').select('id, name, handover_status').eq('id', validatedData.propertyId).single(),
      supabase.from('enhanced_users').select('id, full_name').eq('id', validatedData.clientId).single()
    ])

    if (propertyResult.error || !propertyResult.data) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    if (clientResult.error || !clientResult.data) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const property = propertyResult.data
    const client = clientResult.data

    // Check if property is already in handover
    if (property.handover_status === 'IN_PROGRESS' || property.handover_status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Property is already in handover process' },
        { status: 400 }
      )
    }

    // Start transaction-like operations
    try {
      // 1. Update property handover status
      const { error: propertyUpdateError } = await supabase
        .from('properties')
        .update({
          handover_status: 'IN_PROGRESS',
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedData.propertyId)

      if (propertyUpdateError) {
        throw new Error(`Failed to update property status: ${propertyUpdateError.message}`)
      }

      // 2. Create handover pipeline record
      const handoverData = {
        property_id: validatedData.propertyId,
        client_id: validatedData.clientId,
        buyer_name: client.full_name,
        asking_price_kes: property.asking_price_kes || 0,
        handover_status: 'IN_PROGRESS',
        current_stage: 'Initial Handover Preparation',
        overall_progress: 0,
        pipeline_stages: initializeHandoverStages(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: handover, error: handoverError } = await supabase
        .from('handover_pipeline')
        .insert([handoverData])
        .select()
        .single()

      if (handoverError) {
        // Rollback property status
        await supabase
          .from('properties')
          .update({ handover_status: 'NOT_STARTED' })
          .eq('id', validatedData.propertyId)
        
        throw new Error(`Failed to create handover pipeline: ${handoverError.message}`)
      }

      // 3. Update client interest status
      const { error: interestUpdateError } = await supabase
        .from('client_property_interests')
        .update({
          status: 'IN_HANDOVER',
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedData.interestId)

      if (interestUpdateError) {
        console.warn('Failed to update interest status:', interestUpdateError)
        // Don't fail the entire operation for this
      }

      // 4. Create notification for client
      await createClientNotification(supabase, validatedData.clientId, validatedData.propertyId)

      return NextResponse.json({
        success: true,
        handover,
        message: 'Property successfully transitioned to handover pipeline'
      })

    } catch (transactionError) {
      console.error('Transaction error:', transactionError)
      return NextResponse.json(
        { error: transactionError instanceof Error ? transactionError.message : 'Transaction failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Transition to handover error:', error)
    
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

function initializeHandoverStages() {
  return [
    {
      id: 1,
      name: 'Initial Handover Preparation',
      description: 'Property preparation and buyer identification',
      status: 'In Progress',
      completed: false,
      started_at: new Date().toISOString(),
      notes: 'Handover process initiated'
    },
    {
      id: 2,
      name: 'Property Documentation & Survey',
      description: 'Document preparation and property survey verification',
      status: 'Not Started',
      completed: false
    },
    {
      id: 3,
      name: 'Financial Verification',
      description: 'Buyer financial verification and payment arrangement',
      status: 'Not Started',
      completed: false
    },
    {
      id: 4,
      name: 'Legal Documentation',
      description: 'Legal document preparation and review',
      status: 'Not Started',
      completed: false
    },
    {
      id: 5,
      name: 'Final Handover',
      description: 'Property handover and key transfer',
      status: 'Not Started',
      completed: false
    }
  ]
}

async function createClientNotification(
  supabase: any,
  clientId: string,
  propertyId: string
) {
  try {
    const { data: property } = await supabase
      .from('properties')
      .select('name')
      .eq('id', propertyId)
      .single()

    const notificationData = {
      client_id: clientId,
      type: 'HANDOVER_STARTED',
      title: 'Handover Process Started',
      message: `The handover process for ${property?.name || 'your property'} has been initiated. You can now track progress in your dashboard.`,
      data: {
        property_id: propertyId,
        property_name: property?.name
      },
      created_at: new Date().toISOString(),
      is_read: false
    }

    const { error } = await supabase
      .from('client_notifications')
      .insert([notificationData])

    if (error) {
      console.warn('Failed to create client notification:', error)
    }
  } catch (error) {
    console.warn('Error creating client notification:', error)
  }
}
