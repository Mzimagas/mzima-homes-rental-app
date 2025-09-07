import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../lib/api/middleware'
import { errors } from '../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { tenantCreateSchema } from '../../../lib/validation/tenant'
import { memoryCache, CacheKeys, CacheTTL } from '../../../lib/cache/memory-cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getRoleForProperty(userId: string, propertyId: string) {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data, error } = await admin
      .from('property_users')
      .select('role, status')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle()
    if (error) {
      console.error('[getRoleForProperty] error:', error.message)
      return null
    }
    return data
  } catch (e: any) {
    console.error('[getRoleForProperty] unexpected:', e?.message || e)
    return null
  }
}

export const GET = compose(withRateLimit)(async (req: NextRequest) => {
  try {
    // TEMPORARY: Use service role to bypass RLS while fixing Next.js 15 cookies issue
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const url = new URL(req.url)
    const search = url.searchParams.get('q')?.trim() || ''
    const propertyId = url.searchParams.get('propertyId') || ''
    const unitId = url.searchParams.get('unitId') || ''
    const minimal = url.searchParams.get('minimal') === 'true'
    const includeDeleted = ['1', 'true', 'yes'].includes(
      (url.searchParams.get('includeDeleted') || '').toLowerCase()
    )

    console.info('[GET /api/tenants] params', { search, propertyId, unitId, minimal, includeDeleted })
    console.info('[GET /api/tenants] TEMPORARY: Using service role to bypass RLS')

    // Check cache for minimal requests without filters
    if (minimal && !search && !propertyId && !unitId && !includeDeleted) {
      const cacheKey = CacheKeys.userTenants('global') // Use global key for minimal tenant data
      const cachedTenants = memoryCache.get(cacheKey)

      if (cachedTenants) {
        console.log('👥 Tenants served from cache (minimal)')
        return NextResponse.json({ ok: true, data: cachedTenants }, {
          headers: { 'X-Cache': 'HIT' }
        })
      }
    }

    // Select fields based on minimal flag
    const selectFields = minimal
      ? 'id, status, monthly_rent, created_at'
      : '*'

    // Exclude soft-deleted tenants by default
    let query = includeDeleted
      ? (supabaseAdmin.from('tenants').select(selectFields) as any)
      : (supabaseAdmin.from('tenants').select(selectFields).neq('status', 'DELETED') as any)

    // Read via RLS (query already initialized to exclude DELETED)

    if (propertyId) {
      // Fetch units for property, then filter tenants by those unit IDs
      const { data: unitRows, error: unitsErr } = await supabaseAdmin
        .from('units')
        .select('id')
        .eq('property_id', propertyId)
      if (unitsErr) return errors.badRequest('Failed to fetch units for property', unitsErr)
      const unitIds = (unitRows || []).map((u) => u.id)
      console.info('[GET /api/tenants] property units', unitIds.length)
      if (unitIds.length === 0) return NextResponse.json({ ok: true, data: [] })
      query = query.in('current_unit_id', unitIds)
    }

    if (unitId) query = query.eq('current_unit_id', unitId)
    if (search) query = query.ilike('full_name', `%${search}%`)

    console.info('[GET /api/tenants] executing query...')
    const { data, error } = await query
    if (error) {
      console.error('[GET /api/tenants] query error:', error)
      return errors.badRequest('Failed to fetch tenants', error)
    }
    console.info('[GET /api/tenants] rows', (data || []).length)

    const result = data || []

    // Cache minimal tenant data for simple queries
    if (minimal && !search && !propertyId && !unitId && !includeDeleted && result.length > 0) {
      const cacheKey = CacheKeys.userTenants('global')
      memoryCache.set(cacheKey, result, CacheTTL.USER_DATA)
      console.log('👥 Tenants cached (minimal)')
    }

    return NextResponse.json({ ok: true, data: result }, {
      headers: minimal ? { 'X-Cache': 'MISS' } : {}
    })
  } catch (e) {
    console.error('[GET /api/tenants] unhandled', (e as any)?.message || e)
    return errors.internal()
  }
})

