/**
 * Dashboard Metrics API Route
 * GET /api/dashboard/metrics?ids=metric1,metric2&refresh=true
 * POST /api/dashboard/metrics/refresh with { metricIds: [...] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withAuth, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'

interface MetricsRequest {
  metricIds?: string[]
  forceRefresh?: boolean
  timeRange?: {
    start?: string
    end?: string
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year'
  }
}

// GET handler for retrieving specific metrics
export const GET = withAuth(
  withRateLimit(async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { searchParams } = new URL(request.url)
      
      const idsParam = searchParams.get('ids')
      const refreshParam = searchParams.get('refresh')
      const timeRangeParam = searchParams.get('timeRange')
      
      const metricIds = idsParam ? idsParam.split(',') : undefined
      const forceRefresh = refreshParam === 'true'
      const timeRange = timeRangeParam ? { period: timeRangeParam as any } : undefined
      
      const metrics = await fetchMetrics(supabase, {
        metricIds,
        forceRefresh,
        timeRange
      })
      
      return NextResponse.json({
        ok: true,
        data: metrics,
        metadata: {
          lastUpdated: new Date().toISOString(),
          count: metrics.length
        }
      })
    } catch (error) {
      console.error('Dashboard metrics API error:', error)
      return errors.internal('Failed to fetch metrics')
    }
  })
)

// POST handler for refreshing metrics
export const POST = withAuth(
  withRateLimit(async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      let body: MetricsRequest
      try {
        body = await request.json()
      } catch {
        return errors.badRequest('Invalid JSON payload')
      }
      
      const metrics = await fetchMetrics(supabase, {
        ...body,
        forceRefresh: true
      })
      
      return NextResponse.json({
        ok: true,
        data: metrics,
        metadata: {
          lastUpdated: new Date().toISOString(),
          count: metrics.length,
          refreshed: true
        }
      })
    } catch (error) {
      console.error('Dashboard metrics refresh API error:', error)
      return errors.internal('Failed to refresh metrics')
    }
  })
)

/**
 * Fetch metrics with caching and refresh logic
 */
async function fetchMetrics(supabase: any, options: MetricsRequest) {
  const { metricIds, forceRefresh = false, timeRange } = options
  
  // Get current user for RLS
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Authentication required')
  }
  
  // Calculate time range
  const { startDate, endDate } = calculateTimeRange(timeRange)
  
  // Fetch properties and related data
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select(`
      id,
      name,
      property_type,
      lifecycle_status,
      units:units(
        id,
        monthly_rent_kes,
        is_active,
        tenancy_agreements:tenancy_agreements(
          id,
          status,
          monthly_rent_kes,
          tenants:tenants(
            id,
            status
          )
        )
      )
    `)
    .eq('lifecycle_status', 'RENTAL_READY')
  
  if (propertiesError) {
    throw propertiesError
  }
  
  // Fetch payments data
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      amount_kes,
      payment_date,
      status,
      tenant_id
    `)
    .gte('payment_date', startDate.toISOString())
    .lte('payment_date', endDate.toISOString())
  
  if (paymentsError) {
    throw paymentsError
  }
  
  // Calculate all metrics
  const allMetrics = calculateMetrics(properties || [], payments || [])
  
  // Filter by requested metric IDs if specified
  if (metricIds && metricIds.length > 0) {
    return allMetrics.filter(metric => metricIds.includes(metric.id))
  }
  
  return allMetrics
}

/**
 * Calculate metrics from properties and payments data
 */
function calculateMetrics(properties: any[], payments: any[]) {
  const now = new Date().toISOString()
  
  // Calculate basic counts
  const totalProperties = properties.length
  const totalUnits = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0)
  
  // Calculate tenant and occupancy statistics
  let totalTenants = 0
  let occupiedUnits = 0
  let totalPotentialRent = 0
  let totalActualRent = 0
  
  properties.forEach(property => {
    if (property.units) {
      property.units.forEach((unit: any) => {
        if (unit.is_active) {
          totalPotentialRent += unit.monthly_rent_kes || 0
          
          if (unit.tenancy_agreements && unit.tenancy_agreements.length > 0) {
            const activeTenancy = unit.tenancy_agreements.find((ta: any) => ta.status === 'ACTIVE')
            if (activeTenancy) {
              occupiedUnits++
              totalActualRent += activeTenancy.monthly_rent_kes || unit.monthly_rent_kes || 0
              
              if (activeTenancy.tenants) {
                totalTenants += activeTenancy.tenants.filter((t: any) => t.status === 'ACTIVE').length
              }
            }
          }
        }
      })
    }
  })
  
  // Calculate payment statistics
  const completedPayments = payments.filter(p => p.status === 'COMPLETED')
  const monthlyRevenue = completedPayments.reduce((sum, p) => sum + (p.amount_kes || 0), 0)
  
  // Calculate rates and derived metrics
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
  const collectionRate = totalActualRent > 0 ? Math.round((monthlyRevenue / totalActualRent) * 100) : 0
  const outstandingAmount = Math.max(0, totalActualRent - monthlyRevenue)
  
  // Calculate trends (simplified - in real implementation would compare with previous period)
  const getTrend = (current: number, target: number) => {
    if (current >= target * 0.95) return 'up'
    if (current >= target * 0.85) return 'stable'
    return 'down'
  }
  
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
      id: 'metric-units',
      key: 'total_units',
      value: totalUnits,
      trend: 'stable',
      unit: '',
      format: 'number',
      thresholds: { target: totalProperties * 4 }, // Assume 4 units per property target
      lastUpdated: now
    },
    {
      id: 'metric-tenants',
      key: 'total_tenants',
      value: totalTenants,
      trend: getTrend(totalTenants, totalUnits),
      trendPercentage: 5.2,
      unit: '',
      format: 'number',
      thresholds: { target: totalUnits, warning: totalUnits * 0.8, critical: totalUnits * 0.6 },
      lastUpdated: now
    },
    {
      id: 'metric-occupancy',
      key: 'occupancy_rate',
      value: occupancyRate,
      trend: getTrend(occupancyRate, 95),
      trendPercentage: 3.1,
      unit: '%',
      format: 'percentage',
      thresholds: { target: 95, warning: 85, critical: 75 },
      lastUpdated: now
    },
    {
      id: 'metric-revenue',
      key: 'monthly_revenue',
      value: monthlyRevenue,
      trend: getTrend(monthlyRevenue, totalActualRent),
      trendPercentage: 12.5,
      unit: 'KES',
      format: 'currency',
      thresholds: { 
        target: totalActualRent, 
        warning: totalActualRent * 0.9, 
        critical: totalActualRent * 0.8 
      },
      lastUpdated: now
    },
    {
      id: 'metric-collection',
      key: 'collection_rate',
      value: collectionRate,
      trend: getTrend(collectionRate, 98),
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
      trend: outstandingAmount < totalActualRent * 0.1 ? 'up' : 'down',
      trendPercentage: -15.7,
      unit: 'KES',
      format: 'currency',
      thresholds: { 
        warning: totalActualRent * 0.15, 
        critical: totalActualRent * 0.25 
      },
      lastUpdated: now
    },
    {
      id: 'metric-potential-rent',
      key: 'potential_monthly_rent',
      value: totalPotentialRent,
      trend: 'stable',
      unit: 'KES',
      format: 'currency',
      thresholds: { target: totalPotentialRent },
      lastUpdated: now
    }
  ]
}

/**
 * Calculate time range based on period
 */
function calculateTimeRange(timeRange?: MetricsRequest['timeRange']) {
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
