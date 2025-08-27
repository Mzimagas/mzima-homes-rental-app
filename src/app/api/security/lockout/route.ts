import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '../../../../lib/upstash'

const FAIL_WINDOW_SEC = 10 * 60 // 10 minutes
const LOCK_MINUTES = 15
const FAIL_THRESHOLD = 5

async function sha256Hex(input: string) {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(request: NextRequest) {
  const redis = getRedis()
  const body = await request.json().catch(() => ({}))
  const action = (body?.action || 'login').toString()
  const identifierRaw = (body?.identifier || '').toString().toLowerCase()
  const success = !!body?.success

  if (!identifierRaw)
    return NextResponse.json({ ok: false, error: 'identifier required' }, { status: 400 })

  const idHash = (await sha256Hex(identifierRaw)).slice(0, 12)
  const failKey = `lock:fail:${action}:${idHash}`
  const lockKey = `lock:active:${action}:${idHash}`

  if (success) {
    try {
      await redis.del(failKey)
      await redis.del(lockKey)
    } catch {}
    return NextResponse.json({ ok: true, cleared: true })
  }

  // If already locked, return current TTL
  const lockedTtl = await redis.ttl(lockKey)
  if (lockedTtl && lockedTtl > 0) {
    return NextResponse.json({ ok: true, locked: true, retryAfterSec: lockedTtl }, { status: 429 })
  }

  // Increment failures
  const fails = await redis.incr(failKey)
  await redis.expire(failKey, FAIL_WINDOW_SEC)

  if (fails >= FAIL_THRESHOLD) {
    const ttlSec = LOCK_MINUTES * 60
    await redis.set(lockKey, '1', { ex: ttlSec })
    // Index active locks for admin reporting
    await redis.sadd('lock:active:index', lockKey)
    await redis.expire('lock:active:index', ttlSec)
    return NextResponse.json({ ok: true, locked: true, retryAfterSec: ttlSec }, { status: 429 })
  }

  return NextResponse.json({ ok: true, fails, remaining: Math.max(0, FAIL_THRESHOLD - fails) })
}
