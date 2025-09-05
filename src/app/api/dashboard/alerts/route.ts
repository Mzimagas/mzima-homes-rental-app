/**
 * Dashboard Alerts API Route
 * GET /api/dashboard/alerts?severity=high&unread=true
 * POST /api/dashboard/alerts/mark-read with { alertIds: [...] }
 * PATCH /api/dashboard/alerts/[id] for individual alert updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withAuth, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'

interface AlertsRequest {
  severity?: ('low' | 'medium' | 'high' | 'critical')[]
  unreadOnly?: boolean
  limit?: number
  offset?: number
}

interface MarkReadRequest {
  alertIds: string[]
}

// GET handler for retrieving alerts
export const GET = withAuth(
  withRateLimit(async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { searchParams } = new URL(request.url)
      
      const severityParam = searchParams.get('severity')
      const unreadParam = searchParams.get('unread')
      const limitParam = searchParams.get('limit')
      const offsetParam = searchParams.get('offset')
      
      const severity = severityParam ? severityParam.split(',') as AlertsRequest['severity'] : undefined
      const unreadOnly = unreadParam === 'true'
      const limit = limitParam ? parseInt(limitParam) : 50
      const offset = offsetParam ? parseInt(offsetParam) : 0
      
      const alerts = await fetchAlerts(supabase, {
        severity,
        unreadOnly,
        limit,
        offset
      })
      
      return NextResponse.json({
        ok: true,
        data: alerts,
        metadata: {
          lastUpdated: new Date().toISOString(),
          count: alerts.length,
          hasMore: alerts.length === limit
        }
      })
    } catch (error) {
      console.error('Dashboard alerts API error:', error)
      return errors.internal('Failed to fetch alerts')
    }
  })
)

// POST handler for marking alerts as read
export const POST = withAuth(
  withRateLimit(async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      let body: MarkReadRequest
      try {
        body = await request.json()
      } catch {
        return errors.badRequest('Invalid JSON payload')
      }
      
      if (!body.alertIds || !Array.isArray(body.alertIds)) {
        return errors.badRequest('alertIds array is required')
      }
      
      const result = await markAlertsAsRead(supabase, body.alertIds)
      
      return NextResponse.json({
        ok: true,
        data: result,
        metadata: {
          updated: body.alertIds.length,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Dashboard alerts mark read API error:', error)
      return errors.internal('Failed to mark alerts as read')
    }
  })
)

/**
 * Fetch alerts with filtering and pagination
 */
async function fetchAlerts(supabase: any, options: AlertsRequest) {
  const { severity, unreadOnly = false, limit = 50, offset = 0 } = options
  
  // Get current user for RLS
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Authentication required')
  }
  
  // Generate alerts based on current data analysis
  const generatedAlerts = await generateSystemAlerts(supabase)
  
  // Apply filters
  let filteredAlerts = generatedAlerts
  
  if (severity && severity.length > 0) {
    filteredAlerts = filteredAlerts.filter(alert => severity.includes(alert.severity))
  }
  
  if (unreadOnly) {
    filteredAlerts = filteredAlerts.filter(alert => !alert.isRead)
  }
  
  // Apply pagination
  const paginatedAlerts = filteredAlerts.slice(offset, offset + limit)
  
  return paginatedAlerts
}

/**
 * Generate system alerts based on current data
 */
