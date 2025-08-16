import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

async function handler(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errors.unauthorized()

  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const idx = segments.findIndex(s => s === 'properties')
  const propertyId = idx >= 0 && segments[idx + 1] ? segments[idx + 1] : undefined
  if (!propertyId) return errors.badRequest('Missing property id in path')

  // Permission: OWNER or PROPERTY_MANAGER can enable
  const { data: membership } = await supabase
    .from('property_users')
    .select('role, status')
    .eq('property_id', propertyId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership || membership.status !== 'ACTIVE' || !['OWNER', 'PROPERTY_MANAGER'].includes(membership.role as any)) {
    return errors.forbidden('Insufficient permission to enable property')
  }

  const { error: updateErr } = await supabase
    .from('properties')
    .update({ disabled_at: null, disabled_by: null, disabled_reason: null })
    .eq('id', propertyId)
  if (updateErr) {
    console.error('enable property error', updateErr)
    return errors.internal('Failed to enable property')
  }

  return NextResponse.json({ ok: true })
}

export const POST = compose(
  (h) => withRateLimit(h, (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    return `property-enable:${ip}`
  }, 'property-enable'),
  withCsrf,
  withAuth,
)(handler)

