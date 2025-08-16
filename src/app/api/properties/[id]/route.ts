import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

async function handler(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errors.unauthorized()

  // Permission: OWNER can delete only if no dependencies and policy allows; or ADMIN
  const { data: membership } = await supabase
    .from('property_users')
    .select('role, status')
    .eq('property_id', (req.nextUrl.pathname.split('/').filter(Boolean)[req.nextUrl.pathname.split('/').filter(Boolean).findIndex(s => s === 'properties') + 1] || ''))
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = false // TODO: wire global admin role if you have one

  if ((!membership || membership.status !== 'ACTIVE' || membership.role !== 'OWNER') && !isAdmin) {
    return errors.forbidden('Only property owner or admin can delete properties')
  }

  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const idx = segments.findIndex(s => s === 'properties')
  const propertyId = idx >= 0 && segments[idx + 1] ? segments[idx + 1] : undefined
  if (!propertyId) return errors.badRequest('Missing property id in path')

  const { data: ok, error: rpcErr } = await supabase.rpc('can_delete_property', { _property: propertyId }).single()
  if (rpcErr) {
    console.error('can_delete_property rpc error', rpcErr)
    return errors.internal('Failed to check delete eligibility')
  }
  if (!ok) {
    return NextResponse.json({ ok: false, code: 'INELIGIBLE', message: 'Property has related records and cannot be deleted' }, { status: 409 })
  }

  const { error: delErr } = await supabase.from('properties').delete().eq('id', propertyId)
  if (delErr) {
    console.error('delete property error', delErr)
    return errors.internal('Failed to delete property')
  }

  return NextResponse.json({ ok: true })
}

export const DELETE = compose(
  (h) => withRateLimit(h, (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    return `property-delete:${ip}`
  }, 'property-delete'),
  withCsrf,
  withAuth,
)(handler)

