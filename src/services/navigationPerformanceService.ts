/**
 * Navigation Performance Service
 * Handles caching, preloading, and performance optimization for navigation
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
}

interface NavigationCache {
  [key: string]: CacheEntry
}

interface PerformanceMetrics {
  navigationTimes: Record<string, number[]>
  cacheHitRates: Record<string, { hits: number; misses: number }>
  preloadSuccess: Record<string, { success: number; failures: number }>
}

class NavigationPerformanceService {
  private cache: NavigationCache = {}
  private metrics: PerformanceMetrics = {
    navigationTimes: {},
    cacheHitRates: {},
    preloadSuccess: {}
  }
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes
  private readonly maxCacheSize = 50

  /**
   * Cache data with TTL
   */
  setCache<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Clean up expired entries if cache is getting large
    if (Object.keys(this.cache).length >= this.maxCacheSize) {
      this.cleanExpiredEntries()
    }

    this.cache[key] = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }
  }

  /**
   * Get cached data
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache[key]
    
    if (!entry) {
      this.recordCacheMiss(key)
      return null
    }

    if (Date.now() > entry.expiresAt) {
      delete this.cache[key]
      this.recordCacheMiss(key)
      return null
    }

    this.recordCacheHit(key)
    return entry.data as T
  }

  /**
   * Check if data is cached and fresh
   */
  isCached(key: string): boolean {
    const entry = this.cache[key]
    return entry ? Date.now() <= entry.expiresAt : false
  }

  /**
   * Clear specific cache entry
   */
  clearCache(key: string): void {
    delete this.cache[key]
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache = {}
  }

  /**
   * Clean expired entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now()
    Object.keys(this.cache).forEach(key => {
      if (this.cache[key].expiresAt <= now) {
        delete this.cache[key]
      }
    })
  }

  /**
   * Record navigation timing
   */
  recordNavigationTime(route: string, duration: number): void {
    if (!this.metrics.navigationTimes[route]) {
      this.metrics.navigationTimes[route] = []
    }
    this.metrics.navigationTimes[route].push(duration)
    
    // Keep only last 10 measurements
    if (this.metrics.navigationTimes[route].length > 10) {
      this.metrics.navigationTimes[route] = this.metrics.navigationTimes[route].slice(-10)
    }
  }

  /**
   * Get average navigation time for a route
   */
  getAverageNavigationTime(route: string): number {
    const times = this.metrics.navigationTimes[route]
    if (!times || times.length === 0) return 0
    
    return times.reduce((sum, time) => sum + time, 0) / times.length
  }

  /**
   * Record cache hit
   */
  private recordCacheHit(key: string): void {
    if (!this.metrics.cacheHitRates[key]) {
      this.metrics.cacheHitRates[key] = { hits: 0, misses: 0 }
    }
    this.metrics.cacheHitRates[key].hits++
  }

  /**
   * Record cache miss
   */
  private recordCacheMiss(key: string): void {
    if (!this.metrics.cacheHitRates[key]) {
      this.metrics.cacheHitRates[key] = { hits: 0, misses: 0 }
    }
    this.metrics.cacheHitRates[key].misses++
  }

  /**
   * Get cache hit rate for a key
   */
  getCacheHitRate(key: string): number {
    const stats = this.metrics.cacheHitRates[key]
    if (!stats || (stats.hits + stats.misses) === 0) return 0
    
    return stats.hits / (stats.hits + stats.misses)
  }

  /**
   * Record preload success
   */
  recordPreloadSuccess(route: string): void {
    if (!this.metrics.preloadSuccess[route]) {
      this.metrics.preloadSuccess[route] = { success: 0, failures: 0 }
    }
    this.metrics.preloadSuccess[route].success++
  }

  /**
   * Record preload failure
   */
  recordPreloadFailure(route: string): void {
    if (!this.metrics.preloadSuccess[route]) {
      this.metrics.preloadSuccess[route] = { success: 0, failures: 0 }
    }
    this.metrics.preloadSuccess[route].failures++
  }

  /**
   * Get preload success rate
   */
  getPreloadSuccessRate(route: string): number {
    const stats = this.metrics.preloadSuccess[route]
    if (!stats || (stats.success + stats.failures) === 0) return 0
    
    return stats.success / (stats.success + stats.failures)
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalCacheEntries: number
    averageNavigationTime: number
    overallCacheHitRate: number
    overallPreloadSuccessRate: number
  } {
    const totalCacheEntries = Object.keys(this.cache).length
    
    // Calculate overall averages
    const allNavigationTimes = Object.values(this.metrics.navigationTimes).flat()
    const averageNavigationTime = allNavigationTimes.length > 0 
      ? allNavigationTimes.reduce((sum, time) => sum + time, 0) / allNavigationTimes.length 
      : 0

    const allCacheStats = Object.values(this.metrics.cacheHitRates)
    const totalHits = allCacheStats.reduce((sum, stats) => sum + stats.hits, 0)
    const totalMisses = allCacheStats.reduce((sum, stats) => sum + stats.misses, 0)
    const overallCacheHitRate = (totalHits + totalMisses) > 0 ? totalHits / (totalHits + totalMisses) : 0

    const allPreloadStats = Object.values(this.metrics.preloadSuccess)
    const totalPreloadSuccess = allPreloadStats.reduce((sum, stats) => sum + stats.success, 0)
    const totalPreloadFailures = allPreloadStats.reduce((sum, stats) => sum + stats.failures, 0)
    const overallPreloadSuccessRate = (totalPreloadSuccess + totalPreloadFailures) > 0 
      ? totalPreloadSuccess / (totalPreloadSuccess + totalPreloadFailures) 
      : 0

    return {
      totalCacheEntries,
      averageNavigationTime,
      overallCacheHitRate,
      overallPreloadSuccessRate
    }
  }

  /**
   * Optimize cache based on usage patterns
   */
  optimizeCache(): void {
    const now = Date.now()
    const usageThreshold = 2 * 60 * 1000 // 2 minutes

    // Remove entries that haven't been accessed recently
    Object.keys(this.cache).forEach(key => {
      const entry = this.cache[key]
      if (now - entry.timestamp > usageThreshold) {
        delete this.cache[key]
      }
    })
  }

  /**
   * Start periodic cache optimization
   */
  startCacheOptimization(interval: number = 60000): void {
    setInterval(() => {
      this.optimizeCache()
    }, interval)
  }
}

// Export singleton instance
export const navigationPerformanceService = new NavigationPerformanceService()

// Start cache optimization
if (typeof window !== 'undefined') {
  navigationPerformanceService.startCacheOptimization()
}
