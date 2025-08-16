import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '../../../../lib/upstash'
import { z } from 'zod'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'

async function handler(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const body = await request.json().catch(() => ({}))

  // Validate body with Zod
  const schema = z.object({
    action: z.string().min(1).default('generic'),
    email: z.string().email().optional()
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return errors.validation(parsed.error.flatten())
  }
  const { action, email } = parsed.data
  const identifier = (email || '').toLowerCase()
  const idPrefix = identifier.slice(0, 3)

  // Server-side persistent lockout check
  const redis = getRedis()
  async function sha256Hex(input: string) {
    const buf = new TextEncoder().encode(input)
    const hash = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')
  }
  const idHash = (await sha256Hex(identifier)).slice(0, 12)
  const lockKey = `lock:active:${action}:${idHash}`
  const lockedTtl = await redis.ttl(lockKey)
  if (lockedTtl && lockedTtl > 0) {
    return NextResponse.json({ ok: false, reason: 'lock', retryAfterSec: lockedTtl }, { status: 429 })
  }

  return NextResponse.json({ ok: true, rateKey: `${ip}:${idPrefix}` })
}

const wrapped = compose(
  (h) => withRateLimit(h, (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    return `security-check:${ip}`
  }, 'security-check'),
  withCsrf,
)

export const POST = wrapped(handler)

