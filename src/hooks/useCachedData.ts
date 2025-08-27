'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { dataCache, searchCache, apiCache } from '../services/CachingService'

interface UseCachedDataOptions {
  cacheKey: string
  fetcher: () => Promise<any>
  ttl?: number
  tags?: string[]
  enabled?: boolean
  refreshInterval?: number
  onError?: (error: Error) => void
  onSuccess?: (data: any) => void
}

interface UseCachedDataReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  invalidate: () => void
  cacheStats: {
    isFromCache: boolean
    lastUpdated: Date | null
    cacheSize: number
  }
}

export function useCachedData<T = any>({
  cacheKey,
  fetcher,
  ttl = 300000, // 5 minutes default
  tags = [],
  enabled = true,
  refreshInterval,
  onError,
  onSuccess,
}: UseCachedDataOptions): UseCachedDataReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Use refs to avoid dependency issues with callbacks and fetcher
  const onErrorRef = useRef(onError)
  const onSuccessRef = useRef(onSuccess)
  const fetcherRef = useRef(fetcher)

  // Update refs when callbacks change
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const fetchData = useCallback(
    async (useCache = true) => {
      if (!enabled) return

      setLoading(true)
      setError(null)

      try {
        // Try cache first if enabled
        if (useCache) {
          const cachedData = dataCache.get<T>(cacheKey)
          if (cachedData) {
            setData(cachedData)
            setIsFromCache(true)
            setLastUpdated(new Date())
            setLoading(false)
            onSuccessRef.current?.(cachedData)
            return
          }
        }

        // Fetch fresh data
        const freshData = await fetcherRef.current()

        // Cache the result
        dataCache.set(cacheKey, freshData, {
          ttl,
          tags,
          maxSize: 5 * 1024 * 1024, // 5MB default
        })

        setData(freshData)
        setIsFromCache(false)
        setLastUpdated(new Date())
        onSuccessRef.current?.(freshData)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        onErrorRef.current?.(error)
      } finally {
        setLoading(false)
      }
    },
    [cacheKey, ttl, tags, enabled]
  )

  const refresh = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      // Fetch fresh data directly without cache
      const freshData = await fetcherRef.current()

      // Cache the result
      dataCache.set(cacheKey, freshData, {
        ttl,
        tags,
        maxSize: 5 * 1024 * 1024,
      })

      setData(freshData)
      setIsFromCache(false)
      setLastUpdated(new Date())
      onSuccessRef.current?.(freshData)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onErrorRef.current?.(error)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, ttl, tags, enabled]) // Remove fetchData dependency

  const invalidate = useCallback(() => {
    dataCache.delete(cacheKey)
    setIsFromCache(false)
  }, [cacheKey])

  // Initial fetch - use a ref to track if we've already fetched
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (!hasFetchedRef.current && enabled) {
      hasFetchedRef.current = true
      fetchData()
    }
  }, [enabled]) // Remove fetchData from dependencies

  // Reset fetch flag when key changes
  useEffect(() => {
    hasFetchedRef.current = false
  }, [cacheKey])

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || !enabled) return

    const interval = setInterval(async () => {
      // Refresh with fresh data directly
      if (!enabled) return

      setLoading(true)
      setError(null)

      try {
        const freshData = await fetcherRef.current()

        dataCache.set(cacheKey, freshData, {
          ttl,
          tags,
          maxSize: 5 * 1024 * 1024,
        })

        setData(freshData)
        setIsFromCache(false)
        setLastUpdated(new Date())
        onSuccessRef.current?.(freshData)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        onErrorRef.current?.(error)
      } finally {
        setLoading(false)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, enabled, cacheKey, ttl, tags]) // Stable dependencies

  const cacheStats = {
    isFromCache,
    lastUpdated,
    cacheSize: dataCache.getSize(),
  }

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    cacheStats,
  }
}

// Specialized hooks for different data types

