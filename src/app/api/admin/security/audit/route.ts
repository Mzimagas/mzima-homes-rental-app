import { NextResponse } from 'next/server'
import { getRedis } from '../../../../../lib/upstash'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const allowed = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
  if (!user || (allowed.length && !allowed.includes(user.email?.toLowerCase() || ''))) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const redis = getRedis()
  try {
    const keys = await redis.smembers('audit:index') as string[]
    const items: Array<{ key: string; ttl: number }> = []
    for (const key of keys || []) {
      const ttl = await redis.ttl(key)
      if (ttl > 0) items.push({ key, ttl })
    }
    return NextResponse.json({ ok: true, audits: items })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

