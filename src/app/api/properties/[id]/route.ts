import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function resolveUserId(req: NextRequest): Promise<string | null> {
  // Primary: cookie-based session
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
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

async function checkActiveTenantsInProperty(propertyId: string): Promise<{ hasActiveTenants: boolean; tenantCount: number }> {
  const admin = createClient(supabaseUrl, serviceKey)

  // Get all units for this property
  const { data: units } = await admin
    .from('units')
    .select('id')
    .eq('property_id', propertyId)

  if (!units || units.length === 0) {
    return { hasActiveTenants: false, tenantCount: 0 }
  }

  const unitIds = units.map(u => u.id)

  // Check for active tenants in any of these units
  const { data: activeTenants } = await admin
    .from('tenants')
    .select('id, full_name')
    .in('current_unit_id', unitIds)
    .eq('status', 'ACTIVE')

  return {
    hasActiveTenants: (activeTenants?.length || 0) > 0,
    tenantCount: activeTenants?.length || 0
  }
}

async function handler(req: NextRequest) {
  try {
    console.info('[DELETE /api/properties/[id]] start')

    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    console.info('[DELETE /api/properties/[id]] IP:', ip)

    // CSRF check
    const csrfHeader = req.headers.get('x-csrf-token') || ''
    const csrfCookie = req.cookies.get('csrf-token')?.value || ''
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return errors.csrf()

    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    // Get property details
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: property, error: propertyError } = await admin
      .from('properties')
      .select('id, name, landlord_id')
      .eq('id', propertyId)
      .maybeSingle()

    if (propertyError) return errors.badRequest('Failed to fetch property', propertyError)
    if (!property) return errors.badRequest('Property not found')

    // Check permissions - only OWNER can delete properties
    const membership = await getRoleForProperty(userId, propertyId)
    if (!membership || membership.status !== 'ACTIVE') return errors.forbidden('No access to property')
    const role = (membership as any).role
    if (role !== 'OWNER') return errors.forbidden('Only property owners can delete properties')

    // Check for active tenants
    const { hasActiveTenants, tenantCount } = await checkActiveTenantsInProperty(propertyId)
    if (hasActiveTenants) {
      return errors.badRequest(`Cannot delete property with ${tenantCount} active tenant(s). Please move or remove all tenants first.`)
    }

    // Perform soft delete by setting disabled fields (using existing schema)
    const { error: updateError } = await admin
      .from('properties')
      .update({
        disabled_at: new Date().toISOString(),
        disabled_by: userId,
        disabled_reason: 'Soft deleted by owner'
      })
      .eq('id', propertyId)

    if (updateError) return errors.badRequest('Failed to delete property', updateError)

    // Log the deletion operation for audit trail
    console.info('[DELETE /api/properties/[id]] success', {
      propertyId,
      propertyName: property.name,
      deletedBy: userId,
      tenantCount: 0
    })

    return NextResponse.json({ ok: true })

  } catch (e) {
    console.error('[DELETE /api/properties/[id]] error:', e)
    return errors.internal()
  }
}

export const PATCH = compose(withRateLimit, withCsrf)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const body = await req.json().catch(() => ({}))
    const {
      property_type: newType,
      lifecycle_status,
      subdivision_status,
      handover_status,
      handover_date,
      force
    } = body || {}

    // Check if we have any fields to update
    const hasUpdates = newType || lifecycle_status || subdivision_status || handover_status || handover_date !== undefined
    if (!hasUpdates) {
      return errors.badRequest('No fields to update')
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Load existing property
    const { data: existing, error: loadErr } = await admin
      .from('properties')
      .select('id, property_type, landlord_id')
      .eq('id', propertyId)
      .maybeSingle()

    if (loadErr) return errors.badRequest('Failed to load property', loadErr)
    if (!existing) return errors.badRequest('Property not found')

    // Permission: OWNER or PROPERTY_MANAGER may update; OWNER required to change type
    const membership = await getRoleForProperty(userId, propertyId)
    if (!membership || membership.status !== 'ACTIVE') return errors.forbidden('No access to property')
    const role = (membership as any).role
    if (!['OWNER', 'PROPERTY_MANAGER'].includes(role)) return errors.forbidden('Insufficient permission')

    // Prepare update object
    const updateData: any = {}

    // Handle property type changes (existing logic)
    if (newType) {
      const oldType = (existing as any).property_type as string | null
      const isLand = (t: string | null) => ['RESIDENTIAL_LAND','COMMERCIAL_LAND','AGRICULTURAL_LAND','MIXED_USE_LAND'].includes((t || '').toString())
      const crossingCategory = isLand(oldType) !== isLand(newType)

      if (crossingCategory) {
        // Check units and active tenants
        const { data: units } = await admin.from('units').select('id').eq('property_id', propertyId)
        const unitIds = (units || []).map(u => u.id)
        let activeTenantCount = 0
        if (unitIds.length > 0) {
          const { data: activeTenants } = await admin
            .from('tenants')
            .select('id')
            .in('current_unit_id', unitIds)
            .eq('status', 'ACTIVE')
          activeTenantCount = activeTenants?.length || 0
        }

        const unitCount = unitIds.length

        if (!force && (unitCount > 0 || activeTenantCount > 0)) {
          return new NextResponse(
            JSON.stringify({
              ok: false,
              code: 'TYPE_CHANGE_CONFLICT',
              message: 'Changing property type across categories will affect related data.',
              details: { unitCount, activeTenantCount }
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
      updateData.property_type = newType
    }

    // Handle lifecycle status changes
    if (lifecycle_status) {
      updateData.lifecycle_status = lifecycle_status
    }

    // Handle subdivision status changes
    if (subdivision_status) {
      updateData.subdivision_status = subdivision_status
    }

    // Handle handover status changes
    if (handover_status) {
      updateData.handover_status = handover_status
    }

    // Handle handover date changes
    if (handover_date !== undefined) {
      updateData.handover_date = handover_date
    }

    // Perform the update
    const { error: updErr } = await admin
      .from('properties')
      .update(updateData)
      .eq('id', propertyId)

    if (updErr) return errors.badRequest('Failed to update property', updErr)

    // Server-side audit log (DB + Redis)
    try {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      const ua = req.headers.get('user-agent') || 'unknown'

      // Log property type changes if applicable
      if (newType) {
        const oldType = (existing as any).property_type as string | null
        // Insert durable DB audit if table exists
        try {
          await admin.from('property_audit_log').insert({
            property_id: propertyId,
            user_id: userId,
            event_type: 'property_type_changed',
            old_type: oldType as any,
            new_type: newType as any,
            details: { ip_address: ip, user_agent: ua }
          })
        } catch (auditErr) {
          // Ignore audit errors
        }
        // Fire-and-forget to existing audit endpoint (redis-backed)
        fetch(`${new URL(req.url).origin}/api/security/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'property_type_changed', identifier: propertyId })
        }).catch(()=>{})
      }

      // Log other property updates
      if (lifecycle_status || handover_status || handover_date !== undefined) {
        fetch(`${new URL(req.url).origin}/api/security/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'property_updated',
            identifier: propertyId,
            details: { lifecycle_status, handover_status, handover_date }
          })
        }).catch(()=>{})
      }
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[PATCH /api/properties/[id]] error:', e)
    return errors.internal()
  }
})


export const DELETE = compose(withRateLimit, withCsrf)(handler)

