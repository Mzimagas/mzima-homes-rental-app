import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Batch Properties API - Load multiple properties with related data efficiently
 *
 * GET /api/batch/properties?ids=id1,id2,id3&include=tenants,payments,units
 * POST /api/batch/properties with { ids: [...], include: [...] }
 */

interface BatchPropertiesRequest {
  ids?: string[]
  include?: ('tenants' | 'payments' | 'units' | 'stats')[]
  filters?: {
    property_type?: string
    status?: string
    location?: string
  }
  pagination?: {
    limit?: number
    offset?: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const includeParam = searchParams.get('include')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const ids = idsParam ? idsParam.split(',') : undefined
    const include = includeParam
      ? (includeParam.split(',') as BatchPropertiesRequest['include'])
      : []
    const limit = limitParam ? parseInt(limitParam) : undefined
    const offset = offsetParam ? parseInt(offsetParam) : 0

    const result = await fetchPropertiesBatch(supabase, {
      ids,
      include,
      pagination: { limit, offset },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Batch properties API error:', error)
    return NextResponse.json({ error: 'Failed to fetch properties batch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body: BatchPropertiesRequest = await request.json()

    const result = await fetchPropertiesBatch(supabase, body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Batch properties API error:', error)
    return NextResponse.json({ error: 'Failed to fetch properties batch' }, { status: 500 })
  }
}

async function fetchPropertiesBatch(supabase: any, options: BatchPropertiesRequest) {
  const { ids, include = [], filters = {}, pagination = {} } = options

  // Build the base query with optimized joins
  let selectClause = `
    id,
    name,
    address,
    property_type,
    total_units,
    status,
    created_at,
    updated_at
  `

  // Add related data based on include parameter
  if (include.includes('tenants')) {
    selectClause += `,
    tenants:tenants(
      id,
      full_name,
      email,
      phone,
      lease_start_date,
      lease_end_date,
      monthly_rent,
      status,
      unit_number
    )`
  }

  if (include.includes('units')) {
    selectClause += `,
    units:units(
      id,
      unit_number,
      unit_type,
      monthly_rent,
      is_occupied,
      tenant_id
    )`
  }

  if (include.includes('payments')) {
    selectClause += `,
    payments:payments(
      id,
      amount,
      payment_date,
      payment_method,
      status,
      payment_type,
      tenant_id
    )`
  }

  let query = supabase.from('properties').select(selectClause)

  // Apply filters
  if (ids && ids.length > 0) {
    query = query.in('id', ids)
  }

  if (filters.property_type) {
    query = query.eq('property_type', filters.property_type)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.location) {
    query = query.ilike('address', `%${filters.location}%`)
  }

  // Apply pagination
  if (pagination.limit) {
    query = query.range(pagination.offset || 0, (pagination.offset || 0) + pagination.limit - 1)
  }

  // Execute query
  const { data: properties, error, count } = await query

  if (error) {
    throw error
  }

  const result: any = {
    properties: properties || [],
    total: count,
  }

  // Calculate stats if requested
  if (include.includes('stats')) {
    result.stats = calculatePropertiesStats(properties || [])
  }

  return result
}

function calculatePropertiesStats(properties: any[]) {
  const totalProperties = properties.length
  const totalUnits = properties.reduce((sum, p) => sum + (p.total_units || 1), 0)

  let occupiedUnits = 0
  let totalRent = 0
  let activeTenantsCount = 0

  properties.forEach((property) => {
    if (property.tenants) {
      const activeTenants = property.tenants.filter((t: any) => t.status === 'active')
      activeTenantsCount += activeTenants.length
      occupiedUnits += activeTenants.length
      totalRent += activeTenants.reduce((sum: number, t: any) => sum + (t.monthly_rent || 0), 0)
    }
  })

  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

  return {
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits: totalUnits - occupiedUnits,
    occupancyRate,
    activeTenantsCount,
    totalMonthlyRent: totalRent,
  }
}
