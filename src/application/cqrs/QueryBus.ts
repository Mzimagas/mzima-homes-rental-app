/**
 * Query Bus Implementation
 * Handles query routing, caching, and execution
 */

import {
  Query,
  QueryResult,
  QueryHandler,
  QueryBus,
  QueryMiddleware,
  QueryCache,
  QueryEvent,
  QueryMetrics,
  QuerySubscription
} from './Query'

export class DefaultQueryBus implements QueryBus {
  private handlers = new Map<string, QueryHandler<any>>()
  private middlewares: QueryMiddleware[] = []
  private cache: QueryCache | null = null
  private eventListeners: Array<(event: QueryEvent) => void> = []
  private metrics: QueryMetrics[] = []
  private subscriptions = new Map<string, QuerySubscription>()

  constructor(cache?: QueryCache) {
    this.cache = cache || null
  }

  async send<T extends Query>(query: T): Promise<QueryResult> {
    const startTime = Date.now()
    
    try {
      // Emit query started event
      this.emitEvent({
        type: 'query:started',
        query,
        timestamp: new Date()
      })

      // Check cache first
      if (this.cache && query.cacheKey) {
        const cachedResult = await this.getCachedResult(query)
        if (cachedResult) {
          this.recordMetrics(query, Date.now() - startTime, cachedResult, true)
          
          this.emitEvent({
            type: 'query:cached',
            query,
            result: cachedResult,
            timestamp: new Date()
          })
          
          return cachedResult
        }
      }

      // Find handler
      const handler = this.findHandler(query)
      if (!handler) {
        const error = `No handler found for query type: ${query.type}`
        return {
          success: false,
          errors: [error]
        }
      }

      // Execute with middleware chain
      const result = await this.executeWithMiddleware(query, handler)

      // Cache result if successful and cacheable
      if (result.success && this.cache && query.cacheKey) {
        await this.cacheResult(query, result)
      }

      // Record metrics
      this.recordMetrics(query, Date.now() - startTime, result, false)

      // Emit completion event
      this.emitEvent({
        type: 'query:completed',
        query,
        result,
        timestamp: new Date()
      })

      // Notify subscriptions
      this.notifySubscriptions(query, result)

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Record failed metrics
      this.recordMetrics(query, Date.now() - startTime, null, false)

      // Emit failure event
      this.emitEvent({
        type: 'query:failed',
        query,
        error: error instanceof Error ? error : new Error(errorMessage),
        timestamp: new Date()
      })

      return {
        success: false,
        errors: [errorMessage]
      }
    }
  }

  register<T extends Query>(
    queryType: string,
    handler: QueryHandler<T>
  ): void {
    this.handlers.set(queryType, handler)
  }

  addMiddleware(middleware: QueryMiddleware): void {
    this.middlewares.push(middleware)
  }

  // Cache management
  setCache(cache: QueryCache): void {
    this.cache = cache
  }

  async invalidateCache(pattern?: string): Promise<void> {
    if (!this.cache) return

    if (pattern) {
      await this.cache.invalidatePattern(pattern)
    } else {
      await this.cache.clear()
    }
  }

