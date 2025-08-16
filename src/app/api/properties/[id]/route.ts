import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

async function handler(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errors.unauthorized()

  // Only admins can delete properties (placeholder)
  const isAdmin = false
  if (!isAdmin) return errors.forbidden('Only admins can delete properties')

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

