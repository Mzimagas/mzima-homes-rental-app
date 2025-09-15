import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('✍️ Processing agreement signature...')

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
          phone_number: user.user_metadata?.phone || null,
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
    const { propertyId, signature, agreementAccepted } = await request.json()

    if (!propertyId || !signature || !agreementAccepted) {
      return NextResponse.json({ 
        error: 'Property ID, signature, and agreement acceptance are required' 
      }, { status: 400 })
    }

    // Verify signature matches client name
    if (signature.trim().toLowerCase() !== client.full_name.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Digital signature must match your full name exactly' 
      }, { status: 400 })
    }

    // Get client interest (ACTIVE, COMMITTED, or CONVERTED status)
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select('id, status')
      .eq('client_id', client.id)
      .eq('property_id', propertyId)
      .in('status', ['ACTIVE', 'COMMITTED', 'CONVERTED'])
      .single()

    if (interestError || !interest) {
      console.error('Interest lookup error:', interestError)
      return NextResponse.json({ error: 'Property not reserved by this client' }, { status: 403 })
    }

    // Agreement validation - since we're allowing signing for ACTIVE/COMMITTED interests,
    // we'll proceed with signature processing

    // Create signature data
    const signatureData = {
      signature: signature.trim(),
      signedBy: client.full_name,
      signedAt: new Date().toISOString(),
      clientId: client.id,
      clientEmail: client.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      agreementAccepted: true
    }

    // Update client interest with signature info and change status to COMMITTED
    const signatureNote = `Agreement signed on ${new Date().toLocaleDateString()} by ${signature}. Status: Legally Binding Agreement.`
    const { error: updateError } = await supabase
      .from('client_property_interests')
      .update({
        status: 'COMMITTED',
        agreement_signed_at: new Date().toISOString(),
        notes: signatureNote,
        updated_at: new Date().toISOString()
      })
      .eq('id', interest.id)

    if (updateError) {
      console.error('Failed to update interest timestamp:', updateError)
      // Don't fail the request for this - just log the error
      console.log('Continuing with signature processing despite update error')
    }

    // Auto-update handover details with agreement information
    try {
      const { onAgreementSignedUpdateHandover } = await import('../../../../services/handoverDetailsAutoUpdateService')

      const updateResult = await onAgreementSignedUpdateHandover(client, interest, signatureData)

      if (updateResult.success) {
        console.log('✅ Handover details auto-updated with agreement info:', updateResult)
      } else {
        console.warn('⚠️ Failed to auto-update handover details:', updateResult.error)
        // Don't fail the agreement signing if handover update fails
      }
    } catch (updateError) {
      console.warn('⚠️ Handover details auto-update error:', updateError)
      // Don't fail the agreement signing if handover update fails
    }

    // TODO: Send notification to admin about signed agreement
    // TODO: Generate signed agreement PDF for storage

    return NextResponse.json({
      success: true,
      signature: signatureData,
      message: 'Agreement signed successfully. You can now proceed with deposit payment.'
    })

  } catch (error) {
    console.error('Agreement signing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sign agreement' },
      { status: 500 }
    )
  }
}
