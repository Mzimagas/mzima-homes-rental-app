import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get all client property interests for debugging
    const { data: interests, error } = await supabase
      .from('client_property_interests')
      .select(`
        id,
        client_id,
        property_id,
        status,
        interest_type,
        created_at,
        updated_at,
        reservation_date,
        deposit_amount,
        clients!inner(id, full_name, email),
        properties!inner(id, name, location)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Debug interests error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      interests: interests || [],
      count: interests?.length || 0
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
