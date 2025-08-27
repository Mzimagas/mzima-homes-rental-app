import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const landListSchema = z.object({
  propertyType: z
    .enum(['RESIDENTIAL_LAND', 'COMMERCIAL_LAND', 'AGRICULTURAL_LAND', 'MIXED_USE_LAND'])
    .optional(),
  minArea: z.coerce.number().positive().optional(), // in square meters
  maxArea: z.coerce.number().positive().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  zoning: z.string().optional(),
  utilities: z.string().optional(), // comma-separated utility codes
  roadAccess: z.string().optional(),
  topography: z.string().optional(),
  developmentPermit: z.enum(['APPROVED', 'PENDING', 'NOT_REQUIRED', 'DENIED']).optional(),
  priceType: z.enum(['SALE', 'LEASE', 'BOTH']).default('BOTH'),
  location: z.string().optional(), // search in address
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const parsed = landListSchema.safeParse({
      propertyType: url.searchParams.get('propertyType') || undefined,
      minArea: url.searchParams.get('minArea') || undefined,
      maxArea: url.searchParams.get('maxArea') || undefined,
      minPrice: url.searchParams.get('minPrice') || undefined,
      maxPrice: url.searchParams.get('maxPrice') || undefined,
      zoning: url.searchParams.get('zoning') || undefined,
      utilities: url.searchParams.get('utilities') || undefined,
      roadAccess: url.searchParams.get('roadAccess') || undefined,
      topography: url.searchParams.get('topography') || undefined,
      developmentPermit: url.searchParams.get('developmentPermit') || undefined,
      priceType: url.searchParams.get('priceType') || 'BOTH',
      location: url.searchParams.get('location') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
    }

    const {
      propertyType,
      minArea,
      maxArea,
      minPrice,
      maxPrice,
      zoning,
      utilities,
      roadAccess,
      topography,
      developmentPermit,
      priceType,
      location,
    } = parsed.data

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Base query from view
    const { data: base, error: baseErr } = await supabase
      .from('view_public_land_listings')
      .select('*')
      .order('created_at', { ascending: false })

    if (baseErr) {
      return NextResponse.json({ ok: false, error: baseErr }, { status: 500 })
    }

    let rows = base || []

    // Apply filters
    if (propertyType) {
      rows = rows.filter((r: any) => r.property_type === propertyType)
    }

    if (location) {
      const searchTerm = location.toLowerCase()
      rows = rows.filter(
        (r: any) =>
          r.property_name?.toLowerCase().includes(searchTerm) ||
          r.physical_address?.toLowerCase().includes(searchTerm)
      )
    }

    if (minArea !== undefined) {
      rows = rows.filter((r: any) => (r.total_area_sqm ?? 0) >= minArea)
    }

    if (maxArea !== undefined) {
      rows = rows.filter((r: any) => (r.total_area_sqm ?? 0) <= maxArea)
    }

    if (zoning) {
      rows = rows.filter((r: any) =>
        r.zoning_classification?.toLowerCase().includes(zoning.toLowerCase())
      )
    }

    if (roadAccess) {
      rows = rows.filter((r: any) =>
        r.road_access_type?.toLowerCase().includes(roadAccess.toLowerCase())
      )
    }

    if (topography) {
      rows = rows.filter((r: any) => r.topography?.toLowerCase().includes(topography.toLowerCase()))
    }

    if (developmentPermit) {
      rows = rows.filter((r: any) => r.development_permit_status === developmentPermit)
    }

    // Price filtering based on type
    if (minPrice !== undefined || maxPrice !== undefined) {
      rows = rows.filter((r: any) => {
        let price = 0

        if (priceType === 'SALE' && r.sale_price_kes) {
          price = r.sale_price_kes
        } else if (priceType === 'LEASE' && r.lease_price_per_sqm_kes && r.total_area_sqm) {
          price = r.lease_price_per_sqm_kes * r.total_area_sqm
        } else if (priceType === 'BOTH') {
          price =
            r.sale_price_kes ||
            (r.lease_price_per_sqm_kes && r.total_area_sqm
              ? r.lease_price_per_sqm_kes * r.total_area_sqm
              : 0)
        }

        if (minPrice !== undefined && price < minPrice) return false
        if (maxPrice !== undefined && price > maxPrice) return false
        return true
      })
    }

    // Utility filtering
    if (utilities) {
      const utilityFilters = utilities.split(',').map((u) => u.trim().toLowerCase())

      rows = rows.filter((r: any) => {
        return utilityFilters.every((filter) => {
          switch (filter) {
            case 'electricity':
              return r.electricity_available
            case 'water':
              return r.water_available
            case 'sewer':
              return r.sewer_available
            case 'internet':
              return r.internet_available
            default:
              return true
          }
        })
      })
    }

    // Fetch amenities for remaining properties
    const propertyIds = rows.map((r: any) => r.property_id)
    let amenitiesMap: Record<string, any[]> = {}

    if (propertyIds.length > 0) {
      const { data: amenityData } = await supabase
        .from('land_property_amenities')
        .select('property_id, land_amenities(code, label, category)')
        .in('property_id', propertyIds)

      amenityData?.forEach((item: any) => {
        if (!amenitiesMap[item.property_id]) {
          amenitiesMap[item.property_id] = []
        }
        amenitiesMap[item.property_id].push(item.land_amenities)
      })
    }

    // Fetch additional media for remaining properties
    let mediaMap: Record<string, any[]> = {}
    if (propertyIds.length > 0) {
      const { data: mediaData } = await supabase
        .from('land_media')
        .select('property_id, type, url, alt_text, order_index')
        .in('property_id', propertyIds)
        .order('order_index')

      mediaData?.forEach((item: any) => {
        if (!mediaMap[item.property_id]) {
          mediaMap[item.property_id] = []
        }
        mediaMap[item.property_id].push(item)
      })
    }

    // Enhance data with amenities and media
    const enhancedData = rows.map((r: any) => ({
      ...r,
      amenities: amenitiesMap[r.property_id] || [],
      media: mediaMap[r.property_id] || [],
      // Calculate total lease price if available
      total_lease_price_kes:
        r.lease_price_per_sqm_kes && r.total_area_sqm
          ? r.lease_price_per_sqm_kes * r.total_area_sqm
          : null,
      // Format area display
      area_display: r.total_area_acres
        ? `${r.total_area_acres} acres (${r.total_area_sqm?.toLocaleString()} sqm)`
        : r.total_area_sqm
          ? `${r.total_area_sqm.toLocaleString()} sqm`
          : null,
    }))

    return NextResponse.json({ ok: true, data: enhancedData })
  } catch (e: any) {
    console.error('Land listings API error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
