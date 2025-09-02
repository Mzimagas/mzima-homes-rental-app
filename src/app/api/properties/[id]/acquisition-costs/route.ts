import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
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

// Helper function to check property access
async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)

    // Try the newer function signature first
    const { data, error } = await admin.rpc('get_user_accessible_properties', { user_uuid: userId })

    if (error) {
      // Fallback: Check if user owns the property directly
      const { data: property, error: propError } = await admin
        .from('properties')
        .select('id, landlord_id')
        .eq('id', propertyId)
        .eq('landlord_id', userId)
        .single()

      if (propError) {
        return false
      }

      return !!property
    }

    // Handle different function return formats
    let hasAccess = false
    if (Array.isArray(data)) {
      // Check if data contains property_id field (newer format) or just UUIDs (older format)
      hasAccess = data.some((p: any) => {
        if (typeof p === 'string') {
          // Old format: array of UUIDs
          return p === propertyId
        } else if (p && typeof p === 'object') {
          // New format: array of objects with property_id field
          return p.property_id === propertyId
        }
        return false
      })
    }

    return hasAccess
  } catch (e) {
    return false
  }
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

// GET /api/properties/[id]/acquisition-costs - Fetch all cost entries for a property
export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/acquisition-costs
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId =
      propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: costs, error } = await admin
      .from('property_acquisition_costs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching acquisition costs:', error)
      return errors.internal('Failed to fetch acquisition costs')
    }

    return NextResponse.json({ ok: true, data: costs || [] })
  } catch (e: any) {
    console.error('GET /api/properties/[id]/acquisition-costs error:', e)
    return errors.internal(e?.message || 'Failed to fetch acquisition costs')
  }
}

// POST /api/properties/[id]/acquisition-costs - Add new cost entry
export const POST = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/acquisition-costs
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId =
      propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const parsed = acquisitionCostSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Insert the new cost entry
    const { data: cost, error } = await admin
      .from('property_acquisition_costs')
      .insert({
        property_id: propertyId,
        cost_type_id: parsed.data.cost_type_id,
        cost_category: parsed.data.cost_category,
        amount_kes: parsed.data.amount_kes,
        payment_reference: parsed.data.payment_reference,
        payment_date: parsed.data.payment_date,
        notes: parsed.data.notes,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating acquisition cost:', error)
      return errors.internal('Failed to create acquisition cost')
    }

    return NextResponse.json({ ok: true, data: cost })
  } catch (e: any) {
    console.error('POST /api/properties/[id]/acquisition-costs error:', e)
    return errors.internal(e?.message || 'Failed to create acquisition cost')
  }
})
