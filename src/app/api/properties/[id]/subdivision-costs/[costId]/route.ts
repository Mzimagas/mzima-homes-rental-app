import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
// import { compose, withRateLimit, withCsrf, withAuth } from '../../../../../../lib/api/middleware'
// import { errors } from '../../../../../../lib/api/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Simple error responses
const errors = {
  unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  badRequest: (message: string) => NextResponse.json({ error: message }, { status: 400 }),
  internal: (message: string) => NextResponse.json({ error: message }, { status: 500 }),
  validation: (errors: any) => NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
}

// Helper function to resolve user ID from request
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // Primary: cookie-based session
  try {
    const { createServerSupabaseClient } = await import('../../../../../../lib/supabase-server')
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

// Helper function to check purchase pipeline access
async function checkPurchaseAccess(userId: string, purchaseId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)

    const { data, error } = await admin
      .from('purchase_pipeline')
      .select('created_by')
      .eq('id', purchaseId)
      .single()

    if (error || !data) {
      return false
    }

    return data.created_by === userId
  } catch (error) {
    console.error('Error checking purchase access:', error)
    return false
  }
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
      hasAccess = data.some((p: any) => p.property_id === propertyId && p.can_edit_property)
    } else if (data && typeof data === 'object') {
      hasAccess = data.property_id === propertyId && data.can_edit_property
    }

    return hasAccess
  } catch (error) {
    console.error('Error checking property access:', error)
    return false
  }
}

// Helper function to check access for either property or purchase pipeline
async function checkAccess(userId: string, id: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)

    // First check if this is a purchase pipeline ID
    const { data: purchase, error: purchaseError } = await admin
      .from('purchase_pipeline')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!purchaseError && purchase) {
      // It's a purchase pipeline ID, check purchase access
      console.log('ID is purchase pipeline, checking purchase access')
      return purchase.created_by === userId
    }

    // If not a purchase pipeline ID, check property access
    console.log('ID is not purchase pipeline, checking property access')
    return await checkPropertyAccess(userId, id)
  } catch (error) {
    console.error('Error checking access:', error)
    return false
  }
}

// Validation schema for updating subdivision cost entry
const updateSubdivisionCostSchema = z.object({
  amount_kes: z.number().positive('Amount must be positive').optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'PARTIALLY_PAID']).optional(),
  payment_reference: z.string().optional(),
  payment_date: z.string().optional(),
  notes: z.string().optional()
})

// PATCH /api/properties/[id]/subdivision-costs/[costId] - Update subdivision cost entry
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string, costId: string }> }) {
  try {
    const resolvedParams = await params
    console.log('Subdivision costs PATCH API called for property:', resolvedParams.id, 'cost:', resolvedParams.costId)

    const userId = await resolveUserId(req)
    console.log('Resolved user ID:', userId)
    if (!userId) return errors.unauthorized()

    const { id: propertyId, costId } = resolvedParams
    if (!propertyId || !costId) return errors.badRequest('Missing property id or cost id')

    const hasAccess = await checkAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    const parsed = updateSubdivisionCostSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Update the subdivision cost entry
    const { data: cost, error } = await admin
      .from('property_subdivision_costs')
      .update(parsed.data)
      .eq('id', costId)
      .eq('property_id', propertyId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating subdivision cost:', error)
      return errors.internal('Failed to update subdivision cost entry')
    }

    return NextResponse.json({
      success: true,
      data: cost
    })

  } catch (error) {
    console.error('Error in subdivision costs PATCH API:', error)
    return errors.internal('Internal server error')
  }
}

// DELETE /api/properties/[id]/subdivision-costs/[costId] - Delete subdivision cost entry
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, costId: string }> }) {
  try {
    const resolvedParams = await params
    console.log('Subdivision costs DELETE API called for property:', resolvedParams.id, 'cost:', resolvedParams.costId)

    const userId = await resolveUserId(req)
    console.log('Resolved user ID:', userId)
    if (!userId) return errors.unauthorized()

    const { id: propertyId, costId } = resolvedParams
    if (!propertyId || !costId) return errors.badRequest('Missing property id or cost id')

    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)

    // Delete the subdivision cost entry
    const { error } = await admin
      .from('property_subdivision_costs')
      .delete()
      .eq('id', costId)
      .eq('property_id', propertyId)

    if (error) {
      console.error('Error deleting subdivision cost:', error)
      return errors.internal('Failed to delete subdivision cost entry')
    }

    return NextResponse.json({
      success: true,
      message: 'Subdivision cost entry deleted successfully'
    })

  } catch (error) {
    console.error('Error in subdivision costs DELETE API:', error)
    return errors.internal('Internal server error')
  }
}
