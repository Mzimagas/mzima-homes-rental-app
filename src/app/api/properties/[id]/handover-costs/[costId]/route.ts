import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../../lib/api/middleware'
import { errors } from '../../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'
import { z } from 'zod'
import { MockStorageService } from '../../../../../../lib/mock-storage'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper function to resolve user ID from request
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

  console.warn('[resolveUserId] No valid authentication found')
  return null
}

// Check if user has access to this property
async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    
    const { data, error } = await admin
      .from('properties')
      .select('landlord_id')
      .eq('id', propertyId)
      .single()

    if (error || !data) {
      console.error('Property not found or error:', error)
      return false
    }

    return data.landlord_id === userId
  } catch (e) {
    console.error('Error checking property access:', e)
    return false
  }
}

// Validation schema for handover cost update
const handoverCostUpdateSchema = z.object({
  cost_type_id: z.string().min(1, 'Cost type is required').optional(),
  cost_category: z.enum(['PRE_HANDOVER', 'AGREEMENT_LEGAL', 'LCB_PROCESS', 'PAYMENT_TRACKING', 'TRANSFER_REGISTRATION', 'OTHER']).optional(),
  amount_kes: z.number().positive('Amount must be positive').optional(),
  payment_reference: z.string().optional(),
  payment_date: z.string().optional(),
  notes: z.string().optional()
})

// PATCH /api/properties/[id]/handover-costs/[costId] - Update cost entry
export const PATCH = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id and cost id from path /api/properties/[id]/handover-costs/[costId]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    const costsIdx = segments.findIndex(s => s === 'handover-costs')
    const costId = costsIdx >= 0 && segments[costsIdx + 1] ? segments[costsIdx + 1] : undefined

    if (!propertyId || !costId) return errors.badRequest('Missing property id or cost id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const parsed = handoverCostUpdateSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // First, verify the cost entry exists and belongs to the property
    const { data: existingCost, error: fetchError } = await admin
      .from('property_handover_costs')
      .select('id, property_id')
      .eq('id', costId)
      .eq('property_id', propertyId)
      .single()

    if (fetchError || !existingCost) {
      return errors.notFound('Cost entry not found')
    }

    // Update the cost entry
    const { data: cost, error } = await admin
      .from('property_handover_costs')
      .update(parsed.data)
      .eq('id', costId)
      .eq('property_id', propertyId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating handover cost:', error)
      return errors.internal('Failed to update handover cost')
    }

    return NextResponse.json({ ok: true, data: cost })
  } catch (e: any) {
    console.error('PATCH /api/properties/[id]/handover-costs/[costId] error:', e)
    return errors.internal(e?.message || 'Failed to update handover cost')
  }
})

// DELETE /api/properties/[id]/handover-costs/[costId] - Delete cost entry
export const DELETE = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id and cost id from path /api/properties/[id]/handover-costs/[costId]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    const costsIdx = segments.findIndex(s => s === 'handover-costs')
    const costId = costsIdx >= 0 && segments[costsIdx + 1] ? segments[costsIdx + 1] : undefined

    if (!propertyId || !costId) return errors.badRequest('Missing property id or cost id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    // Delete from memory storage
    const deleted = MockStorageService.deleteHandoverCost(propertyId, costId)

    if (!deleted) {
      return errors.notFound('Handover cost not found')
    }

    console.log('Handover cost deleted from memory:', { costId, propertyId })

    return NextResponse.json({ ok: true, message: 'Handover cost deleted successfully' })
  } catch (e: any) {
    console.error('DELETE /api/properties/[id]/handover-costs/[costId] error:', e)
    return errors.internal(e?.message || 'Failed to delete handover cost')
  }
})
