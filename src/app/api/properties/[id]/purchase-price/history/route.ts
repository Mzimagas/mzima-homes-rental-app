import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../../lib/api/middleware'
import { errors } from '../../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'

interface PurchasePriceHistoryEntry {
  id: string
  previous_price_kes: number | null
  new_price_kes: number
  change_reason: string
  changed_by: string
  changed_by_name: string
  changed_at: string
}

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
      console.error('checkPropertyAccess - RPC error:', error)

      // Fallback: Check if user owns the property directly
      const { data: property, error: propError } = await admin
        .from('properties')
        .select('id, landlord_id')
        .eq('id', propertyId)
        .eq('landlord_id', userId)
        .single()

      if (propError) {
        console.error('checkPropertyAccess - property ownership check error:', propError)
        return false
      }

      return !!property
    }

    // Handle different function return formats
    let hasAccess = false
    if (Array.isArray(data)) {
      hasAccess = data.some((p: any) => {
        if (typeof p === 'string') {
          return p === propertyId
        } else if (p && typeof p === 'object') {
          return p.property_id === propertyId
        }
        return false
      })
    }

    return hasAccess
  } catch (e) {
    console.error('checkPropertyAccess - exception:', e)
    return false
  }
}

// GET /api/properties/[id]/purchase-price/history - Get purchase price change history
export const GET = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/purchase-price/history
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const propertyId = pathSegments[pathSegments.indexOf('properties') + 1]

    const admin = createClient(supabaseUrl, serviceKey)

    // Check property access using the same logic as purchase-price endpoint
    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) {
      return errors.forbidden('Access denied')
    }

    // Get purchase price history
    const { data: history, error: historyError } = await admin
      .from('property_purchase_price_history')
      .select(`
        id,
        previous_price_kes,
        new_price_kes,
        change_reason,
        changed_by,
        changed_by_name,
        changed_at
      `)
      .eq('property_id', propertyId)
      .order('changed_at', { ascending: false })

    if (historyError) {
      console.error('Error fetching purchase price history:', historyError)
      return errors.internal('Failed to fetch purchase price history')
    }
    return NextResponse.json({
      success: true,
      data: history || []
    })

  } catch (error) {
    console.error('Error in purchase price history API:', error)
    return errors.internal('Internal server error')
  }
})
