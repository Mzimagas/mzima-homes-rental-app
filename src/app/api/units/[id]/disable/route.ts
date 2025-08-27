import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { z } from 'zod'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

const Body = z.object({ reason: z.string().max(500).optional() })

async function handler(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return errors.validation(parsed.error.flatten())
  const { reason } = parsed.data

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return errors.unauthorized()

  // Extract unit id from path /api/units/[id]/disable
  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const unitsIdx = segments.findIndex((s) => s === 'units')
  const unitId = unitsIdx >= 0 && segments[unitsIdx + 1] ? segments[unitsIdx + 1] : undefined
  if (!unitId) return errors.badRequest('Missing unit id in path')

  // Check no ACTIVE tenancy agreements
  const { data: activeTenancy, error: tenancyErr } = await supabase
    .from('tenancy_agreements')
    .select('id')
    .eq('unit_id', unitId)
    .eq('status', 'ACTIVE')
    .maybeSingle()
  if (tenancyErr) {
    console.error('tenancy check error', tenancyErr)
    return errors.internal('Failed to check tenancy status')
  }
  if (activeTenancy) {
    return NextResponse.json(
      {
        ok: false,
        code: 'ACTIVE_TENANCY',
        message: 'Unit has an active tenancy. End the tenancy before disabling.',
      },
      { status: 409 }
    )
  }

  const { error: updateErr } = await supabase
    .from('units')
    .update({
      is_active: false,
      disabled_at: new Date().toISOString(),
      disabled_by: user.id,
      disabled_reason: reason ?? null,
    })
    .eq('id', unitId)
  if (updateErr) {
    console.error('disable unit error', updateErr)
    return errors.internal('Failed to disable unit')
  }

  return NextResponse.json({ ok: true })
}

export const POST = compose(
  (h) =>
    withRateLimit(
      h,
      (req) => {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        return `unit-disable:${ip}`
      },
      'unit-disable'
    ),
  withCsrf,
  withAuth
)(handler)
