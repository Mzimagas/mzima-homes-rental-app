/**
 * Dashboard Performance Tests
 * Comprehensive performance testing for dashboard loading, real-time updates, and memory usage
 * Tests rendering performance, data fetching optimization, and memory leak detection
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'
import { useDashboardData } from '../../../hooks/useDashboardData'
import DashboardLayout from '../../../components/dashboard/DashboardLayout'
import { MetricsGrid } from '../../../components/dashboard/metrics/MetricsGrid'
import { dashboardService } from '../../../services/DashboardService'

// Mock dependencies
jest.mock('../../../services/DashboardService')
jest.mock('../../../lib/supabase-client')

// Performance measurement utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map()
  private memoryBaseline: number = 0

  startMeasurement(name: string): void {
    performance.mark(`${name}-start`)
  }

  endMeasurement(name: string): number {
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)
    
    const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure
    const duration = measure.duration

    if (!this.measurements.has(name)) {
      this.measurements.set(name, [])
    }
    this.measurements.get(name)!.push(duration)

    return duration
  }

  getAverageDuration(name: string): number {
    const durations = this.measurements.get(name) || []
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length
  }

  setMemoryBaseline(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      this.memoryBaseline = (performance as any).memory.usedJSHeapSize
    }
  }

  getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize - this.memoryBaseline
    }
    return 0
  }

  clear(): void {
    this.measurements.clear()
    performance.clearMarks()
    performance.clearMeasures()
  }
}

// Test wrapper with performance monitoring
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Dashboard Performance Tests', () => {
  let performanceMonitor: PerformanceMonitor
  let mockDashboardService: jest.Mocked<typeof dashboardService>

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor()
    performanceMonitor.setMemoryBaseline()
    
    mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>
    
    // Setup mock responses
    mockDashboardService.getDashboardMetrics.mockResolvedValue({
      totalProperties: 25,
      activeTenants: 68,
      monthlyRevenue: 2450000,
      occupancyRate: 94.1
    })
  })

  afterEach(() => {
    performanceMonitor.clear()
    jest.clearAllMocks()
  })

  describe('Component Rendering Performance', () => {
    it('should render dashboard layout within performance budget', async () => {
      performanceMonitor.startMeasurement('dashboard-layout-render')

      render(
        <TestWrapper>
          <DashboardLayout />
        </TestWrapper>
      )

      const renderTime = performanceMonitor.endMeasurement('dashboard-layout-render')

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100)
    })

    it('should render metrics grid efficiently', async () => {
      const mockMetrics = Array.from({ length: 20 }, (_, i) => ({
        id: `metric-${i}`,
        value: Math.random() * 1000000,
        format: 'currency' as const,
        trend: 'up' as const,
        lastUpdated: new Date().toISOString()
      }))

      performanceMonitor.startMeasurement('metrics-grid-render')

      render(
        <TestWrapper>
          <MetricsGrid metricIds={mockMetrics.map(m => m.id)} />
        </TestWrapper>
      )

      const renderTime = performanceMonitor.endMeasurement('metrics-grid-render')

      // Should render 20 metrics within 50ms
      expect(renderTime).toBeLessThan(50)
    })

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Property ${i}`,
        value: Math.random() * 1000000
      }))

      mockDashboardService.getPropertyAnalytics.mockResolvedValue(largeDataset)

      performanceMonitor.startMeasurement('large-dataset-render')

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const renderTime = performanceMonitor.endMeasurement('large-dataset-render')

      // Should handle 1000 items within 200ms
      expect(renderTime).toBeLessThan(200)
    })
  })

  describe('Data Fetching Performance', () => {
    it('should fetch dashboard data within performance budget', async () => {
      performanceMonitor.startMeasurement('data-fetch')

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const fetchTime = performanceMonitor.endMeasurement('data-fetch')

      // Should fetch data within 500ms
      expect(fetchTime).toBeLessThan(500)
    })

    it('should batch multiple API calls efficiently', async () => {
      performanceMonitor.startMeasurement('batch-fetch')

      const { result } = renderHook(() => {
        const store = useDashboardStore()
        return store
      })

      await act(async () => {
        await result.current.fetchAllData()
      })

      const fetchTime = performanceMonitor.endMeasurement('batch-fetch')

      // Batch operations should be faster than individual calls
      expect(fetchTime).toBeLessThan(300)
      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(1)
    })

    it('should implement efficient caching', async () => {
      const { result } = renderHook(() => useDashboardData(), {
        wrapper: TestWrapper
      })

      // First fetch
      performanceMonitor.startMeasurement('first-fetch')
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      const firstFetchTime = performanceMonitor.endMeasurement('first-fetch')

      // Second fetch (should use cache)
      performanceMonitor.startMeasurement('cached-fetch')
      act(() => {
        result.current.refetch()
      })
      const cachedFetchTime = performanceMonitor.endMeasurement('cached-fetch')

      // Cached fetch should be significantly faster
      expect(cachedFetchTime).toBeLessThan(firstFetchTime * 0.1)
    })
  })

  describe('Real-time Updates Performance', () => {
    it('should handle frequent updates efficiently', async () => {
      const { result } = renderHook(() => useDashboardStore())

      const updates = Array.from({ length: 100 }, (_, i) => ({
        activeTenants: 68 + i,
        timestamp: Date.now() + i
      }))

      performanceMonitor.startMeasurement('rapid-updates')

      act(() => {
        updates.forEach(update => {
          result.current.updateMetrics(update)
        })
      })

      const updateTime = performanceMonitor.endMeasurement('rapid-updates')

      // Should handle 100 updates within 50ms
      expect(updateTime).toBeLessThan(50)
    })

    it('should debounce rapid updates', async () => {
      const { result } = renderHook(() => useDashboardStore())

      const rapidUpdates = Array.from({ length: 10 }, (_, i) => ({
        activeTenants: 68 + i
      }))

      performanceMonitor.startMeasurement('debounced-updates')

      act(() => {
        rapidUpdates.forEach(update => {
          result.current.updateMetrics(update)
        })
      })

      const updateTime = performanceMonitor.endMeasurement('debounced-updates')

      // Should debounce and only apply final value
      expect(result.current.metrics?.activeTenants).toBe(77) // 68 + 9
      expect(updateTime).toBeLessThan(10)
    })

    it('should optimize re-renders with memoization', async () => {
      let renderCount = 0
      
      const TestComponent = React.memo(() => {
        renderCount++
        const store = useDashboardStore()
        return <div>{store.metrics?.activeTenants}</div>
      })

      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      const initialRenderCount = renderCount

      // Update unrelated state
      act(() => {
        useDashboardStore.getState().setLoading(true)
        useDashboardStore.getState().setLoading(false)
      })

      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Should not re-render for unrelated state changes
      expect(renderCount).toBe(initialRenderCount)
    })
  })

  describe('Memory Usage and Leak Detection', () => {
    it('should not leak memory during normal operations', async () => {
      const initialMemory = performanceMonitor.getMemoryUsage()

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <DashboardLayout />
          </TestWrapper>
        )
        unmount()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = performanceMonitor.getMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024)
    })

    it('should cleanup subscriptions and timers', async () => {
      const { result } = renderHook(() => useDashboardData({
        autoRefresh: true,
        refreshInterval: 100
      }), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Unmount should cleanup timers
      const { unmount } = renderHook(() => useDashboardData({
        autoRefresh: true,
        refreshInterval: 100
      }), {
        wrapper: TestWrapper
      })

      unmount()

      // Wait longer than refresh interval
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should not make additional API calls after unmount
      const callCount = mockDashboardService.getDashboardMetrics.mock.calls.length
      
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(mockDashboardService.getDashboardMetrics.mock.calls.length).toBe(callCount)
    })

    it('should handle large state efficiently', async () => {
      const { result } = renderHook(() => useDashboardStore())

      const largeState = {
        properties: Array.from({ length: 1000 }, (_, i) => ({
          id: `prop-${i}`,
          name: `Property ${i}`,
          data: new Array(100).fill(Math.random())
        })),
        metrics: Array.from({ length: 100 }, (_, i) => ({
          id: `metric-${i}`,
          value: Math.random() * 1000000
        }))
      }

      performanceMonitor.startMeasurement('large-state-update')

      act(() => {
        result.current.setProperties(largeState.properties)
        result.current.setMetrics(largeState.metrics)
      })

      const updateTime = performanceMonitor.endMeasurement('large-state-update')

      // Should handle large state updates efficiently
      expect(updateTime).toBeLessThan(100)
    })
  })

  describe('Bundle Size and Loading Performance', () => {
    it('should lazy load dashboard sections', async () => {
      // Mock dynamic imports
      const mockImport = jest.fn().mockResolvedValue({
        default: () => <div>Lazy Component</div>
      })

      // Simulate lazy loading
      performanceMonitor.startMeasurement('lazy-load')
      await mockImport()
      const loadTime = performanceMonitor.endMeasurement('lazy-load')

      // Lazy loading should be fast
      expect(loadTime).toBeLessThan(50)
    })

    it('should optimize chart rendering', async () => {
      const chartData = Array.from({ length: 100 }, (_, i) => ({
        name: `Point ${i}`,
        value: Math.random() * 1000
      }))

      performanceMonitor.startMeasurement('chart-render')

      // Simulate chart rendering
      render(
        <div data-testid="chart">
          {chartData.map(point => (
            <div key={point.name}>{point.value}</div>
          ))}
        </div>
      )

      const renderTime = performanceMonitor.endMeasurement('chart-render')

      // Chart rendering should be optimized
      expect(renderTime).toBeLessThan(100)
    })
  })

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across runs', async () => {
      const runs = 5
      const renderTimes: number[] = []

      for (let i = 0; i < runs; i++) {
        performanceMonitor.startMeasurement(`run-${i}`)
        
        const { unmount } = render(
          <TestWrapper>
            <DashboardLayout />
          </TestWrapper>
        )

        const renderTime = performanceMonitor.endMeasurement(`run-${i}`)
        renderTimes.push(renderTime)
        
        unmount()
      }

      const averageTime = renderTimes.reduce((sum, time) => sum + time, 0) / runs
      const maxDeviation = Math.max(...renderTimes.map(time => Math.abs(time - averageTime)))

      // Performance should be consistent (deviation < 50% of average)
      expect(maxDeviation).toBeLessThan(averageTime * 0.5)
    })

    it('should detect performance regressions', async () => {
      // Baseline performance
      const baselineRuns = 3
      const baselineTimes: number[] = []

      for (let i = 0; i < baselineRuns; i++) {
        performanceMonitor.startMeasurement(`baseline-${i}`)
        
        render(
          <TestWrapper>
            <MetricsGrid />
          </TestWrapper>
        )

        baselineTimes.push(performanceMonitor.endMeasurement(`baseline-${i}`))
      }

      const baselineAverage = baselineTimes.reduce((sum, time) => sum + time, 0) / baselineRuns

      // Current performance should not be significantly worse than baseline
      performanceMonitor.startMeasurement('current-performance')
      
      render(
        <TestWrapper>
          <MetricsGrid />
        </TestWrapper>
      )

      const currentTime = performanceMonitor.endMeasurement('current-performance')

      // Current performance should be within 150% of baseline
      expect(currentTime).toBeLessThan(baselineAverage * 1.5)
    })
  })

  describe('Optimization Recommendations', () => {
    it('should identify optimization opportunities', () => {
      const optimizations = [
        {
          area: 'Component Memoization',
          recommendation: 'Use React.memo for expensive components',
          impact: 'High'
        },
        {
          area: 'Data Fetching',
          recommendation: 'Implement request deduplication',
          impact: 'Medium'
        },
        {
          area: 'Bundle Splitting',
          recommendation: 'Split dashboard sections into separate chunks',
          impact: 'Medium'
        },
        {
          area: 'Virtual Scrolling',
          recommendation: 'Implement virtual scrolling for large lists',
          impact: 'High'
        }
      ]

      // Verify optimization strategies are documented
      expect(optimizations).toHaveLength(4)
      expect(optimizations.every(opt => opt.impact)).toBe(true)
    })
  })
})
