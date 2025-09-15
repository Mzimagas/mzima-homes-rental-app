import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { getServerSupabase, getServiceSupabase } from '../../../../../lib/supabase-server'
import { propertySchema } from '../../../../../lib/validation/property'

async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = getServiceSupabase()
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
    const supabase = await getServerSupabase()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('auth.getUser error:', error)
    }

    if (!user) {
      return errors.unauthorized()
    }

    // Extract property id from path
    const segments = req.nextUrl.pathname.split('/').filter(Boolean)
    const propertiesIdx = segments.findIndex((s) => s === 'properties')
    const propertyId = propertiesIdx >= 0 && segments[propertiesIdx + 1] ? segments[propertiesIdx + 1] : undefined
    
    if (!propertyId) {
      return errors.badRequest('Missing property id in path')
    }

    // Check property access
    const hasAccess = await checkPropertyAccess(user.id, propertyId)
    if (!hasAccess) {
      return errors.forbidden('Access denied to this property')
    }

    // Parse and validate request body
    const json = await req.json().catch(() => ({}))
    const parsed = propertySchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = getServiceSupabase()

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
        registered_title_owner: parsed.data.registered_title_owner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select('id, name, physical_address, property_type, lat, lng, notes, marketing_description, registered_title_owner, updated_at')
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
