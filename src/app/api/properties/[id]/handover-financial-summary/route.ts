import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'
import { MockStorageService } from '../../../../../lib/mock-storage'

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

// GET /api/properties/[id]/handover-financial-summary - Get comprehensive handover financial summary
export const GET = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/handover-financial-summary
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId =
      propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)

    // Get property basic info
    const { data: property, error: propertyError } = await admin
      .from('properties')
      .select('id, name, handover_price_agreement_kes')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return errors.notFound('Property not found')
    }

    // Get REAL data from in-memory storage
    const handoverPrice = property.handover_price_agreement_kes || 0
    const costEntries = MockStorageService.getHandoverCosts(propertyId)
    const paymentReceipts = MockStorageService.getPaymentReceipts(propertyId)

    console.log('🔍 CLEAN REAL DATA FROM STORAGE:', {
      propertyId,
      handoverPrice,
      costEntriesCount: costEntries.length,
      paymentReceiptsCount: paymentReceipts.length,
      costEntries: costEntries.map((c) => ({
        id: c.id,
        amount: c.amount_kes,
        category: c.cost_category,
        type: c.cost_type_id,
        date: c.payment_date,
      })),
      paymentReceipts: paymentReceipts.map((p) => ({
        id: p.id,
        amount: p.amount_kes,
        receipt_number: p.receipt_number,
        date: p.payment_date,
      })),
    })

    // Calculate totals
    const totalCosts = costEntries.reduce((sum, cost) => sum + cost.amount_kes, 0)
    const totalReceipts = paymentReceipts.reduce((sum, receipt) => sum + receipt.amount_kes, 0)
    const remainingBalance = handoverPrice - totalReceipts
    const totalIncome = handoverPrice - totalCosts

    console.log('💰 CLEAN FINANCIAL SUMMARY:', {
      handoverPrice,
      totalCosts,
      totalReceipts,
      remainingBalance,
      totalIncome,
    })

    const summary = {
      property_id: propertyId,
      handover_price_agreement_kes: handoverPrice,
      total_handover_costs_kes: totalCosts,
      total_receipts_kes: totalReceipts,
      remaining_balance_kes: remainingBalance,
      total_income_kes: totalIncome,
      payment_progress_percentage: handoverPrice > 0 ? (totalReceipts / handoverPrice) * 100 : 0,
    }

    // Calculate cost breakdown by category from real data
    const costsByCategory = MockStorageService.getCostsByCategory(propertyId)

    const response = {
      property: {
        id: property.id,
        name: property.name,
        handover_price_agreement_kes: handoverPrice,
      },
      financial_summary: {
        handover_price_agreement_kes: handoverPrice,
        total_handover_costs_kes: totalCosts,
        total_receipts_kes: totalReceipts,
        remaining_balance_kes: remainingBalance,
        total_income_kes: totalIncome,
        payment_progress_percentage: summary.payment_progress_percentage,
      },
      cost_breakdown: {
        by_category: costsByCategory,
        total_costs: totalCosts,
      },
      cost_entries: costEntries || [],
      payment_receipts: paymentReceipts || [],
      counts: {
        total_cost_entries: costEntries?.length || 0,
        total_payment_receipts: paymentReceipts?.length || 0,
      },
    }

    return NextResponse.json({ ok: true, data: response })
  } catch (e: any) {
    console.error('GET /api/properties/[id]/handover-financial-summary error:', e)
    return errors.internal(e?.message || 'Failed to get handover financial summary')
  }
})
