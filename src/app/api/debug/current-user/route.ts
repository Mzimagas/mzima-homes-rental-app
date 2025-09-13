import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get session from cookies
    const sessionCookie = request.cookies.get('supabase-auth-token')
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session cookie found' }, { status: 401 })
    }

    // Parse session
    let session
    try {
      session = JSON.parse(sessionCookie.value)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session format' }, { status: 401 })
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No user in session' }, { status: 401 })
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (clientError) {
      return NextResponse.json({ 
        error: 'Client lookup failed', 
        details: clientError,
        user_id: session.user.id 
      }, { status: 404 })
    }

    // Get client's property interests
    const { data: interests, error: interestsError } = await supabase
      .from('client_property_interests')
      .select(`
        id,
        property_id,
        status,
        interest_type,
        created_at,
        updated_at,
        reservation_date,
        deposit_amount,
        properties!inner(id, name, location, asking_price_kes)
      `)
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      session_user_id: session.user.id,
      client: client,
      interests: interests || [],
      interests_error: interestsError,
      debug_info: {
        session_exists: !!session,
        user_exists: !!session?.user,
        client_found: !!client,
        interests_count: interests?.length || 0
      }
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
