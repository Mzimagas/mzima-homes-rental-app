import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage?: number
  searchLatency: number
  cacheHitRate: number
}

interface PerformanceMonitorOptions {
  enabled?: boolean
  sampleRate?: number
  logToConsole?: boolean
}

/**
 * Hook for monitoring component and application performance
 */
export function usePerformanceMonitor(
  componentName: string,
  options: PerformanceMonitorOptions = {}
) {
  const {
    enabled = process.env.NODE_ENV === 'development',
    sampleRate = 0.1, // 10% sampling
    logToConsole = true
  } = options

  const renderStartTime = useRef<number>(0)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    searchLatency: 0,
    cacheHitRate: 0
  })

  // Track render performance
  useEffect(() => {
    if (!enabled || Math.random() > sampleRate) return

    renderStartTime.current = performance.now()

    return () => {
      const renderTime = performance.now() - renderStartTime.current
      
      setMetrics(prev => ({
        ...prev,
        renderTime
      }))

      if (logToConsole && renderTime > 16) { // > 1 frame at 60fps
        console.warn(`🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
    }
  })

  // Track memory usage (if available)
  useEffect(() => {
    if (!enabled || !('memory' in performance)) return

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory
      if (memory) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        }))
      }
    }

    updateMemoryUsage()
    const interval = setInterval(updateMemoryUsage, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [enabled])

  // Performance measurement utilities
  const measureAsync = async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    if (!enabled) return operation()

    const start = performance.now()
    try {
      const result = await operation()
      const duration = performance.now() - start

      if (operationName === 'search') {
        setMetrics(prev => ({
          ...prev,
          searchLatency: duration
        }))
      }

      if (logToConsole && duration > 100) {
        console.warn(`🐌 Slow ${operationName} in ${componentName}: ${duration.toFixed(2)}ms`)
      }

      return result
    } catch (error) {
      const duration = performance.now() - start
      if (logToConsole) {
        console.error(`❌ Failed ${operationName} in ${componentName}: ${duration.toFixed(2)}ms`, error)
      }
      throw error
    }
  }

  const measureSync = <T>(
    operation: () => T,
    operationName: string
  ): T => {
    if (!enabled) return operation()

    const start = performance.now()
    try {
      const result = operation()
      const duration = performance.now() - start

      if (logToConsole && duration > 16) {
        console.warn(`🐌 Slow ${operationName} in ${componentName}: ${duration.toFixed(2)}ms`)
      }

      return result
    } catch (error) {
      const duration = performance.now() - start
      if (logToConsole) {
        console.error(`❌ Failed ${operationName} in ${componentName}: ${duration.toFixed(2)}ms`, error)
      }
      throw error
    }
  }

  // Report performance metrics
  const reportMetrics = () => {
    if (!enabled || !logToConsole) return

    console.group(`📊 Performance Metrics - ${componentName}`)
    console.log(`Render Time: ${metrics.renderTime.toFixed(2)}ms`)
    console.log(`Search Latency: ${metrics.searchLatency.toFixed(2)}ms`)
    console.log(`Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`)
    if (metrics.memoryUsage) {
      console.log(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`)
    }
    console.groupEnd()
  }

  return {
    metrics,
    measureAsync,
    measureSync,
    reportMetrics,
    isEnabled: enabled
  }
}

/**
 * Hook for monitoring search performance specifically
 */
export function useSearchPerformanceMonitor() {
  const [searchMetrics, setSearchMetrics] = useState({
    totalSearches: 0,
    averageLatency: 0,
    cacheHits: 0,
    cacheMisses: 0
  })

  const trackSearch = (latency: number, fromCache: boolean) => {
    setSearchMetrics(prev => ({
      totalSearches: prev.totalSearches + 1,
      averageLatency: (prev.averageLatency * prev.totalSearches + latency) / (prev.totalSearches + 1),
      cacheHits: prev.cacheHits + (fromCache ? 1 : 0),
      cacheMisses: prev.cacheMisses + (fromCache ? 0 : 1)
    }))
  }

  const getCacheHitRate = () => {
    const total = searchMetrics.cacheHits + searchMetrics.cacheMisses
    return total > 0 ? searchMetrics.cacheHits / total : 0
  }

  const getPerformanceReport = () => ({
    ...searchMetrics,
    cacheHitRate: getCacheHitRate()
  })

  return {
    trackSearch,
    getCacheHitRate,
    getPerformanceReport,
    searchMetrics
  }
}

/**
 * Hook for detecting performance issues
 */
export function usePerformanceAlerts() {
  const [alerts, setAlerts] = useState<string[]>([])

  const checkPerformance = (metrics: PerformanceMetrics) => {
    const newAlerts: string[] = []

    if (metrics.renderTime > 50) {
      newAlerts.push(`Slow render detected: ${metrics.renderTime.toFixed(2)}ms`)
    }

    if (metrics.searchLatency > 200) {
      newAlerts.push(`Slow search detected: ${metrics.searchLatency.toFixed(2)}ms`)
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 100) {
      newAlerts.push(`High memory usage: ${metrics.memoryUsage.toFixed(2)}MB`)
    }

    if (metrics.cacheHitRate < 0.5) {
      newAlerts.push(`Low cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`)
    }

    setAlerts(newAlerts)
  }

  const clearAlerts = () => setAlerts([])

  return {
    alerts,
    checkPerformance,
    clearAlerts,
    hasAlerts: alerts.length > 0
  }
}
