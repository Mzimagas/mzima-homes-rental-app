// API endpoint to confirm user emails (development only)
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'
import { errors } from '../../../../lib/api/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function handler(request: NextRequest) {
  console.log('🔧 Confirm user API called')

  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    console.log('❌ Confirm user API blocked - not in development mode')
    return errors.forbidden('This endpoint is only available in development')
  }

  const schema = z.object({ email: z.string().email() })
  const json = await request.json().catch(() => ({}))
  console.log('🔧 Request body:', json)

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    console.log('❌ Validation failed:', parsed.error.flatten())
    return errors.validation(parsed.error.flatten())
  }

  const { email } = parsed.data
  console.log('🔧 Confirming email for:', email)

  // First, find the user by email
  console.log('🔧 Listing users to find:', email)
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    console.log('❌ Failed to list users:', listError)
    return errors.internal('Failed to list users')
  }

  console.log('🔧 Found', users.users.length, 'users total')
  const user = users.users.find(u => u.email === email)

  if (!user) {
    console.log('❌ User not found with email:', email)
    console.log('🔧 Available emails:', users.users.map(u => u.email))
    return errors.notFound('User not found')
  }

  console.log('✅ Found user:', user.id, 'email confirmed:', user.email_confirmed_at)

  // Confirm the user's email
  console.log('🔧 Confirming email for user:', user.id)
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  if (error) {
    console.log('❌ Failed to confirm user email:', error)
    return errors.internal('Failed to confirm user email')
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
}

export const POST = handler
