/**
 * Dashboard Widgets API Route
 * GET /api/dashboard/widgets - Get user's dashboard widgets
 * POST /api/dashboard/widgets - Create new widget
 * PUT /api/dashboard/widgets/[id] - Update widget
 * DELETE /api/dashboard/widgets/[id] - Delete widget
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withAuth, withRateLimit } from '../../../../lib/api/middleware'
import { errors } from '../../../../lib/api/errors'

interface CreateWidgetRequest {
  type: 'metric' | 'chart' | 'table' | 'quickActions' | 'notifications' | 'custom'
  title: string
  size: 'small' | 'medium' | 'large' | 'full'
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  config: Record<string, any>
  dataSource: string
}

interface UpdateWidgetRequest {
  title?: string
  size?: 'small' | 'medium' | 'large' | 'full'
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
  config?: Record<string, any>
  isVisible?: boolean
}

// GET handler for retrieving user's widgets
export const GET = withAuth(
  withRateLimit(async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { searchParams } = new URL(request.url)
      
      const layoutParam = searchParams.get('layout')
      const visibleOnlyParam = searchParams.get('visibleOnly')
      
      const layout = layoutParam || 'default'
      const visibleOnly = visibleOnlyParam === 'true'
      
      const widgets = await fetchUserWidgets(supabase, { layout, visibleOnly })
      
      return NextResponse.json({
        ok: true,
        data: widgets,
        metadata: {
          layout,
          count: widgets.length,
          lastUpdated: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Dashboard widgets API error:', error)
      return errors.internal('Failed to fetch widgets')
    }
  })
)

// POST handler for creating new widgets
export const POST = withAuth(
  withRateLimit(async (request: NextRequest) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      let body: CreateWidgetRequest
      try {
        body = await request.json()
      } catch {
        return errors.badRequest('Invalid JSON payload')
      }
      
      // Validate required fields
      if (!body.type || !body.title || !body.size) {
        return errors.badRequest('type, title, and size are required')
      }
      
      const widget = await createWidget(supabase, body)
      
      return NextResponse.json({
        ok: true,
        data: widget,
        metadata: {
          created: true,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Dashboard widget creation API error:', error)
      return errors.internal('Failed to create widget')
    }
  })
)

/**
 * Fetch user's dashboard widgets
 */
async function fetchUserWidgets(
  supabase: any, 
  options: { layout: string; visibleOnly: boolean }
) {
  const { layout, visibleOnly } = options
  
  // Get current user for RLS
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Authentication required')
  }
  
  // For now, return default widgets since we don't have a widgets table yet
  // In a real implementation, this would query a user_dashboard_widgets table
  const defaultWidgets = getDefaultWidgets()
  
  // Apply filters
  let filteredWidgets = defaultWidgets
  
  if (visibleOnly) {
    filteredWidgets = filteredWidgets.filter(widget => widget.isVisible)
  }
  
  // Sort by position for consistent ordering
  filteredWidgets.sort((a, b) => {
    if (a.position.y !== b.position.y) {
      return a.position.y - b.position.y
    }
    return a.position.x - b.position.x
  })
  
  return filteredWidgets
}

/**
 * Create a new widget
 */
async function createWidget(supabase: any, widgetData: CreateWidgetRequest) {
  // Get current user for RLS
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Authentication required')
  }
  
  const now = new Date().toISOString()
  const widget = {
    id: crypto.randomUUID(),
    type: widgetData.type,
    title: widgetData.title,
    size: widgetData.size,
    position: {
      widgetId: '',
      ...widgetData.position
    },
    config: widgetData.config || {},
    dataSource: widgetData.dataSource || 'default',
    refreshInterval: 300000, // 5 minutes
    isVisible: true,
    permissions: {
      canEdit: true,
      canDelete: true,
      canMove: true,
      canResize: true
    },
    createdAt: now,
    updatedAt: now
  }
  
  widget.position.widgetId = widget.id
  
  // In a real implementation, this would insert into user_dashboard_widgets table
  // For now, we'll just return the created widget
  
  return widget
}

/**
 * Get default dashboard widgets
 */
function getDefaultWidgets() {
  const now = new Date().toISOString()
  
  return [
    {
      id: 'widget-properties',
      type: 'metric',
      title: 'Total Properties',
      size: 'small',
      position: { widgetId: 'widget-properties', x: 0, y: 0, width: 1, height: 1 },
      config: { 
        metricId: 'metric-properties',
        showTrend: true,
        showProgress: true,
        compact: false
      },
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
      config: { 
        metricId: 'metric-tenants',
        showTrend: true,
        showProgress: true,
        compact: false
      },
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
      config: { 
        metricId: 'metric-revenue',
        showTrend: true,
        showProgress: true,
        compact: false
      },
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
      config: { 
        metricId: 'metric-occupancy',
        showTrend: true,
        showProgress: true,
        compact: false
      },
      dataSource: 'occupancy',
      refreshInterval: 300000,
      isVisible: true,
      permissions: { canEdit: true, canDelete: false, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'widget-collection',
      type: 'metric',
      title: 'Collection Rate',
      size: 'small',
      position: { widgetId: 'widget-collection', x: 0, y: 1, width: 1, height: 1 },
      config: { 
        metricId: 'metric-collection',
        showTrend: true,
        showProgress: true,
        compact: false
      },
      dataSource: 'payments',
      refreshInterval: 300000,
      isVisible: true,
      permissions: { canEdit: true, canDelete: true, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'widget-outstanding',
      type: 'metric',
      title: 'Outstanding Amount',
      size: 'small',
      position: { widgetId: 'widget-outstanding', x: 1, y: 1, width: 1, height: 1 },
      config: { 
        metricId: 'metric-outstanding',
        showTrend: true,
        showProgress: false,
        compact: false
      },
      dataSource: 'payments',
      refreshInterval: 300000,
      isVisible: true,
      permissions: { canEdit: true, canDelete: true, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'widget-quick-actions',
      type: 'quickActions',
      title: 'Quick Actions',
      size: 'medium',
      position: { widgetId: 'widget-quick-actions', x: 2, y: 1, width: 2, height: 1 },
      config: { 
        layout: 'grid',
        actions: [
          'add-property',
          'add-tenant',
          'record-payment',
          'generate-report'
        ]
      },
      dataSource: 'actions',
      refreshInterval: 0, // No refresh needed for actions
      isVisible: true,
      permissions: { canEdit: true, canDelete: true, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'widget-notifications',
      type: 'notifications',
      title: 'Recent Alerts',
      size: 'large',
      position: { widgetId: 'widget-notifications', x: 0, y: 2, width: 4, height: 1 },
      config: { 
        maxItems: 5,
        showUnreadOnly: false,
        autoRefresh: true
      },
      dataSource: 'alerts',
      refreshInterval: 60000, // 1 minute
      isVisible: true,
      permissions: { canEdit: true, canDelete: true, canMove: true, canResize: true },
      createdAt: now,
      updatedAt: now
    }
  ]
}
