/**
 * Simple in-memory cache for dashboard data
 * Provides TTL-based caching with automatic cleanup
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start cleanup interval to remove expired entries
    this.startCleanup()
  }

  /**
   * Set a cache entry with TTL (time to live) in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000, // Convert to milliseconds
    }
    
    this.cache.set(key, entry)
  }

  /**
   * Get a cache entry if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let active = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++
      } else {
        active++
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      memoryUsage: this.estimateMemoryUsage(),
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Get or set pattern - if key exists return it, otherwise compute and cache
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const computed = await computeFn()
    this.set(key, computed, ttlSeconds)
    return computed
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Cleanup every minute
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): string {
    let totalSize = 0
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON string size of data
      totalSize += key.length * 2 // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2
      totalSize += 64 // Overhead for entry object
    }

    if (totalSize < 1024) {
      return `${totalSize} bytes`
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(1)} KB`
    } else {
      return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
    }
  }

  /**
   * Destroy the cache and cleanup intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Global cache instance
export const memoryCache = new MemoryCache()

// Cache key generators for consistent naming
export const CacheKeys = {
  dashboardStats: (userId: string) => `dashboard:stats:${userId}`,
  userProperties: (userId: string) => `user:properties:${userId}`,
  userTenants: (userId: string) => `user:tenants:${userId}`,
  propertyUnits: (propertyId: string) => `property:units:${propertyId}`,
  tenantPayments: (tenantId: string) => `tenant:payments:${tenantId}`,
}

// Default TTL values (in seconds)
export const CacheTTL = {
  DASHBOARD_STATS: 60, // 1 minute
  USER_DATA: 300, // 5 minutes
  PROPERTY_DATA: 600, // 10 minutes
  PAYMENT_DATA: 180, // 3 minutes
}

export default memoryCache
