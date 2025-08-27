import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRatelimit } from '../../../../lib/upstash'
import { compose, withCsrf, withRateLimit } from '../../../../lib/api/middleware'
import { z } from 'zod'
import { errors } from '../../../../lib/api/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function handler(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const schema = z.object({ email: z.string().email() })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return errors.validation(parsed.error.flatten())

  const email = parsed.data.email.toLowerCase()

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  try {
    await supabase.auth.resend({ type: 'signup', email })
  } catch {}

  return NextResponse.json({ ok: true })
}

export const POST = compose(
  (h) =>
    withRateLimit(
      h,
      (req) => {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        return `resend:${ip}`
      },
      'resend'
    ),
  withCsrf
)(handler)
