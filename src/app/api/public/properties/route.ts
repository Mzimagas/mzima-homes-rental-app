import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  try {
    console.log('🏠 Marketplace API: Fetching handover properties only')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const admin = createClient(supabaseUrl, serviceKey) // server-side client for aggregate counts (bypass RLS)

    // Get properties that are available for sale in marketplace
    // Only show properties that have moved to handover status (IN_PROGRESS or COMPLETED)
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        property_type,
        handover_status,
        sale_price_kes,
        handover_price_agreement_kes,
        notes,
        total_area_sqm,
        total_area_acres,
        lat,
        lng,
        created_at
      `)
      .in('handover_status', ['IN_PROGRESS', 'COMPLETED'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching public properties:', error)
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500 }
      )
    }

    console.log(`🏠 Marketplace API: Found ${properties?.length || 0} handover properties`)
    if (properties && properties.length > 0) {
      console.log('🏠 Sample property handover statuses:', properties.slice(0, 3).map(p => ({
        name: p.name,
        handover_status: p.handover_status
      })))
    }

    // Get property images for each property
    const propertiesWithImages = await Promise.all(
      (properties || []).map(async (property) => {
        try {
          // Try to get property images from property_images table
          const { data: images } = await supabase
            .from('property_images')
            .select('image_url, alt_text, is_primary')
            .eq('property_id', property.id)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true })

          // Get sale status information
          const { data: saleInfo } = await supabase
            .from('property_sale_info')
            .select('sale_status, deposit_amount, total_paid')
            .eq('property_id', property.id)
            .single()

          // Get interest counts for display
          const { count: interestCount } = await admin
            .from('client_property_interests')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', property.id)
            .eq('status', 'ACTIVE') as unknown as { count: number }

          // Format images
          const imageUrls = (images || []).map(img => img.image_url).filter(Boolean)
          const mainImage = images?.find(img => img.is_primary)?.image_url || imageUrls[0]

          return {
            ...property,
            location: property.physical_address,
            property_type: property.property_type || 'RESIDENTIAL',
            asking_price_kes: property.handover_price_agreement_kes || property.sale_price_kes || 5000000,
            description: property.notes || '',
            images: imageUrls,
            main_image: mainImage,
            property_type_display: formatPropertyType(property.property_type),
            location_display: property.physical_address || 'Location not specified',
            handover_status_display: formatHandoverStatus(property.handover_status),
            area_display: formatArea(property.total_area_acres, property.total_area_sqm),
            is_available_for_sale: true, // All handover properties are available
            status: 'AVAILABLE', // Marketplace status
            // Sale status information
            sale_status: saleInfo?.sale_status || 'LISTED_FOR_SALE',
            deposit_received: (saleInfo?.deposit_amount && saleInfo.deposit_amount > 0) || false,
            interest_count: interestCount,
            is_new: property.created_at ? (new Date().getTime() - new Date(property.created_at).getTime() < 1000 * 60 * 60 * 24 * 7) : false
          }
        } catch (imageError) {
          console.warn(`Error fetching images for property ${property.id}:`, imageError)
          return {
            ...property,
            location: property.physical_address,
            property_type: property.property_type || 'RESIDENTIAL',
            asking_price_kes: property.handover_price_agreement_kes || property.sale_price_kes || 5000000,
            description: property.notes || '',
            images: [],
            main_image: null,
            property_type_display: formatPropertyType(property.property_type),
            location_display: property.physical_address || 'Location not specified',
            handover_status_display: formatHandoverStatus(property.handover_status),
            area_display: formatArea(property.total_area_acres, property.total_area_sqm),
            is_available_for_sale: true, // All handover properties are available
            status: 'AVAILABLE', // Marketplace status
            // Default sale status for error case
            sale_status: 'LISTED_FOR_SALE',
            deposit_received: false
          }
        }
      })
    )

    // All properties are available for now
    const availableProperties = propertiesWithImages

    return NextResponse.json({
      success: true,
      properties: availableProperties,
      total: availableProperties.length
    })

  } catch (error) {
    console.error('Unexpected error in public properties API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatPropertyType(type: string | null): string {
  if (!type) return 'Property'

  const typeMap: Record<string, string> = {
    'RESIDENTIAL': 'Residential Property',
    'COMMERCIAL': 'Commercial Property',
    'LAND': 'Land',
    'APARTMENT': 'Apartment',
    'HOUSE': 'House',
    'HOME': 'Home',
    'OFFICE': 'Office',
    'RETAIL': 'Retail',
    'WAREHOUSE': 'Warehouse',
    'INDUSTRIAL': 'Industrial Property'
  }

  return typeMap[type.toUpperCase()] || type
}

function formatHandoverStatus(status: string | null): string {
  if (!status) return 'Available'

  const statusMap: Record<string, string> = {
    'PENDING': 'Coming Soon',
    'IN_PROGRESS': 'Available Now',
    'COMPLETED': 'Ready for Sale'
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
