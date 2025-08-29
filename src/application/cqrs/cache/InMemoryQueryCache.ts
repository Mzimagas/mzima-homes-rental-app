/**
 * In-Memory Query Cache Implementation
 * Simple cache implementation for query results
 */

import { QueryCache } from '../Query'

interface CacheEntry<T> {
  value: T
  expiry: number
  createdAt: number
  accessCount: number
  lastAccessed: number
}

export class InMemoryQueryCache implements QueryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTtl: number
  private maxSize: number
  private cleanupInterval: NodeJS.Timeout

  constructor(defaultTtlMs: number = 300000, maxSize: number = 1000) {
    this.defaultTtl = defaultTtlMs
    this.maxSize = maxSize

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 300000)
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()

    return entry.value
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now()
    const expiry = now + (ttl || this.defaultTtl)

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed()
    }

    const entry: CacheEntry<T> = {
      value,
      expiry,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now
    }

    this.cache.set(key, entry)
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  // Cache statistics
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    entries: Array<{
      key: string
      size: number
      accessCount: number
      age: number
      ttl: number
    }>
  } {
    const now = Date.now()
    const entries: any[] = []

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        size: this.estimateSize(entry.value),
        accessCount: entry.accessCount,
        age: now - entry.createdAt,
        ttl: entry.expiry - now
      })
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      entries
    }
  }

  // Get cache keys matching a pattern
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys())
    
    if (!pattern) {
      return keys
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return keys.filter(key => regex.test(key))
  }

  // Check if a key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  // Get remaining TTL for a key
  getTtl(key: string): number {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return -1
    }

    const remaining = entry.expiry - Date.now()
    return remaining > 0 ? remaining : -1
  }

  // Extend TTL for a key
  async extend(key: string, additionalTtl: number): Promise<boolean> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return false
    }

    entry.expiry += additionalTtl
    return true
  }

  // Get multiple keys at once
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()
    
    for (const key of keys) {
      result.set(key, await this.get<T>(key))
    }

    return result
  }

  // Set multiple keys at once
  async setMultiple<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl)
    }
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key)
    }

    console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`)
  }

  // Evict least recently used entries
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return

    let lruKey: string | null = null
    let lruTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  // Estimate memory size of a value (rough approximation)
  private estimateSize(value: any): number {
    if (value === null || value === undefined) {
      return 0
    }

    if (typeof value === 'string') {
      return value.length * 2 // Rough estimate for UTF-16
    }

    if (typeof value === 'number') {
      return 8
    }

    if (typeof value === 'boolean') {
      return 4
    }

    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 0)
    }

    if (typeof value === 'object') {
      return Object.values(value).reduce((sum: number, item) => (sum as number) + this.estimateSize(item), 0)
    }

    return 0
  }

  // Calculate hit rate (simplified - would need request tracking for accurate rate)
  private calculateHitRate(): number {
    // This is a simplified calculation
    // In a real implementation, you'd track hits and misses
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0)
    
    return totalAccesses > 0 ? (this.cache.size / totalAccesses) * 100 : 0
  }

  // Dispose resources
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
  }
}

// Cache warming utility
export class CacheWarmer {
  constructor(private cache: QueryCache) {}

  async warmCache(entries: Array<{
    key: string
    valueProvider: () => Promise<any>
    ttl?: number
  }>): Promise<void> {
    const promises = entries.map(async entry => {
      try {
        const value = await entry.valueProvider()
        await this.cache.set(entry.key, value, entry.ttl)
      } catch (error) {
        console.warn(`Failed to warm cache for key ${entry.key}:`, error)
      }
    })

    await Promise.all(promises)
  }

  async warmFromQueries(queries: Array<{
    key: string
    query: () => Promise<any>
    ttl?: number
  }>): Promise<void> {
    for (const { key, query, ttl } of queries) {
      try {
        const result = await query()
        await this.cache.set(key, result, ttl)
      } catch (error) {
        console.warn(`Failed to warm cache from query ${key}:`, error)
      }
    }
  }
}
