/**
 * Comprehensive Caching Service
 * Implements multiple caching strategies for optimal performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  size?: number
  tags?: string[]
}

interface CacheStats {
  hits: number
  misses: number
  evictions: number
  totalSize: number
  entryCount: number
  hitRate: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum cache size in bytes
  maxEntries?: number // Maximum number of entries
  strategy?: 'LRU' | 'LFU' | 'FIFO' | 'TTL'
  tags?: string[]
  compress?: boolean
}

export class CachingService {
  private cache = new Map<string, CacheEntry<any>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0,
  }

  private readonly DEFAULT_TTL = 300000 // 5 minutes
  private readonly DEFAULT_MAX_SIZE = 50 * 1024 * 1024 // 50MB
  private readonly DEFAULT_MAX_ENTRIES = 1000
  private readonly DEFAULT_STRATEGY = 'LRU'

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const {
      ttl = this.DEFAULT_TTL,
      maxSize = this.DEFAULT_MAX_SIZE,
      maxEntries = this.DEFAULT_MAX_ENTRIES,
      strategy = this.DEFAULT_STRATEGY,
      tags = [],
      compress = false,
    } = options

    // Calculate entry size
    const entrySize = this.calculateSize(value)

    // Check if we need to evict entries
    this.evictIfNecessary(entrySize, maxSize, maxEntries, strategy)

    // Compress data if requested
    const processedValue = compress ? this.compress(value) : value

    const entry: CacheEntry<T> = {
      data: processedValue,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: entrySize,
      tags,
    }

    this.cache.set(key, entry)
    this.stats.entryCount++
    this.stats.totalSize += entrySize
    this.updateHitRate()
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key)
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()

    this.stats.hits++
    this.updateHitRate()

    // Decompress if needed
    return this.isCompressed(entry.data) ? this.decompress(entry.data) : entry.data
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, options)
    return value
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    this.cache.delete(key)
    this.stats.entryCount--
    this.stats.totalSize -= entry.size || 0
    return true
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
    }
  }

  /**
   * Clear cache entries by tags
   */
  clearByTags(tags: string[]): number {
    let cleared = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some((tag) => tags.includes(tag))) {
        this.delete(key)
        cleared++
      }
    }

    return cleared
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get cache keys matching a pattern
   */
  getKeys(pattern?: RegExp): string[] {
    const keys = Array.from(this.cache.keys())
    return pattern ? keys.filter((key) => pattern.test(key)) : keys
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    return entry !== undefined && !this.isExpired(entry)
  }

  /**
   * Get cache entry metadata
   */
  getMetadata(key: string): Omit<CacheEntry<any>, 'data'> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const { data, ...metadata } = entry
    return metadata
  }

  /**
   * Refresh TTL for a cache entry
   */
  touch(key: string, newTtl?: number): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    entry.lastAccessed = Date.now()
    if (newTtl !== undefined) {
      entry.ttl = newTtl
      entry.timestamp = Date.now()
    }

    return true
  }

  /**
   * Get cache size in bytes
   */
  getSize(): number {
    return this.stats.totalSize
  }

  /**
   * Get cache entry count
   */
  getEntryCount(): number {
    return this.stats.entryCount
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Export cache data for persistence
   */
  export(): { [key: string]: any } {
    const exported: { [key: string]: any } = {}

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        exported[key] = {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          tags: entry.tags,
        }
      }
    }

    return exported
  }

  /**
   * Import cache data from persistence
   */
  import(data: { [key: string]: any }): void {
    for (const [key, entry] of Object.entries(data)) {
      if (entry && typeof entry === 'object') {
        this.set(key, entry.data, {
          ttl: entry.ttl,
          tags: entry.tags,
        })
      }
    }
  }

  // Private helper methods

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private evictIfNecessary(
    newEntrySize: number,
    maxSize: number,
    maxEntries: number,
    strategy: string
  ): void {
    // Check size limit
    while (this.stats.totalSize + newEntrySize > maxSize && this.cache.size > 0) {
      this.evictOne(strategy)
    }

    // Check entry count limit
    while (this.cache.size >= maxEntries) {
      this.evictOne(strategy)
    }
  }

  private evictOne(strategy: string): void {
    let keyToEvict: string | null = null

    switch (strategy) {
      case 'LRU': // Least Recently Used
        keyToEvict = this.findLRUKey()
        break
      case 'LFU': // Least Frequently Used
        keyToEvict = this.findLFUKey()
        break
      case 'FIFO': // First In, First Out
        keyToEvict = this.findFIFOKey()
        break
      case 'TTL': // Shortest TTL
        keyToEvict = this.findShortestTTLKey()
        break
      default:
        keyToEvict = this.findLRUKey()
    }

    if (keyToEvict) {
      this.delete(keyToEvict)
      this.stats.evictions++
    }
  }

  private findLRUKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    return oldestKey
  }

  private findLFUKey(): string | null {
    let leastUsedKey: string | null = null
    let leastCount = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount
        leastUsedKey = key
      }
    }

    return leastUsedKey
  }

  private findFIFOKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  private findShortestTTLKey(): string | null {
    let shortestKey: string | null = null
    let shortestTTL = Infinity

    for (const [key, entry] of this.cache.entries()) {
      const remainingTTL = entry.ttl - (Date.now() - entry.timestamp)
      if (remainingTTL < shortestTTL) {
        shortestTTL = remainingTTL
        shortestKey = key
      }
    }

    return shortestKey
  }

  private calculateSize(value: any): number {
    // Rough estimation of object size in bytes
    const json = JSON.stringify(value)
    return new Blob([json]).size
  }

  private compress(value: any): any {
    // Simple compression placeholder - in production, use a real compression library
    return {
      __compressed: true,
      data: JSON.stringify(value),
    }
  }

  private decompress(value: any): any {
    if (this.isCompressed(value)) {
      return JSON.parse(value.data)
    }
    return value
  }

  private isCompressed(value: any): boolean {
    return value && typeof value === 'object' && value.__compressed === true
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }
}

// Specialized cache instances
export const searchCache = new CachingService()
export const dataCache = new CachingService()
export const apiCache = new CachingService()

// Auto-cleanup interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    searchCache.cleanup()
    dataCache.cleanup()
    apiCache.cleanup()
  }, 60000) // Cleanup every minute
}

export default CachingService
