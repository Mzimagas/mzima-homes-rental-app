import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

async function handler(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errors.unauthorized()

  // Only allow owners/admins to hard delete
  // TODO: Replace with actual role/permission check; for now, block by default
  const isAdmin = false
  if (!isAdmin) return errors.forbidden('Only admins can delete units')

  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const unitsIdx = segments.findIndex(s => s === 'units')
  const unitId = unitsIdx >= 0 && segments[unitsIdx + 1] ? segments[unitsIdx + 1] : undefined
  if (!unitId) return errors.badRequest('Missing unit id in path')

  // Verify delete eligibility via RPC
  const { data: ok, error: rpcErr } = await supabase.rpc('can_delete_unit', { _unit: unitId }).single()
  if (rpcErr) {
    console.error('can_delete_unit rpc error', rpcErr)
    return errors.internal('Failed to check delete eligibility')
  }
  if (!ok) {
    return NextResponse.json({ ok: false, code: 'INELIGIBLE', message: 'Unit has related records and cannot be deleted' }, { status: 409 })
  }

  const { error: delErr } = await supabase.from('units').delete().eq('id', unitId)
  if (delErr) {
    console.error('delete unit error', delErr)
    return errors.internal('Failed to delete unit')
  }

  return NextResponse.json({ ok: true })
}

export const DELETE = compose(
  (h) => withRateLimit(h, (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    return `unit-delete:${ip}`
  }, 'unit-delete'),
  withCsrf,
  withAuth,
)(handler)

