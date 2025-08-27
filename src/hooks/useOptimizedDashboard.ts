'use client'

import { useState, useEffect, useCallback } from 'react'
import { dataPrefetchingService } from '../services/DataPrefetchingService'
import { useCachedDashboard } from './useCachedData'

interface DashboardData {
  properties: any[]
  tenants: any[]
  payments: any[]
  stats: any
  alerts: any[]
}

interface UseOptimizedDashboardOptions {
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  enableCaching?: boolean
  include?: ('properties' | 'tenants' | 'payments' | 'stats' | 'alerts')[]
}

interface UseOptimizedDashboardReturn {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: Date | null
}

export function useOptimizedDashboard(
  options: UseOptimizedDashboardOptions = {}
): UseOptimizedDashboardReturn {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    enableCaching = true,
    include = ['properties', 'tenants', 'payments', 'stats', 'alerts'],
  } = options

  // Use the cached dashboard hook for better performance
  const {
    data: cachedData,
    loading: cachedLoading,
    error: cachedError,
    refresh: cachedRefresh,
    cacheStats,
  } = useCachedDashboard({
    refreshInterval: autoRefresh ? refreshInterval : undefined,
  })

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Process cached data when it changes
  useEffect(() => {
    if (cachedData) {
      const dashboardData: DashboardData = {
        properties: cachedData.properties || [],
        tenants: cachedData.tenants || [],
        payments: cachedData.payments || [],
        stats: cachedData.stats || {},
        alerts: cachedData.alerts || [],
      }

      setData(dashboardData)
      setLastUpdated(cacheStats.lastUpdated)
      setLoading(false)
      setError(null)
    }
  }, [cachedData]) // Remove cacheStats.lastUpdated to prevent infinite loops

  // Handle cached errors
  useEffect(() => {
    if (cachedError) {
      setError(cachedError.message)
      setLoading(false)
    }
  }, [cachedError])

  // Handle cached loading state
  useEffect(() => {
    setLoading(cachedLoading)
  }, [cachedLoading])

  const refresh = useCallback(async () => {
    // Clear cache before refreshing
    if (enableCaching) {
      dataPrefetchingService.clearCache('dashboard')
    }

    await cachedRefresh()
  }, [cachedRefresh, enableCaching])

  // Auto-refresh is now handled by the useCachedDashboard hook

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated,
  }
}

// Specialized hook for property management pages
export function useOptimizedProperties(propertyIds?: string[]) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        include: 'tenants,units,payments',
      })

      if (propertyIds && propertyIds.length > 0) {
        queryParams.set('ids', propertyIds.join(','))
      }

      const response = await fetch(`/api/batch/properties?${queryParams}`)

      if (!response.ok) {
        throw new Error(`Properties API error: ${response.status}`)
      }

      const result = await response.json()
      setData(result.properties || [])
    } catch (err) {
      console.error('Properties loading error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }, [propertyIds])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  return {
    properties: data,
    loading,
    error,
    refresh: fetchProperties,
  }
}

// Specialized hook for tenant management pages
export function useOptimizedTenants(filters?: { property_id?: string; status?: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        include: 'property,payments,lease',
      })

      if (filters?.property_id) {
        queryParams.set('property_id', filters.property_id)
      }

      if (filters?.status) {
        queryParams.set('status', filters.status)
      }

      const response = await fetch(`/api/batch/tenants?${queryParams}`)

      if (!response.ok) {
        throw new Error(`Tenants API error: ${response.status}`)
      }

      const result = await response.json()
      setData(result.tenants || [])
    } catch (err) {
      console.error('Tenants loading error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  return {
    tenants: data,
    loading,
    error,
    refresh: fetchTenants,
  }
}
