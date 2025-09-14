import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { id: propertyId } = params

    // Get property details - only show properties in handover status
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        property_type,
        handover_status,
        handover_date,
        lifecycle_status,
        total_area_acres,
        total_area_sqm,
        sale_price_kes,
        description,
        bedrooms,
        bathrooms,
        parking_spaces,
        year_built,
        amenities,
        lat,
        lng,
        created_at,
        updated_at
      `)
      .eq('id', propertyId)
      .in('handover_status', ['IN_PROGRESS', 'COMPLETED'])
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching property:', error)
      return NextResponse.json(
        { error: 'Failed to fetch property' },
        { status: 500 }
      )
    }

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Get property images
    const { data: images } = await supabase
      .from('property_images')
      .select('image_url, alt_text, is_primary')
      .eq('property_id', propertyId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    // Format images
    const imageUrls = (images || []).map(img => img.image_url).filter(Boolean)
    const mainImage = images?.find(img => img.is_primary)?.image_url || imageUrls[0]

    // Get property amenities if they exist in a separate table
    let amenitiesList: string[] = []
    try {
      const { data: amenitiesData } = await supabase
        .from('property_amenities')
        .select('amenity_name')
        .eq('property_id', propertyId)
      
      amenitiesList = (amenitiesData || []).map(a => a.amenity_name)
    } catch (amenitiesError) {
      // Amenities table might not exist, use property.amenities field if available
      if (property.amenities) {
        amenitiesList = Array.isArray(property.amenities) ? property.amenities : [property.amenities]
      }
    }

    const propertyWithDetails = {
      ...property,
      // Map physical_address to location for frontend compatibility
      location: property.physical_address,
      // Use actual data only
      description: property.description,
      property_type: property.property_type,
      size_sqm: property.total_area_sqm,
      asking_price_kes: property.sale_price_kes || property.handover_price_agreement_kes,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parking_spaces: property.parking_spaces,
      year_built: property.year_built,
      amenities: property.amenities,
      // Image data
      images: imageUrls,
      main_image: mainImage,
      property_type_display: formatPropertyType(property.property_type),
      location_display: property.physical_address,
      handover_status_display: formatHandoverStatus(property.handover_status),
      area_display: formatArea(property.total_area_acres, property.total_area_sqm),
      amenities_list: amenitiesList,
      is_available_for_sale: true,
      status: 'AVAILABLE'
    }

    return NextResponse.json({
      success: true,
      property: propertyWithDetails
    })

  } catch (error) {
    console.error('Unexpected error in property detail API:', error)
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

// Handle OPTIONS for CORS if needed
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
