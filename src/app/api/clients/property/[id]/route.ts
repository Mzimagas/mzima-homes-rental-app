import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Use service key for server-side access
    const supabase = createClient(supabaseUrl, serviceKey)
    const { id: propertyId } = await params

    // Note: Authentication bypassed for client property access
    console.log('🔍 Client Property API - Loading property:', propertyId)

    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        location,
        property_type,
        asking_price_kes,
        purchase_price_agreement_kes,
        handover_price_agreement_kes,
        sale_price_kes,
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
          asking_price_kes: property.handover_price_agreement_kes || null, // Only show price if handover sale price is set
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
