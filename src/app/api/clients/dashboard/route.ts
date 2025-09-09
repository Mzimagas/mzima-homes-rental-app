import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🏠 Client Dashboard API - Loading client data')

    const supabase = await createServerSupabaseClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('🚫 Client Dashboard API - Authentication required')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('✅ Client Dashboard API - User authenticated:', user.id)

    // First, find the client record for this auth user
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !clientRecord) {
      console.warn('❌ Client record not found for user:', user.id, clientError)
      // Return empty properties if no client record found
      return NextResponse.json({
        success: true,
        client: {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          phone: user.user_metadata?.phone || null,
          registration_date: user.created_at,
          properties: []
        }
      })
    }

    console.log('✅ Client record found:', clientRecord.id)

    // Get client properties using the client record ID
    const properties = await getClientProperties(supabase, clientRecord.id)

    return NextResponse.json({
      success: true,
      client: {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        phone: user.user_metadata?.phone || null,
        registration_date: user.created_at,
        properties: properties
      }
    })

  } catch (error) {
    console.error('Client Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getClientProperties(supabase: any, clientId: string) {
  try {
    // Get property interests
    const { data: interests, error: interestsError } = await supabase
      .from('client_property_interests')
      .select(`
        property_id,
        interest_type,
        status,
        created_at,
        notes,
        properties (
          id,
          name,
          physical_address,
          property_source,
          handover_status,
          created_at,
          updated_at
        )
      `)
      .eq('client_id', clientId)
      .eq('status', 'ACTIVE')

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

        const imageUrls = (images || []).map(img => img.image_url).filter(Boolean)

        // Determine property status and progress
        let status: 'INTERESTED' | 'IN_HANDOVER' | 'COMPLETED' = 'INTERESTED'
        let progress = 0
        let currentStage = 'Interest Expressed'

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
          property_type: 'RESIDENTIAL',
          asking_price_kes: 5000000, // Default price
          handover_status: property.handover_status,
          handover_progress: progress,
          current_stage: currentStage,
          images: imageUrls,
          interest_date: interest.created_at,
          status
        })
      }
    }

    return properties

  } catch (error) {
    console.error('Error fetching client properties:', error)
    return []
  }
}
