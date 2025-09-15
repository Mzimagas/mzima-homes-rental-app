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

// Validation schema for handover price update
const handoverPriceUpdateSchema = z.object({
  handover_price_agreement_kes: z.number().positive('Handover price must be positive'),
  change_reason: z.string().min(1, 'Change reason is required'),
})

// PATCH /api/properties/[id]/handover-price - Update handover price
export const PATCH = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/handover-price
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId =
      propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const parsed = handoverPriceUpdateSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Get current price for history
    const { data: currentProperty, error: fetchError } = await admin
      .from('properties')
      .select('handover_price_agreement_kes')
      .eq('id', propertyId)
      .single()

    if (fetchError) {
      console.error('Error fetching current property:', fetchError)
      return errors.internal('Failed to fetch current property data')
    }

    // Update the property price and mirror to purchase price for consistency
    const { error: updateError } = await admin
      .from('properties')
      .update({
        handover_price_agreement_kes: parsed.data.handover_price_agreement_kes,
        purchase_price_agreement_kes: parsed.data.handover_price_agreement_kes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)

    if (updateError) {
      console.error('Error updating handover price:', updateError)
      return errors.internal('Failed to update handover price')
    }

    // TODO: Add to price history table when it's created
    // For now, we'll just log the change
    console.log('Handover price updated:', {
      propertyId,
      oldPrice: currentProperty?.handover_price_agreement_kes,
      newPrice: parsed.data.handover_price_agreement_kes,
      changeReason: parsed.data.change_reason,
      changedBy: userId,
      changeDate: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      message: 'Handover price updated successfully',
      data: {
        property_id: propertyId,
        new_price: parsed.data.handover_price_agreement_kes,
        change_reason: parsed.data.change_reason,
      },
    })
  } catch (e: any) {
    console.error('PATCH /api/properties/[id]/handover-price error:', e)
    return errors.internal(e?.message || 'Failed to update handover price')
  }
})
