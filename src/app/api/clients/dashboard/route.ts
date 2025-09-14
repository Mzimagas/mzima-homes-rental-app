import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '../../../../lib/supabase-server'
import { getUserDisplayName } from '../../../../lib/user-display-utils'

export async function GET(request: NextRequest) {
  try {
    console.log('🏠 Client Dashboard API - Loading client data')

    const supabase = await getServerSupabase()

    // Get the current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('🚫 Client Dashboard API - Authentication required')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('✅ Client Dashboard API - User authenticated:', user.id)

    // First, find the client record for this auth user
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, email, phone, notes, next_of_kin, created_at, auth_user_id')
      .eq('auth_user_id', user.id)
      .single<any>()

    if (clientError || !clientRecord) {
      console.warn('❌ Client record not found for user:', user.id, clientError)
      // Return empty properties if no client record found
      return NextResponse.json({
        success: true,
        client: {
          id: user.id,
          full_name: getUserDisplayName(user),
          email: user.email,
          phone: user.user_metadata?.phone || null,
          registration_date: user.created_at,
          properties: [],
        },
      })
    }

    console.log('✅ Client record found:', clientRecord.id)

    // Get client properties using the client record ID
    const properties = await getClientProperties(supabase, clientRecord.id)
    console.log('✅ Client Dashboard API - Properties loaded:', properties.length)

    return NextResponse.json({
      success: true,
      client: {
        id: clientRecord.id,
        full_name: clientRecord.full_name || getUserDisplayName(user),
        email: clientRecord.email || user.email,
        phone: clientRecord.phone || user.user_metadata?.phone || null,
        notes: clientRecord.notes || null,
        next_of_kin: clientRecord.next_of_kin || [],
        registration_date: clientRecord.created_at || user.created_at,
        properties: properties,
      },
    })
  } catch (error) {
    console.error('Client Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getClientProperties(supabase: any, clientId: string) {
  try {
    console.log('🔍 Getting properties for client:', clientId)

    // Get property interests
    const { data: interests, error: interestsError } = await supabase
      .from('client_property_interests')
      .select(
        `
        id,
        property_id,
        interest_type,
        status,
        created_at,
        notes,
        deposit_amount_kes,
        deposit_paid_at,
        payment_method,
        payment_reference,
        payment_verified_at,
        agreement_generated_at,
        agreement_signed_at,
        properties (
          id,
          name,
          physical_address,
          property_source,
          handover_status,
          reservation_status,
          reserved_by,
          reserved_date,
          lat,
          lng,
          property_type,
          sale_price_kes,
          purchase_price_agreement_kes,
          handover_price_agreement_kes,
          notes,
          total_area_acres,
          total_area_sqm,
          committed_client_id,
          created_at,
          updated_at
        )
      `
      )
      .eq('client_id', clientId)
      .in('status', ['ACTIVE', 'COMMITTED', 'RESERVED', 'CONVERTED'])

    console.log('🔍 Property interests query result:', {
      clientId,
      interestCount: interests?.length || 0,
      interests: interests?.map(i => ({ id: i.id, property_id: i.property_id, status: i.status })),
      interestsError
    })

    if (interestsError && interestsError.code !== 'PGRST116') {
      console.warn('Error fetching property interests:', interestsError)
      return []
    }

    const properties = []

    if (interests && interests.length > 0) {
      for (const interest of interests) {
        if (!interest.properties) continue

        const property = interest.properties

        // Get handover pipeline data if exists
        let handoverData = null
        try {
          const { data: handover } = await supabase
            .from('handover_pipeline')
            .select('*')
            .eq('property_id', property.id)
            .single()

          handoverData = handover
        } catch (handoverError) {
          // Handover pipeline might not exist yet
        }

        // Get property images
        const { data: images } = await supabase
          .from('property_images')
          .select('image_url')
          .eq('property_id', property.id)
          .order('is_primary', { ascending: false })

        const imageUrls = (images || []).map((img) => img.image_url).filter(Boolean)

        // Determine property status and progress
        let status: 'INTERESTED' | 'RESERVED' | 'COMMITTED' | 'IN_HANDOVER' | 'COMPLETED' = 'INTERESTED'
        let progress = 0
        let currentStage = 'Interest Expressed'

        // Check if client has reserved or committed to this property
        // Check property reservation status first (takes precedence)
        if (property.reservation_status === 'RESERVED' && property.reserved_by === clientId) {
          status = 'RESERVED'
          currentStage = 'Reserved - Awaiting Deposit'
          progress = 25
        } else if (interest.status === 'COMMITTED') {
          status = 'COMMITTED'
          currentStage = 'Committed - Ready for Handover'
          progress = 50
        }

        if (handoverData) {
          if (handoverData.handover_status === 'COMPLETED') {
            status = 'COMPLETED'
            progress = 100
            currentStage = 'Handover Completed'
          } else if (handoverData.handover_status === 'IN_PROGRESS') {
            status = 'IN_HANDOVER'
            progress = handoverData.overall_progress || 0
            currentStage = handoverData.current_stage || 'In Progress'
          }
        }

        properties.push({
          id: property.id,
          name: property.name,
          location: property.physical_address || 'Location not specified',
          physical_address: property.physical_address,
          lat: property.lat,
          lng: property.lng,
          property_type: property.property_type || 'RESIDENTIAL',
          property_type_display: property.property_type || 'Residential',
          asking_price_kes: property.handover_price_agreement_kes || property.purchase_price_agreement_kes || property.sale_price_kes,
          description: property.notes,
          total_area_acres: property.total_area_acres,
          total_area_sqm: property.total_area_sqm,
          bedrooms: null, // Not available for land properties
          bathrooms: null, // Not available for land properties
          parking_spaces: null, // Not available for land properties
          handover_status: property.handover_status,
          handover_status_display: property.handover_status,
          handover_progress: progress,
          current_stage: currentStage,
          images: imageUrls,
          main_image: imageUrls[0] || null,
          interest_date: status === 'RESERVED' ? property.reserved_date || interest.created_at : interest.created_at,
          status,
        })
      }
    }

    return properties
  } catch (error) {
    console.error('Error fetching client properties:', error)
    return []
  }
}
