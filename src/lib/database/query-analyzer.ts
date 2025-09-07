/**
 * Database Query Performance Analyzer
 * Helps identify and optimize slow queries
 */

interface QueryMetrics {
  query: string
  duration: number
  timestamp: number
  params?: any[]
  error?: string
}

class QueryAnalyzer {
  private metrics: QueryMetrics[] = []
  private slowQueryThreshold = 1000 // 1 second
  private maxMetrics = 1000 // Keep last 1000 queries

  /**
   * Record a query execution
   */
  recordQuery(query: string, duration: number, params?: any[], error?: string): void {
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: Date.now(),
      params: params ? this.sanitizeParams(params) : undefined,
      error,
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected (${duration}ms):`, {
        query: metric.query,
        duration,
        params: metric.params,
      })
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold?: number): QueryMetrics[] {
    const limit = threshold || this.slowQueryThreshold
    return this.metrics
      .filter(m => m.duration > limit)
      .sort((a, b) => b.duration - a.duration)
  }

  /**
   * Get query statistics
   */
  getStats() {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        errorRate: 0,
        topSlowQueries: [],
      }
    }

    const totalQueries = this.metrics.length
    const averageDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
    const slowQueries = this.metrics.filter(m => m.duration > this.slowQueryThreshold).length
    const errorQueries = this.metrics.filter(m => m.error).length
    const errorRate = (errorQueries / totalQueries) * 100

    const topSlowQueries = this.getSlowQueries()
      .slice(0, 10)
      .map(m => ({
        query: m.query.substring(0, 100) + (m.query.length > 100 ? '...' : ''),
        duration: m.duration,
        timestamp: new Date(m.timestamp).toISOString(),
      }))

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowQueries,
      errorRate: Math.round(errorRate * 100) / 100,
      topSlowQueries,
    }
  }

  /**
   * Get recommendations for optimization
   */
  getRecommendations(): string[] {
    const recommendations: string[] = []
    const stats = this.getStats()

    if (stats.slowQueries > stats.totalQueries * 0.1) {
      recommendations.push('Consider adding database indexes for frequently queried columns')
    }

    if (stats.averageDuration > 500) {
      recommendations.push('Average query time is high - review query complexity and database schema')
    }

    if (stats.errorRate > 5) {
      recommendations.push('High error rate detected - review query syntax and database constraints')
    }

    const slowQueries = this.getSlowQueries()
    const frequentSlowPatterns = this.analyzeSlowQueryPatterns(slowQueries)

    if (frequentSlowPatterns.length > 0) {
      recommendations.push(`Frequent slow query patterns detected: ${frequentSlowPatterns.join(', ')}`)
    }

    return recommendations
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'")
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: any[]): any[] {
    return params.map(param => {
      if (typeof param === 'string' && param.length > 100) {
        return param.substring(0, 100) + '...'
      }
      return param
    })
  }

  /**
   * Analyze patterns in slow queries
   */
  private analyzeSlowQueryPatterns(slowQueries: QueryMetrics[]): string[] {
    const patterns: { [key: string]: number } = {}

    slowQueries.forEach(query => {
      // Extract table names
      const tableMatches = query.query.match(/FROM\s+(\w+)/gi)
      if (tableMatches) {
        tableMatches.forEach(match => {
          const table = match.replace(/FROM\s+/i, '').toLowerCase()
          patterns[`table:${table}`] = (patterns[`table:${table}`] || 0) + 1
        })
      }

      // Extract JOIN patterns
      if (query.query.includes('JOIN')) {
        patterns['joins'] = (patterns['joins'] || 0) + 1
      }

      // Extract WHERE patterns
      if (query.query.includes('WHERE')) {
        patterns['complex_where'] = (patterns['complex_where'] || 0) + 1
      }

      // Extract ORDER BY patterns
      if (query.query.includes('ORDER BY')) {
        patterns['sorting'] = (patterns['sorting'] || 0) + 1
      }
    })

    // Return patterns that appear frequently
    return Object.entries(patterns)
      .filter(([_, count]) => count > 2)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => `${pattern} (${count}x)`)
  }
}

// Global analyzer instance
export const queryAnalyzer = new QueryAnalyzer()

/**
 * Decorator to measure query performance
 */
export function measureQuery<T extends (...args: any[]) => Promise<any>>(
  queryName: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now()
    let error: string | undefined

    try {
      const result = await fn(...args)
      return result
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      const duration = performance.now() - startTime
      queryAnalyzer.recordQuery(queryName, duration, args, error)
    }
  }) as T
}

export default queryAnalyzer