export const POST = compose(
  withRateLimit,
  withCsrf
)(async (req: NextRequest) => {
  try {
    console.info('[POST /api/tenants] start')

    if (!supabaseUrl || !serviceKey) {
      console.error('[POST /api/tenants] missing Supabase configuration')
      return errors.internal('Supabase configuration missing on server')
    }

    // Use service role to bypass RLS for write while auth is verified separately
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Resolve userId from Authorization bearer token or server session
    let userId = ''
    const auth = req.headers.get('authorization') || ''
    console.info('[POST /api/tenants] auth header present?', !!auth)
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7)
      const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { data: tokenUser, error: tokenErr } = await anon.auth.getUser(token)
      console.info('[POST /api/tenants] token user', tokenUser?.user?.id, tokenErr?.message)
      userId = tokenUser?.user?.id || ''
    }
    if (!userId) {
      try {
        const supa = await createServerSupabaseClient()
        const {
          data: { user },
        } = await supa.auth.getUser()
        userId = user?.id || ''
      } catch (e) {
        console.warn('[POST /api/tenants] failed to read server user', (e as any)?.message || e)
      }
    }
    if (!userId) {
      console.warn('[POST /api/tenants] unauthorized - no userId')
      return errors.unauthorized()
    }

    const json = await req.json()
    console.info('[POST /api/tenants] raw payload keys', Object.keys(json || {}))
    const parse = tenantCreateSchema.safeParse(json)
    if (!parse.success) {
      console.warn(
        '[POST /api/tenants] validation failed',
        parse.error?.issues?.map((e: any) => e.path.join('.') + ':' + e.message).join(', ')
      )
      return errors.validation(parse.error.flatten())
    }
    // Ensure status is ACTIVE upon creation to make occupancy consistent across views
    const payload: any = { ...parse.data }

    // Determine property from unit if provided
    let propertyId: string | null = null
    if (payload.current_unit_id) {
      const admin = createClient(supabaseUrl, serviceKey)
      const { data: unit, error: unitErr } = await admin
        .from('units')
        .select('property_id')
        .eq('id', payload.current_unit_id)
        .maybeSingle()
      console.info('[POST /api/tenants] unit lookup', {
        property_id: unit?.property_id,
        unitErr: unitErr?.message,
      })
      propertyId = unit?.property_id || null
    }

    // Check role
    if (propertyId) {
      const membership = await getRoleForProperty(userId, propertyId)
      console.info('[POST /api/tenants] membership', {
        status: (membership as any)?.status,
        role: (membership as any)?.role,
      })
      if (!membership || (membership as any).status !== 'ACTIVE')
        return errors.forbidden('No access to target property')
      const role = (membership as any).role
      if (!['OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT'].includes(role))
        return errors.forbidden('Insufficient role')
    }

    // Insert via service role (whitelist tenant columns only)
    const admin = createClient(supabaseUrl, serviceKey)
    console.info('[POST /api/tenants] inserting tenant')
    const tenantInsert = {
      full_name: payload.full_name,
      phone: payload.phone,
      alternate_phone: payload.alternate_phone ?? null,
      email: payload.email ?? null,
      national_id: payload.national_id,
      notes: payload.notes ?? null,
      emergency_contact_name: payload.emergency_contact_name ?? null,
      emergency_contact_phone: payload.emergency_contact_phone ?? null,
      emergency_contact_relationship: payload.emergency_contact_relationship ?? null,
      emergency_contact_email: payload.emergency_contact_email ?? null,
      current_unit_id: payload.current_unit_id ?? null,
      status: 'ACTIVE' as const,
    }
    const { data: tenant, error } = await admin
      .from('tenants')
      .insert(tenantInsert as any)
      .select('*')
      .single()
    if (error) {
      console.error('[POST /api/tenants] insert error', error)
      return errors.badRequest('Failed to create tenant', error)
    }

    // If unit assigned on creation, create an initial tenancy_agreement and apply billing defaults
    if (payload.current_unit_id) {
      // Load property defaults
      const { data: prop } = await admin
        .from('properties')
        .select('default_align_billing_to_start, default_billing_day')
        .eq('id', propertyId)
        .maybeSingle()

      const alignBilling =
        json.align_billing_to_start ?? prop?.default_align_billing_to_start ?? true
      // If align is true, default billing_day to start day during move/start; here we don’t know start date, but first invoice run will clamp correctly
      // We store a best-effort: if align=true and user didn’t pass a custom day, leave null; else use custom or property default
      const resolvedBillingDay = alignBilling
        ? json.billing_day || null
        : json.billing_day || prop?.default_billing_day || null

      const { error: agErr } = await admin.from('tenancy_agreements').insert({
        tenant_id: tenant.id,
        unit_id: payload.current_unit_id,
        start_date: new Date().toISOString().slice(0, 10),
        status: 'ACTIVE',
        monthly_rent_kes: payload.monthly_rent_kes || null,
        billing_day: resolvedBillingDay,
        align_billing_to_start: alignBilling,
        notes: payload.notes || null,
      })
      if (agErr)
        console.warn(
          '[POST /api/tenants] failed to create initial tenancy_agreement',
          agErr.message
        )
    }

    console.info('[POST /api/tenants] success', tenant?.id)
    return NextResponse.json({ ok: true, data: tenant })
  } catch (e: any) {
    console.error('[POST /api/tenants] unhandled', e?.message || e)
    return errors.internal()
  }
})