export function useCachedProperties(propertyIds?: string[]) {
  const fetcher = useCallback(async () => {
    const response = await fetch(
      `/api/batch/properties${propertyIds ? `?ids=${propertyIds.join(',')}` : ''}`
    )
    if (!response.ok) throw new Error('Failed to fetch properties')
    return response.json()
  }, [propertyIds])

  return useCachedData({
    cacheKey: `properties_${propertyIds?.join(',') || 'all'}`,
    fetcher,
    ttl: 300000, // 5 minutes
    tags: ['properties', 'data'],
  })
}

export function useCachedTenants(filters?: { property_id?: string; status?: string }) {
  const queryString = useMemo(() => {
    const queryParams = new URLSearchParams()
    if (filters?.property_id) queryParams.set('property_id', filters.property_id)
    if (filters?.status) queryParams.set('status', filters.status)
    return queryParams.toString()
  }, [filters?.property_id, filters?.status])

  const fetcher = useCallback(async () => {
    const response = await fetch(`/api/batch/tenants?${queryString}`)
    if (!response.ok) throw new Error('Failed to fetch tenants')
    return response.json()
  }, [queryString])

  return useCachedData({
    cacheKey: `tenants_${queryString}`,
    fetcher,
    ttl: 300000, // 5 minutes
    tags: ['tenants', 'data'],
  })
}

export function useCachedDashboard(options?: { refreshInterval?: number }) {
  const fetcher = useCallback(async () => {
    const response = await fetch('/api/batch/dashboard')
    if (!response.ok) throw new Error('Failed to fetch dashboard data')
    return response.json()
  }, [])

  return useCachedData({
    cacheKey: 'dashboard_data',
    fetcher,
    ttl: 180000, // 3 minutes for dashboard
    tags: ['dashboard', 'data'],
    refreshInterval: options?.refreshInterval, // Only refresh if explicitly requested
  })
}

// Cache management hooks

export function useCacheManager() {
  const [stats, setStats] = useState({
    dataCache: dataCache.getStats(),
    searchCache: searchCache.getStats(),
    apiCache: apiCache.getStats(),
  })

  const updateStats = useCallback(() => {
    setStats({
      dataCache: dataCache.getStats(),
      searchCache: searchCache.getStats(),
      apiCache: apiCache.getStats(),
    })
  }, [])

  const clearAllCaches = useCallback(() => {
    dataCache.clear()
    searchCache.clear()
    apiCache.clear()
    updateStats()
  }, [updateStats])

  const clearCacheByTags = useCallback(
    (tags: string[]) => {
      dataCache.clearByTags(tags)
      searchCache.clearByTags(tags)
      apiCache.clearByTags(tags)
      updateStats()
    },
    [updateStats]
  )

  const cleanupExpired = useCallback(() => {
    const cleaned = {
      data: dataCache.cleanup(),
      search: searchCache.cleanup(),
      api: apiCache.cleanup(),
    }
    updateStats()
    return cleaned
  }, [updateStats])

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(updateStats, 5000) // Every 5 seconds
    return () => clearInterval(interval)
  }, [updateStats])

  return {
    stats,
    clearAllCaches,
    clearCacheByTags,
    cleanupExpired,
    updateStats,
  }
}

// Performance monitoring hook for caching

export function useCachePerformance() {
  const [performance, setPerformance] = useState({
    hitRates: {
      data: 0,
      search: 0,
      api: 0,
    },
    sizes: {
      data: 0,
      search: 0,
      api: 0,
    },
    entries: {
      data: 0,
      search: 0,
      api: 0,
    },
  })

  const updatePerformance = useCallback(() => {
    const dataStats = dataCache.getStats()
    const searchStats = searchCache.getStats()
    const apiStats = apiCache.getStats()

    setPerformance({
      hitRates: {
        data: dataStats.hitRate,
        search: searchStats.hitRate,
        api: apiStats.hitRate,
      },
      sizes: {
        data: dataStats.totalSize,
        search: searchStats.totalSize,
        api: apiStats.totalSize,
      },
      entries: {
        data: dataStats.entryCount,
        search: searchStats.entryCount,
        api: apiStats.entryCount,
      },
    })
  }, [])

  useEffect(() => {
    updatePerformance()
    const interval = setInterval(updatePerformance, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [updatePerformance])

  return {
    performance,
    updatePerformance,
  }
}

export default useCachedData
