/**
 * Dashboard Hooks Integration Tests
 * Tests for dashboard data fetching hooks, real-time updates, and caching
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useDashboardData, useDashboardMetrics, useRealTimeDashboard } from '../../../hooks/useDashboardData'
import { dashboardService } from '../../../services/DashboardService'

// Mock dashboard service
jest.mock('../../../services/DashboardService')

// Mock WebSocket for real-time tests
const mockWebSocket = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN
}

global.WebSocket = jest.fn(() => mockWebSocket) as any

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Dashboard Hooks Integration', () => {
  let mockDashboardService: jest.Mocked<typeof dashboardService>

  beforeEach(() => {
    mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>
    jest.clearAllMocks()
  })

  describe('useDashboardData Hook', () => {
    it('should fetch dashboard data successfully', async () => {
      const mockData = {
        metrics: {
          totalProperties: 25,
          activeTenants: 68,
          monthlyRevenue: 2450000,
          occupancyRate: 94.1
        },
        properties: [
          {
            id: '1',
            name: 'Test Property',
            location: 'Test Location',
            units: 10,
            occupancyRate: 90,
            monthlyRevenue: 100000
          }
        ]
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockData.metrics)
      mockDashboardService.getPropertyAnalytics.mockResolvedValue(mockData.properties)

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper()
      })

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.error).toBeNull()
      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch dashboard data'
      mockDashboardService.getDashboardMetrics.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.data).toBeUndefined()
    })

    it('should support manual refresh', async () => {
      const mockData = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockData)

      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Trigger manual refresh
      act(() => {
        result.current.refetch()
      })

      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(2)
    })

    it('should cache data between renders', async () => {
      const mockData = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockData)

      const wrapper = createWrapper()

      // First render
      const { result: result1 } = renderHook(() => useDashboardData(), { wrapper })

      await waitFor(() => {
        expect(result1.current.loading).toBe(false)
      })

      // Second render with same wrapper (should use cache)
      const { result: result2 } = renderHook(() => useDashboardData(), { wrapper })

      expect(result2.current.loading).toBe(false)
      expect(result2.current.data).toEqual(result1.current.data)
      
      // Should only call service once due to caching
      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(1)
    })
  })

  describe('useDashboardMetrics Hook', () => {
    it('should fetch specific metrics', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1,
        collectionRate: 96.5
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics)

      const { result } = renderHook(() => useDashboardMetrics(['totalProperties', 'activeTenants']), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.totalProperties).toBe(25)
      expect(result.current.data?.activeTenants).toBe(68)
    })

    it('should support auto-refresh', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics)

      const { result } = renderHook(() => useDashboardMetrics(undefined, {
        autoRefresh: true,
        refreshInterval: 100 // 100ms for testing
      }), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Wait for auto-refresh
      await waitFor(() => {
        expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(2)
      }, { timeout: 200 })
    })

    it('should handle metric filtering', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1,
        collectionRate: 96.5,
        outstandingAmount: 135000
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics)

      const { result } = renderHook(() => useDashboardMetrics(['totalProperties', 'activeTenants']), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should only include requested metrics
      expect(result.current.data).toEqual({
        totalProperties: 25,
        activeTenants: 68
      })
    })
  })

  describe('useRealTimeDashboard Hook', () => {
    it('should establish WebSocket connection', () => {
      const { result } = renderHook(() => useRealTimeDashboard({
        autoConnect: true,
        subscriptions: ['dashboard', 'metrics']
      }))

      expect(global.WebSocket).toHaveBeenCalled()
      expect(result.current.connected).toBe(false) // Initially false until connection established
    })

    it('should handle real-time metric updates', async () => {
      const onMetricUpdate = jest.fn()

      renderHook(() => useRealTimeDashboard({
        autoConnect: true,
        subscriptions: ['metrics'],
        onMetricUpdate
      }))

      // Simulate WebSocket message
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'metric_update',
          data: {
            activeTenants: 69,
            occupancyRate: 94.5
          }
        })
      })

      act(() => {
        mockWebSocket.addEventListener.mock.calls
          .find(call => call[0] === 'message')?.[1](messageEvent)
      })

      expect(onMetricUpdate).toHaveBeenCalledWith({
        activeTenants: 69,
        occupancyRate: 94.5
      })
    })

    it('should handle connection errors', async () => {
      const onError = jest.fn()

      renderHook(() => useRealTimeDashboard({
        autoConnect: true,
        subscriptions: ['dashboard'],
        onError
      }))

      // Simulate WebSocket error
      const errorEvent = new Event('error')

      act(() => {
        mockWebSocket.addEventListener.mock.calls
          .find(call => call[0] === 'error')?.[1](errorEvent)
      })

      expect(onError).toHaveBeenCalled()
    })

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useRealTimeDashboard({
        autoConnect: true,
        subscriptions: ['dashboard']
      }))

      unmount()

      expect(mockWebSocket.close).toHaveBeenCalled()
    })

    it('should support subscription management', () => {
      const { result, rerender } = renderHook(
        ({ subscriptions }) => useRealTimeDashboard({
          autoConnect: true,
          subscriptions
        }),
        {
          initialProps: { subscriptions: ['dashboard'] }
        }
      )

      // Update subscriptions
      rerender({ subscriptions: ['dashboard', 'metrics', 'alerts'] })

      // Should send subscription update
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          subscriptions: ['dashboard', 'metrics', 'alerts']
        })
      )
    })
  })

  describe('Hook Integration', () => {
    it('should work together for complete dashboard functionality', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics)

      // Use both hooks together
      const { result } = renderHook(() => {
        const dashboardData = useDashboardData()
        const realTime = useRealTimeDashboard({
          autoConnect: true,
          subscriptions: ['dashboard']
        })

        return { dashboardData, realTime }
      }, {
        wrapper: createWrapper()
      })

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.dashboardData.loading).toBe(false)
      })

      expect(result.current.dashboardData.data).toBeDefined()
      expect(global.WebSocket).toHaveBeenCalled()
    })

    it('should handle concurrent data fetching', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      const mockProperties = [
        {
          id: '1',
          name: 'Test Property',
          location: 'Test Location',
          units: 10,
          occupancyRate: 90,
          monthlyRevenue: 100000
        }
      ]

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics)
      mockDashboardService.getPropertyAnalytics.mockResolvedValue(mockProperties)

      const { result } = renderHook(() => {
        const metrics = useDashboardMetrics()
        const data = useDashboardData()

        return { metrics, data }
      }, {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.metrics.loading).toBe(false)
        expect(result.current.data.loading).toBe(false)
      })

      expect(result.current.metrics.data).toEqual(mockMetrics)
      expect(result.current.data.data).toBeDefined()
    })
  })

  describe('Error Recovery', () => {
    it('should retry failed requests', async () => {
      mockDashboardService.getDashboardMetrics
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          totalProperties: 25,
          activeTenants: 68,
          monthlyRevenue: 2450000,
          occupancyRate: 94.1
        })

      const { result } = renderHook(() => useDashboardData({
        retry: 1,
        retryDelay: 100
      }), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toBeDefined()
      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(2)
    })

    it('should handle stale data gracefully', async () => {
      const staleData = {
        totalProperties: 20,
        activeTenants: 60,
        monthlyRevenue: 2000000,
        occupancyRate: 90.0
      }

      const freshData = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics
        .mockResolvedValueOnce(staleData)
        .mockResolvedValueOnce(freshData)

      const { result } = renderHook(() => useDashboardData({
        staleTime: 100,
        refetchInterval: 200
      }), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.data).toEqual(staleData)
      })

      // Wait for refetch
      await waitFor(() => {
        expect(result.current.data).toEqual(freshData)
      }, { timeout: 300 })
    })
  })
})
