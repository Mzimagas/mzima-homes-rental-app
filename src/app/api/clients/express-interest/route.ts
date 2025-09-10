import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { z } from 'zod'

const expressInterestSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  clientId: z.string().uuid('Invalid client ID').optional(),
  interestType: z.enum(['express-interest', 'contact', 'purchase-inquiry']).default('express-interest'),
  message: z.string().optional(),
  contactPreference: z.enum(['email', 'phone', 'both']).default('email')
})

export async function POST(request: NextRequest) {
  try {
    console.log('🏠 Express Interest API - Starting request processing')

    const body = await request.json()
    console.log('📝 Express Interest API - Request body:', body)

    const validatedData = expressInterestSchema.parse(body)
    console.log('✅ Express Interest API - Data validated:', validatedData)

    const supabase = await createServerSupabaseClient()
    console.log('🔗 Express Interest API - Supabase client created')

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔍 Express Interest API - Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })

    if (authError || !user) {
      console.log('❌ Express Interest API - Authentication failed')
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          details: authError?.message || 'No user found'
        },
        { status: 401 }
      )
    }

    // Find or create the client record for this auth user
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !clientRecord) {
      console.log('Express Interest API - Client record not found, creating one for user:', user.id)

      // Auto-create client record
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert([{
          auth_user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          phone: user.user_metadata?.phone || null,
          registration_source: 'marketplace',
          status: 'ACTIVE',
          email_verified: user.email_confirmed_at ? true : false,
          phone_verified: false
        }])
        .select('id')
        .single()

      if (createError) {
        console.error('Express Interest API - Failed to create client record:', createError)
        return NextResponse.json(
          { error: 'Failed to create client record. Please try again.' },
          { status: 500 }
        )
      }

      clientRecord = newClient
      console.log('Express Interest API - Created new client record:', clientRecord.id)
    }

    const clientId = clientRecord.id
    console.log('Express Interest API - Using client ID:', clientId)

    // Verify the property exists and is available
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, sale_price_kes, handover_status, subdivision_status')
      .eq('id', validatedData.propertyId)
      .single()

    console.log('Express Interest API - Property lookup:', {
      propertyId: validatedData.propertyId,
      found: !!property,
      error: propertyError?.message,
      property: property ? { id: property.id, name: property.name, handover_status: property.handover_status } : null
    })

    if (propertyError || !property) {
      return NextResponse.json(
        { error: `Property not found: ${propertyError?.message || 'Unknown error'}` },
        { status: 404 }
      )
    }

    // Check property availability with improved logic
    // Property is available for interest if:
    // 1. Not completed handover (COMPLETED)
    // 2. Not fully subdivided (SUBDIVIDED)
    // 3. No deposit has been paid (which would lock the property)

    // Check for existing deposits that would lock the property
    const { data: deposits } = await supabase
      .from('client_property_interests')
      .select('id, status, deposit_paid, deposit_amount')
      .eq('property_id', validatedData.propertyId)
      .eq('status', 'ACTIVE')
      .not('deposit_paid', 'is', null)
      .gt('deposit_amount', 0)

    const hasDepositPaid = deposits && deposits.length > 0

    if (property.handover_status === 'COMPLETED' || property.subdivision_status === 'SUBDIVIDED' || hasDepositPaid) {
      const reason = hasDepositPaid
        ? 'Property is reserved (deposit paid by another client)'
        : 'Property is no longer available'

      return NextResponse.json(
        {
          success: false,
          error: reason,
          propertyStatus: {
            handover_status: property.handover_status,
            subdivision_status: property.subdivision_status,
            hasDepositPaid
          }
        },
        { status: 400 }
      )
    }

    // Check if client already has interest in this property
    const { data: existingInterest } = await supabase
      .from('client_property_interests')
      .select('id, status, deposit_paid')
      .eq('client_id', clientId)
      .eq('property_id', validatedData.propertyId)
      .single()

    if (existingInterest && existingInterest.status === 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already expressed interest in this property',
          existingInterest: {
            id: existingInterest.id,
            hasDeposit: !!existingInterest.deposit_paid
          }
        },
        { status: 400 }
      )
    }

    // Create or update interest record
    const interestData = {
      client_id: clientId,
      property_id: validatedData.propertyId,
      interest_type: validatedData.interestType,
      status: 'ACTIVE',
      message: validatedData.message,
      contact_preference: validatedData.contactPreference,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let interest
    if (existingInterest) {
      // Update existing interest
      const { data: updatedInterest, error: updateError } = await supabase
        .from('client_property_interests')
        .update({
          ...interestData,
          id: existingInterest.id
        })
        .eq('id', existingInterest.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating interest:', updateError)
        return NextResponse.json(
          { error: 'Failed to update interest' },
          { status: 500 }
        )
      }
      interest = updatedInterest
    } else {
      // Create new interest
      const { data: newInterest, error: createError } = await supabase
        .from('client_property_interests')
        .insert([interestData])
        .select()
        .single()

      if (createError) {
        console.error('Error creating interest:', createError)
        return NextResponse.json(
          { error: 'Failed to express interest' },
          { status: 500 }
        )
      }
      interest = newInterest
    }

    // Create admin notification
    await createAdminNotification(supabase, clientId, validatedData.propertyId, validatedData.interestType)

    // If this is a purchase inquiry, consider transitioning to handover pipeline
    if (validatedData.interestType === 'purchase-inquiry') {
      await considerHandoverTransition(supabase, validatedData.propertyId, clientId)
    }

    console.log('✅ Express Interest API - Success:', {
      interestId: interest.id,
      clientId,
      propertyId: validatedData.propertyId
    })

    return NextResponse.json({
      success: true,
      interest: {
        id: interest.id,
        property_id: validatedData.propertyId,
        client_id: clientId,
        status: interest.status,
        created_at: interest.created_at
      },
      message: 'Interest expressed successfully',
      property: {
        id: property.id,
        name: property.name
      }
    })

  } catch (error) {
    console.error('❌ Express interest error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function createAdminNotification(
  supabase: any,
  clientId: string,
  propertyId: string,
  interestType: string
) {
  try {
    // Get client and property details for notification
    const [clientResult, propertyResult] = await Promise.all([
      supabase.from('enhanced_users').select('full_name, email').eq('id', clientId).single(),
      supabase.from('properties').select('name').eq('id', propertyId).single()
    ])

    const clientName = clientResult.data?.full_name || 'Unknown Client'
    const propertyName = propertyResult.data?.name || 'Unknown Property'

    const notificationData = {
      type: 'CLIENT_INTEREST',
      title: 'New Property Interest',
      message: `${clientName} has expressed interest in ${propertyName}`,
      data: {
        client_id: clientId,
        property_id: propertyId,
        interest_type: interestType,
        client_name: clientName,
        property_name: propertyName
      },
      created_at: new Date().toISOString(),
      is_read: false,
      priority: interestType === 'purchase-inquiry' ? 'HIGH' : 'NORMAL'
    }

    const { error } = await supabase
      .from('admin_notifications')
      .insert([notificationData])

    if (error) {
      console.warn('Failed to create admin notification:', error)
    }
  } catch (error) {
    console.warn('Error creating admin notification:', error)
  }
}

async function considerHandoverTransition(
  supabase: any,
  propertyId: string,
  clientId: string
) {
  try {
    // Check if property should be transitioned to handover pipeline
    // This could be based on business rules, admin approval, etc.
    
    // For now, we'll create a pending handover request that admin can approve
    const handoverRequestData = {
      property_id: propertyId,
      client_id: clientId,
      status: 'PENDING_APPROVAL',
      requested_at: new Date().toISOString(),
      notes: 'Automatic handover request based on purchase inquiry'
    }

    const { error } = await supabase
      .from('handover_requests')
      .insert([handoverRequestData])

    if (error) {
      console.warn('Failed to create handover request:', error)
    }
  } catch (error) {
    console.warn('Error creating handover request:', error)
  }
}
