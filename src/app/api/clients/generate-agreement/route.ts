import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('📄 Generating purchase agreement...')

    const supabase = await createServerSupabaseClient()

    // Get current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id, user.email)

    // Get client data - first try from clients table, create if doesn't exist
    let client: any = null;
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('auth_user_id', user.id)
      .single()

    if (clientRecord) {
      console.log('✅ Found existing client record:', clientRecord.id)
      client = clientRecord;
    } else {
      // Create client record if it doesn't exist
      console.log('⚠️ No client record found, creating one for user:', user.id);
      console.log('📝 User metadata:', user.user_metadata);

      const clientData = {
        auth_user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        phone: user.user_metadata?.phone || null,
        registration_source: 'marketplace',
        status: 'ACTIVE',
        email_verified: user.email_confirmed_at ? true : false,
        phone_verified: false
      };

      console.log('📝 Creating client with data:', clientData);

      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert([clientData])
        .select('id, full_name, email, phone')
        .single();

      if (createError) {
        console.error('❌ Failed to create client record:', createError);
        console.error('❌ Create error details:', JSON.stringify(createError, null, 2));
        return NextResponse.json({ error: 'Failed to create client profile' }, { status: 500 });
      }

      console.log('✅ Created new client record:', newClient.id);
      client = newClient;
    }

    // Parse request body
    const { propertyId } = await request.json()

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, physical_address, property_type, sale_price_kes, notes')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      console.error('Property lookup error:', propertyError)
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Check if client has reserved this property (ACTIVE, COMMITTED, or CONVERTED status)
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

    // Generate agreement content
    const agreementData = {
      property: {
        id: property.id,
        name: property.name,
        location: property.physical_address || 'Location not specified',
        type: property.property_type || 'RESIDENTIAL',
        purchasePrice: property.sale_price_kes || 0,
        description: property.notes
      },
      client: {
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        phone: client.phone
      },
      terms: {
        depositPercentage: 10,
        depositAmount: (property.sale_price_kes || 0) * 0.1,
        balanceAmount: (property.sale_price_kes || 0) * 0.9,
        paymentPeriodDays: 30,
        legalFeesSharing: 'equally',
        propertyCondition: 'as-is, where-is'
      },
      generatedAt: new Date().toISOString(),
      agreementId: `AGR-${propertyId}-${client.id}-${Date.now()}`
    }

    // Update client interest with agreement generation timestamp
    const { error: updateError } = await supabase
      .from('client_property_interests')
      .update({
        agreement_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', interest.id)

    if (updateError) {
      console.error('Failed to update interest timestamp:', updateError)
      // Don't fail the request for this - just log the error
      console.log('Continuing with agreement generation despite update error')
    }

    return NextResponse.json({
      success: true,
      agreement: agreementData,
      message: 'Purchase agreement generated successfully'
    })

  } catch (error) {
    console.error('Agreement generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate agreement' },
      { status: 500 }
    )
  }
}
