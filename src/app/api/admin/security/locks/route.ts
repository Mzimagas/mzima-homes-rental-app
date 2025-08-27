import { NextResponse } from 'next/server'
import { getRedis } from '../../../../../lib/upstash'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const allowed = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (!user || (allowed.length && !allowed.includes(user.email?.toLowerCase() || ''))) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const redis = getRedis()
  try {
    const keys = (await redis.smembers('lock:active:index')) as string[]
    const results: Array<{ key: string; ttl: number }> = []
    for (const key of keys || []) {
      const ttl = await redis.ttl(key)
      if (ttl > 0) results.push({ key, ttl })
    }
    return NextResponse.json({ ok: true, locks: results })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
