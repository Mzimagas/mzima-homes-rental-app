import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    console.log('🔍 Getting client interest for property:', params.propertyId)

    const supabase = await createServerSupabaseClient()

    // Get current user session (admin authentication)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // TODO: Add admin role verification here
    // For now, we'll assume authenticated users have admin access

    const propertyId = params.propertyId

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Get client interest for this property
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select(`
        id,
        client_id,
        property_id,
        status,
        agreement_generated_at,
        agreement_signed_at,
        deposit_amount_kes,
        deposit_paid_at,
        payment_method,
        payment_reference,
        payment_verified_at,
        created_at,
        updated_at,
        clients!inner (
          id,
          full_name,
          email,
          phone_number
        )
      `)
      .eq('property_id', propertyId)
      .in('status', ['COMMITTED', 'CONVERTED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (interestError) {
      console.error('Interest lookup error:', interestError)
      return NextResponse.json({ error: 'Failed to get client interest' }, { status: 500 })
    }

    if (!interest) {
      return NextResponse.json({
        success: true,
        interest: null,
        message: 'No client interest found for this property'
      })
    }

    // Format the response
    const formattedInterest = {
      id: interest.id,
      client_id: interest.client_id,
      property_id: interest.property_id,
      status: interest.status,
      agreement_generated_at: interest.agreement_generated_at,
      agreement_signed_at: interest.agreement_signed_at,
      deposit_amount_kes: interest.deposit_amount_kes,
      deposit_paid_at: interest.deposit_paid_at,
      payment_method: interest.payment_method,
      payment_reference: interest.payment_reference,
      payment_verified_at: interest.payment_verified_at,
      created_at: interest.created_at,
      updated_at: interest.updated_at,
      client_name: interest.clients?.full_name,
      client_email: interest.clients?.email,
      client_phone: interest.clients?.phone_number
    }

    return NextResponse.json({
      success: true,
      interest: formattedInterest
    })

  } catch (error) {
    console.error('Property client interest lookup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get client interest' },
      { status: 500 }
    )
  }
}
