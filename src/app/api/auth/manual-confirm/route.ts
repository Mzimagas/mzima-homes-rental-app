import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  console.log('🔧 Manual confirm API called')
  
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    console.log('❌ Manual confirm API blocked - not in development mode')
    return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 })
  }

  try {
    const { email } = await request.json()
    console.log('🔧 Manual confirming email for:', email)

    // First, find the user by email
    console.log('🔧 Listing users to find:', email)
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.log('❌ Failed to list users:', listError)
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }

    console.log('🔧 Found', users.users.length, 'users total')
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.log('❌ User not found with email:', email)
      console.log('🔧 Available emails:', users.users.map(u => u.email))
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('✅ Found user:', user.id, 'email confirmed:', user.email_confirmed_at)

    // Confirm the user's email
    console.log('🔧 Confirming email for user:', user.id)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    })

    if (error) {
      console.log('❌ Failed to confirm user email:', error)
      return NextResponse.json({ error: 'Failed to confirm user email' }, { status: 500 })
    }

    console.log('✅ Email confirmed successfully for user:', user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
      },
    })
  } catch (error) {
    console.log('❌ Manual confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
