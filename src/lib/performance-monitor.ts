/**
 * Performance monitoring utilities for tracking component load times and API performance
 */

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private isEnabled: boolean = process.env.NODE_ENV === 'development'

  /**
   * Start timing a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    })
  }

  /**
   * End timing a performance metric and log the result
   */
  end(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.isEnabled) return null

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata }
    }

    // Log performance metrics
    const metadataStr = metric.metadata ? ` (${JSON.stringify(metric.metadata)})` : ''
    console.log(`⏱️ ${name}: ${Math.round(duration)}ms${metadataStr}`)

    // Warn about slow operations
    if (duration > 2000) {
      console.warn(`🐌 Slow operation detected: ${name} took ${Math.round(duration)}ms`)
    }

    this.metrics.delete(name)
    return duration
  }

  /**
   * Measure the execution time of an async function
   */
  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.start(name, metadata)
    try {
      const result = await fn()
      this.end(name, { success: true })
      return result
    } catch (error) {
      this.end(name, { success: false, error: error.message })
      throw error
    }
  }

  /**
   * Create a timeout promise that rejects after the specified time
   */
  createTimeout(ms: number, name?: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const message = name ? `${name} timed out after ${ms}ms` : `Operation timed out after ${ms}ms`
        reject(new Error(message))
      }, ms)
    })
  }

  /**
   * Race a promise against a timeout
   */
  async withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number, 
    name?: string
  ): Promise<T> {
    return Promise.race([
      promise,
      this.createTimeout(timeoutMs, name)
    ])
  }

  /**
   * Get all current metrics (for debugging)
   */
  getCurrentMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
}

// Export a singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Export hook for React components
export function usePerformanceMonitor() {
  return performanceMonitor
}

// Export utility functions
export const perf = {
  start: (name: string, metadata?: Record<string, any>) => performanceMonitor.start(name, metadata),
  end: (name: string, metadata?: Record<string, any>) => performanceMonitor.end(name, metadata),
  measure: <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => 
    performanceMonitor.measure(name, fn, metadata),
  withTimeout: <T>(promise: Promise<T>, timeoutMs: number, name?: string) => 
    performanceMonitor.withTimeout(promise, timeoutMs, name)
}
