import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { interestId: string } }
) {
  try {
    console.log('🔍 Admin payment verification request for interest:', params.interestId)

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

    // Verify admin permissions (check if user has admin role)
    const { data: userProfile, error: profileError } = await supabase
      .from('enhanced_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || !['ADMIN', 'SUPER_ADMIN'].includes(userProfile.role)) {
      console.error('Permission denied - user role:', userProfile?.role)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { verified, notes } = await request.json()

    if (typeof verified !== 'boolean') {
      return NextResponse.json({ error: 'Verified status is required' }, { status: 400 })
    }

    // Get the client property interest record
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select(`
        id,
        client_id,
        property_id,
        status,
        deposit_amount_kes,
        deposit_paid_at,
        payment_method,
        payment_reference,
        payment_verified_at,
        clients!inner (
          id,
          full_name,
          email
        ),
        properties!inner (
          id,
          name
        )
      `)
      .eq('id', params.interestId)
      .single()

    if (interestError || !interest) {
      console.error('Interest lookup error:', interestError)
      return NextResponse.json({ error: 'Client interest not found' }, { status: 404 })
    }

    // Check if payment exists and is pending verification
    if (!interest.deposit_paid_at) {
      return NextResponse.json({ error: 'No deposit payment found for this interest' }, { status: 400 })
    }

    if (interest.payment_verified_at) {
      return NextResponse.json({ error: 'Payment has already been verified' }, { status: 400 })
    }

    // Update payment verification status
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (verified) {
      updateData.payment_verified_at = new Date().toISOString()
      // If verified, ensure status is IN_HANDOVER
      if (interest.status !== 'IN_HANDOVER') {
        updateData.status = 'IN_HANDOVER'
      }
    }

    if (notes) {
      updateData.notes = notes
    }

    const { error: updateError } = await supabase
      .from('client_property_interests')
      .update(updateData)
      .eq('id', params.interestId)

    if (updateError) {
      console.error('Failed to update payment verification:', updateError)
      return NextResponse.json({ error: 'Failed to update payment verification' }, { status: 500 })
    }

    // If payment is verified, also update the property payment installment status
    if (verified && interest.payment_reference) {
      const { error: installmentUpdateError } = await supabase
        .from('property_payment_installments')
        .update({
          status: 'VERIFIED',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          notes: notes ? `Admin verification: ${notes}` : 'Payment verified by admin',
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', interest.property_id)
        .eq('payment_reference', interest.payment_reference)

      if (installmentUpdateError) {
        console.warn('Failed to update payment installment status:', installmentUpdateError)
        // Don't fail the request, but log the warning
      }
    }

    // Log the verification action for audit trail
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: verified ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
        resource_type: 'CLIENT_PROPERTY_INTEREST',
        resource_id: params.interestId,
        details: {
          client_id: interest.client_id,
          property_id: interest.property_id,
          payment_reference: interest.payment_reference,
          deposit_amount_kes: interest.deposit_amount_kes,
          notes: notes,
        },
        created_at: new Date().toISOString(),
      })

    if (auditError) {
      console.warn('Failed to create audit log:', auditError)
      // Don't fail the request for audit log issues
    }

    console.log(`✅ Payment ${verified ? 'verified' : 'rejected'} for interest ${params.interestId}`)

    return NextResponse.json({
      success: true,
      message: verified 
        ? 'Payment verified successfully. Property will move to client\'s My Properties.'
        : 'Payment verification rejected.',
      interest: {
        id: interest.id,
        client_name: interest.clients.full_name,
        property_name: interest.properties.name,
        payment_verified_at: verified ? new Date().toISOString() : null,
        status: verified && interest.status !== 'IN_HANDOVER' ? 'IN_HANDOVER' : interest.status,
      }
    })

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
