/**
 * Dashboard Performance Monitor
 * Real-time performance monitoring and optimization utilities for dashboard components
 * Provides metrics collection, performance budgets, and optimization recommendations
 */

// Performance metrics interfaces
export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  type: 'render' | 'fetch' | 'interaction' | 'memory'
  component?: string
  details?: Record<string, any>
}

export interface PerformanceBudget {
  name: string
  threshold: number
  type: 'render' | 'fetch' | 'interaction' | 'memory'
  severity: 'warning' | 'error'
}

export interface PerformanceReport {
  metrics: PerformanceMetric[]
  violations: PerformanceBudgetViolation[]
  recommendations: PerformanceRecommendation[]
  summary: PerformanceSummary
}

export interface PerformanceBudgetViolation {
  budget: PerformanceBudget
  actualValue: number
  severity: 'warning' | 'error'
  timestamp: number
}

export interface PerformanceRecommendation {
  type: 'optimization' | 'refactor' | 'infrastructure'
  priority: 'high' | 'medium' | 'low'
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
}

export interface PerformanceSummary {
  totalMetrics: number
  averageRenderTime: number
  averageFetchTime: number
  memoryUsage: number
  budgetViolations: number
  performanceScore: number
}

// Performance budgets for dashboard components
const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  {
    name: 'Dashboard Layout Render',
    threshold: 100, // ms
    type: 'render',
    severity: 'warning'
  },
  {
    name: 'Metrics Grid Render',
    threshold: 50, // ms
    type: 'render',
    severity: 'warning'
  },
  {
    name: 'Chart Component Render',
    threshold: 200, // ms
    type: 'render',
    severity: 'error'
  },
  {
    name: 'Data Fetch Time',
    threshold: 500, // ms
    type: 'fetch',
    severity: 'warning'
  },
  {
    name: 'Real-time Update',
    threshold: 50, // ms
    type: 'interaction',
    severity: 'error'
  },
  {
    name: 'Memory Usage',
    threshold: 50 * 1024 * 1024, // 50MB
    type: 'memory',
    severity: 'warning'
  }
]

/**
 * Dashboard Performance Monitor Class
 */
export class DashboardPerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private budgets: PerformanceBudget[] = PERFORMANCE_BUDGETS
  private violations: PerformanceBudgetViolation[] = []
  private isEnabled: boolean = true
  private memoryBaseline: number = 0

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled && typeof window !== 'undefined'
    
    if (this.isEnabled) {
      this.initializeMemoryBaseline()
      this.setupPerformanceObserver()
    }
  }

  /**
   * Initialize memory baseline for memory usage calculations
   */
  private initializeMemoryBaseline(): void {
    if ('performance' in window && 'memory' in performance) {
      this.memoryBaseline = (performance as any).memory.usedJSHeapSize
    }
  }

  /**
   * Setup Performance Observer for automatic metric collection
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('dashboard')) {
            this.addMetric({
              name: entry.name,
              value: entry.duration || 0,
              timestamp: Date.now(),
              type: 'render',
              details: {
                entryType: entry.entryType,
                startTime: entry.startTime
              }
            })
          }
        }
      })

      try {
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] })
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error)
      }
    }
  }

  /**
   * Start measuring a performance metric
   */
  startMeasurement(name: string, component?: string): void {
    if (!this.isEnabled) return

    performance.mark(`${name}-start`)
    
    // Store component context for later use
    if (component) {
      (window as any).__performanceContext = {
        ...((window as any).__performanceContext || {}),
        [name]: { component }
      }
    }
  }

  /**
   * End measurement and record metric
   */
  endMeasurement(
    name: string, 
    type: PerformanceMetric['type'] = 'render',
    details?: Record<string, any>
  ): number {
    if (!this.isEnabled) return 0

    try {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)
      
      const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure
      const duration = measure.duration

      const context = (window as any).__performanceContext?.[name]
      
      this.addMetric({
        name,
        value: duration,
        timestamp: Date.now(),
        type,
        component: context?.component,
        details
      })

      this.checkBudgetViolations(name, duration, type)

      return duration
    } catch (error) {
      console.warn('Failed to measure performance:', error)
      return 0
    }
  }

  /**
   * Add a performance metric manually
   */
  addMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return

    this.metrics.push(metric)
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  /**
   * Measure memory usage
   */
  measureMemoryUsage(): number {
    if (!this.isEnabled || !('performance' in window) || !('memory' in performance)) {
      return 0
    }

    const currentMemory = (performance as any).memory.usedJSHeapSize
    const memoryUsage = currentMemory - this.memoryBaseline

    this.addMetric({
      name: 'Memory Usage',
      value: memoryUsage,
      timestamp: Date.now(),
      type: 'memory',
      details: {
        usedJSHeapSize: currentMemory,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      }
    })

    this.checkBudgetViolations('Memory Usage', memoryUsage, 'memory')

    return memoryUsage
  }

  /**
   * Check for budget violations
   */
  private checkBudgetViolations(
    name: string, 
    value: number, 
    type: PerformanceMetric['type']
  ): void {
    const budget = this.budgets.find(b => 
      b.name === name || (b.type === type && name.toLowerCase().includes(b.name.toLowerCase()))
    )

    if (budget && value > budget.threshold) {
      this.violations.push({
        budget,
        actualValue: value,
        severity: budget.severity,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    const summary = this.generateSummary()
    const recommendations = this.generateRecommendations()

    return {
      metrics: [...this.metrics],
      violations: [...this.violations],
      recommendations,
      summary
    }
  }

  /**
   * Generate performance summary
   */
  private generateSummary(): PerformanceSummary {
    const renderMetrics = this.metrics.filter(m => m.type === 'render')
    const fetchMetrics = this.metrics.filter(m => m.type === 'fetch')
    const memoryMetrics = this.metrics.filter(m => m.type === 'memory')

    const averageRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length
      : 0

    const averageFetchTime = fetchMetrics.length > 0
      ? fetchMetrics.reduce((sum, m) => sum + m.value, 0) / fetchMetrics.length
      : 0

    const latestMemoryUsage = memoryMetrics.length > 0
      ? memoryMetrics[memoryMetrics.length - 1].value
      : 0

    const performanceScore = this.calculatePerformanceScore()

    return {
      totalMetrics: this.metrics.length,
      averageRenderTime,
      averageFetchTime,
      memoryUsage: latestMemoryUsage,
      budgetViolations: this.violations.length,
      performanceScore
    }
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private calculatePerformanceScore(): number {
    let score = 100

    // Deduct points for budget violations
    const errorViolations = this.violations.filter(v => v.severity === 'error').length
    const warningViolations = this.violations.filter(v => v.severity === 'warning').length
    
    score -= errorViolations * 20
    score -= warningViolations * 10

    // Deduct points for slow metrics
    const slowRenders = this.metrics.filter(m => 
      m.type === 'render' && m.value > 100
    ).length
    
    const slowFetches = this.metrics.filter(m => 
      m.type === 'fetch' && m.value > 1000
    ).length

    score -= slowRenders * 5
    score -= slowFetches * 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = []

    // Check for slow renders
    const slowRenders = this.metrics.filter(m => 
      m.type === 'render' && m.value > 100
    )

    if (slowRenders.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        description: 'Optimize slow rendering components with React.memo and useMemo',
        impact: 'Reduce render time by 30-50%',
        effort: 'medium'
      })
    }

    // Check for slow data fetching
    const slowFetches = this.metrics.filter(m => 
      m.type === 'fetch' && m.value > 1000
    )

    if (slowFetches.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        description: 'Implement request batching and caching for data fetching',
        impact: 'Reduce fetch time by 40-60%',
        effort: 'medium'
      })
    }

    // Check for memory issues
    const highMemoryUsage = this.metrics.filter(m => 
      m.type === 'memory' && m.value > 30 * 1024 * 1024 // 30MB
    )

    if (highMemoryUsage.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Implement memory cleanup and optimize data structures',
        impact: 'Reduce memory usage by 20-40%',
        effort: 'high'
      })
    }

    // Check for frequent violations
    if (this.violations.length > 10) {
      recommendations.push({
        type: 'refactor',
        priority: 'high',
        description: 'Review and refactor components with frequent performance violations',
        impact: 'Improve overall performance score by 20-30 points',
        effort: 'high'
      })
    }

    return recommendations
  }

  /**
   * Clear all metrics and violations
   */
  clear(): void {
    this.metrics = []
    this.violations = []
    
    if (this.isEnabled) {
      performance.clearMarks()
      performance.clearMeasures()
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      violations: this.violations,
      summary: this.generateSummary()
    }, null, 2)
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled && typeof window !== 'undefined'
  }
}

