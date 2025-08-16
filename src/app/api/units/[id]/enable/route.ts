import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

async function handler(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errors.unauthorized()

  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const unitsIdx = segments.findIndex(s => s === 'units')
  const unitId = unitsIdx >= 0 && segments[unitsIdx + 1] ? segments[unitsIdx + 1] : undefined
  if (!unitId) return errors.badRequest('Missing unit id in path')

  const { error: updateErr } = await supabase
    .from('units')
    .update({ is_active: true, disabled_at: null, disabled_by: null, disabled_reason: null })
    .eq('id', unitId)
  if (updateErr) {
    console.error('enable unit error', updateErr)
    return errors.internal('Failed to enable unit')
  }

  return NextResponse.json({ ok: true })
}

export const POST = compose(
  (h) => withRateLimit(h, (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    return `unit-enable:${ip}`
  }, 'unit-enable'),
  withCsrf,
  withAuth,
)(handler)

