import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  try {
    console.log('🏠 Marketplace API: Fetching handover properties by marketplace_status')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const admin = createClient(supabaseUrl, serviceKey) // server-side client for aggregate counts (bypass RLS)

    // Get handover properties that are visible in marketplace using handover marketplace_status
    // Show handover properties with marketplace_status: AVAILABLE, RESERVED
    // This queries the handover_pipeline table instead of general properties
    let handoverProperties = []
    let error = null

    try {
      const result = await supabase
        .from('handover_pipeline')
        .select(
          `
          id,
          property_id,
          property_name,
          property_address,
          property_type,
          marketplace_status,
          marketplace_listed_at,
          asking_price_kes,
          negotiated_price_kes,
          buyer_name,
          overall_progress,
          handover_status,
          created_at
        `
        )
        .in('marketplace_status', ['AVAILABLE', 'RESERVED'])
        .order('marketplace_listed_at', { ascending: false })

      handoverProperties = result.data || []
      error = result.error
    } catch (tableError) {
      // Handle case where handover_pipeline table doesn't exist yet
      console.log('🏠 Marketplace API: handover_pipeline table not found, returning empty results')
      handoverProperties = []
      error = null
    }

    if (error) {
      console.error('Error fetching handover marketplace properties:', error)
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
    }

    console.log(
      `🏠 Marketplace API: Found ${handoverProperties?.length || 0} handover marketplace properties (AVAILABLE, RESERVED)`
    )

    // If no handover properties found, check for legacy properties with handover_status = 'AWAITING_START'
    // This provides backward compatibility until migrations are run
    if (!handoverProperties || handoverProperties.length === 0) {
      console.log(
        '🏠 Marketplace API: No handover marketplace properties found, checking legacy properties...'
      )

      try {
        const { data: legacyProperties } = await supabase
          .from('properties')
          .select(
            `
            id,
            name,
            physical_address,
            property_type,
            handover_status,
            sale_price_kes,
            handover_price_agreement_kes,
            notes,
            marketing_description,
            total_area_sqm,
            total_area_acres,
            lat,
            lng,
            created_at
          `
          )
          .eq('handover_status', 'AWAITING_START')
          .order('created_at', { ascending: false })
          .limit(10)

        if (legacyProperties && legacyProperties.length > 0) {
          console.log(
            `🏠 Marketplace API: Found ${legacyProperties.length} legacy properties with AWAITING_START status`
          )

          // Transform legacy properties to match handover property structure
          handoverProperties = legacyProperties.map((prop) => ({
            id: `legacy-${prop.id}`,
            property_id: prop.id,
            property_name: prop.name,
            property_address: prop.physical_address,
            property_type: prop.property_type,
            marketplace_status: 'AVAILABLE',
            marketplace_listed_at: prop.created_at,
            asking_price_kes: prop.handover_price_agreement_kes || prop.sale_price_kes,
            negotiated_price_kes: null,
            buyer_name: null,
            overall_progress: 0,
            handover_status: prop.handover_status,
            created_at: prop.created_at,
          }))
        }
      } catch (legacyError) {
        console.log(
          '🏠 Marketplace API: Legacy properties query failed, continuing with empty results'
        )
      }
    }

    if (handoverProperties && handoverProperties.length > 0) {
      console.log(
        '🏠 Sample handover property statuses:',
        handoverProperties.slice(0, 3).map((p) => ({
          name: p.property_name,
          marketplace_status: p.marketplace_status,
          marketplace_listed_at: p.marketplace_listed_at,
          buyer_name: p.buyer_name,
        }))
      )
    }

    // Get property images and additional data for each handover property
    const propertiesWithImages = await Promise.all(
      (handoverProperties || []).map(async (handoverProperty) => {
        try {
          // Try to get property images from property_images table using property_id
          const { data: images } = await supabase
            .from('property_images')
            .select('image_url, alt_text, is_primary')
            .eq('property_id', handoverProperty.property_id)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true })

          // Get additional property details from properties table
          const { data: propertyDetails } = await supabase
            .from('properties')
            .select('marketing_description, notes, total_area_acres, total_area_sqm, lat, lng')
            .eq('id', handoverProperty.property_id)
            .single()

          // Get interest counts for display (using property_id)
          const { count: interestCount } = (await admin
            .from('client_property_interests')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', handoverProperty.property_id)
            .eq('status', 'ACTIVE')) as unknown as { count: number }

          // Format images
          const imageUrls = (images || []).map((img) => img.image_url).filter(Boolean)
          const mainImage = images?.find((img) => img.is_primary)?.image_url || imageUrls[0]

          return {
            // Use handover property data as base
            id: handoverProperty.property_id, // Use actual property ID for client compatibility
            handover_id: handoverProperty.id, // Keep handover ID for reference
            name: handoverProperty.property_name,
            location: handoverProperty.property_address,
            physical_address: handoverProperty.property_address,
            property_type: handoverProperty.property_type,
            asking_price_kes:
              handoverProperty.negotiated_price_kes || handoverProperty.asking_price_kes,
            description: propertyDetails?.marketing_description || propertyDetails?.notes || '',
            images: imageUrls,
            main_image: mainImage,
            property_type_display: formatPropertyType(handoverProperty.property_type),
            location_display: handoverProperty.property_address,
            marketplace_status_display: formatHandoverMarketplaceStatus(
              handoverProperty.marketplace_status
            ),
            area_display: formatArea(
              propertyDetails?.total_area_acres,
              propertyDetails?.total_area_sqm
            ),
            is_available_for_interest: handoverProperty.marketplace_status === 'AVAILABLE',
            is_reserved: handoverProperty.marketplace_status === 'RESERVED',
            status: handoverProperty.marketplace_status, // Use handover marketplace status
            // Handover-specific fields
            buyer_name: handoverProperty.buyer_name,
            overall_progress: handoverProperty.overall_progress,
            handover_status: handoverProperty.handover_status,
            // Additional metadata
            interest_count: interestCount,
            is_new: handoverProperty.created_at
              ? new Date().getTime() - new Date(handoverProperty.created_at).getTime() <
                1000 * 60 * 60 * 24 * 7
              : false,
            // Coordinates from property details
            lat: propertyDetails?.lat,
            lng: propertyDetails?.lng,
          }
        } catch (imageError) {
          console.warn(
            `Error fetching images for handover property ${handoverProperty.property_id}:`,
            imageError
          )
          return {
            // Fallback data for error case
            id: handoverProperty.property_id,
            handover_id: handoverProperty.id,
            name: handoverProperty.property_name,
            location: handoverProperty.property_address,
            physical_address: handoverProperty.property_address,
            property_type: handoverProperty.property_type,
            asking_price_kes:
              handoverProperty.negotiated_price_kes || handoverProperty.asking_price_kes,
            description: '',
            images: [],
            main_image: null,
            property_type_display: formatPropertyType(handoverProperty.property_type),
            location_display: handoverProperty.property_address,
            marketplace_status_display: formatHandoverMarketplaceStatus(
              handoverProperty.marketplace_status
            ),
            area_display: 'N/A',
            is_available_for_interest: handoverProperty.marketplace_status === 'AVAILABLE',
            is_reserved: handoverProperty.marketplace_status === 'RESERVED',
            status: handoverProperty.marketplace_status,
            buyer_name: handoverProperty.buyer_name,
            overall_progress: handoverProperty.overall_progress,
            handover_status: handoverProperty.handover_status,
            interest_count: 0,
            is_new: false,
          }
        }
      })
    )

    // Only AVAILABLE handover properties are available for interest
    const availableProperties = propertiesWithImages

    return NextResponse.json({
      success: true,
      properties: availableProperties,
      total: availableProperties.length,
    })
  } catch (error) {
    console.error('Unexpected error in public properties API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function formatPropertyType(type: string | null): string {
  if (!type) return 'Property'

  const typeMap: Record<string, string> = {
    RESIDENTIAL: 'Residential Property',
    COMMERCIAL: 'Commercial Property',
    LAND: 'Land',
    APARTMENT: 'Apartment',
    HOUSE: 'House',
    HOME: 'Home',
    OFFICE: 'Office',
    RETAIL: 'Retail',
    WAREHOUSE: 'Warehouse',
    INDUSTRIAL: 'Industrial Property',
  }

  return typeMap[type.toUpperCase()] || type
}

function formatMarketplaceStatus(status: string | null): string {
  if (!status) return 'Not Listed'

  const statusMap: Record<string, string> = {
    NOT_LISTED: 'Not Listed',
    COMING_SOON: 'Coming Soon',
    AVAILABLE: 'Available Now',
    RESERVED: 'Reserved',
    UNDER_CONTRACT: 'Under Contract',
    SOLD: 'Sold',
    WITHDRAWN: 'Withdrawn',
  }

  return statusMap[status.toUpperCase()] || status
}

function formatHandoverMarketplaceStatus(status: string | null): string {
  if (!status) return 'Not Listed'

  const statusMap: Record<string, string> = {
    NOT_LISTED: 'Not Listed',
    AVAILABLE: 'Available Now',
    RESERVED: 'Reserved',
    UNDER_CONTRACT: 'Under Contract',
    SOLD: 'Sold',
  }

  return statusMap[status.toUpperCase()] || status
}

function formatHandoverStatus(status: string | null): string {
  if (!status) return 'Available'

  const statusMap: Record<string, string> = {
    PENDING: 'Coming Soon',
    IN_PROGRESS: 'Available Now',
    COMPLETED: 'Ready for Sale',
  }

  return statusMap[status.toUpperCase()] || status
}

function formatArea(acres: number | null, sqm: number | null): string {
  if (acres && acres > 0) {
    return `${acres.toFixed(2)} acres`
  }
  if (sqm && sqm > 0) {
    return `${sqm.toLocaleString()} sqm`
  }
  return 'Area not specified'
}

// Also handle OPTIONS for CORS if needed
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