async function generateSystemAlerts(supabase: any) {
  const alerts: any[] = []
  const now = new Date().toISOString()
  
  try {
    // Check for overdue payments
    const { data: overduePayments } = await supabase
      .from('payments')
      .select(`
        id,
        amount_kes,
        payment_date,
        tenants:tenants(
          id,
          full_name,
          properties:properties(
            id,
            name
          )
        )
      `)
      .eq('status', 'PENDING')
      .lt('payment_date', new Date().toISOString())
      .limit(10)
    
    if (overduePayments && overduePayments.length > 0) {
      alerts.push({
        id: 'alert-overdue-payments',
        type: 'payment',
        severity: overduePayments.length > 5 ? 'critical' : 'high',
        title: 'Overdue Payments',
        message: `${overduePayments.length} payments are overdue`,
        source: 'payment_system',
        isRead: false,
        isResolved: false,
        createdAt: now,
        data: {
          count: overduePayments.length,
          totalAmount: overduePayments.reduce((sum, p) => sum + (p.amount_kes || 0), 0)
        }
      })
    }
    
    // Check for vacant units
    const { data: properties } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        units:units(
          id,
          unit_number,
          is_active,
          tenancy_agreements:tenancy_agreements(
            id,
            status
          )
        )
      `)
      .eq('lifecycle_status', 'RENTAL_READY')
    
    if (properties) {
      let totalVacantUnits = 0
      let propertiesWithVacancies: any[] = []
      
      properties.forEach(property => {
        if (property.units) {
          const vacantUnits = property.units.filter((unit: any) => {
            if (!unit.is_active) return false
            if (!unit.tenancy_agreements || unit.tenancy_agreements.length === 0) return true
            return !unit.tenancy_agreements.some((ta: any) => ta.status === 'ACTIVE')
          })
          
          if (vacantUnits.length > 0) {
            totalVacantUnits += vacantUnits.length
            propertiesWithVacancies.push({
              ...property,
              vacantCount: vacantUnits.length
            })
          }
        }
      })
      
      if (totalVacantUnits > 0) {
        const severity = totalVacantUnits > 10 ? 'high' : totalVacantUnits > 5 ? 'medium' : 'low'
        alerts.push({
          id: 'alert-vacant-units',
          type: 'maintenance',
          severity,
          title: 'Vacant Units',
          message: `${totalVacantUnits} units are currently vacant across ${propertiesWithVacancies.length} properties`,
          source: 'property_system',
          isRead: false,
          isResolved: false,
          createdAt: now,
          data: {
            totalVacant: totalVacantUnits,
            propertiesAffected: propertiesWithVacancies.length,
            properties: propertiesWithVacancies.slice(0, 5) // Top 5 for details
          }
        })
      }
    }
    
    // Check for low collection rates
    const currentMonth = new Date()
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    
    const { data: monthlyPayments } = await supabase
      .from('payments')
      .select('amount_kes, status')
      .gte('payment_date', startOfMonth.toISOString())
    
    const { data: expectedRent } = await supabase
      .from('tenancy_agreements')
      .select('monthly_rent_kes')
      .eq('status', 'ACTIVE')
    
    if (monthlyPayments && expectedRent) {
      const collectedAmount = monthlyPayments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + (p.amount_kes || 0), 0)
      
      const expectedAmount = expectedRent.reduce((sum, ta) => sum + (ta.monthly_rent_kes || 0), 0)
      
      const collectionRate = expectedAmount > 0 ? (collectedAmount / expectedAmount) * 100 : 100
      
      if (collectionRate < 90) {
        const severity = collectionRate < 70 ? 'critical' : collectionRate < 80 ? 'high' : 'medium'
        alerts.push({
          id: 'alert-low-collection',
          type: 'financial',
          severity,
          title: 'Low Collection Rate',
          message: `Collection rate is ${collectionRate.toFixed(1)}% for this month`,
          source: 'financial_system',
          isRead: false,
          isResolved: false,
          createdAt: now,
          data: {
            collectionRate: collectionRate.toFixed(1),
            collected: collectedAmount,
            expected: expectedAmount,
            shortfall: expectedAmount - collectedAmount
          }
        })
      }
    }
    
    // Check for lease expirations (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const { data: expiringLeases } = await supabase
      .from('tenancy_agreements')
      .select(`
        id,
        end_date,
        tenants:tenants(
          id,
          full_name
        ),
        units:units(
          id,
          unit_number,
          properties:properties(
            id,
            name
          )
        )
      `)
      .eq('status', 'ACTIVE')
      .lte('end_date', thirtyDaysFromNow.toISOString())
      .gte('end_date', new Date().toISOString())
    
    if (expiringLeases && expiringLeases.length > 0) {
      alerts.push({
        id: 'alert-lease-expiration',
        type: 'lease',
        severity: 'medium',
        title: 'Upcoming Lease Expirations',
        message: `${expiringLeases.length} leases expire within 30 days`,
        source: 'lease_system',
        isRead: false,
        isResolved: false,
        createdAt: now,
        data: {
          count: expiringLeases.length,
          leases: expiringLeases.slice(0, 5) // Top 5 for details
        }
      })
    }
    
  } catch (error) {
    console.error('Error generating system alerts:', error)
    
    // Add a system error alert
    alerts.push({
      id: 'alert-system-error',
      type: 'system',
      severity: 'medium',
      title: 'System Monitoring Issue',
      message: 'Unable to generate some system alerts due to data access issues',
      source: 'monitoring_system',
      isRead: false,
      isResolved: false,
      createdAt: now,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
  
  return alerts
}

/**
 * Mark alerts as read (placeholder - would update database in real implementation)
 */
async function markAlertsAsRead(supabase: any, alertIds: string[]) {
  // In a real implementation, this would update an alerts table
  // For now, we'll return success
  
  return {
    success: true,
    updatedIds: alertIds,
    timestamp: new Date().toISOString()
  }
}
