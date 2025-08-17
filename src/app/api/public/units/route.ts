import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const listSchema = z.object({
  propertyId: z.string().uuid().optional(),
  propertyType: z.enum(['HOME', 'HOSTEL', 'STALL']).optional(), // Only rental property types
  minRent: z.coerce.number().optional(),
  maxRent: z.coerce.number().optional(),
  amenities: z.string().optional(), // comma-separated amenity codes
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const parsed = listSchema.safeParse({
      propertyId: url.searchParams.get('propertyId') || undefined,
      propertyType: url.searchParams.get('propertyType') || undefined,
      minRent: url.searchParams.get('minRent') || undefined,
      maxRent: url.searchParams.get('maxRent') || undefined,
      amenities: url.searchParams.get('amenities') || undefined,
    })
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
    const { propertyId, propertyType, minRent, maxRent, amenities } = parsed.data

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Base: published + vacant; include a thumbnail (first media url) server-side
    const { data: base, error: baseErr } = await supabase.from('view_public_vacant_units').select('*').order('monthly_rent_kes', { ascending: true })
    if (baseErr) return NextResponse.json({ ok: false, error: baseErr }, { status: 500 })

    // Filter property/rent in-memory (can be pushed to SQL view later)
    let rows = base || []
    if (propertyId) rows = rows.filter((r: any) => r.property_id === propertyId)
    if (propertyType) rows = rows.filter((r: any) => r.property_type === propertyType)
    if (minRent !== undefined) rows = rows.filter((r: any) => (r.monthly_rent_kes ?? 0) >= minRent)
    if (maxRent !== undefined) rows = rows.filter((r: any) => (r.monthly_rent_kes ?? 0) <= maxRent)

    // Amenity filter
    let codes: string[] = []
    if (amenities) codes = amenities.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    if (codes.length) {
      const { data: ua } = await supabase
        .from('unit_amenities')
        .select('unit_id, amenities(code)')
      const allowedUnitIds = new Set(
        (ua || [])
          .filter((r: any) => (r as any).amenities && codes.every(c => ((r as any).amenities as any[]).some((a: any) => a.code === c)))
          .map((r: any) => r.unit_id)
      )
      rows = rows.filter((u: any) => allowedUnitIds.has(u.unit_id))
    }

    // Fetch thumbnails for the remaining units
    const unitIds = rows.map((r: any) => r.unit_id)
    let thumbs: Record<string, string> = {}
    if (unitIds.length) {
      const { data: media } = await supabase
        .from('units_media')
        .select('unit_id, url, order_index, type')
        .in('unit_id', unitIds)
        .order('order_index')
      const firstPhoto: Record<string, string> = {}
      for (const m of media || []) {
        if (m.type !== 'PHOTO') continue
        if (!firstPhoto[m.unit_id]) firstPhoto[m.unit_id] = m.url
      }
      thumbs = firstPhoto
    }

    const data = rows.map((r: any) => ({ ...r, thumbnail_url: thumbs[r.unit_id] || null }))

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}

