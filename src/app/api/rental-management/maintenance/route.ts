import { NextRequest, NextResponse } from 'next/server'
import { compose, withAuth, withCsrf, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Validation schema for maintenance requests
const maintenanceRequestSchema = z.object({
  property_id: z.string().uuid('Invalid property ID'),
  unit_id: z.string().uuid('Invalid unit ID').optional(),
  tenant_id: z.string().uuid('Invalid tenant ID').optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
  category: z.enum([
    'PLUMBING',
    'ELECTRICAL',
    'HVAC',
    'APPLIANCE',
    'STRUCTURAL',
    'COSMETIC',
    'OTHER',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  estimated_cost: z.number().min(0).optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
})

const updateMaintenanceRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: z
    .enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'COSMETIC', 'OTHER'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  assigned_to: z.string().uuid().optional(),
  estimated_cost: z.number().min(0).optional(),
  actual_cost: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
})

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

async function checkPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  try {
    const admin = createClient(supabaseUrl, serviceKey)

    // Check if user is property owner or has access through property_users
    const { data, error } = await admin.rpc('check_property_access', {
      user_id: userId,
      property_id: propertyId,
    })

    if (error) {
      console.error('Error checking property access:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error in checkPropertyAccess:', error)
    return false
  }
}

// GET /api/rental-management/maintenance - List maintenance requests
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const url = new URL(req.url)
    const propertyId = url.searchParams.get('propertyId')
    const unitId = url.searchParams.get('unitId')
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const admin = createClient(supabaseUrl, serviceKey)

    // Build query
    let query = admin
      .from('maintenance_requests')
      .select(
        `
        *,
        properties(id, name),
        units(id, unit_label),
        tenants(id, full_name)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (propertyId) {
      // Check access to specific property
      const hasAccess = await checkPropertyAccess(userId, propertyId)
      if (!hasAccess) return errors.forbidden()

      query = query.eq('property_id', propertyId)
    } else {
      // Get user's accessible properties
      const { data: accessibleProperties } = await admin.rpc('get_user_accessible_properties', {
        user_id: userId,
      })

      if (!accessibleProperties || accessibleProperties.length === 0) {
        return NextResponse.json({ ok: true, data: [] })
      }

      const propertyIds = accessibleProperties.map((p: any) => p.property_id)
      query = query.in('property_id', propertyIds)
    }

    if (unitId) query = query.eq('unit_id', unitId)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching maintenance requests:', error)
      return errors.internal('Failed to fetch maintenance requests')
    }

    return NextResponse.json({ ok: true, data: data || [] })
  } catch (error: any) {
    console.error('GET /api/rental-management/maintenance error:', error)
    return errors.internal(error?.message || 'Failed to fetch maintenance requests')
  }
}

// POST /api/rental-management/maintenance - Create maintenance request
export const POST = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const json = await req.json().catch(() => ({}))
    const parsed = maintenanceRequestSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    // Check property access
    const hasAccess = await checkPropertyAccess(userId, parsed.data.property_id)
    if (!hasAccess) return errors.forbidden()

    const admin = createClient(supabaseUrl, serviceKey)

    // Create maintenance request
    const { data, error } = await admin
      .from('maintenance_requests')
      .insert({
        ...parsed.data,
        status: 'SUBMITTED',
        submitted_date: new Date().toISOString(),
      })
      .select(
        `
        *,
        properties(id, name),
        units(id, unit_label),
        tenants(id, full_name)
      `
      )
      .single()

    if (error) {
      console.error('Error creating maintenance request:', error)
      return errors.internal('Failed to create maintenance request')
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('POST /api/rental-management/maintenance error:', error)
    return errors.internal(error?.message || 'Failed to create maintenance request')
  }
})

// PUT /api/rental-management/maintenance/[id] - Update maintenance request
export const PUT = compose(
  withRateLimit,
  withCsrf,
  withAuth
)(async (req: NextRequest) => {
  try {
    const userId = await getUserId(req)
    if (!userId) return errors.unauthorized()

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const requestId = pathSegments[pathSegments.length - 1]

    if (!requestId) {
      return errors.badRequest('Maintenance request ID is required')
    }

    const json = await req.json().catch(() => ({}))
    const parsed = updateMaintenanceRequestSchema.safeParse(json)

    if (!parsed.success) {
      return errors.validation(parsed.error.flatten())
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Get existing request to check access
    const { data: existingRequest, error: fetchError } = await admin
      .from('maintenance_requests')
      .select('property_id')
      .eq('id', requestId)
      .single()

    if (fetchError || !existingRequest) {
      return errors.notFound('Maintenance request not found')
    }

    // Check property access
    const hasAccess = await checkPropertyAccess(userId, existingRequest.property_id)
    if (!hasAccess) return errors.forbidden()

    // Update request
    const updateData: any = { ...parsed.data }

    // Set timestamps based on status changes
    if (parsed.data.status === 'ACKNOWLEDGED' && !existingRequest.acknowledged_date) {
      updateData.acknowledged_date = new Date().toISOString()
    }
    if (parsed.data.status === 'COMPLETED' && !existingRequest.completed_date) {
      updateData.completed_date = new Date().toISOString()
    }

    const { data, error } = await admin
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', requestId)
      .select(
        `
        *,
        properties(id, name),
        units(id, unit_label),
        tenants(id, full_name)
      `
      )
      .single()

    if (error) {
      console.error('Error updating maintenance request:', error)
      return errors.internal('Failed to update maintenance request')
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('PUT /api/rental-management/maintenance error:', error)
    return errors.internal(error?.message || 'Failed to update maintenance request')
  }
})
