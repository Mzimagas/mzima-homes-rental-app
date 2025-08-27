import { NextRequest, NextResponse } from 'next/server'
import { compose, withRateLimit, withCsrf } from '../../../../lib/api/middleware'
import { z } from 'zod'
import { errors } from '../../../../lib/api/errors'

async function handler(request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return errors.internal('Turnstile not configured')

  const body = await request.json().catch(() => ({}))
  const schema = z.object({ token: z.string().min(10) })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return errors.validation(parsed.error.flatten())

  const token = parsed.data.token
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)
  if (ip) formData.append('remoteip', ip)

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData as any,
  })
  const data = await result.json()

  if (!data.success) return NextResponse.json({ ok: false }, { status: 403 })
  return NextResponse.json({ ok: true })
}

export const POST = compose(
  (h) =>
    withRateLimit(
      h,
      (req) => {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        return `turnstile:${ip}`
      },
      'turnstile'
    ),
  withCsrf
)(handler)
