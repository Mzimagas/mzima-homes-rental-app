import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { propertySchema } from '../../../../../lib/validation/property'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const token = authHeader.substring(7)
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: { user } } = await admin.auth.getUser(token)
    return user?.id || null
  } catch {
    return null
  }
}

async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data } = await admin
      .from('property_users')
      .select('role, status')
      .eq('property_id', propertyId)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    return data && ['OWNER', 'PROPERTY_MANAGER'].includes(data.role)
  } catch {
    return false
  }
}

// PATCH /api/properties/[id]/update - Update basic property information
export const PATCH = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    
    if (!propertyId) {
      return errors.badRequest('Missing property id in path')
    }

    // Check property access
    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) {
      return errors.forbidden('Access denied to this property')
    }

    // Parse and validate request body
    const json = await req.json().catch(() => ({}))
    const parsed = propertySchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Verify property exists
    const { data: existingProperty, error: fetchError } = await admin
      .from('properties')
      .select('id, name')
      .eq('id', propertyId)
      .single()

    if (fetchError || !existingProperty) {
      return errors.notFound('Property not found')
    }

    // Update the property
    const { data: updatedProperty, error: updateError } = await admin
      .from('properties')
      .update({
        name: parsed.data.name,
        physical_address: parsed.data.physical_address,
        property_type: parsed.data.property_type,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        notes: parsed.data.notes,
        marketing_description: parsed.data.marketing_description,
        default_billing_day: parsed.data.default_billing_day,
        default_align_billing_to_start: parsed.data.default_align_billing_to_start,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select('id, name, physical_address, property_type, lat, lng, notes, marketing_description, default_billing_day, default_align_billing_to_start, updated_at')
      .single()

    if (updateError) {
      console.error('Error updating property:', updateError)
      return errors.internal('Failed to update property')
    }

    // Log the property update
    try {
      const baseUrl = new URL(req.url).origin
      const auditUrl = baseUrl + '/api/security/audit'
      await fetch(auditUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'property_updated',
          identifier: propertyId,
          details: { 
            name: updatedProperty.name,
            updated_fields: Object.keys(parsed.data),
            method: 'basic_info_update'
          },
        }),
      })
    } catch {
      // Ignore audit logging errors
    }

    return NextResponse.json({
      ok: true,
      data: updatedProperty,
      message: 'Property updated successfully',
    })
  } catch (error: any) {
    console.error('PATCH /api/properties/[id]/update error:', error)
    return errors.internal(error?.message || 'Failed to update property')
  }
})
