import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
// import { compose, withRateLimit, withCsrf, withAuth } from '../../../../../lib/api/middleware'
// import { errors } from '../../../../../lib/api/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Validation schema for subdivision cost entries
const subdivisionCostSchema = z.object({
  cost_type_id: z.string().min(1, 'Cost type is required'),
  cost_category: z.enum([
    'STATUTORY_BOARD_FEES',
    'SURVEY_PLANNING_FEES',
    'REGISTRATION_TITLE_FEES',
    'LEGAL_COMPLIANCE',
    'OTHER_CHARGES',
  ]),
  amount_kes: z.number().positive('Amount must be positive'),
  payment_status: z.enum(['PENDING', 'PAID', 'PARTIALLY_PAID']),
  payment_reference: z.string().optional(),
  payment_date: z.string().optional(),
  notes: z.string().optional(),
})

// Simple error responses
const errors = {
  unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  badRequest: (message: string) => NextResponse.json({ error: message }, { status: 400 }),
  internal: (message: string) => NextResponse.json({ error: message }, { status: 500 }),
  validation: (errors: any) =>
    NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 }),
}

// Helper function to resolve user ID from request
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // Primary: cookie-based session
  try {
    const { createServerSupabaseClient } = await import('../../../../../lib/supabase-server')
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
    let { data, error } = await admin.rpc('get_user_accessible_properties', { user_uuid: userId })

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

// GET /api/properties/[id]/subdivision-costs - Fetch all subdivision cost entries for a property
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    console.log('Subdivision costs GET API called for property:', resolvedParams.id)

    const userId = await resolveUserId(req)
    console.log('Resolved user ID:', userId)

    if (!userId) {
      console.log('No user ID found, returning unauthorized')
      return errors.unauthorized()
    }

    const propertyId = resolvedParams.id
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkAccess(userId, propertyId)
    console.log('Access check result:', hasAccess)

    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: costs, error } = await admin
      .from('property_subdivision_costs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subdivision costs:', error)
      return errors.internal('Failed to fetch subdivision costs')
    }

    console.log('Successfully fetched subdivision costs:', costs?.length || 0, 'entries')

    return NextResponse.json({
      success: true,
      data: costs || [],
    })
  } catch (error) {
    console.error('Error in subdivision costs GET API:', error)
    return errors.internal('Internal server error')
  }
}

// POST /api/properties/[id]/subdivision-costs - Add new subdivision cost entry
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    console.log('Subdivision costs POST API called for property:', resolvedParams.id)

    /*
    // Simple test response first
    return NextResponse.json({
      success: true,
      message: 'API route is working',
      propertyId: resolvedParams.id
    })
    */
    const userId = await resolveUserId(req)
    console.log('Resolved user ID:', userId)
    if (!userId) {
      console.log('No user ID found, returning unauthorized')
      return errors.unauthorized()
    }

    const propertyId = resolvedParams.id
    if (!propertyId) return errors.badRequest('Missing property id in path')

    const hasAccess = await checkAccess(userId, propertyId)
    console.log('Access check result:', hasAccess)
    if (!hasAccess) return errors.forbidden()

    const json = await req.json().catch(() => ({}))
    console.log('Request JSON:', json)

    const parsed = subdivisionCostSchema.safeParse(json)
    console.log('Validation result:', parsed)

    if (!parsed.success) {
      console.log('Validation errors:', parsed.error.flatten())
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const insertData = {
      property_id: propertyId,
      cost_type_id: parsed.data.cost_type_id,
      cost_category: parsed.data.cost_category,
      amount_kes: parsed.data.amount_kes,
      payment_status: parsed.data.payment_status,
      payment_reference: parsed.data.payment_reference,
      payment_date: parsed.data.payment_date,
      notes: parsed.data.notes,
      created_by: userId,
    }
    console.log('Insert data:', insertData)

    // Insert the new subdivision cost entry
    const { data: cost, error } = await admin
      .from('property_subdivision_costs')
      .insert(insertData)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating subdivision cost:', error)
      return errors.internal('Failed to create subdivision cost entry')
    }

    console.log('Successfully created subdivision cost:', cost)

    return NextResponse.json({
      success: true,
      data: cost,
    })
  } catch (error) {
    console.error('Error in subdivision costs POST API:', error)
    return errors.internal('Internal server error')
  }
}
