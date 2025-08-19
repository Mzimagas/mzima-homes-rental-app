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

    // Try the newer function signature first
    let { data, error } = await admin
      .rpc('get_user_accessible_properties', { user_uuid: userId })

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

// Validation schema for purchase price update
const purchasePriceSchema = z.object({
  purchase_price_agreement_kes: z.number().nonnegative('Purchase price must be non-negative'),
  change_reason: z.string().min(10, 'Change reason must be at least 10 characters').optional()
})

// PATCH /api/properties/[id]/purchase-price - Update purchase price in sales agreement
export const PATCH = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/purchase-price
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const parsed = purchasePriceSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // First, verify the property exists and get current price
    const { data: existingProperty, error: fetchError } = await admin
      .from('properties')
      .select('id, name, purchase_price_agreement_kes')
      .eq('id', propertyId)
      .single()

    if (fetchError || !existingProperty) {
      return errors.notFound('Property not found')
    }

    const oldPrice = existingProperty.purchase_price_agreement_kes
    const newPrice = parsed.data.purchase_price_agreement_kes

    // If price is changing and we have an existing price, require a reason
    if (oldPrice !== null && oldPrice !== newPrice && !parsed.data.change_reason) {
      return errors.badRequest('Change reason is required when modifying an existing purchase price')
    }

    // Record price change history if price is changing (including initial set)
    if (oldPrice !== newPrice) {
      try {
        // Determine reason: require for edits, auto-label for initial set
        const reason =
          oldPrice === null
            ? (parsed.data.change_reason || 'Initial purchase price entry')
            : parsed.data.change_reason!

        // Optionally fetch a human-friendly name
        let changed_by_name: string | undefined
        try {
          const { data: profile } = await admin
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single()
          changed_by_name = profile?.full_name || profile?.email || undefined
        } catch {}

        const insertPayload: any = {
          property_id: propertyId,
          previous_price_kes: oldPrice,
          new_price_kes: newPrice,
          change_reason: reason,
          changed_by: userId,
        }
        if (typeof changed_by_name === 'string') {
          insertPayload.changed_by_name = changed_by_name
        }

        const { error: historyInsertError } = await admin
          .from('property_purchase_price_history')
          .insert(insertPayload)

        if (historyInsertError) {
          console.error('Error inserting price change history:', historyInsertError)
          // Do not fail the overall request on history logging error
        }
      } catch (historyError) {
        console.error('Error recording price change history:', historyError)
        // Do not fail the overall request on history logging error
      }
    }

    // Update the purchase price
    const { data: updatedProperty, error: updateError } = await admin
      .from('properties')
      .update({
        purchase_price_agreement_kes: newPrice,
        purchase_price_last_updated_at: new Date().toISOString(),
        purchase_price_last_updated_by: userId
      })
      .eq('id', propertyId)
      .select('id, name, purchase_price_agreement_kes, purchase_price_last_updated_at')
      .single()

    if (updateError) {
      console.error('Error updating purchase price:', updateError)
      return errors.internal('Failed to update purchase price')
    }

    return NextResponse.json({ ok: true, data: updatedProperty })
  } catch (e: any) {
    console.error('PATCH /api/properties/[id]/purchase-price error:', e)
    return errors.internal(e?.message || 'Failed to update purchase price')
  }
})