  // Event subscription
  onEvent(listener: (event: QueryEvent) => void): () => void {
    this.eventListeners.push(listener)
    
    return () => {
      const index = this.eventListeners.indexOf(listener)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  // Query subscriptions for real-time updates
  subscribe<T extends Query>(
    query: T,
    callback: (result: QueryResult) => void
  ): () => void {
    const subscription: QuerySubscription = {
      id: this.generateSubscriptionId(),
      query,
      callback,
      isActive: true,
      lastUpdate: new Date()
    }

    this.subscriptions.set(subscription.id, subscription)

    // Return unsubscribe function
    return () => {
      subscription.isActive = false
      this.subscriptions.delete(subscription.id)
    }
  }

  // Performance metrics
  getMetrics(filter?: {
    queryType?: string
    userId?: string
    fromDate?: Date
    toDate?: Date
  }): QueryMetrics[] {
    let filtered = this.metrics

    if (filter) {
      filtered = filtered.filter(metric => {
        if (filter.queryType && metric.queryType !== filter.queryType) return false
        if (filter.userId && metric.userId !== filter.userId) return false
        if (filter.fromDate && metric.timestamp < filter.fromDate) return false
        if (filter.toDate && metric.timestamp > filter.toDate) return false
        return true
      })
    }

    return filtered
  }

  getPerformanceStats(): {
    totalQueries: number
    averageExecutionTime: number
    cacheHitRate: number
    queryTypeStats: Record<string, {
      count: number
      averageTime: number
      cacheHitRate: number
    }>
  } {
    const total = this.metrics.length
    const totalTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0)
    const cacheHits = this.metrics.filter(m => m.cacheHit).length

    const queryTypeStats: Record<string, any> = {}
    
    this.metrics.forEach(metric => {
      if (!queryTypeStats[metric.queryType]) {
        queryTypeStats[metric.queryType] = {
          count: 0,
          totalTime: 0,
          cacheHits: 0
        }
      }
      
      const stats = queryTypeStats[metric.queryType]
      stats.count++
      stats.totalTime += metric.executionTime
      if (metric.cacheHit) stats.cacheHits++
    })

    // Calculate averages and rates
    Object.keys(queryTypeStats).forEach(type => {
      const stats = queryTypeStats[type]
      stats.averageTime = stats.count > 0 ? stats.totalTime / stats.count : 0
      stats.cacheHitRate = stats.count > 0 ? (stats.cacheHits / stats.count) * 100 : 0
      delete stats.totalTime
      delete stats.cacheHits
    })

    return {
      totalQueries: total,
      averageExecutionTime: total > 0 ? totalTime / total : 0,
      cacheHitRate: total > 0 ? (cacheHits / total) * 100 : 0,
      queryTypeStats
    }
  }

  // Clear metrics (for maintenance)
  clearMetrics(olderThan?: Date): void {
    if (olderThan) {
      this.metrics = this.metrics.filter(metric => metric.timestamp >= olderThan)
    } else {
      this.metrics = []
    }
  }

  private findHandler<T extends Query>(query: T): QueryHandler<T> | null {
    const handler = this.handlers.get(query.type)
    return handler && handler.canHandle(query) ? handler : null
  }

  private async executeWithMiddleware<T extends Query>(
    query: T,
    handler: QueryHandler<T>
  ): Promise<QueryResult> {
    // Create execution chain
    const executeHandler = async (q: T): Promise<QueryResult> => {
      return handler.handle(q)
    }

    // Apply middleware in reverse order
    let next = executeHandler
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i]
      const currentNext = next
      next = (q: T) => middleware.execute(q, currentNext)
    }

    return next(query)
  }

  private async getCachedResult<T extends Query>(query: T): Promise<QueryResult | null> {
    if (!this.cache || !query.cacheKey) return null

    try {
      const cached = await this.cache.get<QueryResult>(query.cacheKey)
      if (cached) {
        // Add cache metadata
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            fromCache: true,
            cacheExpiry: new Date(Date.now() + (query.cacheTtl || 300000))
          }
        }
      }
    } catch (error) {
      console.warn('Cache retrieval error:', error)
    }

    return null
  }

  private async cacheResult<T extends Query>(query: T, result: QueryResult): Promise<void> {
    if (!this.cache || !query.cacheKey) return

    try {
      await this.cache.set(query.cacheKey, result, query.cacheTtl)
    } catch (error) {
      console.warn('Cache storage error:', error)
    }
  }

  private recordMetrics<T extends Query>(
    query: T,
    executionTime: number,
    result: QueryResult | null,
    cacheHit: boolean
  ): void {
    const metric: QueryMetrics = {
      queryType: query.type,
      executionTime,
      resultCount: result?.data ? (Array.isArray(result.data) ? result.data.length : 1) : 0,
      cacheHit,
      timestamp: new Date(),
      userId: query.userId
    }

    this.metrics.push(metric)

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  private emitEvent(event: QueryEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in query event listener:', error)
      }
    })
  }

  private notifySubscriptions(query: Query, result: QueryResult): void {
    // Notify subscriptions that match the query type
    this.subscriptions.forEach(subscription => {
      if (subscription.isActive && subscription.query.type === query.type) {
        try {
          subscription.callback(result)
          subscription.lastUpdate = new Date()
        } catch (error) {
          console.error('Error in query subscription callback:', error)
        }
      }
    })
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
