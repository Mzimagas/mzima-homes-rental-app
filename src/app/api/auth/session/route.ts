import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

// Sync Supabase auth session from client -> server cookies (SSR)
export async function POST(request: NextRequest) {
  try {
    const { event, session } = await request.json()
    const supabase = await createServerSupabaseClient()

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (!session?.access_token || !session?.refresh_token) {
        return NextResponse.json({ success: false, error: 'Missing tokens' }, { status: 400 })
      }
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 })
      }
      return NextResponse.json({ success: true })
    }

    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    // No-op for other events
    return NextResponse.json({ success: true, message: 'No-op event' })
  } catch (error) {
    console.error('Auth session sync error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

