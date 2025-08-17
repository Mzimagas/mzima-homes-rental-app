import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: unit, error } = await supabase
      .from('view_public_vacant_units')
      .select('*')
      .eq('unit_id', params.id)
      .maybeSingle()
    if (error) return NextResponse.json({ ok: false, error }, { status: 500 })
    if (!unit) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

    const [{ data: media }, { data: amenities }] = await Promise.all([
      supabase.from('units_media').select('id, type, url, alt_text, order_index').eq('unit_id', params.id).order('order_index'),
      supabase.from('unit_amenities').select('amenities (code, label)').eq('unit_id', params.id)
    ])

    return NextResponse.json({ ok: true, data: { unit, media: media || [], amenities: (amenities || []).map((r: any) => r.amenities) } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}

