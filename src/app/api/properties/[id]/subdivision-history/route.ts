import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../../lib/api/middleware'
import { errors } from '../../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper function to resolve user ID from request
async function resolveUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, serviceKey)
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return null
    }

    return user.id
  } catch (error) {
    console.error('Error resolving user ID:', error)
    return null
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
      console.error('checkPropertyAccess - RPC error:', error)

      // Fallback: Check if user owns the property directly
      const { data: property, error: propError } = await admin
        .from('properties')
        .select('id, landlord_id')
        .eq('id', propertyId)
        .eq('landlord_id', userId)
        .single()

      if (propError) {
        console.error('checkPropertyAccess - property ownership check error:', propError)
        return false
      }

      return !!property
    }

    // Handle different function return formats
    let hasAccess = false
    if (Array.isArray(data)) {
      hasAccess = data.some((p: any) => {
        if (typeof p === 'string') {
          return p === propertyId
        } else if (p && typeof p === 'object') {
          return p.property_id === propertyId
        }
        return false
      })
    }

    return hasAccess
  } catch (e) {
    console.error('checkPropertyAccess - exception:', e)
    return false
  }
}

// Helper function to check property edit access
async function checkPropertyEditAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)

    // Try the newer function signature first
    let { data, error } = await admin
      .rpc('get_user_accessible_properties', { user_uuid: userId })

    if (error) {
      console.error('checkPropertyEditAccess - RPC error:', error)

      // Fallback: Check if user owns the property directly (owners can edit)
      const { data: property, error: propError } = await admin
        .from('properties')
        .select('id, landlord_id')
        .eq('id', propertyId)
        .eq('landlord_id', userId)
        .single()

      if (propError) {
        console.error('checkPropertyEditAccess - property ownership check error:', propError)
        return false
      }

      return !!property
    }

    // Handle different function return formats and check for edit permissions
    let hasEditAccess = false
    if (Array.isArray(data)) {
      hasEditAccess = data.some((p: any) => {
        if (p && typeof p === 'object') {
          return p.property_id === propertyId && p.can_edit_property === true
        }
        // If it's just a string (property ID), assume owner has edit access
        return p === propertyId
      })
    }

    return hasEditAccess
  } catch (e) {
    console.error('checkPropertyEditAccess - exception:', e)
    return false
  }
}

// GET /api/properties/[id]/subdivision-history - Get subdivision history
export const GET = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path /api/properties/[id]/subdivision-history
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const propertyId = pathSegments[pathSegments.indexOf('properties') + 1]

    if (!propertyId) {
      return errors.badRequest('Property ID is required')
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Check property access
    const hasAccess = await checkPropertyAccess(userId, propertyId)
    if (!hasAccess) {
      return errors.forbidden('Access denied')
    }

    // Get subdivision history using the database function
    const { data: history, error: historyError } = await admin
      .rpc('get_subdivision_history', { property_uuid: propertyId })

    if (historyError) {
      console.error('Error fetching subdivision history:', historyError)
      return errors.internal('Failed to fetch subdivision history')
    }

    return NextResponse.json({
      success: true,
      data: history || []
    })

  } catch (error) {
    console.error('Error in subdivision history API:', error)
    return errors.internal('Internal server error')
  }
})

// POST /api/properties/[id]/subdivision-history - Record subdivision history
export const POST = compose(withRateLimit, withCsrf, withAuth)(async (req: NextRequest) => {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return errors.unauthorized()

    // Extract property id from path
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const propertyId = pathSegments[pathSegments.indexOf('properties') + 1]

    if (!propertyId) {
      return errors.badRequest('Property ID is required')
    }

    const body = await req.json()
    const {
      subdivision_id,
      action_type,
      previous_status,
      new_status,
      subdivision_name,
      total_plots_planned,
      change_reason,
      details = {}
    } = body

    // Validate required fields
    if (!action_type || !change_reason) {
      return errors.badRequest('Action type and change reason are required')
    }

    if (change_reason.length < 10) {
      return errors.badRequest('Change reason must be at least 10 characters long')
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Check property edit access
    const hasEditAccess = await checkPropertyEditAccess(userId, propertyId)
    if (!hasEditAccess) {
      return errors.forbidden('You do not have permission to modify this property')
    }

    // Record subdivision history using the database function
    const { data: historyId, error: recordError } = await admin
      .rpc('record_subdivision_history', {
        property_uuid: propertyId,
        subdivision_uuid: subdivision_id || null,
        action_type_param: action_type,
        previous_status_param: previous_status || null,
        new_status_param: new_status || null,
        subdivision_name_param: subdivision_name || null,
        total_plots_param: total_plots_planned || null,
        reason: change_reason,
        details_param: details
      })

    if (recordError) {
      console.error('Error recording subdivision history via function:', recordError)

      // Try direct insertion as fallback
      try {
        // Get user info from auth instead of profiles table
        const { data: authUser } = await admin.auth.admin.getUserById(userId)

        const userName = authUser?.user?.user_metadata?.full_name ||
                        authUser?.user?.user_metadata?.name ||
                        authUser?.user?.email ||
                        'Abel Gichimu' // Fallback to your name since you're the main user

        const { data: directInsert, error: insertError } = await admin
          .from('property_subdivision_history')
          .insert({
            property_id: propertyId,
            subdivision_id: subdivision_id || null,
            action_type: action_type,
            previous_status: previous_status || null,
            new_status: new_status || null,
            subdivision_name: subdivision_name || null,
            total_plots_planned: total_plots_planned || null,
            change_reason: change_reason,
            changed_by: userId,
            changed_by_name: userName,
            details: details
          })
          .select('id')
          .single()

        if (insertError) {
          console.error('Direct insert also failed:', insertError)
          return errors.internal('Failed to record subdivision history')
        }

        return NextResponse.json({
          success: true,
          data: { id: directInsert.id }
        })
      } catch (fallbackError) {
        console.error('Fallback insertion failed:', fallbackError)
        return errors.internal('Failed to record subdivision history')
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: historyId }
    })

  } catch (error) {
    console.error('Error in subdivision history API:', error)
    return errors.internal('Internal server error')
  }
})
