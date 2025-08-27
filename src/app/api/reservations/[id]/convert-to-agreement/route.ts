import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { errors } from '../../../../../lib/api/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const schema = z.object({
  start_date: z.string().min(1),
  monthly_rent_kes: z.coerce.number().optional().nullable(),
  deposit_kes: z.coerce.number().optional().nullable(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const json = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(json)
    if (!parsed.success) return errors.validation(parsed.error.flatten())

    const admin = createClient(supabaseUrl, serviceKey)

    // Load reservation + unit + property defaults
    const { data: resv, error: rErr } = await admin
      .from('reservation_requests')
      .select(
        '*, units(unit_label, monthly_rent_kes, deposit_kes, property_id), properties:property_id(default_align_billing_to_start, default_billing_day)'
      )
      .eq('id', params.id)
      .maybeSingle()
    if (rErr) return errors.badRequest('Failed to fetch reservation', rErr)
    if (!resv) return errors.badRequest('Reservation not found')

    const startDate = parsed.data.start_date
    const rent = parsed.data.monthly_rent_kes ?? resv.units?.monthly_rent_kes ?? null
    const deposit = parsed.data.deposit_kes ?? resv.units?.deposit_kes ?? null
    const align = resv.properties?.default_align_billing_to_start ?? true
    const billingDay = align ? null : (resv.properties?.default_billing_day ?? null)

    // Upsert a tenant if necessary (basic: by phone/email)
    let tenantId: string | null = null
    if (resv.email) {
      const { data: t } = await admin
        .from('tenants')
        .select('id')
        .eq('email', resv.email)
        .maybeSingle()
      tenantId = t?.id || null
    }
    if (!tenantId) {
      const { data: t2 } = await admin
        .from('tenants')
        .select('id')
        .eq('phone', resv.phone)
        .maybeSingle()
      tenantId = t2?.id || null
    }
    if (!tenantId) {
      const { data: tNew, error: tErr } = await admin
        .from('tenants')
        .insert({
          full_name: resv.full_name,
          phone: resv.phone,
          email: resv.email || null,
          national_id: '',
          notes: resv.message || null,
          current_unit_id: null,
          status: 'ACTIVE',
        })
        .select('id')
        .single()
      if (tErr) return errors.badRequest('Failed to create tenant', tErr)
      tenantId = tNew.id
    }

    // Create DRAFT tenancy_agreement
    const { data: ag, error: agErr } = await admin
      .from('tenancy_agreements')
      .insert({
        tenant_id: tenantId,
        unit_id: resv.unit_id,
        start_date: startDate,
        status: 'DRAFT',
        monthly_rent_kes: rent,
        deposit_kes: deposit,
        align_billing_to_start: align,
        billing_day: billingDay,
        notes: resv.message || null,
      })
      .select('id')
      .single()
    if (agErr) return errors.badRequest('Failed to create agreement', agErr)

    // Update reservation status to APPROVED
    await admin
      .from('reservation_requests')
      .update({ status: 'APPROVED', handled_at: new Date().toISOString() })
      .eq('id', params.id)

    return NextResponse.json({ ok: true, data: { agreement_id: ag.id } })
  } catch (e: any) {
    return errors.internal(e?.message || 'Failed')
  }
}
