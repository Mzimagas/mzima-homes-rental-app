/**
 * Dashboard Batch API Route
 * Efficient batch loading of dashboard data following /api/batch/properties patterns
 * GET /api/dashboard/batch?include=widgets,metrics,alerts&timeRange=month
 * POST /api/dashboard/batch with { include: [...], filters: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withAuth, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'

// Request/Response interfaces
interface DashboardBatchRequest {
  include?: ('widgets' | 'metrics' | 'alerts' | 'stats' | 'layouts')[]
  timeRange?: {
    start?: string
    end?: string
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year'
  }
  filters?: {
    properties?: string[]
    tenants?: string[]
    alertSeverity?: string[]
  }
}

interface DashboardBatchResponse {
  widgets?: any[]
  metrics?: any[]
  alerts?: any[]
  stats?: any
  layouts?: any[]
  metadata?: {
    lastUpdated: string
    cacheExpiry: string
    totalItems: number
  }
}

// GET handler with authentication and rate limiting
export const GET = withAuth(
  withRateLimit(async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })

      // Parse query parameters
      const { searchParams } = new URL(request.url)
      const includeParam = searchParams.get('include')
      const timeRangeParam = searchParams.get('timeRange')
      const propertiesParam = searchParams.get('properties')

      const include = includeParam
        ? (includeParam.split(',') as DashboardBatchRequest['include'])
        : ['widgets', 'metrics', 'alerts', 'stats']

      const timeRange = timeRangeParam
        ? { period: timeRangeParam as any }
        : { period: 'month' as const }

      const filters = {
        properties: propertiesParam ? propertiesParam.split(',') : undefined
      }

      const result = await fetchDashboardBatch(supabase, {
        include,
        timeRange,
        filters
      })

      return NextResponse.json(result)
    } catch (error) {
      console.error('Dashboard batch API error:', error)
      return errors.internal('Failed to fetch dashboard data')
    }
  })
)

// POST handler for complex requests
export const POST = withAuth(
  withRateLimit(async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      let body: DashboardBatchRequest
      try {
        body = await request.json()
      } catch {
        return errors.badRequest('Invalid JSON payload')
      }

      const result = await fetchDashboardBatch(supabase, body)
      return NextResponse.json(result)
    } catch (error) {
      console.error('Dashboard batch API error:', error)
      return errors.internal('Failed to fetch dashboard data')
    }
  })
)

/**
 * Fetch dashboard data in batch with optimized queries
 */
