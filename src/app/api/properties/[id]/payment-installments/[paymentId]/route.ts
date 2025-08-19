import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../../lib/api/middleware'
import { errors } from '../../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'

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

  return null
}

// Helper function to check property access
async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data } = await admin
      .rpc('get_user_accessible_properties', { user_uuid: userId })

    return data?.some((p: any) => p.property_id === propertyId) || false
  } catch {
    return false
  }
}

// DELETE /api/properties/[id]/payment-installments/[paymentId] - Delete payment installment
export const DELETE = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id and payment id from path /api/properties/[id]/payment-installments/[paymentId]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    const paymentsIdx = segments.findIndex(s => s === 'payment-installments')
    const paymentId = paymentsIdx >= 0 && segments[paymentsIdx + 1] ? segments[paymentsIdx + 1] : undefined

    if (!propertyId || !paymentId) return errors.badRequest('Missing property id or payment id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)

    // First, verify the payment exists and belongs to the property
    const { data: existingPayment, error: fetchError } = await admin
      .from('property_payment_installments')
      .select('id, property_id, installment_number')
      .eq('id', paymentId)
      .eq('property_id', propertyId)
      .single()

    if (fetchError || !existingPayment) {
      return errors.notFound('Payment installment not found')
    }

    // Delete the payment installment
    const { error: deleteError } = await admin
      .from('property_payment_installments')
      .delete()
      .eq('id', paymentId)
      .eq('property_id', propertyId)

    if (deleteError) {
      console.error('Error deleting payment installment:', deleteError)
      return errors.internal('Failed to delete payment installment')
    }

    // After deletion, we should renumber the remaining installments to maintain sequence
    // Get all remaining payments for this property
    const { data: remainingPayments, error: remainingError } = await admin
      .from('property_payment_installments')
      .select('id, installment_number')
      .eq('property_id', propertyId)
      .order('installment_number', { ascending: true })
    
    if (!remainingError && remainingPayments) {
      // Renumber the installments to maintain sequence (1, 2, 3, ...)
      const updates = remainingPayments.map((payment, index) => ({
        id: payment.id,
        installment_number: index + 1
      }))
      
      // Update installment numbers if needed
      for (const update of updates) {
        if (update.installment_number !== remainingPayments.find(p => p.id === update.id)?.installment_number) {
          await admin
            .from('property_payment_installments')
            .update({ installment_number: update.installment_number })
            .eq('id', update.id)
        }
      }
    }
    
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /api/properties/[id]/payment-installments/[paymentId] error:', e)
    return errors.internal(e?.message || 'Failed to delete payment installment')
  }
})
