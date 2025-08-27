// Performance Optimization and Caching Strategies
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cache interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

// In-memory cache implementation
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 1000 // Maximum number of entries

  set<T>(key: string, data: T, ttl: number = 300000): void {
    // Default 5 minutes
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    }
  }
}

// Global cache instance
export const cache = new MemoryCache()

// Performance monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()

  static startTimer(operation: string): () => number {
    const startTime = performance.now()

    return () => {
      const duration = performance.now() - startTime
      this.recordMetric(operation, duration)
      return duration
    }
  }

  static recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }

    const operationMetrics = this.metrics.get(operation)!
    operationMetrics.push(duration)

    // Keep only last 100 measurements
    if (operationMetrics.length > 100) {
      operationMetrics.shift()
    }
  }

  static getMetrics(operation: string): {
    count: number
    average: number
    min: number
    max: number
    p95: number
  } | null {
    const operationMetrics = this.metrics.get(operation)

    if (!operationMetrics || operationMetrics.length === 0) {
      return null
    }

    const sorted = [...operationMetrics].sort((a, b) => a - b)
    const count = sorted.length
    const sum = sorted.reduce((a, b) => a + b, 0)
    const average = sum / count
    const min = sorted[0]
    const max = sorted[count - 1]
    const p95Index = Math.floor(count * 0.95)
    const p95 = sorted[p95Index]

    return { count, average, min, max, p95 }
  }

  static getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {}

    for (const operation of this.metrics.keys()) {
      result[operation] = this.getMetrics(operation)
    }

    return result
  }
}

// Optimized query builder
export class OptimizedQueryBuilder {
  // Get parcels with optimized joins and filtering
  static async getParcelsOptimized(
    filters: {
      county?: string
      tenure?: string
      current_use?: string
      search?: string
      limit?: number
      offset?: number
    } = {}
  ) {
    const endTimer = PerformanceMonitor.startTimer('get_parcels_optimized')

    try {
      // Build cache key
      const cacheKey = `parcels:${JSON.stringify(filters)}`

      // Check cache first
      const cached = cache.get(cacheKey)
      if (cached) {
        endTimer()
        return cached
      }

      // Build optimized query
      let query = supabase
        .from('parcels')
        .select(
          `
          parcel_id,
          lr_number,
          county,
          locality,
          tenure,
          acreage_ha,
          current_use,
          acquisition_cost_total,
          acquisition_date,
          subdivisions!inner(
            subdivision_id,
            name,
            status,
            total_plots_planned
          )
        `
        )
        .order('lr_number', { ascending: true })

      // Apply filters efficiently
      if (filters.county) {
        query = query.eq('county', filters.county)
      }
      if (filters.tenure) {
        query = query.eq('tenure', filters.tenure)
      }
      if (filters.current_use) {
        query = query.eq('current_use', filters.current_use)
      }
      if (filters.search) {
        query = query.or(`lr_number.ilike.%${filters.search}%,locality.ilike.%${filters.search}%`)
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      // Cache the result for 5 minutes
      cache.set(cacheKey, data, 300000)

      return data
    } finally {
      endTimer()
    }
  }

  // Get plots with optimized joins
  static async getPlotsOptimized(
    subdivisionId?: string,
    filters: {
      stage?: string
      utility_level?: string
      corner_plot?: boolean
      premium_location?: boolean
      limit?: number
      offset?: number
    } = {}
  ) {
    const endTimer = PerformanceMonitor.startTimer('get_plots_optimized')

    try {
      const cacheKey = `plots:${subdivisionId}:${JSON.stringify(filters)}`

      const cached = cache.get(cacheKey)
      if (cached) {
        endTimer()
        return cached
      }

      let query = supabase
        .from('plots')
        .select(
          `
          plot_id,
          plot_no,
          size_sqm,
          size_acres,
          stage,
          access_type,
          utility_level,
          corner_plot,
          premium_location,
          frontage_meters,
          subdivisions!inner(
            subdivision_id,
            name,
            status
          ),
          sale_agreements(
            sale_agreement_id,
            status,
            price,
            clients(full_name)
          )
        `
        )
        .order('plot_no', { ascending: true })

      if (subdivisionId) {
        query = query.eq('subdivision_id', subdivisionId)
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && key !== 'limit' && key !== 'offset') {
          query = query.eq(key, value)
        }
      })

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      // Cache for 2 minutes (plots change more frequently)
      cache.set(cacheKey, data, 120000)

      return data
    } finally {
      endTimer()
    }
  }

  // Get sales dashboard data with single optimized query
  static async getSalesDashboardData(dateFrom?: string, dateTo?: string) {
    const endTimer = PerformanceMonitor.startTimer('get_sales_dashboard_data')

    try {
      const cacheKey = `sales_dashboard:${dateFrom}:${dateTo}`

      const cached = cache.get(cacheKey)
      if (cached) {
        endTimer()
        return cached
      }

      // Use a single RPC call to get all dashboard data
      const { data, error } = await supabase.rpc('get_sales_dashboard_data', {
        date_from: dateFrom,
        date_to: dateTo,
      })

      if (error) throw error

      // Cache for 1 minute (dashboard data should be fresh)
      cache.set(cacheKey, data, 60000)

      return data
    } finally {
      endTimer()
    }
  }

  // Batch operations for better performance
  static async batchCreatePlots(plots: any[]) {
    const endTimer = PerformanceMonitor.startTimer('batch_create_plots')

    try {
      // Process in batches of 50 to avoid timeout
      const batchSize = 50
      const results = []

      for (let i = 0; i < plots.length; i += batchSize) {
        const batch = plots.slice(i, i + batchSize)

        const { data, error } = await supabase.from('plots').insert(batch).select()

        if (error) throw error

        results.push(...data)
      }

      // Invalidate related caches
      this.invalidateCachePattern('plots:')

      return results
    } finally {
      endTimer()
    }
  }

  // Cache invalidation helpers
  static invalidateCachePattern(pattern: string): void {
    // Get all cache keys that match the pattern
    const keysToDelete: string[] = []

    // Note: In a real implementation, you might use Redis with pattern matching
    // For now, we'll clear the entire cache when patterns are used
    if (pattern.includes(':')) {
      cache.clear()
    }
  }

  static invalidateCache(key: string): void {
    cache.delete(key)
  }
}

