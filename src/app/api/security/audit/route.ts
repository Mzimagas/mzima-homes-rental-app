import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '../../../../lib/upstash'

const WINDOW_SEC = 10 * 60
const ALERT_THRESHOLD = 20

async function shaHex(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('')
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(()=>({}))
  const event = (body?.event || 'unknown').toString()
  const identifier = (body?.identifier || '').toString().slice(0,3)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  try {
    const redis = getRedis()
    const idHash = (await shaHex(identifier)).slice(0, 12)
    const key = `audit:${event}:${idHash}:${ip}`
    const count = await redis.incr(key)
    await redis.expire(key, WINDOW_SEC)
    // index recent audit keys for admin visibility
    await redis.sadd('audit:index', key)
    await redis.expire('audit:index', WINDOW_SEC)
    // raise alert if threshold exceeded
    if (count >= ALERT_THRESHOLD) {
      await redis.sadd('alerts:security', `${event}:${idHash}:${ip}`)
      await redis.expire('alerts:security', WINDOW_SEC)
    }
  } catch {}

  return NextResponse.json({ ok: true })
}

