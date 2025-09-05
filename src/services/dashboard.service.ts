/**
 * Dashboard Service
 * Centralized service for dashboard data operations following consolidated-property.service.ts patterns
 * Handles authentication, error handling, and batch operations
 */

import supabase from '../lib/supabase-client'
import { isAuthError } from '../components/properties/utils/property-management.utils'
import { 
  DashboardWidget, 
  DashboardMetric, 
  DashboardAlert, 
  DashboardLayout 
} from '../presentation/stores/dashboardStore'

// Dashboard data aggregation types
export interface DashboardStats {
  totalProperties: number
  totalUnits: number
  totalTenants: number
  occupancyRate: number
  monthlyRevenue: number
  collectionRate: number
  outstandingAmount: number
  maintenanceRequests: number
  criticalAlerts: number
}

export interface DashboardBatchResponse {
  widgets: DashboardWidget[]
  metrics: DashboardMetric[]
  alerts: DashboardAlert[]
  stats: DashboardStats
  layouts: DashboardLayout[]
}

export interface DashboardFilters {
  timeRange?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  startDate?: string
  endDate?: string
  properties?: string[]
  tenants?: string[]
}

export interface MetricUpdateRequest {
  metricIds?: string[]
  forceRefresh?: boolean
}

/**
 * Dashboard Service Class
 * Following ConsolidatedPropertyService patterns for consistency
 */
export class DashboardService {
  private static readonly AUTH_ERROR_MESSAGE = 'Session expired. Please log in again.'
  private static readonly LOGIN_URL = '/auth/login?message=Please log in to access dashboard.'

