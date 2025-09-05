import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Batch Dashboard API - Load all dashboard data in a single optimized request
 *
 * GET /api/batch/dashboard
 * POST /api/batch/dashboard with options
 */

interface DashboardBatchRequest {
  include?: ('properties' | 'tenants' | 'payments' | 'stats' | 'alerts')[]
  timeRange?: {
    start?: string
    end?: string
  }
  filters?: {
    property_ids?: string[]
    tenant_status?: string
    payment_status?: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { searchParams } = new URL(request.url)
    const includeParam = searchParams.get('include')
    const include = includeParam
      ? (includeParam.split(',') as DashboardBatchRequest['include'])
      : ['properties', 'tenants', 'payments', 'stats', 'alerts']

    const result = await fetchDashboardBatch(supabase, { include: include as ('properties' | 'tenants' | 'payments' | 'stats' | 'alerts')[] })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Batch dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard batch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body: DashboardBatchRequest = await request.json()

    const result = await fetchDashboardBatch(supabase, body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Batch dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard batch' }, { status: 500 })
  }
}

async function fetchDashboardBatch(supabase: any, options: DashboardBatchRequest) {
  const { include = [], timeRange = {}, filters = {} } = options

  // Prepare parallel queries for optimal performance
  const queries: Promise<any>[] = []
  const queryMap: { [key: string]: number } = {}

  // Properties query
  if (include.includes('properties') || include.includes('stats')) {
    queryMap.properties = queries.length
    queries.push(
      supabase
        .from('properties')
        .select(
          `
          id,
          name,
          physical_address,
          property_type,
          property_source,
          lifecycle_status,
          subdivision_status,
          handover_status,
          source_reference_id,
          created_at,
          units(
            id,
            unit_label,
            tenancy_agreements(
              id,
              tenants(
                id,
                full_name,
                status
              )
            )
          )
        `
        )
        .then((result: any) => ({ type: 'properties', ...result }))
    )
  }

  // Tenants query
  if (include.includes('tenants') || include.includes('stats')) {
    let tenantQuery = supabase.from('tenants').select(`
        id,
        full_name,
        email,
        phone,
        status,
        created_at,
        tenancy_agreements(
          id,
          monthly_rent_kes,
          start_date,
          end_date,
          status
        )
      `)

    if (filters.tenant_status) {
      tenantQuery = tenantQuery.eq('status', filters.tenant_status)
    }

    queryMap.tenants = queries.length
    queries.push(tenantQuery.then((result: any) => ({ type: 'tenants', ...result })))
  }

  // Payments query (using new rental_payments table)
  if (include.includes('payments') || include.includes('stats') || include.includes('alerts')) {
    let paymentQuery = supabase.from('rental_payments').select(`
        id,
        amount_kes,
        payment_date,
        payment_method,
        transaction_reference,
        tenant_id,
        unit_id,
        notes,
        created_at,
        tenants(
          id,
          full_name
        )
      `)

    // Default to last 90 days if no time range specified
    const startDate =
      timeRange.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = timeRange.end || new Date().toISOString()

    paymentQuery = paymentQuery.gte('payment_date', startDate).lte('payment_date', endDate)

    queryMap.payments = queries.length
    queries.push(paymentQuery.then((result: any) => ({ type: 'payments', ...result })))
  }

  // Execute all queries in parallel
  const results = await Promise.all(queries)

  // Process results
  const data: any = {}
  const errors: any[] = []

  results.forEach((result) => {
    if (result.error) {
      errors.push({ type: result.type, error: result.error })
    } else {
      data[result.type] = result.data || []
    }
  })

  if (errors.length > 0) {
    console.error('Dashboard batch errors:', errors)
    // Continue with partial data rather than failing completely
  }

  // Calculate comprehensive stats
  let stats = {}
  if (include.includes('stats')) {
    stats = calculateDashboardStats(data.properties || [], data.tenants || [], data.payments || [])
  }

  // Generate alerts
  let alerts: any[] = []
  if (include.includes('alerts')) {
    alerts = generateDashboardAlerts(data.properties || [], data.tenants || [], data.payments || [])
  }

  return {
    ...data,
    stats,
    alerts,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  }
}

function calculateDashboardStats(properties: any[], tenants: any[], payments: any[]) {
  // Property stats
  const totalProperties = properties.length
  const totalUnits = properties.reduce((sum, p) => sum + (p.total_units || 1), 0)

  // Tenant stats
  const activeTenants = tenants.filter((t) => t.status === 'active')
  const occupiedUnits = activeTenants.length
  const vacantUnits = totalUnits - occupiedUnits
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

  // Rent stats - get from tenancy agreements
  const monthlyRentPotential = tenants.reduce((sum, t) => {
    const activeAgreement = t.tenancy_agreements?.find((a: any) => a.status === 'active')
    return sum + (activeAgreement?.monthly_rent_kes || 0)
  }, 0)
  const monthlyRentActual = activeTenants.reduce((sum, t) => {
    const activeAgreement = t.tenancy_agreements?.find((a: any) => a.status === 'active')
    return sum + (activeAgreement?.monthly_rent_kes || 0)
  }, 0)

  // Payment stats - using new rental_payments structure
  const thisMonth = new Date()
  const thisMonthPayments = payments.filter((p) => {
    const paymentDate = new Date(p.payment_date)
    return (
      paymentDate.getMonth() === thisMonth.getMonth() &&
      paymentDate.getFullYear() === thisMonth.getFullYear()
    )
  })

  // All payments in rental_payments are considered 'paid' since they're completed transactions
  const paidPayments = payments // All payments are completed
  const overduePayments: any[] = [] // No overdue concept in rental_payments
  const pendingPayments: any[] = [] // No pending concept in rental_payments

  const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount_kes || 0), 0)
  const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + (p.amount_kes || 0), 0)
  const overdueAmount = 0 // No overdue concept in rental_payments

  return {
    properties: {
      total: totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
    },
    tenants: {
      total: tenants.length,
      active: activeTenants.length,
      inactive: tenants.length - activeTenants.length,
    },
    revenue: {
      monthlyPotential: monthlyRentPotential,
      monthlyActual: monthlyRentActual,
      thisMonth: thisMonthRevenue,
      total: totalRevenue,
      overdue: overdueAmount,
    },
    payments: {
      total: payments.length,
      paid: paidPayments.length,
      overdue: overduePayments.length,
      pending: pendingPayments.length,
      thisMonth: thisMonthPayments.length,
    },
  }
}