// Database optimization utilities
export class DatabaseOptimizer {
  // Analyze query performance
  static async analyzeQueryPerformance(query: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('explain_query', { query_text: query })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error analyzing query performance:', error)
      return null
    }
  }

  // Get database statistics
  static async getDatabaseStats(): Promise<{
    tableStats: any[]
    indexUsage: any[]
    slowQueries: any[]
  }> {
    try {
      const [tableStats, indexUsage, slowQueries] = await Promise.all([
        supabase.rpc('get_table_stats'),
        supabase.rpc('get_index_usage'),
        supabase.rpc('get_slow_queries'),
      ])

      return {
        tableStats: tableStats.data || [],
        indexUsage: indexUsage.data || [],
        slowQueries: slowQueries.data || [],
      }
    } catch (error) {
      console.error('Error getting database stats:', error)
      return {
        tableStats: [],
        indexUsage: [],
        slowQueries: [],
      }
    }
  }

  // Suggest optimizations
  static async suggestOptimizations(): Promise<string[]> {
    const suggestions: string[] = []

    try {
      const stats = await this.getDatabaseStats()

      // Analyze table statistics
      stats.tableStats.forEach((table: any) => {
        if (table.seq_scan > table.idx_scan * 10) {
          suggestions.push(
            `Table ${table.table_name} has high sequential scan ratio. Consider adding indexes.`
          )
        }

        if (table.n_dead_tup > table.n_live_tup * 0.1) {
          suggestions.push(
            `Table ${table.table_name} has many dead tuples. Consider running VACUUM.`
          )
        }
      })

      // Analyze index usage
      stats.indexUsage.forEach((index: any) => {
        if (index.idx_scan === 0) {
          suggestions.push(`Index ${index.index_name} is never used. Consider dropping it.`)
        }
      })

      // Analyze slow queries
      if (stats.slowQueries.length > 0) {
        suggestions.push(
          `Found ${stats.slowQueries.length} slow queries. Review and optimize them.`
        )
      }
    } catch (error) {
      console.error('Error generating optimization suggestions:', error)
    }

    return suggestions
  }
}

// Connection pooling and management
export class ConnectionManager {
  private static connections = new Map<string, any>()
  private static maxConnections = 10

  static async getConnection(key: string = 'default'): Promise<any> {
    if (this.connections.has(key)) {
      return this.connections.get(key)
    }

    if (this.connections.size >= this.maxConnections) {
      // Remove oldest connection
      const oldestKey = this.connections.keys().next().value
      this.connections.delete(oldestKey)
    }

    // Create new connection
    const connection = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    this.connections.set(key, connection)
    return connection
  }

  static closeConnection(key: string): void {
    this.connections.delete(key)
  }

  static closeAllConnections(): void {
    this.connections.clear()
  }

  static getConnectionStats(): {
    activeConnections: number
    maxConnections: number
  } {
    return {
      activeConnections: this.connections.size,
      maxConnections: this.maxConnections,
    }
  }
}

// Cleanup tasks
export class PerformanceCleanup {
  // Run periodic cleanup tasks
  static startCleanupTasks(): void {
    // Clean up cache every 5 minutes
    setInterval(
      () => {
        cache.cleanup()
      },
      5 * 60 * 1000
    )

    // Log performance metrics every 10 minutes
    setInterval(
      () => {
        const metrics = PerformanceMonitor.getAllMetrics()
        console.log('Performance Metrics:', metrics)
      },
      10 * 60 * 1000
    )
  }

  // Manual cleanup
  static cleanup(): void {
    cache.clear()
    ConnectionManager.closeAllConnections()
  }
}

// Export optimized API functions
export const optimizedApi = {
  parcels: OptimizedQueryBuilder.getParcelsOptimized,
  plots: OptimizedQueryBuilder.getPlotsOptimized,
  salesDashboard: OptimizedQueryBuilder.getSalesDashboardData,
  batchCreatePlots: OptimizedQueryBuilder.batchCreatePlots,
}

// Initialize cleanup tasks
if (typeof window === 'undefined') {
  // Only run on server side
  PerformanceCleanup.startCleanupTasks()
}
