import { NextRequest, NextResponse } from 'next/server'

import { errors } from '../../../../../lib/api/errors'
import { getRatelimit } from '../../../../../lib/upstash'
import { tenantMoveSchema } from '../../../../../lib/validation/tenant'

import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function resolveUserId(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
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

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const rl = getRatelimit()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rlRes = await rl.limit(`tenants-move:POST:${ip}`)
    if (!rlRes.success) return errors.rate()

    // CSRF
    const csrfHeader = req.headers.get('x-csrf-token') || ''
    const csrfCookie = req.cookies.get('csrf-token')?.value || ''
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return errors.csrf()

    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract tenant id from path /api/tenants/[id]/move
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const tenantsIdx = segments.findIndex(s => s === 'tenants')
    const tenantId = tenantsIdx >= 0 && segments[tenantsIdx + 1] ? segments[tenantsIdx + 1] : undefined
    if (!tenantId) return errors.badRequest('Missing tenant id in path')

    const json = await req.json()
    const parse = tenantMoveSchema.safeParse(json)
    if (!parse.success) {
      return errors.validation(parse.error.flatten())
    }
    const { new_unit_id, monthly_rent_kes, move_date, reason, notes, end_current_agreement } = parse.data

    const admin = createClient(supabaseUrl, serviceKey)

    // Validate tenant exists and get current unit info
    const { data: tenant, error: tenantErr } = await admin
      .from('tenants')
      .select('id, full_name, current_unit_id')
      .eq('id', tenantId)
      .single()
    if (tenantErr || !tenant) return errors.badRequest('Tenant not found')

    // Validate new unit exists and get property info
    const { data: unit, error: unitErr } = await admin
      .from('units')
      .select('id, property_id, unit_label, monthly_rent_kes')
      .eq('id', new_unit_id)
      .single()
    if (unitErr || !unit) return errors.badRequest('Invalid unit')

    // Load property defaults
    const { data: prop, error: propErr } = await admin
      .from('properties')
      .select('id, default_billing_day, default_align_billing_to_start')
      .eq('id', unit.property_id)
      .maybeSingle()
    if (propErr) return errors.badRequest('Failed to load property defaults')

    // Check if tenant is already in this unit
    if (tenant.current_unit_id === new_unit_id) {
      return errors.badRequest('Tenant is already in this unit')
    }

    // Check if unit is occupied by another tenant
    const { data: existingTenant, error: occupancyErr } = await admin
      .from('tenants')
      .select('id, full_name')
      .eq('current_unit_id', new_unit_id)
      .neq('id', tenantId)
      .maybeSingle()

    if (occupancyErr) return errors.badRequest('Failed to check unit occupancy')
    if (existingTenant) {
      return errors.badRequest(`Unit ${unit.unit_label} is currently occupied by ${existingTenant.full_name}`)
    }

    // Check role for the property
    const { data: membership } = await admin
      .from('property_users')
      .select('role, status')
      .eq('user_id', userId)
      .eq('property_id', unit.property_id)
      .maybeSingle()
    if (!membership || (membership as any).status !== 'ACTIVE') return errors.forbidden('No access to property')
    const role = (membership as any).role
    if (!['OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT'].includes(role)) return errors.forbidden('Insufficient role')

    // Parse move date
    const moveDate = new Date(move_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Validate move date is not in the past
    if (moveDate < today) {
      return errors.badRequest('Move date cannot be in the past')
    }

    // End current active agreement if requested and tenant has one
    if (end_current_agreement && tenant.current_unit_id) {
      const endDate = new Date(moveDate)
      endDate.setDate(endDate.getDate() - 1) // End the day before move

      const { error: endErr } = await admin
        .from('tenancy_agreements')
        .update({
          end_date: endDate.toISOString().slice(0, 10),
          status: 'ENDED',
          notes: notes ? `Move to ${unit.unit_label}. ${notes}` : `Move to ${unit.unit_label}`
        })
        .eq('tenant_id', tenantId)
        .is('end_date', null)
        .eq('status', 'ACTIVE')

      if (endErr) return errors.badRequest('Failed to end current agreement', endErr)
    }

    // Create new agreement starting on move date
    const alignBilling = (parse.data.align_billing_to_start ?? prop?.default_align_billing_to_start ?? true)
    const resolvedBillingDay = alignBilling
      ? new Date(move_date).getDate()
      : (parse.data.billing_day || prop?.default_billing_day || new Date(move_date).getDate())

    const { data: createdAgreement, error: createErr } = await admin.from('tenancy_agreements').insert({
      tenant_id: tenantId,
      unit_id: new_unit_id,
      start_date: move_date,
      status: moveDate <= today ? 'ACTIVE' : 'PENDING',
      monthly_rent_kes: monthly_rent_kes || unit.monthly_rent_kes,
      billing_day: resolvedBillingDay,
      align_billing_to_start: alignBilling,
      notes: reason ? `Move reason: ${reason}${notes ? `. ${notes}` : ''}` : notes
    }).select('id').single()
    if (createErr) return errors.badRequest('Failed to create new agreement', createErr)

    // Create first-month prorated invoice if applicable
    const { error: prorationErr } = await admin.rpc('create_first_month_prorated_invoice', { p_tenancy_agreement_id: createdAgreement?.id })
    if (prorationErr) {
      console.warn('[move] proration failed', prorationErr.message)
    }

    // Update tenant current_unit_id (only if move is today or in the past)
    if (moveDate <= today) {
      const { error: updErr } = await admin
        .from('tenants')
        .update({ current_unit_id: new_unit_id })
        .eq('id', tenantId)
      if (updErr) return errors.badRequest('Failed to update tenant current unit', updErr)
    }

    return NextResponse.json({
      ok: true,
      message: moveDate <= today
        ? `${tenant.full_name} has been moved to ${unit.unit_label}`
        : `${tenant.full_name} is scheduled to move to ${unit.unit_label} on ${move_date}`
    })
  } catch (e) {
    console.error('Move tenant error:', e)
    return errors.internal()
  }
}

