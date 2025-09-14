import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🚫 Processing reservation cancellation...')

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

    // Get client data - first try from clients table, create if doesn't exist
    let client: any = null;
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (clientRecord) {
      client = clientRecord;
    } else {
      // Create client record if it doesn't exist
      console.log('No client record found, creating one for user:', user.id);
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
        .select('id, full_name, email')
        .single();

      if (createError) {
        console.error('Failed to create client record:', createError);
        return NextResponse.json({ error: 'Failed to create client profile' }, { status: 500 });
      }

      client = newClient;
    }

    // Parse request body
    const { propertyId } = await request.json()

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    console.log('Cancelling reservation:', { propertyId, clientId: client.id })

    // Check if client has a RESERVED interest for this property
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select('id, property_id, status')
      .eq('client_id', client.id)
      .eq('property_id', propertyId)
      .eq('status', 'RESERVED')
      .maybeSingle()

    if (interestError) {
      console.error('Interest lookup error:', interestError)
      return NextResponse.json({ error: 'Failed to check reservation' }, { status: 500 })
    }

    if (!interest) {
      return NextResponse.json(
        { error: 'No active reservation found for this property' },
        { status: 404 }
      )
    }

    // Start transaction: Remove reservation and make property available again
    try {
      // 1. Update interest status to INACTIVE (cancelled)
      const { error: interestUpdateError } = await supabase
        .from('client_property_interests')
        .update({
          status: 'INACTIVE',
          updated_at: new Date().toISOString(),
          cancellation_date: new Date().toISOString(),
          cancellation_reason: 'CLIENT_CANCELLED',
        })
        .eq('id', interest.id)

      if (interestUpdateError) {
        throw new Error(`Failed to cancel interest: ${interestUpdateError.message}`)
      }

      // 2. Clear property reservation status
      const { error: propertyUpdateError } = await supabase
        .from('properties')
        .update({
          reservation_status: null,
          reserved_by: null,
          reserved_date: null,
          committed_client_id: null,
          commitment_date: null,
          deposit_amount: null,
          deposit_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)

      if (propertyUpdateError) {
        console.warn('Property update failed:', propertyUpdateError)
        // Don't fail the transaction for property update issues
      }

      console.log('✅ Reservation cancelled successfully')

      return NextResponse.json({
        success: true,
        message: 'Reservation cancelled successfully',
        cancellation: {
          property_id: propertyId,
          client_id: client.id,
          status: 'CANCELLED',
          cancellation_date: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Cancellation error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to cancel reservation' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Reservation cancellation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