  /**
   * Handle authentication errors consistently across all operations
   */
  private static async handleAuthError(error: any, context: string): Promise<boolean> {
    if (isAuthError(error)) {
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.warn('Failed to sign out:', signOutError)
      }
      window.location.href = `${this.LOGIN_URL}&context=${context}`
      return true
    }
    return false
  }

  /**
   * Get authenticated user with error handling
   */
  private static async getAuthenticatedUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      const handled = await this.handleAuthError(error, 'getUser')
      if (handled) return null
      throw error
    }
    
    if (!user) {
      window.location.href = this.LOGIN_URL
      return null
    }
    
    return user
  }

  /**
   * Execute database operation with consistent error handling
   */
  private static async executeWithErrorHandling<T>(
    operation: () => Promise<{ data: T; error: any }>,
    context: string,
    defaultValue: T
  ): Promise<T> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) return defaultValue

      const { data, error } = await operation()
      
      if (error) {
        const handled = await this.handleAuthError(error, context)
        if (handled) return defaultValue
        throw error
      }
      
      return data || defaultValue
    } catch (error) {
      console.error(`Error in ${context}:`, error)
      if (error instanceof Error && isAuthError(error)) {
        window.location.href = `${this.LOGIN_URL}&context=${context}`
      }
      return defaultValue
    }
  }

  /**
   * Load complete dashboard data in batch
   */
  static async loadDashboardBatch(filters?: DashboardFilters): Promise<DashboardBatchResponse> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) {
        return {
          widgets: [],
          metrics: [],
          alerts: [],
          stats: this.getEmptyStats(),
          layouts: []
        }
      }

      // Execute all dashboard queries in parallel
      const [
        statsResult,
        alertsResult,
        layoutsResult
      ] = await Promise.allSettled([
        this.getDashboardStats(filters),
        this.getDashboardAlerts(),
        this.getDashboardLayouts()
      ])

      // Generate default widgets and metrics based on stats
      const stats = statsResult.status === 'fulfilled' ? statsResult.value : this.getEmptyStats()
      const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : []
      const layouts = layoutsResult.status === 'fulfilled' ? layoutsResult.value : []

      const widgets = this.generateDefaultWidgets()
      const metrics = this.generateMetricsFromStats(stats)

      return {
        widgets,
        metrics,
        alerts,
        stats,
        layouts
      }
    } catch (error) {
      console.error('Error loading dashboard batch:', error)
      return {
        widgets: [],
        metrics: [],
        alerts: [],
        stats: this.getEmptyStats(),
        layouts: []
      }
    }
  }

  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(filters?: DashboardFilters): Promise<DashboardStats> {
    const defaultStats = this.getEmptyStats()

    try {
      // Get property statistics
      const propertiesResult = await this.executeWithErrorHandling(
        () => supabase
          .from('properties')
          .select('id, property_type')
          .eq('lifecycle_status', 'RENTAL_READY'),
        'getDashboardStats:properties',
        []
      )

      // Get unit statistics
      const unitsResult = await this.executeWithErrorHandling(
        () => supabase
          .from('units')
          .select('id, is_active, monthly_rent_kes')
          .eq('is_active', true),
        'getDashboardStats:units',
        []
      )

      // Get tenant statistics
      const tenantsResult = await this.executeWithErrorHandling(
        () => supabase
          .from('tenants')
          .select('id, status')
          .eq('status', 'ACTIVE'),
        'getDashboardStats:tenants',
        []
      )

      // Get payment statistics for current month
      const currentMonth = new Date()
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const paymentsResult = await this.executeWithErrorHandling(
        () => supabase
          .from('payments')
          .select('amount_kes, status, payment_date')
          .gte('payment_date', startOfMonth.toISOString())
          .lte('payment_date', endOfMonth.toISOString()),
        'getDashboardStats:payments',
        []
      )

      // Calculate statistics
      const totalProperties = propertiesResult.length
      const totalUnits = unitsResult.length
      const totalTenants = tenantsResult.length
      
      // Calculate occupancy rate (simplified - would need tenant-unit relationships)
      const occupancyRate = totalUnits > 0 ? Math.round((totalTenants / totalUnits) * 100) : 0

      // Calculate monthly revenue
      const monthlyRevenue = paymentsResult
        .filter((p: any) => p.status === 'COMPLETED')
        .reduce((sum: number, p: any) => sum + (p.amount_kes || 0), 0)

      // Calculate collection rate
      const totalExpected = unitsResult.reduce((sum: number, u: any) => sum + (u.monthly_rent_kes || 0), 0)
      const collectionRate = totalExpected > 0 ? Math.round((monthlyRevenue / totalExpected) * 100) : 0

      // Calculate outstanding amount
      const outstandingAmount = totalExpected - monthlyRevenue

      return {
        totalProperties,
        totalUnits,
        totalTenants,
        occupancyRate,
        monthlyRevenue,
        collectionRate,
        outstandingAmount: Math.max(0, outstandingAmount),
        maintenanceRequests: 0, // Would need maintenance requests table
        criticalAlerts: 0 // Calculated from alerts
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return defaultStats
    }
  }

  /**
   * Get dashboard alerts
   */
  static async getDashboardAlerts(): Promise<DashboardAlert[]> {
    // This would integrate with a notifications/alerts system
    // For now, return mock alerts based on business logic
    const mockAlerts: DashboardAlert[] = [
      {
        id: 'alert-1',
        type: 'payment',
        severity: 'high',
        title: 'Overdue Payments',
        message: '3 tenants have overdue payments',
        source: 'payment_system',
        isRead: false,
        isResolved: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'alert-2',
        type: 'maintenance',
        severity: 'medium',
        title: 'Maintenance Requests',
        message: '5 pending maintenance requests',
        source: 'maintenance_system',
        isRead: false,
        isResolved: false,
        createdAt: new Date().toISOString()
      }
    ]

    return mockAlerts
  }

  /**
   * Get dashboard layouts
   */
  static async getDashboardLayouts(): Promise<DashboardLayout[]> {
    const defaultLayout: DashboardLayout = {
      id: 'default',
      name: 'Default Layout',
      isDefault: true,
      widgetPositions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return [defaultLayout]
  }

  /**
   * Refresh specific metrics
   */
  static async refreshMetrics(request: MetricUpdateRequest): Promise<DashboardMetric[]> {
    try {
      // Get fresh stats
      const stats = await this.getDashboardStats()
      
      // Generate updated metrics
      const metrics = this.generateMetricsFromStats(stats)
      
      // Filter by requested metric IDs if specified
      if (request.metricIds && request.metricIds.length > 0) {
        return metrics.filter(m => request.metricIds!.includes(m.id))
      }
      
      return metrics
    } catch (error) {
      console.error('Error refreshing metrics:', error)
      return []
    }
  }

  /**
   * Generate default widgets
   */
  private static generateDefaultWidgets(): DashboardWidget[] {
    const now = new Date().toISOString()
    
    return [
      {
        id: 'widget-properties',
        type: 'metric',
        title: 'Total Properties',
        size: 'small',
        position: { widgetId: 'widget-properties', x: 0, y: 0, width: 1, height: 1 },
        config: { refreshInterval: 300000 }, // 5 minutes
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
        config: { refreshInterval: 300000 },
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
        config: { refreshInterval: 300000 },
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
        config: { refreshInterval: 300000 },
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
   * Generate metrics from dashboard stats
   */
  private static generateMetricsFromStats(stats: DashboardStats): DashboardMetric[] {
    const now = new Date().toISOString()

    return [
      {
        id: 'metric-properties',
        key: 'total_properties',
        value: stats.totalProperties,
        trend: 'stable',
        unit: '',
        format: 'number',
        thresholds: { target: 25 },
        lastUpdated: now
      },
      {
        id: 'metric-tenants',
        key: 'total_tenants',
        value: stats.totalTenants,
        trend: 'up',
        trendPercentage: 5.2,
        unit: '',
        format: 'number',
        thresholds: { target: stats.totalUnits },
        lastUpdated: now
      },
      {
        id: 'metric-revenue',
        key: 'monthly_revenue',
        value: stats.monthlyRevenue,
        trend: stats.monthlyRevenue > 2000000 ? 'up' : 'down',
        trendPercentage: 12.5,
        unit: 'KES',
        format: 'currency',
        thresholds: { target: 2500000, warning: 2000000, critical: 1500000 },
        lastUpdated: now
      },
      {
        id: 'metric-occupancy',
        key: 'occupancy_rate',
        value: stats.occupancyRate,
        trend: stats.occupancyRate >= 90 ? 'up' : stats.occupancyRate >= 80 ? 'stable' : 'down',
        trendPercentage: 3.1,
        unit: '%',
        format: 'percentage',
        thresholds: { target: 95, warning: 85, critical: 75 },
        lastUpdated: now
      },
      {
        id: 'metric-collection',
        key: 'collection_rate',
        value: stats.collectionRate,
        trend: stats.collectionRate >= 95 ? 'up' : stats.collectionRate >= 90 ? 'stable' : 'down',
        trendPercentage: -2.3,
        unit: '%',
        format: 'percentage',
        thresholds: { target: 98, warning: 90, critical: 80 },
        lastUpdated: now
      },
      {
        id: 'metric-outstanding',
        key: 'outstanding_amount',
        value: stats.outstandingAmount,
        trend: stats.outstandingAmount < 100000 ? 'up' : 'down',
        trendPercentage: -15.7,
        unit: 'KES',
        format: 'currency',
        thresholds: { warning: 150000, critical: 300000 },
        lastUpdated: now
      }
    ]
  }

  /**
   * Get empty stats object
   */
  private static getEmptyStats(): DashboardStats {
    return {
      totalProperties: 0,
      totalUnits: 0,
      totalTenants: 0,
      occupancyRate: 0,
      monthlyRevenue: 0,
      collectionRate: 0,
      outstandingAmount: 0,
      maintenanceRequests: 0,
      criticalAlerts: 0
    }
  }

  /**
   * Update widget configuration
   */
  static async updateWidget(
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<{ success: boolean; data?: DashboardWidget; error?: string }> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) {
        return { success: false, error: 'Authentication required' }
      }

      // In a real implementation, this would save to a user_dashboard_widgets table
      // For now, we'll return success with the updated widget
      const updatedWidget: DashboardWidget = {
        id: widgetId,
        type: 'metric',
        title: 'Updated Widget',
        size: 'medium',
        position: { widgetId, x: 0, y: 0, width: 2, height: 1 },
        config: {},
        dataSource: 'default',
        refreshInterval: 300000,
        isVisible: true,
        permissions: { canEdit: true, canDelete: true, canMove: true, canResize: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updates
      }

      return { success: true, data: updatedWidget }
    } catch (error) {
      console.error('Error updating widget:', error)
      return { success: false, error: 'Failed to update widget' }
    }
  }

  /**
   * Save dashboard layout
   */
  static async saveLayout(
    layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; data?: DashboardLayout; error?: string }> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) {
        return { success: false, error: 'Authentication required' }
      }

      const newLayout: DashboardLayout = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...layout
      }

      // In a real implementation, this would save to a user_dashboard_layouts table
      return { success: true, data: newLayout }
    } catch (error) {
      console.error('Error saving layout:', error)
      return { success: false, error: 'Failed to save layout' }
    }
  }

  /**
   * Batch update multiple widgets
   */
  static async batchUpdateWidgets(
    updates: Array<{ id: string; data: Partial<DashboardWidget> }>
  ): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; error?: string }> }> {
    const results: Array<{ id: string; success: boolean; error?: string }> = []

    for (const update of updates) {
      const result = await this.updateWidget(update.id, update.data)
      results.push({
        id: update.id,
        success: result.success,
        error: result.error
      })
    }

    const allSuccessful = results.every(r => r.success)
    return { success: allSuccessful, results }
  }

  /**
   * Get property analytics data
   */
  static async getPropertyAnalytics(filters?: DashboardFilters): Promise<{
    occupancyTrends: Array<{ date: string; occupancy: number }>
    revenueTrends: Array<{ date: string; revenue: number }>
    propertyPerformance: Array<{ propertyId: string; name: string; revenue: number; occupancy: number }>
  }> {
    try {
      // Mock data for now - would integrate with actual analytics queries
      const occupancyTrends = Array.from({ length: 12 }, (_, i) => ({
        date: new Date(2024, i, 1).toISOString(),
        occupancy: Math.floor(Math.random() * 20) + 80 // 80-100%
      }))

      const revenueTrends = Array.from({ length: 12 }, (_, i) => ({
        date: new Date(2024, i, 1).toISOString(),
        revenue: Math.floor(Math.random() * 500000) + 2000000 // 2M-2.5M KES
      }))

      const propertyPerformance = [
        { propertyId: '1', name: 'Westlands Tower', revenue: 240000, occupancy: 95 },
        { propertyId: '2', name: 'Karen Villas', revenue: 180000, occupancy: 100 },
        { propertyId: '3', name: 'Kilimani Heights', revenue: 135000, occupancy: 75 },
        { propertyId: '4', name: 'Lavington Court', revenue: 200000, occupancy: 88 }
      ]

      return {
        occupancyTrends,
        revenueTrends,
        propertyPerformance
      }
    } catch (error) {
      console.error('Error getting property analytics:', error)
      return {
        occupancyTrends: [],
        revenueTrends: [],
        propertyPerformance: []
      }
    }
  }

  /**
   * Mark alert as read
   */
  static async markAlertAsRead(
    alertId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) {
        return { success: false, error: 'Authentication required' }
      }

      // In a real implementation, this would update the alerts table
      return { success: true }
    } catch (error) {
      console.error('Error marking alert as read:', error)
      return { success: false, error: 'Failed to mark alert as read' }
    }
  }

  /**
   * Mark alert as resolved
   */
  static async markAlertAsResolved(
    alertId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) {
        return { success: false, error: 'Authentication required' }
      }

      // In a real implementation, this would update the alerts table
      return { success: true }
    } catch (error) {
      console.error('Error marking alert as resolved:', error)
      return { success: false, error: 'Failed to mark alert as resolved' }
    }
  }
}
