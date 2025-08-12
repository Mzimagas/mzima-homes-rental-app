import { NextRequest, NextResponse } from 'next/server'
import { getRatelimit, getRedis } from '../../../../lib/upstash'

export async function POST(request: NextRequest) {
  // CSRF check
  const csrfHeader = request.headers.get('x-csrf-token') || ''
  const csrfCookie = request.cookies.get('csrf-token')?.value || ''
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ ok: false, reason: 'csrf' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const body = await request.json().catch(() => ({}))
  const action = (body?.action || 'generic').toString()
  const identifier = (body?.email || '').toString().toLowerCase()
  const idPrefix = identifier.slice(0, 3)

  // Distributed rate limit
  const rl = getRatelimit()
  const [ipRes, idRes] = await Promise.all([
    rl.limit(`ip:${ip}:action:${action}`),
    rl.limit(`id:${idPrefix}:action:${action}`),
  ])
  if (!ipRes.success || !idRes.success) {
    return NextResponse.json({ ok: false, reason: 'rate' }, { status: 429 })
  }

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

  return NextResponse.json({ ok: true })
}