// Singleton instance
export const dashboardPerformanceMonitor = new DashboardPerformanceMonitor(
  process.env.NODE_ENV === 'development' || process.env.ENABLE_PERFORMANCE_MONITORING === 'true'
)

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const startMeasurement = (name: string, component?: string) => {
    dashboardPerformanceMonitor.startMeasurement(name, component)
  }

  const endMeasurement = (
    name: string, 
    type: PerformanceMetric['type'] = 'render',
    details?: Record<string, any>
  ) => {
    return dashboardPerformanceMonitor.endMeasurement(name, type, details)
  }

  const measureMemory = () => {
    return dashboardPerformanceMonitor.measureMemoryUsage()
  }

  const getReport = () => {
    return dashboardPerformanceMonitor.getReport()
  }

  return {
    startMeasurement,
    endMeasurement,
    measureMemory,
    getReport,
    monitor: dashboardPerformanceMonitor
  }
}

// Performance measurement decorator for components
export function withPerformanceMonitoring<T extends React.ComponentType<any>>(
  Component: T,
  componentName?: string
): T {
  const WrappedComponent = React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const displayName = componentName || Component.displayName || Component.name || 'Component'
    
    React.useEffect(() => {
      dashboardPerformanceMonitor.startMeasurement(`${displayName}-mount`)
      
      return () => {
        dashboardPerformanceMonitor.endMeasurement(`${displayName}-mount`, 'render', {
          component: displayName,
          phase: 'mount'
        })
      }
    }, [])

    return React.createElement(Component, { ...props, ref })
  })

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`
  
  return WrappedComponent as T
}

// Performance optimization utilities
export const PerformanceOptimizations = {
  /**
   * Debounce function for performance optimization
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  /**
   * Throttle function for performance optimization
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  /**
   * Memoize expensive calculations
   */
  memoize<T extends (...args: any[]) => any>(
    func: T,
    getKey?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>()

    return ((...args: Parameters<T>) => {
      const key = getKey ? getKey(...args) : JSON.stringify(args)

      if (cache.has(key)) {
        return cache.get(key)!
      }

      const result = func(...args)
      cache.set(key, result)

      // Limit cache size to prevent memory leaks
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
      }

      return result
    }) as T
  },

  /**
   * Batch DOM updates for better performance
   */
  batchDOMUpdates(callback: () => void): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback)
    } else {
      requestAnimationFrame(callback)
    }
  },

  /**
   * Virtual scrolling helper for large lists
   */
  calculateVisibleItems(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan: number = 5
  ): { startIndex: number; endIndex: number; visibleItems: number } {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleItems = Math.ceil(containerHeight / itemHeight)
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2)

    return { startIndex, endIndex, visibleItems }
  }
}

export default DashboardPerformanceMonitor
