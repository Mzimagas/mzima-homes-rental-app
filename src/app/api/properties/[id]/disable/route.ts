import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { z } from 'zod'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

const Body = z.object({ reason: z.string().max(500).optional(), disableUnits: z.boolean().optional() })

async function handler(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return errors.validation(parsed.error.flatten())
  const { reason, disableUnits } = parsed.data

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errors.unauthorized()

  // Extract property id from path
  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const idx = segments.findIndex(s => s === 'properties')
  const propertyId = idx >= 0 && segments[idx + 1] ? segments[idx + 1] : undefined
  if (!propertyId) return errors.badRequest('Missing property id in path')

  // Permission: OWNER or PROPERTY_MANAGER can disable
  const { data: membership } = await supabase
    .from('property_users')
    .select('role, status')
    .eq('property_id', propertyId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership || membership.status !== 'ACTIVE' || !['OWNER', 'PROPERTY_MANAGER'].includes(membership.role as any)) {
    return errors.forbidden('Insufficient permission to disable property')
  }

  // Check no ACTIVE tenancies across all units for this property
  const { data: unitsForProperty, error: unitsLoadErr } = await supabase.from('units').select('id').eq('property_id', propertyId)
  if (unitsLoadErr) {
    console.error('units load error', unitsLoadErr)
    return errors.internal('Failed to load units for tenancy check')
  }
  const unitIds = (unitsForProperty || []).map((u: any) => u.id)
  if (unitIds.length > 0) {
    const { data: active, error: activeErr } = await supabase
      .from('tenancy_agreements')
      .select('id')
      .eq('status', 'ACTIVE')
      .in('unit_id', unitIds)
      .maybeSingle()
    if (activeErr) {
      console.error('active tenancy check error', activeErr)
      return errors.internal('Failed to check active tenancies')
    }
    if (active) {
      return NextResponse.json({ ok: false, code: 'ACTIVE_TENANCY', message: 'Property has active tenancies. End them before disabling.' }, { status: 409 })
    }
  }

  // Optionally disable all units
  if (disableUnits) {
    const { error: unitsErr } = await supabase.from('units').update({ is_active: false }).eq('property_id', propertyId)
    if (unitsErr) {
      console.error('disable units error', unitsErr)
      return errors.internal('Failed to disable units')
    }
  }

  const { error: updateErr } = await supabase
    .from('properties')
    .update({ disabled_at: new Date().toISOString(), disabled_by: user.id, disabled_reason: reason ?? null })
    .eq('id', propertyId)
  if (updateErr) {
    console.error('disable property error', updateErr)
    return errors.internal('Failed to disable property')
  }

  return NextResponse.json({ ok: true })
}

export const POST = compose(
  (h) => withRateLimit(h, (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    return `property-disable:${ip}`
  }, 'property-disable'),
  withCsrf,
  withAuth,
)(handler)