function generateDashboardAlerts(properties: any[], tenants: any[], payments: any[]) {
  const alerts = []
  const now = new Date()

  // Note: No overdue payments alert since rental_payments only contains completed payments

  // Lease expiration alerts - check tenancy agreements
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiringLeases = tenants.filter((t) => {
    const activeAgreement = t.tenancy_agreements?.find((a: any) => a.status === 'active')
    if (!activeAgreement?.end_date) return false
    const endDate = new Date(activeAgreement.end_date)
    return endDate <= thirtyDaysFromNow && endDate >= now
  })

  if (expiringLeases.length > 0) {
    alerts.push({
      type: 'expiring_leases',
      severity: 'medium',
      title: `${expiringLeases.length} Leases Expiring Soon`,
      description: 'Leases expiring within 30 days',
      count: expiringLeases.length,
      action: 'Review Lease Renewals',
    })
  }

  // Vacant units alert
  const vacantUnits = properties.reduce((sum, p) => {
    const occupiedInProperty = tenants.filter(
      (t) => t.property_id === p.id && t.status === 'active'
    ).length
    return sum + Math.max(0, (p.total_units || 1) - occupiedInProperty)
  }, 0)

  if (vacantUnits > 0) {
    alerts.push({
      type: 'vacant_units',
      severity: 'low',
      title: `${vacantUnits} Vacant Units`,
      description: 'Units available for rent',
      count: vacantUnits,
      action: 'View Vacant Units',
    })
  }

  return alerts
}
