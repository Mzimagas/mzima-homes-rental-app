import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const propertyId = params.id

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify client has access to this property
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select('id, status')
      .eq('client_id', user.id)
      .eq('property_id', propertyId)
      .eq('status', 'ACTIVE')
      .single()

    if (interestError || !interest) {
      return NextResponse.json(
        { error: 'You do not have access to this property' },
        { status: 403 }
      )
    }

    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        location,
        property_type,
        asking_price_kes,
        description,
        handover_status
      `)
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Get property images
    const { data: images } = await supabase
      .from('property_images')
      .select('image_url')
      .eq('property_id', propertyId)
      .order('is_primary', { ascending: false })

    const imageUrls = (images || []).map(img => img.image_url).filter(Boolean)

    // Get handover pipeline data
    const { data: handover, error: handoverError } = await supabase
      .from('handover_pipeline')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    if (handoverError || !handover) {
      return NextResponse.json(
        { error: 'Handover data not found' },
        { status: 404 }
      )
    }

    // Determine client access permissions
    const clientAccess = {
      can_view_documents: true, // All clients can view documents
      can_view_financials: true, // All clients can view financials
      can_download_reports: handover.handover_status !== 'NOT_STARTED' // Can download reports if handover started
    }

    const response = {
      success: true,
      property: {
        id: property.id,
        property: {
          id: property.id,
          name: property.name,
          location: property.location,
          property_type: property.property_type,
          asking_price_kes: property.asking_price_kes,
          description: property.description,
          images: imageUrls
        },
        handover: {
          id: handover.id,
          handover_status: handover.handover_status,
          current_stage: handover.current_stage,
          overall_progress: handover.overall_progress || 0,
          pipeline_stages: handover.pipeline_stages || [],
          created_at: handover.created_at,
          expected_completion_date: handover.expected_completion_date
        },
        client_access: clientAccess
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Client property detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