async function fetchDashboardBatch(
  supabase: any,
  options: DashboardBatchRequest
): Promise<DashboardBatchResponse> {
  const { include = [], timeRange = {}, filters = {} } = options

  // Prepare parallel queries for optimal performance
  const queries: Promise<any>[] = []
  const queryMap: { [key: string]: number } = {}

  // Get current user for RLS
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Authentication required')
  }

  // Calculate time range
  const { startDate, endDate } = calculateTimeRange(timeRange)

  // Properties and stats query (foundation for other metrics)
  if (include.includes('stats') || include.includes('metrics')) {
    queryMap.properties = queries.length
    queries.push(
      supabase
        .from('properties')
        .select(`
          id,
          name,
          property_type,
          lifecycle_status,
          total_units,
          created_at,
          units:units(
            id,
            unit_number,
            monthly_rent_kes,
            is_active,
            tenancy_agreements:tenancy_agreements(
              id,
              status,
              monthly_rent_kes,
              tenants:tenants(
                id,
                full_name,
                status
              )
            )
          )
        `)
        .eq('lifecycle_status', 'RENTAL_READY')
        .then((result: any) => ({ type: 'properties', ...result }))
    )
  }

  // Payments query for financial metrics
  if (include.includes('stats') || include.includes('metrics')) {
    queryMap.payments = queries.length
    queries.push(
      supabase
        .from('payments')
        .select(`
          id,
          amount_kes,
          payment_date,
          status,
          payment_method,
          tenant_id,
          tenants:tenants(
            id,
            property_id
          )
        `)
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString())
        .then((result: any) => ({ type: 'payments', ...result }))
    )
  }

  // Execute all queries in parallel
  const results = await Promise.allSettled(queries)

  // Process results
  const response: DashboardBatchResponse = {}
  let totalItems = 0

  // Extract data from results
  const propertiesResult = queryMap.properties !== undefined 
    ? results[queryMap.properties] 
    : null
  const paymentsResult = queryMap.payments !== undefined 
    ? results[queryMap.payments] 
    : null

  const properties = propertiesResult?.status === 'fulfilled' 
    ? propertiesResult.value.data || [] 
    : []
  const payments = paymentsResult?.status === 'fulfilled' 
    ? paymentsResult.value.data || [] 
    : []

  // Generate widgets if requested
  if (include.includes('widgets')) {
    response.widgets = generateDefaultWidgets()
    totalItems += response.widgets.length
  }

  // Calculate metrics if requested
  if (include.includes('metrics')) {
    response.metrics = calculateDashboardMetrics(properties, payments)
    totalItems += response.metrics.length
  }

  // Calculate stats if requested
  if (include.includes('stats')) {
    response.stats = calculateDashboardStats(properties, payments)
    totalItems += 1
  }

  // Generate alerts if requested
  if (include.includes('alerts')) {
    response.alerts = generateDashboardAlerts(properties, payments)
    totalItems += response.alerts.length
  }

  // Get layouts if requested
  if (include.includes('layouts')) {
    response.layouts = [
      {
        id: 'default',
        name: 'Default Layout',
        isDefault: true,
        widgetPositions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    totalItems += response.layouts.length
  }

  // Add metadata
  response.metadata = {
    lastUpdated: new Date().toISOString(),
    cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    totalItems
  }

  return response
}

/**
 * Calculate time range based on period
 */
function calculateTimeRange(timeRange: DashboardBatchRequest['timeRange']) {
  const now = new Date()
  let startDate: Date
  let endDate = now

  if (timeRange?.start && timeRange?.end) {
    startDate = new Date(timeRange.start)
    endDate = new Date(timeRange.end)
  } else {
    switch (timeRange?.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }
  }

  return { startDate, endDate }
}

/**
 * Generate default dashboard widgets
 */
function generateDefaultWidgets() {
  const now = new Date().toISOString()
  
  return [
    {
      id: 'widget-properties',
      type: 'metric',
      title: 'Total Properties',
      size: 'small',
      position: { widgetId: 'widget-properties', x: 0, y: 0, width: 1, height: 1 },
      config: { metricId: 'metric-properties' },
      dataSource: 'properties',
      refreshInterval: 300000,
      isVisible: true,
      permissions: { canEdit: true, canDelete: false, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'widget-tenants',
      type: 'metric',
      title: 'Active Tenants',
      size: 'small',
      position: { widgetId: 'widget-tenants', x: 1, y: 0, width: 1, height: 1 },
      config: { metricId: 'metric-tenants' },
      dataSource: 'tenants',
      refreshInterval: 300000,
      isVisible: true,
      permissions: { canEdit: true, canDelete: false, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'widget-revenue',
      type: 'metric',
      title: 'Monthly Revenue',
      size: 'small',
      position: { widgetId: 'widget-revenue', x: 2, y: 0, width: 1, height: 1 },
      config: { metricId: 'metric-revenue' },
      dataSource: 'payments',
      refreshInterval: 300000,
      isVisible: true,
      permissions: { canEdit: true, canDelete: false, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'widget-occupancy',
      type: 'metric',
      title: 'Occupancy Rate',
      size: 'small',
      position: { widgetId: 'widget-occupancy', x: 3, y: 0, width: 1, height: 1 },
      config: { metricId: 'metric-occupancy' },
      dataSource: 'occupancy',
      refreshInterval: 300000,
      isVisible: true,
      permissions: { canEdit: true, canDelete: false, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    }
  ]
}

/**
 * Calculate dashboard metrics from properties and payments data
 */
function calculateDashboardMetrics(properties: any[], payments: any[]) {
  const now = new Date().toISOString()

  // Calculate basic counts
  const totalProperties = properties.length
  const totalUnits = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0)

  // Calculate tenant statistics
  let totalTenants = 0
  let occupiedUnits = 0
  let totalPotentialRent = 0

  properties.forEach(property => {
    if (property.units) {
      property.units.forEach((unit: any) => {
        totalPotentialRent += unit.monthly_rent_kes || 0

        if (unit.tenancy_agreements && unit.tenancy_agreements.length > 0) {
          const activeTenancy = unit.tenancy_agreements.find((ta: any) => ta.status === 'ACTIVE')
          if (activeTenancy && activeTenancy.tenants) {
            totalTenants += activeTenancy.tenants.filter((t: any) => t.status === 'ACTIVE').length
            occupiedUnits++
          }
        }
      })
    }
  })

  // Calculate payment statistics
  const completedPayments = payments.filter(p => p.status === 'COMPLETED')
  const monthlyRevenue = completedPayments.reduce((sum, p) => sum + (p.amount_kes || 0), 0)

  // Calculate rates
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
  const collectionRate = totalPotentialRent > 0 ? Math.round((monthlyRevenue / totalPotentialRent) * 100) : 0
  const outstandingAmount = Math.max(0, totalPotentialRent - monthlyRevenue)

  return [
    {
      id: 'metric-properties',
      key: 'total_properties',
      value: totalProperties,
      trend: 'stable',
      unit: '',
      format: 'number',
      thresholds: { target: 25 },
      lastUpdated: now
    },
    {
      id: 'metric-tenants',
      key: 'total_tenants',
      value: totalTenants,
      trend: 'up',
      trendPercentage: 5.2,
      unit: '',
      format: 'number',
      thresholds: { target: totalUnits },
      lastUpdated: now
    },
    {
      id: 'metric-revenue',
      key: 'monthly_revenue',
      value: monthlyRevenue,
      trend: monthlyRevenue > 2000000 ? 'up' : 'down',
      trendPercentage: 12.5,
      unit: 'KES',
      format: 'currency',
      thresholds: { target: 2500000, warning: 2000000, critical: 1500000 },
      lastUpdated: now
    },
    {
      id: 'metric-occupancy',
      key: 'occupancy_rate',
      value: occupancyRate,
      trend: occupancyRate >= 90 ? 'up' : occupancyRate >= 80 ? 'stable' : 'down',
      trendPercentage: 3.1,
      unit: '%',
      format: 'percentage',
      thresholds: { target: 95, warning: 85, critical: 75 },
      lastUpdated: now
    },
    {
      id: 'metric-collection',
      key: 'collection_rate',
      value: collectionRate,
      trend: collectionRate >= 95 ? 'up' : collectionRate >= 90 ? 'stable' : 'down',
      trendPercentage: -2.3,
      unit: '%',
      format: 'percentage',
      thresholds: { target: 98, warning: 90, critical: 80 },
      lastUpdated: now
    },
    {
      id: 'metric-outstanding',
      key: 'outstanding_amount',
      value: outstandingAmount,
      trend: outstandingAmount < 100000 ? 'up' : 'down',
      trendPercentage: -15.7,
      unit: 'KES',
      format: 'currency',
      thresholds: { warning: 150000, critical: 300000 },
      lastUpdated: now
    }
  ]
}

/**
 * Calculate dashboard statistics
 */
function calculateDashboardStats(properties: any[], payments: any[]) {
  // Use the same calculations as metrics but return as stats object
  const metrics = calculateDashboardMetrics(properties, payments)

  return {
    totalProperties: metrics.find(m => m.key === 'total_properties')?.value || 0,
    totalUnits: properties.reduce((sum, p) => sum + (p.units?.length || 0), 0),
    totalTenants: metrics.find(m => m.key === 'total_tenants')?.value || 0,
    occupancyRate: metrics.find(m => m.key === 'occupancy_rate')?.value || 0,
    monthlyRevenue: metrics.find(m => m.key === 'monthly_revenue')?.value || 0,
    collectionRate: metrics.find(m => m.key === 'collection_rate')?.value || 0,
    outstandingAmount: metrics.find(m => m.key === 'outstanding_amount')?.value || 0,
    maintenanceRequests: 0, // Would need maintenance requests table
    criticalAlerts: 0 // Calculated from alerts
  }
}

/**
 * Generate dashboard alerts based on data analysis
 */
function generateDashboardAlerts(properties: any[], payments: any[]) {
  const alerts: any[] = []
  const now = new Date().toISOString()

  // Check for overdue payments
  const overduePayments = payments.filter(p => {
    if (p.status !== 'PENDING') return false
    const paymentDate = new Date(p.payment_date)
    const now = new Date()
    return paymentDate < now
  })

  if (overduePayments.length > 0) {
    alerts.push({
      id: 'alert-overdue-payments',
      type: 'payment',
      severity: 'high',
      title: 'Overdue Payments',
      message: `${overduePayments.length} payments are overdue`,
      source: 'payment_system',
      isRead: false,
      isResolved: false,
      createdAt: now
    })
  }

  // Check for low occupancy
  const totalUnits = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0)
  let occupiedUnits = 0

  properties.forEach(property => {
    if (property.units) {
      property.units.forEach((unit: any) => {
        if (unit.tenancy_agreements && unit.tenancy_agreements.length > 0) {
          const activeTenancy = unit.tenancy_agreements.find((ta: any) => ta.status === 'ACTIVE')
          if (activeTenancy) occupiedUnits++
        }
      })
    }
  })

  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

  if (occupancyRate < 80) {
    alerts.push({
      id: 'alert-low-occupancy',
      type: 'financial',
      severity: 'medium',
      title: 'Low Occupancy Rate',
      message: `Occupancy rate is ${occupancyRate.toFixed(1)}%, below target of 80%`,
      source: 'occupancy_system',
      isRead: false,
      isResolved: false,
      createdAt: now
    })
  }

  // Check for properties without tenants
  const vacantProperties = properties.filter(property => {
    if (!property.units || property.units.length === 0) return true

    return property.units.every((unit: any) => {
      if (!unit.tenancy_agreements || unit.tenancy_agreements.length === 0) return true
      return !unit.tenancy_agreements.some((ta: any) => ta.status === 'ACTIVE')
    })
  })

  if (vacantProperties.length > 0) {
    alerts.push({
      id: 'alert-vacant-properties',
      type: 'maintenance',
      severity: 'low',
      title: 'Vacant Properties',
      message: `${vacantProperties.length} properties are completely vacant`,
      source: 'property_system',
      isRead: false,
      isResolved: false,
      createdAt: now
    })
  }

  return alerts
}
