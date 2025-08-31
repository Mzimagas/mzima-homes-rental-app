import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compose, withAuth, withRateLimit, withCsrf } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper function to resolve user ID from request
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // Primary: cookie-based session
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) return user.id
  } catch (e) {
    console.warn('[resolveUserId] Cookie auth failed:', e)
  }

  // Fallback: Bearer token in Authorization header
  const auth = req.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7)
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (anon) {
      try {
        const anonClient = createClient(supabaseUrl, anon)
        const { data: tokenUser } = await anonClient.auth.getUser(token)
        if (tokenUser?.user) return tokenUser.user.id
      } catch (e) {
        console.warn('[resolveUserId] Token auth failed:', e)
      }
    }
  }

  return null
}

// Check if user has access to this purchase pipeline entry
async function checkPurchaseAccess(userId: string, purchaseId: string): Promise<boolean> {
  console.log('checkPurchaseAccess - userId:', userId, 'purchaseId:', purchaseId)

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data, error } = await supabase
    .from('purchase_pipeline')
    .select('created_by, property_id, completed_property_id')
    .eq('id', purchaseId)
    .single()

  console.log('checkPurchaseAccess - purchase data:', data, 'error:', error)

  if (error || !data) {
    console.log('checkPurchaseAccess - purchase not found or error')
    return false
  }

  // Check if user created this purchase pipeline entry
  if (data.created_by === userId) {
    console.log('checkPurchaseAccess - user is creator')
    return true
  }

  // If purchase is linked to a property, check property access as fallback
  if (data.property_id || data.completed_property_id) {
    const propertyId = data.property_id || data.completed_property_id
    console.log('checkPurchaseAccess - checking property access for:', propertyId)

    try {
      // Check if user has access to the linked property
      const { data: propertyAccess, error: accessError } = await supabase.rpc(
        'get_user_accessible_properties',
        { user_uuid: userId }
      )

      if (!accessError && Array.isArray(propertyAccess)) {
        const hasPropertyAccess = propertyAccess.some((p: any) => {
          if (typeof p === 'string') {
            return p === propertyId
          } else if (p && typeof p === 'object') {
            return p.property_id === propertyId
          }
          return false
        })

        console.log('checkPurchaseAccess - property access:', hasPropertyAccess)
        if (hasPropertyAccess) return true
      }

      // Fallback: Check direct property ownership
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id, landlord_id')
        .eq('id', propertyId)
        .eq('landlord_id', userId)
        .single()

      if (!propError && property) {
        console.log('checkPurchaseAccess - user owns linked property')
        return true
      }
    } catch (e) {
      console.log('checkPurchaseAccess - property access check failed:', e)
    }
  }

  console.log('checkPurchaseAccess - no access found')
  return false
}

// Validation schema for acquisition cost entry
const acquisitionCostSchema = z.object({
  cost_type_id: z.string().min(1, 'Cost type is required'),
  cost_category: z.enum([
    'PRE_PURCHASE',
    'AGREEMENT_LEGAL',
    'LCB_PROCESS',
    'TRANSFER_REGISTRATION',
    'OTHER',
  ]),
  amount_kes: z.number().positive('Amount must be positive'),
  payment_reference: z.string().optional(),
  payment_date: z.string().optional(),
  notes: z.string().optional(),
})

// GET /api/purchase-pipeline/[id]/acquisition-costs - Get acquisition costs for purchase pipeline entry
export const GET = compose(
  withAuth,
  withRateLimit,
  withCsrf
)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract purchase id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex((s) => s === 'purchase-pipeline')
    const purchaseId =
      pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    if (!purchaseId) return errors.badRequest('Missing purchase id in path')

    console.log('GET acquisition-costs - userId:', userId)
    console.log('GET acquisition-costs - purchaseId:', purchaseId)

    // Check access
    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    if (!hasAccess) {
      console.log('GET acquisition-costs - hasAccess:', hasAccess)
      return errors.forbidden()
    }

    console.log('GET acquisition-costs - hasAccess:', hasAccess)

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('property_acquisition_costs')
      .select('*')
      .eq('property_id', purchaseId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching acquisition costs:', error)
      return errors.internal('Failed to fetch acquisition costs')
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error in GET acquisition costs:', error)
    return errors.internal('Failed to fetch acquisition costs')
  }
})

// POST /api/purchase-pipeline/[id]/acquisition-costs - Create acquisition cost for purchase pipeline entry
export const POST = compose(
  withAuth,
  withRateLimit,
  withCsrf
)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract purchase id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex((s) => s === 'purchase-pipeline')
    const purchaseId =
      pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    if (!purchaseId) return errors.badRequest('Missing purchase id in path')

    console.log('POST acquisition-costs - userId:', userId)
    console.log('POST acquisition-costs - purchaseId:', purchaseId)

    // Check access
    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    if (!hasAccess) {
      console.log('POST acquisition-costs - hasAccess:', hasAccess)
      return errors.forbidden()
    }

    console.log('POST acquisition-costs - hasAccess:', hasAccess)

    const json = await req.json().catch(() => ({}))
    const parsed = acquisitionCostSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('property_acquisition_costs')
      .insert({
        property_id: purchaseId,
        cost_type_id: parsed.data.cost_type_id,
        cost_category: parsed.data.cost_category,
        amount_kes: parsed.data.amount_kes,
        payment_reference: parsed.data.payment_reference,
        payment_date: parsed.data.payment_date,
        notes: parsed.data.notes,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating acquisition cost:', error)
      return errors.internal('Failed to create acquisition cost')
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST acquisition costs:', error)
    return errors.internal('Failed to create acquisition cost')
  }
})
