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

// GET /api/purchase-pipeline/[id]/acquisition-costs - Get acquisition costs for purchase pipeline entry
export const GET = compose(withAuth, withRateLimit, withCsrf)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract purchase id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex(s => s === 'purchase-pipeline')
    const purchaseId = pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    if (!purchaseId) return errors.badRequest('Missing purchase id in path')

    console.log('GET acquisition-costs - userId:', userId)
    console.log('GET acquisition-costs - purchaseId:', purchaseId)

    // Check access
    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    if (!hasAccess) {
      console.log('GET acquisition-costs - hasAccess:', hasAccess)
      return errors.forbidden()
    }

    console.log('GET acquisition-costs - hasAccess:', hasAccess)

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('property_acquisition_costs')
      .select('*')
      .eq('property_id', purchaseId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching acquisition costs:', error)
      return errors.internal('Failed to fetch acquisition costs')
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error in GET acquisition costs:', error)
    return errors.internal('Failed to fetch acquisition costs')
  }
})

// POST /api/purchase-pipeline/[id]/acquisition-costs - Create acquisition cost for purchase pipeline entry
export const POST = compose(withAuth, withRateLimit, withCsrf)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract purchase id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const pipelineIdx = segments.findIndex(s => s === 'purchase-pipeline')
    const purchaseId = pipelineIdx >= 0 && segments[pipelineIdx + 1] ? segments[pipelineIdx + 1] : undefined
    if (!purchaseId) return errors.badRequest('Missing purchase id in path')

    console.log('POST acquisition-costs - userId:', userId)
    console.log('POST acquisition-costs - purchaseId:', purchaseId)

    // Check access
    const hasAccess = await checkPurchaseAccess(userId, purchaseId)
    if (!hasAccess) {
      console.log('POST acquisition-costs - hasAccess:', hasAccess)
      return errors.forbidden()
    }

    console.log('POST acquisition-costs - hasAccess:', hasAccess)

    const body = await req.json()
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('property_acquisition_costs')
      .insert({
        ...body,
        property_id: purchaseId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating acquisition cost:', error)
      return errors.internal('Failed to create acquisition cost')
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST acquisition costs:', error)
    return errors.internal('Failed to create acquisition cost')
  }
})
