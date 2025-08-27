import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function resolveUserId(req: NextRequest): Promise<string | null> {
  // Primary: cookie-based session
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) return user.id
  } catch (e) {
    console.warn('[resolveUserId] Cookie auth failed:', e)
  }

  // Fallback: Bearer token
  const auth = req.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7)
    const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: tokenUser } = await anon.auth.getUser(token)
    if (tokenUser?.user?.id) return tokenUser.user.id
  }

  return null
}

async function getRoleForProperty(userId: string, propertyId: string) {
  const admin = createClient(supabaseUrl, serviceKey)

  const { data: membership } = await admin
    .from('property_users')
    .select('role, status')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle()

  return membership
}

export const PATCH = compose(
  withRateLimit,
  withCsrf
)(async (req: NextRequest) => {
  try {
    console.info('[PATCH /api/properties/[id]/restore] start')

    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    console.info('[PATCH /api/properties/[id]/restore] IP:', ip)

    // CSRF check
    const csrfHeader = req.headers.get('x-csrf-token') || ''
    const csrfCookie = req.cookies.get('csrf-token')?.value || ''
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return errors.csrf()

    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/restore
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId =
      propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    // Get property details
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: property, error: propertyError } = await admin
      .from('properties')
      .select('id, name, landlord_id, disabled_at, disabled_by, disabled_reason')
      .eq('id', propertyId)
      .maybeSingle()

    if (propertyError) return errors.badRequest('Failed to fetch property', propertyError)
    if (!property) return errors.badRequest('Property not found')

    // Check if property is actually deleted (disabled)
    if (!property.disabled_at) {
      return errors.badRequest('Property is not deleted and cannot be restored')
    }

    // Check permissions - only OWNER can restore properties
    const membership = await getRoleForProperty(userId, propertyId)
    if (!membership || membership.status !== 'ACTIVE')
      return errors.forbidden('No access to property')
    const role = (membership as any).role
    if (role !== 'OWNER') return errors.forbidden('Only property owners can restore properties')

    // Perform the restore by clearing disabled fields
    const { error: updateError } = await admin
      .from('properties')
      .update({
        disabled_at: null,
        disabled_by: null,
        disabled_reason: null,
      })
      .eq('id', propertyId)

    if (updateError) return errors.badRequest('Failed to restore property', updateError)

    // Log the restore operation for audit trail
    console.info('[PATCH /api/properties/[id]/restore] success', {
      propertyId,
      propertyName: property.name,
      restoredBy: userId,
    })

    return NextResponse.json({
      ok: true,
      data: {
        id: property.id,
        name: property.name,
        status: 'ACTIVE',
        restored_by: userId,
        restored_at: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.error('[PATCH /api/properties/[id]/restore] error:', e)
    return errors.internal()
  }
})
