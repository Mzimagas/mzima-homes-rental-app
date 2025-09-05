/**
 * Dashboard Caching Service
 * Specialized caching strategy for dashboard data with intelligent TTL, invalidation, and memory management
 * Extends CachingService.ts patterns with dashboard-specific optimizations
 */

import { dataCache, searchCache, apiCache } from './CachingService'

// Dashboard-specific cache configuration
export interface DashboardCacheConfig {
  metrics: {
    ttl: number
    maxSize: number
    priority: 'high' | 'medium' | 'low'
    invalidationTriggers: string[]
  }
  alerts: {
    ttl: number
    maxSize: number
    priority: 'high' | 'medium' | 'low'
    invalidationTriggers: string[]
  }
  stats: {
    ttl: number
    maxSize: number
    priority: 'high' | 'medium' | 'low'
    invalidationTriggers: string[]
  }
  widgets: {
    ttl: number
    maxSize: number
    priority: 'high' | 'medium' | 'low'
    invalidationTriggers: string[]
  }
  layouts: {
    ttl: number
    maxSize: number
    priority: 'high' | 'medium' | 'low'
    invalidationTriggers: string[]
  }
}

// Cache invalidation rules
export interface InvalidationRule {
  trigger: string
  affectedCaches: string[]
  delay?: number // Delay before invalidation in ms
  cascade?: boolean // Whether to cascade to related caches
}

// Cache performance metrics
export interface CachePerformanceMetrics {
  hitRate: number
  missRate: number
  evictionRate: number
  averageResponseTime: number
  memoryUsage: number
  totalRequests: number
  cacheSize: number
  lastCleanup: Date
}

/**
 * Dashboard Caching Service
 */
class DashboardCachingService {
  private config: DashboardCacheConfig
  private invalidationRules: Map<string, InvalidationRule[]> = new Map()
  private performanceMetrics: CachePerformanceMetrics
  private cleanupInterval: NodeJS.Timeout | null = null
  
  // Cache key prefixes
  private readonly CACHE_PREFIXES = {
    metrics: 'dashboard:metrics:',
    alerts: 'dashboard:alerts:',
    stats: 'dashboard:stats:',
    widgets: 'dashboard:widgets:',
    layouts: 'dashboard:layouts:',
    batch: 'dashboard:batch:',
    analytics: 'dashboard:analytics:'
  }

  constructor() {
    this.config = this.getDefaultConfig()
    this.performanceMetrics = this.initializeMetrics()
    this.setupInvalidationRules()
    this.startCleanupScheduler()
  }

  /**
   * Get default cache configuration
   */
  private getDefaultConfig(): DashboardCacheConfig {
    return {
      metrics: {
        ttl: 180000, // 3 minutes
        maxSize: 2 * 1024 * 1024, // 2MB
        priority: 'high',
        invalidationTriggers: ['payment_created', 'tenant_updated', 'property_updated']
      },
      alerts: {
        ttl: 60000, // 1 minute
        maxSize: 1 * 1024 * 1024, // 1MB
        priority: 'high',
        invalidationTriggers: ['payment_overdue', 'maintenance_request', 'lease_expiring']
      },
      stats: {
        ttl: 300000, // 5 minutes
        maxSize: 1 * 1024 * 1024, // 1MB
        priority: 'medium',
        invalidationTriggers: ['payment_created', 'tenant_created', 'property_created']
      },
      widgets: {
        ttl: 600000, // 10 minutes
        maxSize: 512 * 1024, // 512KB
        priority: 'low',
        invalidationTriggers: ['user_preferences_updated']
      },
      layouts: {
        ttl: 3600000, // 1 hour
        maxSize: 256 * 1024, // 256KB
        priority: 'low',
        invalidationTriggers: ['user_preferences_updated']
      }
    }
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): CachePerformanceMetrics {
    return {
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastCleanup: new Date()
    }
  }

