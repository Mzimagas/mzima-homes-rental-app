import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getUserId(req: NextRequest): Promise<string | null> {
  // Primary: cookie-based session
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user.id
  } catch {}

  // Fallback: Bearer token in Authorization header
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const token = authHeader.substring(7)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error } = await anonClient.auth.getUser(token)

    return error ? null : user?.id || null
  } catch {
    return null
  }
}

async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data } = await admin
      .rpc('get_user_accessible_properties', { user_uuid: userId })

    return data?.some((p: any) => p.property_id === propertyId && p.can_edit_property) || false
  } catch {
    return false
  }
}

export const POST = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden('Insufficient permissions to perform reverse transfer')

    const body = await req.json().catch(() => ({})) as { reason?: string; notes?: string }
    const reason = (body.reason || 'Unspecified issue').toString()
    const notes = (body.notes || '').toString()

    const admin = createClient(supabaseUrl, serviceKey)

    // Load property
    const { data: property, error: propErr } = await admin
      .from('properties')
      .select('id, name, property_source, lifecycle_status, source_reference_id')
      .eq('id', propertyId)
      .single()

    if (propErr || !property) return errors.notFound('Property not found')
    if (property.property_source !== 'PURCHASE_PIPELINE') {
      return errors.badRequest('Only properties originating from the purchase pipeline can be moved back')
    }

    // Locate corresponding purchase record by source_reference_id or completed_property_id
    let purchaseId: string | null = property.source_reference_id
    if (!purchaseId) {
      const { data: purchaseByCompleted } = await admin
        .from('purchase_pipeline')
        .select('id')
        .eq('completed_property_id', propertyId)
        .maybeSingle()
      purchaseId = purchaseByCompleted?.id || null
    }

    if (!purchaseId) return errors.badRequest('Linked purchase pipeline record not found')

    // We will revert purchase_status to an appropriate non-complete state.
    // Since DB enum allows specific values, map issues to DUE_DILIGENCE as a safe default.
    const targetPurchaseStatus = 'DUE_DILIGENCE'

    // 1) Update purchase_pipeline first
    const { error: updatePurchaseErr, data: prevPurchase } = await admin
      .from('purchase_pipeline')
      .update({
        purchase_status: targetPurchaseStatus,
        actual_completion_date: null,
        completed_property_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseId)
      .select('id, purchase_status')
      .maybeSingle()

    if (updatePurchaseErr) return errors.internal('Failed to update purchase pipeline record')

    // 2) Update property
    const reverseNote = `Moved back to Purchase Pipeline on ${new Date().toLocaleDateString()} - Reason: ${reason}${notes ? `; Notes: ${notes}` : ''}`

    const { error: updatePropErr } = await admin
      .from('properties')
      .update({
        lifecycle_status: 'PENDING_PURCHASE',
        acquisition_notes: (reverseNote),
      })
      .eq('id', propertyId)

    // Also deactivate units for this property if any, as it's no longer an active managed property
    const { error: unitsErr } = await admin
      .from('units')
      .update({ is_active: false })
      .eq('property_id', propertyId)

    // Rollback purchase if property update failed
    if (updatePropErr) {
      await admin
        .from('purchase_pipeline')
        .update({ purchase_status: 'COMPLETED', completed_property_id: propertyId })
        .eq('id', purchaseId)
      return errors.internal('Failed to update property during reverse transfer')
    }

    // Fire-and-forget audit
    try {
      fetch(`${new URL(req.url).origin}/api/security/audit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          event: 'reverse_transfer', identifier: propertyId, details: { purchaseId, reason, notes }
        })
      }).catch(()=>{})
    } catch {}

    return NextResponse.json({ ok: true, data: { property_id: propertyId, purchase_id: purchaseId } })
  } catch (e) {
    console.error('[POST /api/properties/[id]/reverse-transfer] error:', e)
    return errors.internal()
  }
})

