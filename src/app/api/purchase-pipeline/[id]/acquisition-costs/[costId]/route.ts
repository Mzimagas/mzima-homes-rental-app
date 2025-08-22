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
    const { data: { user } } = await supabase.auth.getUser()
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

// DELETE /api/purchase-pipeline/[id]/acquisition-costs/[costId] - Delete acquisition cost for purchase pipeline entry
export const DELETE = compose(withAuth, withRateLimit, withCsrf)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract purchase id and cost id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex(s => s === 'purchase-pipeline')
    const purchaseId = pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    const costId = segments[segments.length - 1]

    if (!purchaseId || !costId) return errors.badRequest('Missing purchase id or cost id in path')

    console.log('DELETE acquisition-cost - userId:', userId)
    console.log('DELETE acquisition-cost - purchaseId:', purchaseId)
    console.log('DELETE acquisition-cost - costId:', costId)

    // Check access
    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    if (!hasAccess) {
      console.log('DELETE acquisition-cost - hasAccess:', hasAccess)
      return errors.forbidden()
    }

    console.log('DELETE acquisition-cost - hasAccess:', hasAccess)

    const supabase = createClient(supabaseUrl, serviceKey)

    const { error } = await supabase
      .from('property_acquisition_costs')
      .delete()
      .eq('id', costId)
      .eq('property_id', purchaseId) // Extra security check

    if (error) {
      console.error('Error deleting acquisition cost:', error)
      return errors.internal('Failed to delete acquisition cost')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE acquisition cost:', error)
    return errors.internal('Failed to delete acquisition cost')
  }
})
