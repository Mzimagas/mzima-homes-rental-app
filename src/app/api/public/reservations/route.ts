import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const schema = z.object({
  unit_id: z.string().uuid(),
  full_name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().nullable(),
  preferred_move_in: z.string().optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  turnstileToken: z.string().min(1).optional(),
})

function parseFormUrlEncoded(body: string) {
  const params = new URLSearchParams(body)
  const obj: any = {}
  params.forEach((v, k) => { obj[k] = v })
  return obj
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const contentType = req.headers.get('content-type') || ''
    let body: any = {}
    if (contentType.includes('application/json')) {
      body = await req.json().catch(()=>({}))
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text()
      body = parseFormUrlEncoded(text)
    } else {
      // best effort parse
      body = await req.json().catch(()=>({}))
    }

    // Map Turnstile default field name from widget into our expected field
    if (!('turnstileToken' in body) && typeof (body['cf-turnstile-response']) === 'string') {
      body.turnstileToken = body['cf-turnstile-response']
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })

    const { unit_id, full_name, phone, email, preferred_move_in, message, turnstileToken } = parsed.data

    // Optional: Verify Turnstile token if provided
    if (turnstileToken) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/security/turnstile-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      })
      const j = await res.json().catch(()=>({ ok: false }))
      if (!j.ok) return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 403 })
    }

    // fetch unit -> property_id
    const { data: unit } = await supabase.from('units').select('id, property_id, unit_label, monthly_rent_kes, deposit_kes').eq('id', unit_id).maybeSingle()
    if (!unit) return NextResponse.json({ ok: false, error: 'Unit not found' }, { status: 404 })

    const insert = {
      unit_id,
      property_id: unit.property_id,
      full_name,
      phone,
      email: email || null,
      preferred_move_in: preferred_move_in || null,
      message: message || null,
    }

    const { data: resv, error } = await supabase.from('reservation_requests').insert(insert as any).select('*').single()
    if (error) return NextResponse.json({ ok: false, error }, { status: 500 })

    // Email notification: fan out to property staff using service role if available; fallback to SMTP_USER
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const subject = `New Reservation Request for Unit ${unit.unit_label}`
      const messageBody = `New reservation request:\n\nUnit: ${unit.unit_label}\nRent: ${unit.monthly_rent_kes || ''}\nDeposit: ${unit.deposit_kes || ''}\n\nProspect: ${full_name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}\nPreferred Move-in: ${preferred_move_in || ''}\n\nOpen dashboard: ${appUrl}/app/dashboard/properties/${unit.property_id}?tab=reservations`

      let recipients: string[] = []
      if (serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        const { data: staff } = await admin
          .from('property_users')
          .select('user_id, role, status')
          .eq('property_id', unit.property_id)
        const targetRoles = new Set(['OWNER','PROPERTY_MANAGER','LEASING_AGENT'])
        const activeStaff = (staff || []).filter((r: any) => r.status === 'ACTIVE' && targetRoles.has(r.role))
        for (const s of activeStaff) {
          try {
            // Fetch email per user via Admin API
            const { data: userRes } = await (admin as any).auth.admin.getUserById(s.user_id)
            const mail = userRes?.user?.email
            if (mail) recipients.push(mail)
          } catch {}
        }
        // Deduplicate
        recipients = Array.from(new Set(recipients))
      }

      if (!recipients.length && process.env.SMTP_USER) recipients = [process.env.SMTP_USER]

      for (const to of recipients) {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
          body: JSON.stringify({
            to,
            subject,
            message: messageBody,
            settings: {
              smtp_host: process.env.SMTP_HOST,
              smtp_port: Number(process.env.SMTP_PORT || 587),
              smtp_username: process.env.SMTP_USER,
              smtp_password: process.env.SMTP_PASS,
              from_email: process.env.SMTP_USER,
              from_name: process.env.NEXT_PUBLIC_APP_NAME || 'Mzima Homes',
            }
          })
        })
      }
    } catch (e) {
      console.warn('Failed to send email notification', e)
    }

    return NextResponse.json({ ok: true, data: resv })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}

