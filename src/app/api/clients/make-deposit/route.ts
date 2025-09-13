import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🏦 Processing deposit request...')

    // Get session from cookies
    const sessionCookie = request.cookies.get('supabase-auth-token')
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse session
    let session
    try {
      session = JSON.parse(sessionCookie.value)
    } catch (error) {
      console.error('Session parsing error:', error)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('user_id', session.user.id)
      .single()

    if (clientError || !client) {
      console.error('Client lookup error:', clientError)
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Parse request body
    const { propertyId, depositAmount } = await request.json()

    if (!propertyId || !depositAmount) {
      return NextResponse.json(
        { error: 'Property ID and deposit amount are required' },
        { status: 400 }
      )
    }

    // Validate deposit amount
    if (typeof depositAmount !== 'number' || depositAmount <= 0) {
      return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 })
    }

    console.log('Processing deposit:', { propertyId, depositAmount, clientId: client.id })

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

    // Start transaction: Update interest to COMMITTED and record deposit
    try {
      // 1. Update interest status to COMMITTED
      const { error: interestUpdateError } = await supabase
        .from('client_property_interests')
        .update({
          status: 'COMMITTED',
          updated_at: new Date().toISOString(),
          deposit_amount: depositAmount,
          deposit_date: new Date().toISOString(),
        })
        .eq('id', interest.id)

      if (interestUpdateError) {
        throw new Error(`Failed to update interest: ${interestUpdateError.message}`)
      }

      // 2. Update property status - transition from AWAITING_START to IN_PROGRESS
      const { error: propertyUpdateError } = await supabase
        .from('properties')
        .update({
          reservation_status: 'COMMITTED',
          committed_client_id: client.id,
          commitment_date: new Date().toISOString(),
          deposit_amount: depositAmount,
          deposit_date: new Date().toISOString(),
          handover_status: 'IN_PROGRESS', // Move from AWAITING_START to IN_PROGRESS
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)

      if (propertyUpdateError) {
        console.warn('Property update failed:', propertyUpdateError)
        // Don't fail the transaction for property update issues
      }

      // 3. Create deposit record (optional - for financial tracking)
      const { error: depositRecordError } = await supabase
        .from('client_deposits')
        .insert({
          client_id: client.id,
          property_id: propertyId,
          amount: depositAmount,
          deposit_date: new Date().toISOString(),
          status: 'CONFIRMED',
          payment_method: 'PENDING', // To be updated when actual payment is processed
          created_at: new Date().toISOString(),
        })

      if (depositRecordError) {
        console.warn('Deposit record creation failed:', depositRecordError)
        // Don't fail the transaction for deposit record issues
      }

      console.log('✅ Deposit processed successfully')

      return NextResponse.json({
        success: true,
        message: 'Deposit processed successfully',
        deposit: {
          property_id: propertyId,
          client_id: client.id,
          amount: depositAmount,
          status: 'COMMITTED',
          deposit_date: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Transaction error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to process deposit' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Deposit processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
