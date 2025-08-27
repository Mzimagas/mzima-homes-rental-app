/**
 * Search Performance Monitor
 * Tracks and analyzes search performance metrics
 */

interface SearchMetric {
  id: string
  timestamp: number
  query: string
  resultCount: number
  executionTime: number
  indexSize: number
  cacheHit: boolean
  userAgent?: string
  sessionId?: string
}

interface PerformanceStats {
  totalSearches: number
  averageExecutionTime: number
  medianExecutionTime: number
  p95ExecutionTime: number
  p99ExecutionTime: number
  cacheHitRate: number
  popularQueries: Array<{ query: string; count: number; avgTime: number }>
  slowQueries: Array<{ query: string; maxTime: number; avgTime: number }>
  indexGrowthRate: number
  errorRate: number
}

interface PerformanceAlert {
  type: 'slow_query' | 'high_error_rate' | 'low_cache_hit' | 'index_bloat'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metric: string
  threshold: number
  currentValue: number
  timestamp: number
}

export class SearchPerformanceMonitor {
  private metrics: SearchMetric[] = []
  private readonly MAX_METRICS = 10000 // Keep last 10k metrics
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second
  private readonly LOW_CACHE_HIT_THRESHOLD = 0.7 // 70%
  private readonly HIGH_ERROR_RATE_THRESHOLD = 0.05 // 5%

  private alerts: PerformanceAlert[] = []
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = []

  /**
   * Record a search operation
   */
  recordSearch(
    query: string,
    resultCount: number,
    executionTime: number,
    indexSize: number,
    cacheHit: boolean = false,
    sessionId?: string
  ): void {
    const metric: SearchMetric = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      query: query.toLowerCase().trim(),
      resultCount,
      executionTime,
      indexSize,
      cacheHit,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      sessionId,
    }

    this.metrics.push(metric)

    // Maintain metrics size limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metric)

