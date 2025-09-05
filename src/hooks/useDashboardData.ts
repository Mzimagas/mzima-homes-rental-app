/**
 * Dashboard Data Fetching Hooks
 * Comprehensive hooks for dashboard data management following useCachedData.ts patterns
 * Includes caching, error handling, and real-time updates
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCachedData } from './useCachedData'
import { useDashboardStore } from '../presentation/stores/dashboardStore'

// Dashboard data interfaces
export interface DashboardBatchData {
  widgets: any[]
  metrics: any[]
  alerts: any[]
  stats: any
  layouts: any[]
  metadata: {
    lastUpdated: string
    cacheExpiry: string
    totalItems: number
  }
}

export interface DashboardDataOptions {
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
  autoRefresh?: boolean
  refreshInterval?: number
  enableCaching?: boolean
}

export interface DashboardDataReturn {
  data: DashboardBatchData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: Date | null
  cacheStats: {
    isFromCache: boolean
    lastUpdated: Date | null
    cacheSize: number
  }
}

/**
 * Main dashboard data hook - fetches all dashboard data in batch
 */
export function useDashboardData(options: DashboardDataOptions = {}): DashboardDataReturn {
  const {
    include = ['widgets', 'metrics', 'alerts', 'stats'],
    timeRange = { period: 'month' },
    filters = {},
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    enableCaching = true
  } = options

  // Create cache key based on options
  const cacheKey = `dashboard_batch_${JSON.stringify({ include, timeRange, filters })}`

  // Fetcher function for the API call
  const fetcher = useCallback(async (): Promise<DashboardBatchData> => {
    const params = new URLSearchParams()
    
    if (include.length > 0) {
      params.append('include', include.join(','))
    }
    
    if (timeRange.period) {
      params.append('timeRange', timeRange.period)
    }
    
    if (filters.properties && filters.properties.length > 0) {
      params.append('properties', filters.properties.join(','))
    }

    const response = await fetch(`/api/dashboard/batch?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
    }
    
    return response.json()
  }, [include, timeRange, filters])

  // Use cached data hook with auto-refresh if enabled
  const {
    data,
    loading,
    error,
    refresh,
    cacheStats
  } = useCachedData<DashboardBatchData>({
    cacheKey,
    fetcher,
    ttl: enableCaching ? 180000 : 0, // 3 minutes or no cache
    tags: ['dashboard', 'batch'],
    enabled: true,
    refreshInterval: autoRefresh ? refreshInterval : undefined,
    onSuccess: (data) => {
      // Update dashboard store with fresh data
      const store = useDashboardStore.getState()
      if (data.widgets) store.setWidgets(data.widgets)
      if (data.metrics) store.upsertMetrics(data.metrics)
      if (data.alerts) store.setAlerts(data.alerts)
    },
    onError: (error) => {
      console.error('Dashboard data fetch error:', error)
    }
  })

  return {
    data,
    loading,
    error: error?.message || null,
    refresh,
    lastUpdated: cacheStats.lastUpdated,
    cacheStats
  }
}

/**
 * Hook for fetching dashboard statistics
 */
export function useDashboardStats(options: Omit<DashboardDataOptions, 'include'> = {}) {
  const {
    timeRange = { period: 'month' },
    filters = {},
    autoRefresh = false,
    refreshInterval = 300000,
    enableCaching = true
  } = options

  const cacheKey = `dashboard_stats_${JSON.stringify({ timeRange, filters })}`

  const fetcher = useCallback(async () => {
    const { data } = await useDashboardData({
      include: ['stats'],
      timeRange,
      filters,
      enableCaching: false // Let this hook handle caching
    })
    return data?.stats || null
  }, [timeRange, filters])

  return useCachedData({
    cacheKey,
    fetcher,
    ttl: enableCaching ? 180000 : 0,
    tags: ['dashboard', 'stats'],
    refreshInterval: autoRefresh ? refreshInterval : undefined
  })
}

/**
 * Hook for fetching dashboard metrics
 */
export function useDashboardMetrics(options: {
  metricIds?: string[]
  forceRefresh?: boolean
  timeRange?: DashboardDataOptions['timeRange']
  autoRefresh?: boolean
  refreshInterval?: number
} = {}) {
  const {
    metricIds,
    forceRefresh = false,
    timeRange = { period: 'month' },
    autoRefresh = false,
    refreshInterval = 300000
  } = options

  const cacheKey = `dashboard_metrics_${JSON.stringify({ metricIds, timeRange })}`

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams()
    
    if (metricIds && metricIds.length > 0) {
      params.append('ids', metricIds.join(','))
    }
    
    if (timeRange.period) {
      params.append('timeRange', timeRange.period)
    }
    
    if (forceRefresh) {
      params.append('refresh', 'true')
    }

    const response = await fetch(`/api/dashboard/metrics?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data
  }, [metricIds, timeRange, forceRefresh])

  const result = useCachedData({
    cacheKey,
    fetcher,
    ttl: forceRefresh ? 0 : 180000, // No cache if force refresh
    tags: ['dashboard', 'metrics'],
    refreshInterval: autoRefresh ? refreshInterval : undefined,
    onSuccess: (metrics) => {
      // Update dashboard store with fresh metrics
      const store = useDashboardStore.getState()
      store.upsertMetrics(metrics)
    }
  })

  // Refresh specific metrics function
  const refreshMetrics = useCallback(async (specificMetricIds?: string[]) => {
    const params = new URLSearchParams()
    
    if (specificMetricIds && specificMetricIds.length > 0) {
      params.append('ids', specificMetricIds.join(','))
    } else if (metricIds && metricIds.length > 0) {
      params.append('ids', metricIds.join(','))
    }
    
    params.append('refresh', 'true')

    const response = await fetch(`/api/dashboard/metrics?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to refresh metrics: ${response.statusText}`)
    }
    
    const refreshResult = await response.json()
    
    // Update store and trigger re-render
    const store = useDashboardStore.getState()
    store.upsertMetrics(refreshResult.data)
    
    // Refresh the cached data
    await result.refresh()
    
    return refreshResult.data
  }, [metricIds, result])

  return {
    ...result,
    refreshMetrics
  }
}

