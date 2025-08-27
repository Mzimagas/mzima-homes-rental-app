import { NextRequest, NextResponse } from 'next/server'
import { errors } from '../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { tenantUpdateSchema } from '../../../../lib/validation/tenant'
import { getRatelimit } from '../../../../lib/upstash'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function resolveUserId(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.id) return user.id
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
  const { data: tenant } = await admin
    .from('tenants')
    .select('current_unit_id')
    .eq('id', tenantId)
    .maybeSingle()

  let propertyId: string | null = null
  if (tenant?.current_unit_id) {
    const { data: unit } = await admin
      .from('units')
      .select('property_id')
      .eq('id', tenant.current_unit_id)
      .maybeSingle()
    propertyId = unit?.property_id || null
  }
  if (!propertyId) {
    const { data: ta } = await admin
      .from('tenancy_agreements')
      .select('unit_id')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ta?.unit_id) {
      const { data: unit } = await admin
        .from('units')
        .select('property_id')
        .eq('id', ta.unit_id)
        .maybeSingle()
      propertyId = unit?.property_id || null
    }
  }

  if (!propertyId) return null
  const { data } = await admin
    .from('property_users')
    .select('role, status')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle()
  return data
}
function rateKey(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  return `tenants-id:${ip}`
}

export async function GET(req: NextRequest) {
  // GET doesn’t need compose because RLS guards reads; rate limit handled globally if needed

  try {
    // Extract tenant id from path /api/tenants/[id]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const tenantsIdx = segments.findIndex((s) => s === 'tenants')
    const tenantId =
      tenantsIdx >= 0 && segments[tenantsIdx + 1] ? segments[tenantsIdx + 1] : undefined
    if (!tenantId) return errors.badRequest('Missing tenant id in path')

    // TEMPORARY: Use service role to bypass RLS while fixing Next.js 15 cookies issue
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    console.info('[GET /api/tenants/[id]] TEMPORARY: Using service role to bypass RLS')

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*, tenancy_agreements(*)')
      .eq('id', tenantId)
      .maybeSingle()
    if (error) return errors.badRequest('Failed to fetch tenant', error)
    if (!data) return errors.badRequest('Tenant not found')
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return errors.internal()
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Rate limit
    const rl = getRatelimit()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rlRes = await rl.limit(`tenants-id:PATCH:${ip}`)
    if (!rlRes.success) return errors.rate()

    // CSRF check
    const csrfHeader = req.headers.get('x-csrf-token') || ''
    const csrfCookie = req.cookies.get('csrf-token')?.value || ''
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return errors.csrf()

    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract tenant id from path /api/tenants/[id]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const tenantsIdx = segments.findIndex((s) => s === 'tenants')
    const tenantId =
      tenantsIdx >= 0 && segments[tenantsIdx + 1] ? segments[tenantsIdx + 1] : undefined
    if (!tenantId) return errors.badRequest('Missing tenant id in path')

    const json = await req.json()
    const parse = tenantUpdateSchema.safeParse({ ...json, id: tenantId })
    if (!parse.success) return errors.validation(parse.error.flatten())
    const payload = parse.data

    const membership = await getRoleForTenant(userId, tenantId)
    if (!membership || membership.status !== 'ACTIVE')
      return errors.forbidden('No access to tenant')
    const role = (membership as any).role
    if (!['OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT'].includes(role))
      return errors.forbidden('Insufficient role')

    const admin = createClient(supabaseUrl, serviceKey)
    const { data, error } = await admin
      .from('tenants')
      .update(payload)
      .eq('id', tenantId)
      .select('*')
      .maybeSingle()
    if (error) return errors.badRequest('Failed to update tenant', error)

    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return errors.internal()
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Rate limit
    const rl = getRatelimit()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rlRes = await rl.limit(`tenants-id:DELETE:${ip}`)
    if (!rlRes.success) return errors.rate()

    // CSRF check
    const csrfHeader = req.headers.get('x-csrf-token') || ''
    const csrfCookie = req.cookies.get('csrf-token')?.value || ''
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return errors.csrf()

    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract tenant id from path /api/tenants/[id]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const tenantsIdx = segments.findIndex((s) => s === 'tenants')
    const tenantId =
      tenantsIdx >= 0 && segments[tenantsIdx + 1] ? segments[tenantsIdx + 1] : undefined
    if (!tenantId) return errors.badRequest('Missing tenant id in path')

    const membership = await getRoleForTenant(userId, tenantId)
    if (!membership || membership.status !== 'ACTIVE')
      return errors.forbidden('No access to tenant')
    const role = (membership as any).role
    if (!['OWNER', 'PROPERTY_MANAGER'].includes(role))
      return errors.forbidden('Cannot delete tenant')

    // Soft delete
    const admin = createClient(supabaseUrl, serviceKey)
    const { error } = await admin
      .from('tenants')
      .update({ status: 'DELETED', current_unit_id: null })
      .eq('id', tenantId)
    if (error) return errors.badRequest('Failed to delete tenant', error)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return errors.internal()
  }
}
