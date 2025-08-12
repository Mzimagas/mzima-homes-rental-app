import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return NextResponse.json({ ok: false }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const token = body?.token
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

  if (!token) return NextResponse.json({ ok: false }, { status: 400 })

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

