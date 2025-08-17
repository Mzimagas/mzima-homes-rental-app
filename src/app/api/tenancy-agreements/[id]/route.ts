import { NextRequest, NextResponse } from 'next/server'
import { errors } from '../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const Body = z.object({
  billing_day: z.number().int().min(1).max(31).optional(),
  align_billing_to_start: z.boolean().optional()
})

async function getRoleForAgreement(userId: string, agreementId: string) {
  const admin = createClient(supabaseUrl, serviceKey)
  const { data: ta } = await admin
    .from('tenancy_agreements')
    .select('unit_id')
    .eq('id', agreementId)
    .maybeSingle()
  if (!ta?.unit_id) return null
  const { data: unit } = await admin
    .from('units')
    .select('property_id')
    .eq('id', ta.unit_id)
    .maybeSingle()
  const propertyId = unit?.property_id
  if (!propertyId) return null
  const { data: membership } = await admin
    .from('property_users')
    .select('role, status')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle()
  return membership
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = createClient(supabaseUrl, serviceKey)

    // Extract agreement id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const idx = segments.findIndex(s => s === 'tenancy-agreements')
    const agreementId = idx >= 0 && segments[idx + 1] ? segments[idx + 1] : undefined
    if (!agreementId) return errors.badRequest('Missing agreement id in path')

    // Auth via server-side session
    const { data: userCheck } = await admin.auth.getUser()
    const userId = userCheck?.user?.id
    if (!userId) return errors.unauthorized()

    const membership = await getRoleForAgreement(userId, agreementId)
    if (!membership || membership.status !== 'ACTIVE') return errors.forbidden('No access to tenancy agreement')
    const role = (membership as any).role
    if (!['OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT'].includes(role)) return errors.forbidden('Insufficient role')

    const parsed = Body.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return errors.validation(parsed.error.flatten())

    const { billing_day, align_billing_to_start } = parsed.data

    const { data, error } = await admin
      .from('tenancy_agreements')
      .update({ billing_day, align_billing_to_start })
      .eq('id', agreementId)
      .select('*')
      .maybeSingle()

    if (error) return errors.badRequest('Failed to update tenancy agreement', error)
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return errors.internal()
  }
}