    // Store metrics in localStorage for persistence
    this.persistMetrics()
  }

  /**
   * Record a search error
   */
  recordError(query: string, error: string, executionTime: number): void {
    const errorMetric: SearchMetric = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      query: query.toLowerCase().trim(),
      resultCount: -1, // Indicates error
      executionTime,
      indexSize: 0,
      cacheHit: false,
      sessionId: this.getCurrentSessionId(),
    }

    this.metrics.push(errorMetric)
    this.checkPerformanceThresholds(errorMetric)
    this.persistMetrics()
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(timeRange?: { start: number; end: number }): PerformanceStats {
    let relevantMetrics = this.metrics

    // Filter by time range if provided
    if (timeRange) {
      relevantMetrics = this.metrics.filter(
        (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )
    }

    const successfulSearches = relevantMetrics.filter((m) => m.resultCount >= 0)
    const errorSearches = relevantMetrics.filter((m) => m.resultCount < 0)
    const executionTimes = successfulSearches.map((m) => m.executionTime).sort((a, b) => a - b)
    const cacheHits = successfulSearches.filter((m) => m.cacheHit).length

    // Calculate percentiles
    const p95Index = Math.floor(executionTimes.length * 0.95)
    const p99Index = Math.floor(executionTimes.length * 0.99)
    const medianIndex = Math.floor(executionTimes.length * 0.5)

    // Popular queries analysis
    const queryFrequency = new Map<string, { count: number; totalTime: number }>()
    successfulSearches.forEach((metric) => {
      const existing = queryFrequency.get(metric.query) || { count: 0, totalTime: 0 }
      queryFrequency.set(metric.query, {
        count: existing.count + 1,
        totalTime: existing.totalTime + metric.executionTime,
      })
    })

    const popularQueries = Array.from(queryFrequency.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Slow queries analysis
    const slowQueries = Array.from(queryFrequency.entries())
      .map(([query, stats]) => ({
        query,
        maxTime: Math.max(
          ...successfulSearches.filter((m) => m.query === query).map((m) => m.executionTime)
        ),
        avgTime: stats.totalTime / stats.count,
      }))
      .filter((q) => q.avgTime > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10)

    // Index growth rate (simplified calculation)
    const indexGrowthRate = this.calculateIndexGrowthRate(relevantMetrics)

    return {
      totalSearches: relevantMetrics.length,
      averageExecutionTime:
        executionTimes.length > 0
          ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
          : 0,
      medianExecutionTime: executionTimes[medianIndex] || 0,
      p95ExecutionTime: executionTimes[p95Index] || 0,
      p99ExecutionTime: executionTimes[p99Index] || 0,
      cacheHitRate: successfulSearches.length > 0 ? cacheHits / successfulSearches.length : 0,
      popularQueries,
      slowQueries,
      indexGrowthRate,
      errorRate: relevantMetrics.length > 0 ? errorSearches.length / relevantMetrics.length : 0,
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 50): PerformanceAlert[] {
    return this.alerts.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback)
      if (index > -1) {
        this.alertCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Get search trends over time
   */
  getSearchTrends(bucketSize: number = 3600000): Array<{
    timestamp: number
    searchCount: number
    avgExecutionTime: number
    errorRate: number
  }> {
    const buckets = new Map<
      number,
      {
        searches: SearchMetric[]
        errors: number
      }
    >()

    this.metrics.forEach((metric) => {
      const bucketKey = Math.floor(metric.timestamp / bucketSize) * bucketSize
      const bucket = buckets.get(bucketKey) || { searches: [], errors: 0 }

      if (metric.resultCount >= 0) {
        bucket.searches.push(metric)
      } else {
        bucket.errors++
      }

      buckets.set(bucketKey, bucket)
    })

    return Array.from(buckets.entries())
      .map(([timestamp, bucket]) => ({
        timestamp,
        searchCount: bucket.searches.length,
        avgExecutionTime:
          bucket.searches.length > 0
            ? bucket.searches.reduce((sum, s) => sum + s.executionTime, 0) / bucket.searches.length
            : 0,
        errorRate:
          bucket.searches.length + bucket.errors > 0
            ? bucket.errors / (bucket.searches.length + bucket.errors)
            : 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'timestamp',
        'query',
        'resultCount',
        'executionTime',
        'indexSize',
        'cacheHit',
      ]
      const rows = this.metrics.map((m) => [
        new Date(m.timestamp).toISOString(),
        `"${m.query.replace(/"/g, '""')}"`,
        m.resultCount,
        m.executionTime,
        m.indexSize,
        m.cacheHit,
      ])

      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    }

    return JSON.stringify(this.metrics, null, 2)
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics = []
    this.alerts = []
    this.clearPersistedMetrics()
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardData(): {
    currentStats: PerformanceStats
    recentAlerts: PerformanceAlert[]
    trends: ReturnType<typeof this.getSearchTrends>
    healthScore: number
  } {
    const last24Hours = {
      start: Date.now() - 24 * 60 * 60 * 1000,
      end: Date.now(),
    }

    const currentStats = this.getPerformanceStats(last24Hours)
    const recentAlerts = this.getAlerts(10)
    const trends = this.getSearchTrends(3600000) // 1-hour buckets
    const healthScore = this.calculateHealthScore(currentStats)

    return {
      currentStats,
      recentAlerts,
      trends,
      healthScore,
    }
  }

  // Private methods

  private checkPerformanceThresholds(metric: SearchMetric): void {
    // Check for slow queries
    if (metric.executionTime > this.SLOW_QUERY_THRESHOLD) {
      this.createAlert({
        type: 'slow_query',
        severity: metric.executionTime > 5000 ? 'critical' : 'high',
        message: `Slow search query detected: "${metric.query}"`,
        metric: 'execution_time',
        threshold: this.SLOW_QUERY_THRESHOLD,
        currentValue: metric.executionTime,
        timestamp: Date.now(),
      })
    }

    // Check cache hit rate (every 100 searches)
    if (this.metrics.length % 100 === 0) {
      const recentMetrics = this.metrics.slice(-100)
      const cacheHitRate = recentMetrics.filter((m) => m.cacheHit).length / recentMetrics.length

      if (cacheHitRate < this.LOW_CACHE_HIT_THRESHOLD) {
        this.createAlert({
          type: 'low_cache_hit',
          severity: 'medium',
          message: `Low cache hit rate detected: ${(cacheHitRate * 100).toFixed(1)}%`,
          metric: 'cache_hit_rate',
          threshold: this.LOW_CACHE_HIT_THRESHOLD,
          currentValue: cacheHitRate,
          timestamp: Date.now(),
        })
      }
    }

    // Check error rate
    const recentErrors = this.metrics.slice(-50).filter((m) => m.resultCount < 0).length
    const errorRate = recentErrors / Math.min(50, this.metrics.length)

    if (errorRate > this.HIGH_ERROR_RATE_THRESHOLD) {
      this.createAlert({
        type: 'high_error_rate',
        severity: 'high',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        metric: 'error_rate',
        threshold: this.HIGH_ERROR_RATE_THRESHOLD,
        currentValue: errorRate,
        timestamp: Date.now(),
      })
    }
  }

  private createAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert)

    // Limit alerts history
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000)
    }

    // Notify subscribers
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert)
      } catch (error) {
        console.error('Error in alert callback:', error)
      }
    })
  }

  private calculateIndexGrowthRate(metrics: SearchMetric[]): number {
    if (metrics.length < 2) return 0

    const sortedMetrics = metrics.sort((a, b) => a.timestamp - b.timestamp)
    const firstSize = sortedMetrics[0].indexSize
    const lastSize = sortedMetrics[sortedMetrics.length - 1].indexSize
    const timeSpan = sortedMetrics[sortedMetrics.length - 1].timestamp - sortedMetrics[0].timestamp

    if (timeSpan === 0 || firstSize === 0) return 0

    // Growth rate per hour
    return ((lastSize - firstSize) / firstSize) * (3600000 / timeSpan)
  }

  private calculateHealthScore(stats: PerformanceStats): number {
    let score = 100

    // Penalize slow average execution time
    if (stats.averageExecutionTime > 500) score -= 20
    else if (stats.averageExecutionTime > 200) score -= 10

    // Penalize low cache hit rate
    if (stats.cacheHitRate < 0.5) score -= 30
    else if (stats.cacheHitRate < 0.7) score -= 15

    // Penalize high error rate
    if (stats.errorRate > 0.1) score -= 25
    else if (stats.errorRate > 0.05) score -= 10

    // Penalize very slow P95 times
    if (stats.p95ExecutionTime > 2000) score -= 15

    return Math.max(0, score)
  }

  private getCurrentSessionId(): string {
    if (typeof window === 'undefined') return 'server'

    let sessionId = sessionStorage.getItem('search_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('search_session_id', sessionId)
    }
    return sessionId
  }

  private persistMetrics(): void {
    if (typeof localStorage === 'undefined') return

    try {
      // Only persist recent metrics to avoid localStorage bloat
      const recentMetrics = this.metrics.slice(-1000)
      localStorage.setItem('search_performance_metrics', JSON.stringify(recentMetrics))
    } catch (error) {
      console.warn('Failed to persist search metrics:', error)
    }
  }

  private loadPersistedMetrics(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem('search_performance_metrics')
      if (stored) {
        this.metrics = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load persisted search metrics:', error)
    }
  }

  private clearPersistedMetrics(): void {
    if (typeof localStorage === 'undefined') return

    try {
      localStorage.removeItem('search_performance_metrics')
    } catch (error) {
      console.warn('Failed to clear persisted search metrics:', error)
    }
  }

  constructor() {
    this.loadPersistedMetrics()
  }
}

// Export singleton instance
export const searchPerformanceMonitor = new SearchPerformanceMonitor()
export default SearchPerformanceMonitor