  /**
   * Setup cache invalidation rules
   */
  private setupInvalidationRules() {
    const rules: InvalidationRule[] = [
      {
        trigger: 'payment_created',
        affectedCaches: ['metrics', 'stats', 'alerts'],
        delay: 1000, // 1 second delay
        cascade: true
      },
      {
        trigger: 'tenant_updated',
        affectedCaches: ['metrics', 'stats'],
        delay: 2000,
        cascade: false
      },
      {
        trigger: 'property_updated',
        affectedCaches: ['metrics', 'stats'],
        delay: 2000,
        cascade: false
      },
      {
        trigger: 'maintenance_request',
        affectedCaches: ['alerts'],
        delay: 0,
        cascade: false
      },
      {
        trigger: 'user_preferences_updated',
        affectedCaches: ['widgets', 'layouts'],
        delay: 0,
        cascade: false
      }
    ]

    rules.forEach(rule => {
      if (!this.invalidationRules.has(rule.trigger)) {
        this.invalidationRules.set(rule.trigger, [])
      }
      this.invalidationRules.get(rule.trigger)!.push(rule)
    })
  }

  /**
   * Cache dashboard metrics with intelligent TTL
   */
  async cacheMetrics(key: string, data: any, options: { timeRange?: string; properties?: string[] } = {}) {
    const cacheKey = this.buildCacheKey('metrics', key, options)
    const config = this.config.metrics
    
    const startTime = Date.now()
    
    try {
      dataCache.set(cacheKey, data, {
        ttl: config.ttl,
        maxSize: config.maxSize,
        tags: ['dashboard', 'metrics', ...config.invalidationTriggers],
        compress: true
      })
      
      this.updateMetrics('hit', Date.now() - startTime)
      return cacheKey
    } catch (error) {
      this.updateMetrics('miss', Date.now() - startTime)
      throw error
    }
  }

  /**
   * Get cached metrics with fallback
   */
  async getCachedMetrics(key: string, options: { timeRange?: string; properties?: string[] } = {}) {
    const cacheKey = this.buildCacheKey('metrics', key, options)
    const startTime = Date.now()
    
    try {
      const cached = dataCache.get(cacheKey)
      this.updateMetrics(cached ? 'hit' : 'miss', Date.now() - startTime)
      return cached
    } catch (error) {
      this.updateMetrics('miss', Date.now() - startTime)
      return null
    }
  }

  /**
   * Cache dashboard alerts with priority handling
   */
  async cacheAlerts(key: string, data: any, options: { severity?: string[]; unreadOnly?: boolean } = {}) {
    const cacheKey = this.buildCacheKey('alerts', key, options)
    const config = this.config.alerts
    
    // High priority for critical alerts
    const priority = data.some?.((alert: any) => alert.severity === 'critical') ? 'high' : config.priority
    
    dataCache.set(cacheKey, data, {
      ttl: config.ttl,
      maxSize: config.maxSize,
      tags: ['dashboard', 'alerts', ...config.invalidationTriggers],
      strategy: priority === 'high' ? 'LRU' : 'LFU'
    })
    
    return cacheKey
  }

  /**
   * Cache dashboard statistics with dependency tracking
   */
  async cacheStats(key: string, data: any, dependencies: string[] = []) {
    const cacheKey = this.buildCacheKey('stats', key)
    const config = this.config.stats
    
    dataCache.set(cacheKey, data, {
      ttl: config.ttl,
      maxSize: config.maxSize,
      tags: ['dashboard', 'stats', ...config.invalidationTriggers, ...dependencies]
    })
    
    return cacheKey
  }

  /**
   * Cache widget configurations
   */
  async cacheWidgets(userId: string, widgets: any[]) {
    const cacheKey = this.buildCacheKey('widgets', `user:${userId}`)
    const config = this.config.widgets
    
    dataCache.set(cacheKey, widgets, {
      ttl: config.ttl,
      maxSize: config.maxSize,
      tags: ['dashboard', 'widgets', `user:${userId}`]
    })
    
    return cacheKey
  }

  /**
   * Cache dashboard layouts
   */
  async cacheLayouts(userId: string, layouts: any[]) {
    const cacheKey = this.buildCacheKey('layouts', `user:${userId}`)
    const config = this.config.layouts
    
    dataCache.set(cacheKey, layouts, {
      ttl: config.ttl,
      maxSize: config.maxSize,
      tags: ['dashboard', 'layouts', `user:${userId}`]
    })
    
    return cacheKey
  }

