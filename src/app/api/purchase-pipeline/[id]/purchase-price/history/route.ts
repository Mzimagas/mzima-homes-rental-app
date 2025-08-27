import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compose, withAuth, withRateLimit, withCsrf } from '../../../../../../lib/api/middleware'
import { errors } from '../../../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'

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
    .select('created_by')
    .eq('id', purchaseId)
    .single()

  console.log('checkPurchaseAccess - purchase data:', data, 'error:', error)

  if (error || !data) {
    console.log('checkPurchaseAccess - purchase not found or error')
    return false
  }

  const hasAccess = data.created_by === userId
  console.log('checkPurchaseAccess - hasAccess:', hasAccess)
  return hasAccess
}

// GET /api/purchase-pipeline/[id]/purchase-price/history - Get purchase price change history for purchase pipeline entry
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

    console.log('GET purchase-price history - userId:', userId)
    console.log('GET purchase-price history - purchaseId:', purchaseId)

    // Check access
    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    if (!hasAccess) {
      console.log('GET purchase-price history - hasAccess:', hasAccess)
      return errors.forbidden()
    }

    console.log('GET purchase-price history - hasAccess:', hasAccess)

    const supabase = createClient(supabaseUrl, serviceKey)

    // For purchase pipeline, we'll check if there's a purchase price history table
    // or if we need to create a simple history from the purchase pipeline table itself

    // First, try to get history from property_purchase_price_history table using purchase pipeline ID
    const { data: history, error: historyError } = await supabase
      .from('property_purchase_price_history')
      .select(
        `
        id,
        previous_price_kes,
        new_price_kes,
        change_reason,
        changed_by,
        changed_at
      `
      )
      .eq('property_id', purchaseId)
      .order('changed_at', { ascending: false })

    if (historyError) {
      console.log('No purchase price history found, returning empty array:', historyError)
      // Return empty history for now - purchase pipeline entries might not have price change history yet
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Format the history data to match the expected structure
    // For each entry, fetch the user name separately
    const formattedHistory = await Promise.all(
      (history || []).map(async (entry) => {
        let changed_by_name = 'Unknown User'

        if (entry.changed_by) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', entry.changed_by)
              .single()

            changed_by_name = profile?.full_name || profile?.email || 'Unknown User'
          } catch (profileError) {
            console.log('Could not fetch profile for user:', entry.changed_by, profileError)
          }
        }

        return {
          id: entry.id,
          previous_price_kes: entry.previous_price_kes,
          new_price_kes: entry.new_price_kes,
          change_reason: entry.change_reason,
          changed_by_name,
          changed_at: entry.changed_at,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: formattedHistory,
    })
  } catch (error) {
    console.error('Error in GET purchase price history:', error)
    return errors.internal('Failed to fetch purchase price history')
  }
})
