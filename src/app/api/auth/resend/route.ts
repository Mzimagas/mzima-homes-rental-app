import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRatelimit } from '../../../../lib/upstash'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  const csrfHeader = request.headers.get('x-csrf-token') || ''
  const csrfCookie = request.cookies.get('csrf-token')?.value || ''
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ ok:false }, { status: 403 })
  }
  const rl = getRatelimit()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const body = await request.json().catch(()=>({}))
  const email = (body?.email || '').toString().toLowerCase()
  const id = email.slice(0,3)
  const [ipRes, idRes] = await Promise.all([
    rl.limit(`resend:ip:${ip}`), rl.limit(`resend:id:${id}`)
  ])
  if (!ipRes.success || !idRes.success) return NextResponse.json({ ok:false }, { status: 429 })

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  try {
    await supabase.auth.resend({ type: 'signup', email })
  } catch {}

  return NextResponse.json({ ok: true })
}

