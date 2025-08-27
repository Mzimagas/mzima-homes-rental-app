import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Batch Tenants API - Load multiple tenants with related data efficiently
 *
 * GET /api/batch/tenants?ids=id1,id2,id3&include=property,payments
 * POST /api/batch/tenants with { ids: [...], include: [...] }
 */

interface BatchTenantsRequest {
  ids?: string[]
  include?: ('property' | 'payments' | 'lease' | 'stats')[]
  filters?: {
    status?: string
    property_id?: string
    lease_status?: string
  }
  pagination?: {
    limit?: number
    offset?: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const includeParam = searchParams.get('include')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const propertyIdParam = searchParams.get('property_id')
    const statusParam = searchParams.get('status')

    const ids = idsParam ? idsParam.split(',') : undefined
    const include = includeParam ? (includeParam.split(',') as BatchTenantsRequest['include']) : []
    const limit = limitParam ? parseInt(limitParam) : undefined
    const offset = offsetParam ? parseInt(offsetParam) : 0

    const filters: BatchTenantsRequest['filters'] = {}
    if (propertyIdParam) filters.property_id = propertyIdParam
    if (statusParam) filters.status = statusParam

    const result = await fetchTenantsBatch(supabase, {
      ids,
      include,
      filters,
      pagination: { limit, offset },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Batch tenants API error:', error)
    return NextResponse.json({ error: 'Failed to fetch tenants batch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body: BatchTenantsRequest = await request.json()

    const result = await fetchTenantsBatch(supabase, body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Batch tenants API error:', error)
    return NextResponse.json({ error: 'Failed to fetch tenants batch' }, { status: 500 })
  }
}

async function fetchTenantsBatch(supabase: any, options: BatchTenantsRequest) {
  const { ids, include = [], filters = {}, pagination = {} } = options

  let selectClause = `
    id,
    full_name,
    email,
    phone,
    lease_start_date,
    lease_end_date,
    monthly_rent,
    security_deposit,
    status,
    unit_number,
    property_id,
    created_at,
    updated_at
  `

  if (include.includes('property')) {
    selectClause += `,
    property:properties(
      id,
      name,
      address,
      property_type,
      total_units
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
      due_date,
      late_fee
    )`
  }

  if (include.includes('lease')) {
    selectClause += `,
    lease:leases(
      id,
      lease_start_date,
      lease_end_date,
      monthly_rent,
      security_deposit,
      lease_terms,
      status
    )`
  }

  let query = supabase.from('tenants').select(selectClause)

  // Apply filters
  if (ids && ids.length > 0) {
    query = query.in('id', ids)
  }

  if (filters.property_id) {
    query = query.eq('property_id', filters.property_id)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.lease_status) {
    // Filter by lease status if lease data is included
    if (include.includes('lease')) {
      query = query.eq('lease.status', filters.lease_status)
    }
  }

  // Apply pagination
  if (pagination.limit) {
    query = query.range(pagination.offset || 0, (pagination.offset || 0) + pagination.limit - 1)
  }

  // Execute query
  const { data: tenants, error, count } = await query

  if (error) {
    throw error
  }

  let result: any = {
    tenants: tenants || [],
    total: count,
  }

  // Calculate stats if requested
  if (include.includes('stats')) {
    result.stats = calculateTenantsStats(tenants || [])
  }

  return result
}

function calculateTenantsStats(tenants: any[]) {
  const totalTenants = tenants.length
  const activeTenants = tenants.filter((t) => t.status === 'active').length
  const inactiveTenants = totalTenants - activeTenants

  const totalMonthlyRent = tenants
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + (t.monthly_rent || 0), 0)

  const totalSecurityDeposits = tenants.reduce((sum, t) => sum + (t.security_deposit || 0), 0)

  // Calculate lease expiration stats
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const leasesExpiringSoon = tenants.filter((t) => {
    if (!t.lease_end_date) return false
    const endDate = new Date(t.lease_end_date)
    return endDate <= thirtyDaysFromNow && endDate >= now
  }).length

  const leasesExpiringIn90Days = tenants.filter((t) => {
    if (!t.lease_end_date) return false
    const endDate = new Date(t.lease_end_date)
    return endDate <= ninetyDaysFromNow && endDate >= now
  }).length

  // Payment stats if payment data is included
  let paymentStats = {}
  const tenantsWithPayments = tenants.filter((t) => t.payments && t.payments.length > 0)

  if (tenantsWithPayments.length > 0) {
    const allPayments = tenantsWithPayments.flatMap((t) => t.payments || [])
    const paidPayments = allPayments.filter((p) => p.status === 'paid')
    const overduePayments = allPayments.filter((p) => p.status === 'overdue')

    paymentStats = {
      totalPayments: allPayments.length,
      paidPayments: paidPayments.length,
      overduePayments: overduePayments.length,
      totalPaidAmount: paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalOverdueAmount: overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    }
  }

  return {
    totalTenants,
    activeTenants,
    inactiveTenants,
    totalMonthlyRent,
    totalSecurityDeposits,
    leasesExpiringSoon,
    leasesExpiringIn90Days,
    ...paymentStats,
  }
}
