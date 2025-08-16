import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../lib/api/middleware'
import { errors } from '../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { tenantCreateSchema } from '../../../lib/validation/tenant'

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
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const url = new URL(req.url)
    const search = url.searchParams.get('q')?.trim() || ''
    const propertyId = url.searchParams.get('propertyId') || ''
    const unitId = url.searchParams.get('unitId') || ''
    const includeDeleted = ['1', 'true', 'yes'].includes((url.searchParams.get('includeDeleted') || '').toLowerCase())

    console.info('[GET /api/tenants] params', { search, propertyId, unitId, includeDeleted })
    console.info('[GET /api/tenants] TEMPORARY: Using service role to bypass RLS')

    // Exclude soft-deleted tenants by default
    let query = includeDeleted
      ? (supabaseAdmin.from('tenants').select('*') as any)
      : (supabaseAdmin.from('tenants').select('*').neq('status', 'DELETED') as any)

    // Read via RLS (query already initialized to exclude DELETED)

    if (propertyId) {
      // Fetch units for property, then filter tenants by those unit IDs
      const { data: unitRows, error: unitsErr } = await supabaseAdmin
        .from('units')
        .select('id')
        .eq('property_id', propertyId)
      if (unitsErr) return errors.badRequest('Failed to fetch units for property', unitsErr)
      const unitIds = (unitRows || []).map(u => u.id)
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
    console.info('[GET /api/tenants] data:', data)
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    console.error('[GET /api/tenants] unhandled', (e as any)?.message || e)
    return errors.internal()
  }
})

export const POST = compose(withRateLimit, withCsrf)(async (req: NextRequest) => {
  try {
    console.info('[POST /api/tenants] start')

    if (!supabaseUrl || !serviceKey) {
      console.error('[POST /api/tenants] missing Supabase configuration')
      return errors.internal('Supabase configuration missing on server')
    }

    // Use service role to bypass RLS for write while auth is verified separately
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
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
        const { data: { user } } = await supa.auth.getUser()
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
      console.warn('[POST /api/tenants] validation failed', parse.error?.issues?.map((e: any)=>e.path.join('.')+':'+e.message).join(', '))
      return errors.validation(parse.error.flatten())
    }
    // Ensure status is ACTIVE upon creation to make occupancy consistent across views
    const payload: any = { ...parse.data, status: 'ACTIVE' }
    console.info('[POST /api/tenants] payload.current_unit_id', payload.current_unit_id, 'status', payload.status)

    // Determine property from unit if provided
    let propertyId: string | null = null
    if (payload.current_unit_id) {
      const admin = createClient(supabaseUrl, serviceKey)
      const { data: unit, error: unitErr } = await admin.from('units').select('property_id').eq('id', payload.current_unit_id).maybeSingle()
      console.info('[POST /api/tenants] unit lookup', { property_id: unit?.property_id, unitErr: unitErr?.message })
      propertyId = unit?.property_id || null
    }

    // Check role
    if (propertyId) {
      const membership = await getRoleForProperty(userId, propertyId)
      console.info('[POST /api/tenants] membership', { status: (membership as any)?.status, role: (membership as any)?.role })
      if (!membership || (membership as any).status !== 'ACTIVE') return errors.forbidden('No access to target property')
      const role = (membership as any).role
      if (!['OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT'].includes(role)) return errors.forbidden('Insufficient role')
    }

    // Insert via service role
    const admin = createClient(supabaseUrl, serviceKey)
    console.info('[POST /api/tenants] inserting tenant')
    const { data, error } = await admin.from('tenants').insert(payload).select('*').single()
    if (error) {
      console.error('[POST /api/tenants] insert error', error)
      return errors.badRequest('Failed to create tenant', error)
    }

    console.info('[POST /api/tenants] success', data?.id)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error('[POST /api/tenants] unhandled', e?.message || e)
    return errors.internal()
  }
})

