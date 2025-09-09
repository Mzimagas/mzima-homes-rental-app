import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { z } from 'zod'

const clientRegistrationSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10, 'Valid phone number required').optional().nullable(),
  loginMethod: z.enum(['email', 'phone', 'username']),
  propertyInterest: z.string().uuid().optional().nullable(),
  registrationContext: z.string().optional().nullable()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = clientRegistrationSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create client record
    const clientData = {
      auth_user_id: user.id, // Link to the auth user
      full_name: validatedData.fullName,
      email: validatedData.email || user.email,
      phone: validatedData.phone,
      registration_source: 'marketplace',
      registration_context: {
        login_method: validatedData.loginMethod,
        property_interest: validatedData.propertyInterest,
        registration_context: validatedData.registrationContext
      },
      status: 'ACTIVE',
      email_verified: false,
      phone_verified: false
    }

    // Insert into clients table
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    if (clientError) {
      // If clients table doesn't exist, create it in enhanced_users
      console.warn('Clients table not found, using enhanced_users:', clientError)
      
      const { data: enhancedUser, error: enhancedError } = await supabase
        .from('enhanced_users')
        .upsert([{
          id: user.id,
          email: validatedData.email || user.email,
          full_name: validatedData.fullName,
          phone: validatedData.phone,
          user_type: 'client',
          is_active: true,
          metadata: {
            login_method: validatedData.loginMethod,
            registration_context: validatedData.registrationContext,
            property_interest: validatedData.propertyInterest
          }
        }])
        .select()
        .single()

      if (enhancedError) {
        console.error('Error creating enhanced user record:', enhancedError)
        return NextResponse.json(
          { error: 'Failed to create client record' },
          { status: 500 }
        )
      }

      // If there's a property interest, create the interest record
      if (validatedData.propertyInterest) {
        await createPropertyInterest(supabase, user.id, validatedData.propertyInterest, validatedData.registrationContext)
      }

      return NextResponse.json({
        success: true,
        client: enhancedUser,
        message: 'Client registered successfully'
      })
    }

    // If there's a property interest, create the interest record
    if (validatedData.propertyInterest) {
      await createPropertyInterest(supabase, client.id, validatedData.propertyInterest, validatedData.registrationContext)
    }

    return NextResponse.json({
      success: true,
      client,
      message: 'Client registered successfully'
    })

  } catch (error) {
    console.error('Client registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid registration data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createPropertyInterest(
  supabase: any,
  clientId: string,
  propertyId: string,
  context: string | null
) {
  try {
    // Create property interest record
    const interestData = {
      client_id: clientId,
      property_id: propertyId,
      interest_type: context || 'express-interest',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      notes: `Client expressed interest via ${context || 'registration'}`
    }

    const { error: interestError } = await supabase
      .from('client_property_interests')
      .insert([interestData])

    if (interestError) {
      console.warn('Failed to create property interest record:', interestError)
      // Don't fail the registration if this fails
    }

    // Optionally notify admin about new interest
    await notifyAdminOfInterest(supabase, clientId, propertyId, context)

  } catch (error) {
    console.warn('Error creating property interest:', error)
  }
}

async function notifyAdminOfInterest(
  supabase: any,
  clientId: string,
  propertyId: string,
  context: string | null
) {
  try {
    // Create notification for admin
    const notificationData = {
      type: 'CLIENT_INTEREST',
      title: 'New Property Interest',
      message: `A new client has expressed interest in a property`,
      data: {
        client_id: clientId,
        property_id: propertyId,
        context: context
      },
      created_at: new Date().toISOString(),
      is_read: false
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
