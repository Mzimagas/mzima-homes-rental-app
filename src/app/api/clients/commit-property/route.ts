import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { z } from 'zod'

// Validation schema for property commitment
const commitPropertySchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
})

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Client Commit Property API - Processing request')

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
    const validatedData = commitPropertySchema.parse(body)

    console.log('📝 Validated data:', {
      propertyId: validatedData.propertyId,
      userId: user.id,
    })

    // Get client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !client) {
      console.error('Client lookup error:', clientError)
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Check for any existing interest (including INACTIVE ones)
    const { data: existingInterest, error: existingInterestError } = await supabase
      .from('client_property_interests')
      .select('id, property_id, status, interest_type')
      .eq('client_id', client.id)
      .eq('property_id', validatedData.propertyId)
      .single()

    let interest = existingInterest

    // If no interest exists at all, create one
    if (existingInterestError && existingInterestError.code === 'PGRST116') {
      console.log('No existing interest found, creating new interest...')

      // Create new interest
      const { data: newInterest, error: createError } = await supabase
        .from('client_property_interests')
        .insert({
          client_id: client.id,
          property_id: validatedData.propertyId,
          status: 'ACTIVE',
          interest_type: 'PURCHASE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, property_id, status, interest_type')
        .single()

      if (createError || !newInterest) {
        console.error('Error creating new interest:', createError)
        return NextResponse.json(
          { error: 'Failed to create property interest' },
          { status: 500 }
        )
      }

      interest = newInterest
    } else if (existingInterestError) {
      console.error('Interest lookup error:', existingInterestError)
      return NextResponse.json(
        { error: 'Failed to check property interest' },
        { status: 500 }
      )
    } else if (existingInterest && existingInterest.status === 'INACTIVE') {
      // Reactivate inactive interest
      console.log('Reactivating inactive interest...')

      const { data: reactivatedInterest, error: reactivateError } = await supabase
        .from('client_property_interests')
        .update({
          status: 'ACTIVE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInterest.id)
        .select('id, property_id, status, interest_type')
        .single()

      if (reactivateError || !reactivatedInterest) {
        console.error('Error reactivating interest:', reactivateError)
        return NextResponse.json(
          { error: 'Failed to reactivate property interest' },
          { status: 500 }
        )
      }

      interest = reactivatedInterest
    }

    if (!interest) {
      return NextResponse.json(
        { error: 'Unable to establish property interest' },
        { status: 500 }
      )
    }

    // If already committed, return success (idempotent operation)
    if (interest.status === 'COMMITTED') {
      return NextResponse.json({
        success: true,
        message: 'Property already committed',
        commitment: {
          property_id: validatedData.propertyId,
          client_id: client.id,
          status: 'already_committed',
        },
      })
    }

    // Get property details - check if property exists and is available
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, handover_status, asking_price_kes, committed_client_id')
      .eq('id', validatedData.propertyId)
      .maybeSingle()

    if (propertyError) {
      console.error('Property lookup error:', propertyError)
      return NextResponse.json(
        { error: 'Failed to check property details' },
        { status: 500 }
      )
    }

    if (!property) {
      console.error('Property not found:', validatedData.propertyId)
      return NextResponse.json(
        { error: 'Property not found or no longer available' },
        { status: 404 }
      )
    }

    // Check if property is available for commitment
    if (property.handover_status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Property is not available for commitment' },
        { status: 400 }
      )
    }

    // Check if property is already committed to another client
    if (property.committed_client_id && property.committed_client_id !== client.id) {
      return NextResponse.json(
        { error: 'Property is already committed to another client' },
        { status: 400 }
      )
    }

    // Start transaction-like operations
    try {
      // 1. Update property to mark it as committed to this client
      const { error: propertyUpdateError } = await supabase
        .from('properties')
        .update({
          committed_client_id: client.id,
          commitment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', validatedData.propertyId)

      if (propertyUpdateError) {
        throw new Error(`Failed to commit property: ${propertyUpdateError.message}`)
      }

      // 2. Update client interest status to COMMITTED
      const { error: interestUpdateError } = await supabase
        .from('client_property_interests')
        .update({
          status: 'COMMITTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', interest.id)

      if (interestUpdateError) {
        // Rollback property commitment
        await supabase
          .from('properties')
          .update({
            committed_client_id: null,
            commitment_date: null,
          })
          .eq('id', validatedData.propertyId)

        throw new Error(`Failed to update interest status: ${interestUpdateError.message}`)
      }

      // 3. Deactivate all other interests for this property
      const { error: deactivateError } = await supabase
        .from('client_property_interests')
        .update({
          status: 'INACTIVE',
          updated_at: new Date().toISOString(),
          notes: 'Property committed to another client',
        })
        .eq('property_id', validatedData.propertyId)
        .neq('client_id', client.id)
        .eq('status', 'ACTIVE')

      if (deactivateError) {
        console.warn('Failed to deactivate other interests:', deactivateError)
        // Don't fail the entire operation for this
      }

      // 4. Create admin notification about property commitment
      await createAdminNotification(
        supabase,
        client.id,
        validatedData.propertyId,
        'PROPERTY_COMMITTED'
      )

      console.log('✅ Client Commit Property API - Success:', {
        propertyId: validatedData.propertyId,
        clientId: client.id,
        clientName: client.full_name,
      })

      return NextResponse.json({
        success: true,
        message: 'Property committed successfully',
        commitment: {
          property_id: validatedData.propertyId,
          client_id: client.id,
          commitment_date: new Date().toISOString(),
        },
      })
    } catch (transactionError) {
      console.error('Transaction error:', transactionError)
      return NextResponse.json(
        { error: `Failed to commit property: ${transactionError.message}` },
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

    console.error('Unexpected error in client commit property API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to create admin notifications
async function createAdminNotification(
  supabase: any,
  clientId: string,
  propertyId: string,
  type: string
) {
  try {
    // Get client and property details for notification
    const [clientResult, propertyResult] = await Promise.all([
      supabase.from('clients').select('full_name').eq('id', clientId).single(),
      supabase.from('properties').select('name').eq('id', propertyId).single(),
    ])

    const clientName = clientResult.data?.full_name || 'Unknown Client'
    const propertyName = propertyResult.data?.name || 'Unknown Property'

    const notificationData = {
      type: 'CLIENT_PROPERTY_COMMITMENT',
      title: 'Property Commitment',
      message: `${clientName} has committed to ${propertyName}`,
      data: {
        client_id: clientId,
        property_id: propertyId,
        client_name: clientName,
        property_name: propertyName,
      },
      created_at: new Date().toISOString(),
    }

    await supabase.from('admin_notifications').insert(notificationData)
  } catch (error) {
    console.warn('Failed to create admin notification:', error)
    // Don't fail the main operation for notification errors
  }
}
