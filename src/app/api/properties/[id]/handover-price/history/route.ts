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

// GET /api/properties/[id]/handover-price/history - Get handover price history
export const GET = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/handover-price/history
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    // TODO: Replace with actual price history table query once table is created
    // For now, return mock history data based on current property price
    const admin = createClient(supabaseUrl, serviceKey)
    
    const { data: property, error: propertyError } = await admin
      .from('properties')
      .select('handover_price_agreement_kes, created_at, updated_at')
      .eq('id', propertyId)
      .single()

    if (propertyError) {
      console.error('Error fetching property:', propertyError)
      return errors.internal('Failed to fetch property data')
    }

    // Mock history data - replace with actual table query when available
    const mockHistory = []
    
    if (property?.handover_price_agreement_kes) {
      mockHistory.push({
        id: 'initial',
        property_id: propertyId,
        price_kes: property.handover_price_agreement_kes,
        change_date: property.created_at,
        change_reason: 'Initial handover price set',
        changed_by: 'System',
        created_at: property.created_at
      })
    }

    return NextResponse.json({ 
      ok: true, 
      data: mockHistory,
      message: 'Price history retrieved successfully'
    })
  } catch (e: any) {
    console.error('GET /api/properties/[id]/handover-price/history error:', e)
    return errors.internal(e?.message || 'Failed to fetch handover price history')
  }
})
