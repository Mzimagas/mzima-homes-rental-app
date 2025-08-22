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

// Validation schema for payment receipt update
const paymentReceiptUpdateSchema = z.object({
  receipt_number: z.number().positive('Receipt number must be positive').optional(),
  amount_kes: z.number().positive('Amount must be positive').optional(),
  payment_date: z.string().optional(),
  payment_reference: z.string().optional(),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'OTHER']).optional(),
  notes: z.string().optional()
})

// PATCH /api/properties/[id]/payment-receipts/[receiptId] - Update payment receipt
export const PATCH = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id and receipt id from path /api/properties/[id]/payment-receipts/[receiptId]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    const receiptsIdx = segments.findIndex(s => s === 'payment-receipts')
    const receiptId = receiptsIdx >= 0 && segments[receiptsIdx + 1] ? segments[receiptsIdx + 1] : undefined

    if (!propertyId || !receiptId) return errors.badRequest('Missing property id or receipt id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const parsed = paymentReceiptUpdateSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    // Update in memory storage
    const updatedReceipt = MockStorageService.updatePaymentReceipt(propertyId, receiptId, parsed.data)

    if (!updatedReceipt) {
      return errors.notFound('Payment receipt not found')
    }

    console.log('Payment receipt updated in memory:', updatedReceipt)

    return NextResponse.json({ ok: true, data: updatedReceipt })
  } catch (e: any) {
    console.error('PATCH /api/properties/[id]/payment-receipts/[receiptId] error:', e)
    return errors.internal(e?.message || 'Failed to update payment receipt')
  }
})

// DELETE /api/properties/[id]/payment-receipts/[receiptId] - Delete payment receipt
export const DELETE = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id and receipt id from path /api/properties/[id]/payment-receipts/[receiptId]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    const receiptsIdx = segments.findIndex(s => s === 'payment-receipts')
    const receiptId = receiptsIdx >= 0 && segments[receiptsIdx + 1] ? segments[receiptsIdx + 1] : undefined

    if (!propertyId || !receiptId) return errors.badRequest('Missing property id or receipt id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    // Delete from memory storage
    const deleted = MockStorageService.deletePaymentReceipt(propertyId, receiptId)

    if (!deleted) {
      return errors.notFound('Payment receipt not found')
    }

    console.log('Payment receipt deleted from memory:', { receiptId, propertyId })

    return NextResponse.json({ ok: true, message: 'Payment receipt deleted successfully' })
  } catch (e: any) {
    console.error('DELETE /api/properties/[id]/payment-receipts/[receiptId] error:', e)
    return errors.internal(e?.message || 'Failed to delete payment receipt')
  }
})
