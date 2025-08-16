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
    const supabase = createServerSupabaseClient()
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

async function getRoleForTenant(userId: string, tenantId: string) {
  const admin = createClient(supabaseUrl, serviceKey)
  // Find the tenant's property via current_unit or latest active agreement
  const { data: tenant } = await admin.from('tenants').select('current_unit_id').eq('id', tenantId).maybeSingle()

  let propertyId: string | null = null
  if (tenant?.current_unit_id) {
    const { data: unit } = await admin.from('units').select('property_id').eq('id', tenant.current_unit_id).maybeSingle()
    propertyId = unit?.property_id || null
  }

  if (!propertyId) {
    // Try to find via latest agreement
    const { data: agreement } = await admin
      .from('tenancy_agreements')
      .select('unit_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (agreement?.unit_id) {
      const { data: unit } = await admin.from('units').select('property_id').eq('id', agreement.unit_id).maybeSingle()
      propertyId = unit?.property_id || null
    }
  }

  if (!propertyId) return null

  const { data: membership } = await admin
    .from('property_users')
    .select('role, status')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle()

  return membership
}

async function checkUnitAvailability(unitId: string): Promise<{ available: boolean; occupiedBy?: string }> {
  const admin = createClient(supabaseUrl, serviceKey)
  
  // Check if unit is currently occupied by another active tenant
  const { data: currentTenant } = await admin
    .from('tenants')
    .select('id, full_name')
    .eq('current_unit_id', unitId)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (currentTenant) {
    return { available: false, occupiedBy: currentTenant.full_name }
  }

  // Check if unit still exists and is active
  const { data: unit } = await admin
    .from('units')
    .select('id, is_active, unit_label')
    .eq('id', unitId)
    .maybeSingle()

  if (!unit) {
    return { available: false }
  }

  if (!unit.is_active) {
    return { available: false }
  }

  return { available: true }
}

export const PATCH = compose(withRateLimit, withCsrf)(async (req: NextRequest) => {
  try {
    console.info('[PATCH /api/tenants/[id]/restore] start')

    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    console.info('[PATCH /api/tenants/[id]/restore] IP:', ip)

    // CSRF check
    const csrfHeader = req.headers.get('x-csrf-token') || ''
    const csrfCookie = req.cookies.get('csrf-token')?.value || ''
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return errors.csrf()

    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract tenant id from path /api/tenants/[id]/restore
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const tenantsIdx = segments.findIndex(s => s === 'tenants')
    const tenantId = tenantsIdx >= 0 && segments[tenantsIdx + 1] ? segments[tenantsIdx + 1] : undefined
    if (!tenantId) return errors.badRequest('Missing tenant id in path')

    // Get tenant details
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: tenant, error: tenantError } = await admin
      .from('tenants')
      .select('id, full_name, status, current_unit_id, email, phone')
      .eq('id', tenantId)
      .maybeSingle()

    if (tenantError) return errors.badRequest('Failed to fetch tenant', tenantError)
    if (!tenant) return errors.badRequest('Tenant not found')

    // Check if tenant is actually deleted
    if (tenant.status !== 'DELETED') {
      return errors.badRequest('Tenant is not deleted and cannot be restored')
    }

    // Check permissions - only OWNER or PROPERTY_MANAGER can restore
    const membership = await getRoleForTenant(userId, tenantId)
    if (!membership || membership.status !== 'ACTIVE') return errors.forbidden('No access to tenant')
    const role = (membership as any).role
    if (!['OWNER', 'PROPERTY_MANAGER'].includes(role)) return errors.forbidden('Cannot restore tenant - insufficient permissions')

    // Parse request body for restore options
    const body = await req.json().catch(() => ({}))
    const { restore_to_unit, force_restore } = body

    let targetUnitId = restore_to_unit || tenant.current_unit_id
    let unitConflict = null

    // Check unit availability if restoring to a unit
    if (targetUnitId) {
      const availability = await checkUnitAvailability(targetUnitId)
      
      if (!availability.available) {
        if (availability.occupiedBy) {
          unitConflict = {
            type: 'occupied',
            message: `Unit is currently occupied by ${availability.occupiedBy}`,
            occupiedBy: availability.occupiedBy
          }
        } else {
          unitConflict = {
            type: 'unavailable',
            message: 'Unit is no longer available or does not exist'
          }
        }

        // If force_restore is not set and there's a conflict, return the conflict info
        if (!force_restore) {
          return NextResponse.json({
            ok: false,
            error: 'Unit conflict',
            conflict: unitConflict,
            tenant: {
              id: tenant.id,
              full_name: tenant.full_name,
              email: tenant.email,
              phone: tenant.phone
            }
          }, { status: 409 })
        }

        // If force_restore is true, restore without unit assignment
        targetUnitId = null
      }
    }

    // Perform the restore
    const updateData: any = {
      status: 'ACTIVE'
    }

    // Only set unit if available
    if (targetUnitId && !unitConflict) {
      updateData.current_unit_id = targetUnitId
    } else {
      updateData.current_unit_id = null
    }

    const { error: updateError } = await admin
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)

    if (updateError) return errors.badRequest('Failed to restore tenant', updateError)

    // Log the restore operation for audit trail
    console.info('[PATCH /api/tenants/[id]/restore] success', {
      tenantId,
      restoredBy: userId,
      targetUnitId,
      hadConflict: !!unitConflict,
      forceRestore: !!force_restore
    })

    return NextResponse.json({
      ok: true,
      data: {
        id: tenant.id,
        full_name: tenant.full_name,
        status: 'ACTIVE',
        current_unit_id: targetUnitId,
        restored_to_unit: targetUnitId,
        had_unit_conflict: !!unitConflict,
        conflict_resolved: force_restore && !!unitConflict
      }
    })

  } catch (e) {
    console.error('[PATCH /api/tenants/[id]/restore] error:', e)
    return errors.internal()
  }
})
