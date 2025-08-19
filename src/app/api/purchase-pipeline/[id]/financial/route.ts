import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compose } from '../../../../../lib/middleware/compose'
import { withAuth } from '../../../../../lib/middleware/auth'
import { withRateLimit } from '../../../../../lib/middleware/rate-limit'
import { withCsrf } from '../../../../../lib/middleware/csrf'
import { resolveUserId } from '../../../../../lib/auth-utils'
import { errors } from '../../../../../lib/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper function to check purchase pipeline access
async function checkPurchaseAccess(userId: string, purchaseId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    
    const { data: purchase, error } = await admin
      .from('purchase_pipeline')
      .select('created_by')
      .eq('id', purchaseId)
      .single()

    if (error || !purchase) {
      return false
    }

    return purchase.created_by === userId
  } catch (e) {
    return false
  }
}

// GET /api/purchase-pipeline/[id]/financial - Get financial data for purchase pipeline entry
export const GET = compose(withRateLimit, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract purchase id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex(s => s === 'purchase-pipeline')
    const purchaseId = pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    if (!purchaseId) return errors.badRequest('Missing purchase id in path')

    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)

    // Get purchase pipeline data
    const { data: purchase, error: purchaseError } = await admin
      .from('purchase_pipeline')
      .select('*')
      .eq('id', purchaseId)
      .single()

    if (purchaseError || !purchase) {
      return errors.notFound('Purchase pipeline entry not found')
    }

    // For purchase pipeline entries, we'll return mock financial data structure
    // that matches what PropertyAcquisitionFinancials expects
    const financialData = {
      costs: [], // Empty acquisition costs for now
      payments: [], // Empty payment installments for now
      purchase_price_agreement_kes: purchase.negotiated_price_kes || purchase.asking_price_kes || 0,
      purchase_price_history: []
    }

    return Response.json(financialData)
  } catch (error) {
    console.error('Error fetching purchase pipeline financial data:', error)
    return errors.internal('Failed to fetch financial data')
  }
})

// PATCH /api/purchase-pipeline/[id]/financial - Update financial data for purchase pipeline entry
export const PATCH = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract purchase id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex(s => s === 'purchase-pipeline')
    const purchaseId = pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    if (!purchaseId) return errors.badRequest('Missing purchase id in path')

    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const admin = createClient(supabaseUrl, serviceKey)

    // Update purchase pipeline with financial data
    const updateData: any = {}
    
    if (json.negotiated_price_kes !== undefined) {
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
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error updating purchase pipeline financial data:', error)
    return errors.internal('Failed to update financial data')
  }
})
