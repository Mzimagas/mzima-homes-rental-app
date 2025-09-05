import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compose, withAuth, withRateLimit, withCsrf } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

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

// Helper function to check purchase pipeline access
async function checkPurchaseAccess(userId: string, idParam: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    console.log('checkPurchaseAccess - userId:', userId, 'idParam:', idParam)

    // First try to find by purchase pipeline ID
    let { data: purchase, error } = await admin
      .from('purchase_pipeline')
      .select('created_by, property_id, completed_property_id')
      .eq('id', idParam)
      .single()

    // If not found by purchase ID, try to find by property ID
    if (error && error.code === 'PGRST116') {
      console.log('checkPurchaseAccess - not found by purchase ID, trying property ID')
      const { data: purchaseByProperty, error: propertyError } = await admin
        .from('purchase_pipeline')
        .select('created_by, property_id, completed_property_id')
        .or(`property_id.eq.${idParam},completed_property_id.eq.${idParam}`)
        .single()

      if (!propertyError && purchaseByProperty) {
        purchase = purchaseByProperty
        error = null
        console.log('checkPurchaseAccess - found purchase by property ID:', purchase)
      }
    }

    console.log('checkPurchaseAccess - purchase data:', purchase, 'error:', error)

    if (error || !purchase) {
      console.log(
        'checkPurchaseAccess - no purchase pipeline record found, allowing access for regular property'
      )
      // Allow access for properties that don't have purchase pipeline records
      // These are just regular properties without purchase workflows
      return true
    }

    // Check if user created this purchase pipeline entry
    if (purchase.created_by === userId) {
      console.log('checkPurchaseAccess - user is creator')
      return true
    }

    // If purchase is linked to a property, check property access as fallback
    if (purchase.property_id || purchase.completed_property_id) {
      const propertyId = purchase.property_id || purchase.completed_property_id
      console.log('checkPurchaseAccess - checking property access for:', propertyId)

      try {
        // Check if user has access to the linked property
        const { data: propertyAccess, error: accessError } = await admin.rpc(
          'get_user_accessible_properties',
          { user_uuid: userId }
        )

        if (!accessError && Array.isArray(propertyAccess)) {
          const hasPropertyAccess = propertyAccess.some((p: any) => {
            if (typeof p === 'string') {
              return p === propertyId
            } else if (p && typeof p === 'object') {
              return p.property_id === propertyId
            }
            return false
          })

          console.log('checkPurchaseAccess - property access:', hasPropertyAccess)
          if (hasPropertyAccess) return true
        }

        // Fallback: Check direct property ownership
        const { data: property, error: propError } = await admin
          .from('properties')
          .select('id, landlord_id')
          .eq('id', propertyId)
          .eq('landlord_id', userId)
          .single()

        if (!propError && property) {
          console.log('checkPurchaseAccess - user owns linked property')
          return true
        }
      } catch (e) {
        console.log('checkPurchaseAccess - property access check failed:', e)
      }
    }

    console.log('checkPurchaseAccess - no access found')
    return false
  } catch (e) {
    console.log('checkPurchaseAccess - exception:', e)
    return false
  }
}

