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

  return null
}

// Helper function to check property access
async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data } = await admin
      .rpc('get_user_accessible_properties', { user_uuid: userId })

    return data?.some((p: any) => p.property_id === propertyId) || false
  } catch {
    return false
  }
}

// DELETE /api/properties/[id]/acquisition-costs/[costId] - Delete cost entry
export const DELETE = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id and cost id from path /api/properties/[id]/acquisition-costs/[costId]
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex(s => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    const costsIdx = segments.findIndex(s => s === 'acquisition-costs')
    const costId = costsIdx >= 0 && segments[costsIdx + 1] ? segments[costsIdx + 1] : undefined

    if (!propertyId || !costId) return errors.badRequest('Missing property id or cost id in path')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)

    // First, verify the cost entry exists and belongs to the property
    const { data: existingCost, error: fetchError } = await admin
      .from('property_acquisition_costs')
      .select('id, property_id')
      .eq('id', costId)
      .eq('property_id', propertyId)
      .single()

    if (fetchError || !existingCost) {
      return errors.notFound('Cost entry not found')
    }

    // Delete the cost entry
    const { error: deleteError } = await admin
      .from('property_acquisition_costs')
      .delete()
      .eq('id', costId)
      .eq('property_id', propertyId)

    if (deleteError) {
      console.error('Error deleting acquisition cost:', deleteError)
      return errors.internal('Failed to delete acquisition cost')
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /api/properties/[id]/acquisition-costs/[costId] error:', e)
    return errors.internal(e?.message || 'Failed to delete acquisition cost')
  }
})
