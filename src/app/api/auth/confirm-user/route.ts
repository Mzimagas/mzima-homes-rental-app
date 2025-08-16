// API endpoint to confirm user emails (development only)
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { compose, withCsrf } from '../../../../lib/api/middleware'
import { z } from 'zod'
import { errors } from '../../../../lib/api/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function handler(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return errors.forbidden('This endpoint is only available in development')
  }

  const schema = z.object({ userId: z.string().uuid(), email: z.string().email() })
  const json = await request.json().catch(()=>({}))
  const parsed = schema.safeParse(json)
  if (!parsed.success) return errors.validation(parsed.error.flatten())

  const { userId } = parsed.data

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { email_confirm: true }
  )

  if (error) {
    return errors.internal('Failed to confirm user email')
  }

  return NextResponse.json({
    success: true,
    user: {
      id: data.user.id,
      email: data.user.email,
      email_confirmed_at: data.user.email_confirmed_at
    }
  })
}

export const POST = compose(
  withCsrf,
)(handler)
