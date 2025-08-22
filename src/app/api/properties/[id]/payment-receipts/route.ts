import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'
import { z } from 'zod'
import { MockStorageService } from '../../../../../lib/mock-storage'

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

// Validation schema for payment receipt entry
const paymentReceiptSchema = z.object({
  receipt_number: z.number().positive('Receipt number must be positive'),
  amount_kes: z.number().positive('Amount must be positive'),
  payment_date: z.string().optional(),
  payment_reference: z.string().optional(),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'OTHER']).optional(),
  notes: z.string().optional()
})

// GET /api/properties/[id]/payment-receipts - Fetch all payment receipts for a property
export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/payment-receipts
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    // TODO: Replace with actual database query once table is created
    // For now, return empty array
    const receipts: any[] = []

    return NextResponse.json({ ok: true, data: receipts })
  } catch (e: any) {
    console.error('GET /api/properties/[id]/payment-receipts error:', e)
    return errors.internal(e?.message || 'Failed to fetch payment receipts')
  }
}

// POST /api/properties/[id]/payment-receipts - Add new payment receipt
export const POST = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/payment-receipts
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const parsed = paymentReceiptSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    // Use in-memory storage for development
    const receipt = {
      id: `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      property_id: propertyId,
      receipt_number: parsed.data.receipt_number,
      amount_kes: parsed.data.amount_kes,
      payment_date: parsed.data.payment_date,
      payment_reference: parsed.data.payment_reference,
      payment_method: parsed.data.payment_method,
      notes: parsed.data.notes,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Store in memory
    const savedReceipt = MockStorageService.addPaymentReceipt(propertyId, receipt)
    console.log('💾 Payment receipt saved to memory:', savedReceipt)
    console.log('💾 All receipts for this property now:', MockStorageService.getPaymentReceipts(propertyId))
    console.log('💾 Total receipts amount:', MockStorageService.getTotalReceipts(propertyId))

    return NextResponse.json({ ok: true, data: savedReceipt })
  } catch (e: any) {
    console.error('POST /api/properties/[id]/payment-receipts error:', e)
    return errors.internal(e?.message || 'Failed to create payment receipt')
  }
})