/**
 * Hook for fetching dashboard alerts
 */
export function useDashboardAlerts(options: {
  severity?: ('low' | 'medium' | 'high' | 'critical')[]
  unreadOnly?: boolean
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
} = {}) {
  const {
    severity,
    unreadOnly = false,
    limit = 50,
    autoRefresh = true, // Alerts should refresh more frequently
    refreshInterval = 60000 // 1 minute for alerts
  } = options

  const cacheKey = `dashboard_alerts_${JSON.stringify({ severity, unreadOnly, limit })}`

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams()
    
    if (severity && severity.length > 0) {
      params.append('severity', severity.join(','))
    }
    
    if (unreadOnly) {
      params.append('unread', 'true')
    }
    
    if (limit) {
      params.append('limit', limit.toString())
    }

    const response = await fetch(`/api/dashboard/alerts?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data
  }, [severity, unreadOnly, limit])

  const result = useCachedData({
    cacheKey,
    fetcher,
    ttl: 60000, // 1 minute cache for alerts
    tags: ['dashboard', 'alerts'],
    refreshInterval: autoRefresh ? refreshInterval : undefined,
    onSuccess: (alerts) => {
      // Update dashboard store with fresh alerts
      const store = useDashboardStore.getState()
      store.setAlerts(alerts)
    }
  })

  // Mark alerts as read function
  const markAlertsAsRead = useCallback(async (alertIds: string[]) => {
    const response = await fetch('/api/dashboard/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alertIds })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to mark alerts as read: ${response.statusText}`)
    }
    
    // Update store
    const store = useDashboardStore.getState()
    alertIds.forEach(id => store.markAlertAsRead(id))
    
    // Refresh cached data
    await result.refresh()
    
    return response.json()
  }, [result])

  return {
    ...result,
    markAlertsAsRead
  }
}

/**
 * Hook for fetching dashboard widgets
 */
export function useDashboardWidgets(options: {
  layout?: string
  visibleOnly?: boolean
  autoRefresh?: boolean
} = {}) {
  const {
    layout = 'default',
    visibleOnly = false,
    autoRefresh = false
  } = options

  const cacheKey = `dashboard_widgets_${layout}_${visibleOnly}`

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams()
    
    if (layout) {
      params.append('layout', layout)
    }
    
    if (visibleOnly) {
      params.append('visibleOnly', 'true')
    }

    const response = await fetch(`/api/dashboard/widgets?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch widgets: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data
  }, [layout, visibleOnly])

  return useCachedData({
    cacheKey,
    fetcher,
    ttl: 300000, // 5 minutes for widgets
    tags: ['dashboard', 'widgets'],
    refreshInterval: autoRefresh ? 300000 : undefined,
    onSuccess: (widgets) => {
      // Update dashboard store with fresh widgets
      const store = useDashboardStore.getState()
      store.setWidgets(widgets)
    }
  })
}

/**
 * Combined hook for all dashboard data with optimized loading
 */
export function useOptimizedDashboard(options: DashboardDataOptions = {}) {
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Load data in priority order
  const statsResult = useDashboardStats(options)
  const metricsResult = useDashboardMetrics(options)
  const widgetsResult = useDashboardWidgets(options)
  const alertsResult = useDashboardAlerts(options)

  // Track initialization
  useEffect(() => {
    if (!isInitialized && !statsResult.loading && !metricsResult.loading) {
      setIsInitialized(true)
    }
  }, [isInitialized, statsResult.loading, metricsResult.loading])

  // Combined refresh function
  const refreshAll = useCallback(async () => {
    await Promise.all([
      statsResult.refresh(),
      metricsResult.refresh(),
      widgetsResult.refresh(),
      alertsResult.refresh()
    ])
  }, [statsResult, metricsResult, widgetsResult, alertsResult])

  return {
    stats: statsResult,
    metrics: metricsResult,
    widgets: widgetsResult,
    alerts: alertsResult,
    loading: statsResult.loading || metricsResult.loading || widgetsResult.loading || alertsResult.loading,
    error: statsResult.error || metricsResult.error || widgetsResult.error || alertsResult.error,
    isInitialized,
    refreshAll
  }
}
