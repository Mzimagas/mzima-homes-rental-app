import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../lib/api/middleware'
import { errors } from '../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { propertySchema } from '../../../lib/validation/property'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    // Primary: cookie-based session
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await (await supabase).auth.getUser()
    if (user) return user.id
  } catch {}

  // Fallback: Bearer token in Authorization header
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const token = authHeader.substring(7)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const {
      data: { user },
      error,
    } = await anonClient.auth.getUser(token)

    return error ? null : user?.id || null
  } catch {
    return null
  }
}

// GET /api/properties - List properties for authenticated user
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const admin = createClient(supabaseUrl, serviceKey)

    // Get user's accessible properties
    const { data: accessibleProperties, error: accessError } = await admin.rpc(
      'get_user_accessible_properties',
      { user_id: userId }
    )

    if (accessError) {
      console.error('Error getting accessible properties:', accessError)
      return errors.internal('Failed to get accessible properties')
    }

    if (!accessibleProperties || accessibleProperties.length === 0) {
      return NextResponse.json({ ok: true, data: [] })
    }

    const propertyIds = accessibleProperties.map((p: any) => p.property_id).filter(Boolean)

    // Fetch full property details
    const { data: properties, error: propertiesError } = await admin
      .from('properties')
      .select(
        `
        id,
        name,
        physical_address,
        property_type,
        lat,
        lng,
        notes,
        default_billing_day,
        default_align_billing_to_start,
        created_at,
        updated_at
      `
      )
      .in('id', propertyIds)
      .is('disabled_at', null)
      .order('name')

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError)
      return errors.internal('Failed to fetch properties')
    }

    return NextResponse.json({ ok: true, data: properties || [] })
  } catch (error: any) {
    console.error('GET /api/properties error:', error)
    return errors.internal(error?.message || 'Failed to fetch properties')
  }
}

// POST /api/properties - Create new property
export const POST = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest) => {
  try {
    const json = await req.json().catch(() => ({}))
    const parsed = propertySchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const admin = createClient(supabaseUrl, serviceKey)

    // Create the property
    const { data: property, error: propertyError } = await admin
      .from('properties')
      .insert({
        name: parsed.data.name,
        physical_address: parsed.data.physical_address,
        property_type: parsed.data.property_type,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        notes: parsed.data.notes,
        default_billing_day: parsed.data.default_billing_day,
        default_align_billing_to_start: parsed.data.default_align_billing_to_start,
        landlord_id: userId, // Set the creator as the landlord
        property_source: 'DIRECT_ADDITION',
        lifecycle_status: 'ACTIVE',
      })
      .select('id, name')
      .single()

    if (propertyError) {
      console.error('Error creating property:', propertyError)
      return errors.internal('Failed to create property')
    }

    // Add the creator as the property owner with full permissions
    const { error: accessError } = await admin.from('property_users').insert({
      property_id: property.id,
      user_id: userId,
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: {
        can_view: true,
        can_edit: true,
        can_delete: true,
        can_manage_users: true,
        can_manage_tenants: true,
        can_manage_finances: true,
      },
    })

    if (accessError) {
      console.error('Error setting property access:', accessError)
      // Don't fail the request, but log the error
    }

    // Log the property creation
    try {
      await fetch(`${new URL(req.url).origin}/api/security/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'property_created',
          identifier: property.id,
          details: { name: property.name, method: 'direct_addition' },
        }),
      })
    } catch {
      // Ignore audit logging errors
    }

    return NextResponse.json({
      ok: true,
      data: property,
      message: 'Property created successfully',
    })
  } catch (error: any) {
    console.error('POST /api/properties error:', error)
    return errors.internal(error?.message || 'Failed to create property')
  }
})