// GET /api/purchase-pipeline/[id]/financial - Get financial data for purchase pipeline entry
export const GET = compose(
  withRateLimit,
  withAuth
)(async (req: NextRequest): Promise<NextResponse> => {
  try {
    console.log('[financial] Starting auth check...')
    console.log('[financial] headers.authorization =', req.headers.get('authorization'))
    console.log('[financial] cookies present =', req.headers.get('cookie') ? 'yes' : 'no')

    const userId = await resolveUserId(req)
    console.log('[financial] userId from resolveUserId:', userId)

    if (!userId) {
      console.warn('[financial] 403 — no userId from resolveUserId')
      return errors.unauthorized()
    }

    // Extract id from path (could be purchase pipeline ID or property ID)
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex((s) => s === 'purchase-pipeline')
    const idParam =
      pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    if (!idParam) return errors.badRequest('Missing id in path')

    console.log('GET purchase-pipeline financial - idParam:', idParam)

    const hasAccess = await checkPurchaseAccess(userId, idParam)
    console.log('[financial] hasAccess check result:', hasAccess)

    if (!hasAccess) {
      console.warn('[financial] No purchase pipeline record found for:', idParam)
      // Return empty financial data for properties without purchase pipeline records
      console.log(
        '[financial] Returning empty financial data for property without purchase pipeline'
      )
      return Response.json({
        costs: [],
        payments: [],
        purchase_price_agreement_kes: 0,
        purchase_price_history: [],
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Get purchase pipeline data - try by ID first, then by property ID
    let purchase: any = null
    let actualPurchaseId: string = idParam

    // First try to get by purchase pipeline ID
    let { data: purchaseData, error: purchaseError } = await admin
      .from('purchase_pipeline')
      .select('*')
      .eq('id', idParam)
      .single()

    if (purchaseError && purchaseError.code === 'PGRST116') {
      // If not found by purchase ID, try by property ID
      console.log('Trying to find purchase by property ID:', idParam)
      const { data: purchaseByProperty, error: propertyError } = await admin
        .from('purchase_pipeline')
        .select('*')
        .or(`property_id.eq.${idParam},completed_property_id.eq.${idParam}`)
        .single()

      if (!propertyError && purchaseByProperty) {
        purchaseData = purchaseByProperty
        actualPurchaseId = purchaseByProperty.id
        purchaseError = null
        console.log('Found purchase by property ID:', actualPurchaseId)
      }
    }

    if (purchaseError || !purchaseData) {
      console.log('Purchase pipeline entry not found for:', idParam)
      return errors.notFound('Purchase pipeline entry not found')
    }

    purchase = purchaseData

    // Get the property ID to use for financial data queries
    const propertyIdForFinancials =
      purchase.property_id || purchase.completed_property_id || actualPurchaseId
    console.log('Using property ID for financial queries:', propertyIdForFinancials)

    // Get real financial data from the shared tables using the property ID
    const [costsResult, paymentsResult] = await Promise.all([
      admin
        .from('property_acquisition_costs')
        .select('*')
        .eq('property_id', propertyIdForFinancials)
        .order('created_at', { ascending: true }),
      admin
        .from('property_payment_installments')
        .select('*')
        .eq('property_id', propertyIdForFinancials)
        .order('payment_date', { ascending: true }),
    ])

    const financialData = {
      costs: costsResult.data || [],
      payments: paymentsResult.data || [],
      purchase_price_agreement_kes: purchase.negotiated_price_kes || purchase.asking_price_kes || 0,
      purchase_price_history: [], // Purchase pipeline doesn't have price history yet
    }

    return Response.json(financialData)
  } catch (error) {
    console.error('Error fetching purchase pipeline financial data:', error)
    return errors.internal('Failed to fetch financial data')
  }
})

// PATCH /api/purchase-pipeline/[id]/financial - Update financial data for purchase pipeline entry
export const PATCH = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const userId = await resolveUserId(req)
    console.log('PATCH purchase-pipeline financial - userId:', userId)
    if (!userId) return errors.unauthorized()

    // Extract purchase id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex((s) => s === 'purchase-pipeline')
    const purchaseId =
      pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    console.log('PATCH purchase-pipeline financial - purchaseId:', purchaseId)
    if (!purchaseId) return errors.badRequest('Missing purchase id in path')

    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    console.log('PATCH purchase-pipeline financial - hasAccess:', hasAccess)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    console.log('PATCH request body:', json)
    const admin = createClient(supabaseUrl, serviceKey)

    // Get current purchase pipeline data to check for price changes
    const { data: currentPurchase, error: fetchError } = await admin
      .from('purchase_pipeline')
      .select('negotiated_price_kes, asking_price_kes')
      .eq('id', purchaseId)
      .single()

    if (fetchError) {
      console.error('Error fetching current purchase pipeline data:', fetchError)
      return errors.internal('Failed to fetch current data')
    }

    console.log('Current purchase data:', currentPurchase)

    // Update purchase pipeline with financial data
    const updateData: any = {}
    let priceChanged = false
    let oldPrice = null
    let newPrice = null

    if (json.negotiated_price_kes !== undefined) {
      const currentPrice = currentPurchase.negotiated_price_kes
      const incomingPrice = parseFloat(json.negotiated_price_kes)

      console.log('Price comparison - current:', currentPrice, 'incoming:', incomingPrice)

      if (currentPrice !== incomingPrice) {
        priceChanged = true
        oldPrice = currentPrice
        newPrice = incomingPrice
        console.log('Price changed detected! Old:', oldPrice, 'New:', newPrice)
      }

      updateData.negotiated_price_kes = json.negotiated_price_kes
    }

    if (json.asking_price_kes !== undefined) {
      updateData.asking_price_kes = json.asking_price_kes
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString()

      const { error: updateError } = await admin
        .from('purchase_pipeline')
        .update(updateData)
        .eq('id', purchaseId)

      if (updateError) {
        console.error('Error updating purchase pipeline:', updateError)
        return errors.internal('Failed to update purchase pipeline')
      }

      // Record price change history if price changed
      console.log(
        'Checking price change history - priceChanged:',
        priceChanged,
        'change_reason:',
        json.change_reason
      )
      if (priceChanged && json.change_reason) {
        console.log('Recording price change history...')
        try {
          const { error: historyError } = await admin
            .from('property_purchase_price_history')
            .insert({
              property_id: purchaseId, // Using purchase pipeline ID as property_id
              previous_price_kes: oldPrice,
              new_price_kes: newPrice,
              change_reason: json.change_reason,
              changed_by: userId,
            })

          if (historyError) {
            console.error('Error recording price change history:', historyError)
            // Don't fail the whole request if history recording fails
          } else {
            console.log('Successfully recorded price change history')
          }
        } catch (historyRecordError) {
          console.error('Error recording price change history:', historyRecordError)
          // Don't fail the whole request if history recording fails
        }
      } else {
        console.log(
          'Not recording price change history - priceChanged:',
          priceChanged,
          'change_reason present:',
          !!json.change_reason
        )
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error updating purchase pipeline financial data:', error)
    return errors.internal('Failed to update financial data')
  }
})
