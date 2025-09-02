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

// Validation schema for payment installment
const paymentInstallmentSchema = z.object({
  amount_kes: z.number().positive('Amount must be positive'),
  payment_date: z.string().optional(),
  payment_reference: z.string().optional(),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'OTHER']).optional(),
  notes: z.string().optional(),
})

// GET /api/properties/[id]/payment-installments - Fetch all payment installments for a property
export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/payment-installments
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId =
      propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: payments, error } = await admin
      .from('property_payment_installments')
      .select('*')
      .eq('property_id', propertyId)
      .order('installment_number', { ascending: true })

    if (error) {
      console.error('Error fetching payment installments:', error)
      return errors.internal('Failed to fetch payment installments')
    }

    return NextResponse.json({ ok: true, data: payments || [] })
  } catch (e: any) {
    console.error('GET /api/properties/[id]/payment-installments error:', e)
    return errors.internal(e?.message || 'Failed to fetch payment installments')
  }
}

// POST /api/properties/[id]/payment-installments - Add new payment installment
export const POST = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/payment-installments
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId =
      propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const parsed = paymentInstallmentSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Get the next installment number
    const { data: lastPayment } = await admin
      .from('property_payment_installments')
      .select('installment_number')
      .eq('property_id', propertyId)
      .order('installment_number', { ascending: false })
      .limit(1)
      .single()

    const nextInstallmentNumber = (lastPayment?.installment_number || 0) + 1

    // Insert the new payment installment
    const { data: payment, error } = await admin
      .from('property_payment_installments')
      .insert({
        property_id: propertyId,
        installment_number: nextInstallmentNumber,
        amount_kes: parsed.data.amount_kes,
        payment_date: parsed.data.payment_date,
        payment_reference: parsed.data.payment_reference,
        payment_method: parsed.data.payment_method,
        notes: parsed.data.notes,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating payment installment:', error)
      return errors.internal('Failed to create payment installment')
    }

    return NextResponse.json({ ok: true, data: payment })
  } catch (e: any) {
    console.error('POST /api/properties/[id]/payment-installments error:', e)
    return errors.internal(e?.message || 'Failed to create payment installment')
  }
})