  /**
   * Cache batch dashboard data
   */
  async cacheBatchData(key: string, data: any, include: string[] = []) {
    const cacheKey = this.buildCacheKey('batch', key, { include })
    
    // Use shortest TTL from included data types
    const ttl = Math.min(
      ...include.map(type => this.config[type as keyof DashboardCacheConfig]?.ttl || 300000)
    )
    
    dataCache.set(cacheKey, data, {
      ttl,
      maxSize: 5 * 1024 * 1024, // 5MB for batch data
      tags: ['dashboard', 'batch', ...include]
    })
    
    return cacheKey
  }

  /**
   * Invalidate cache based on trigger
   */
  async invalidateByTrigger(trigger: string, metadata: any = {}) {
    const rules = this.invalidationRules.get(trigger)
    if (!rules) return
    
    for (const rule of rules) {
      if (rule.delay && rule.delay > 0) {
        // Delayed invalidation
        setTimeout(() => {
          this.invalidateCacheTypes(rule.affectedCaches, rule.cascade)
        }, rule.delay)
      } else {
        // Immediate invalidation
        await this.invalidateCacheTypes(rule.affectedCaches, rule.cascade)
      }
    }
    
    console.log(`Cache invalidation triggered by: ${trigger}`, metadata)
  }

  /**
   * Invalidate specific cache types
   */
  private async invalidateCacheTypes(cacheTypes: string[], cascade: boolean = false) {
    for (const cacheType of cacheTypes) {
      const prefix = this.CACHE_PREFIXES[cacheType as keyof typeof this.CACHE_PREFIXES]
      if (prefix) {
        // Invalidate all keys with this prefix
        dataCache.deleteByTag(cacheType)
        
        if (cascade) {
          // Cascade to related caches
          dataCache.deleteByTag('dashboard')
        }
      }
    }
  }

  /**
   * Build cache key with consistent formatting
   */
  private buildCacheKey(type: string, key: string, options: any = {}): string {
    const prefix = this.CACHE_PREFIXES[type as keyof typeof this.CACHE_PREFIXES] || 'dashboard:'
    const optionsHash = Object.keys(options).length > 0 
      ? `:${btoa(JSON.stringify(options)).slice(0, 8)}`
      : ''
    
    return `${prefix}${key}${optionsHash}`
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(type: 'hit' | 'miss' | 'eviction', responseTime: number) {
    this.performanceMetrics.totalRequests++
    
    if (type === 'hit') {
      this.performanceMetrics.hitRate = 
        (this.performanceMetrics.hitRate * (this.performanceMetrics.totalRequests - 1) + 1) / 
        this.performanceMetrics.totalRequests
    } else if (type === 'miss') {
      this.performanceMetrics.missRate = 
        (this.performanceMetrics.missRate * (this.performanceMetrics.totalRequests - 1) + 1) / 
        this.performanceMetrics.totalRequests
    }
    
    // Update average response time
    this.performanceMetrics.averageResponseTime = 
      (this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1) + responseTime) / 
      this.performanceMetrics.totalRequests
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Perform cache cleanup
   */
  private performCleanup() {
    const beforeSize = dataCache.getSize()
    
    // Clean expired entries
    dataCache.cleanup?.()
    
    const afterSize = dataCache.getSize()
    const cleaned = beforeSize - afterSize
    
    this.performanceMetrics.lastCleanup = new Date()
    this.performanceMetrics.cacheSize = afterSize
    this.performanceMetrics.memoryUsage = afterSize
    
    if (cleaned > 0) {
      console.log(`Dashboard cache cleanup: removed ${cleaned} bytes`)
    }
  }

  /**
   * Get cache performance metrics
   */
  getPerformanceMetrics(): CachePerformanceMetrics {
    return {
      ...this.performanceMetrics,
      cacheSize: dataCache.getSize()
    }
  }

  /**
   * Clear all dashboard caches
   */
  clearAll() {
    dataCache.deleteByTag('dashboard')
    this.performanceMetrics = this.initializeMetrics()
  }

  /**
   * Shutdown the caching service
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clearAll()
  }
}

// Export singleton instance
export const dashboardCachingService = new DashboardCachingService()

export default dashboardCachingService
