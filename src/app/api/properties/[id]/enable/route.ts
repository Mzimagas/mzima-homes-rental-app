import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

async function handler(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errors.unauthorized()

  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const idx = segments.findIndex(s => s === 'properties')
  const propertyId = idx >= 0 && segments[idx + 1] ? segments[idx + 1] : undefined
  if (!propertyId) return errors.badRequest('Missing property id in path')

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

