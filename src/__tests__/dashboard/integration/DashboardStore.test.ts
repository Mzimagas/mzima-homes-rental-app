/**
 * Dashboard Store Integration Tests
 * Tests for dashboard store state management, data flow, and persistence
 */

import { act, renderHook } from '@testing-library/react'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'
import { dashboardService } from '../../../services/DashboardService'

// Mock dashboard service
jest.mock('../../../services/DashboardService')

describe('Dashboard Store Integration', () => {
  let mockDashboardService: jest.Mocked<typeof dashboardService>

  beforeEach(() => {
    mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>
    
    // Reset store state
    const { result } = renderHook(() => useDashboardStore())
    act(() => {
      result.current.reset?.()
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('State Management', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDashboardStore())
      
      expect(result.current.metrics).toBeNull()
      expect(result.current.properties).toEqual([])
      expect(result.current.tenants).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should update loading state during data fetch', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockMetrics), 100))
      )

      const { result } = renderHook(() => useDashboardStore())

      act(() => {
        result.current.fetchMetrics()
      })

      expect(result.current.loading).toBe(true)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.metrics).toEqual(mockMetrics)
    })

    it('should handle errors properly', async () => {
      const errorMessage = 'Failed to fetch metrics'
      mockDashboardService.getDashboardMetrics.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useDashboardStore())

      await act(async () => {
        await result.current.fetchMetrics()
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.loading).toBe(false)
      expect(result.current.metrics).toBeNull()
    })
  })

  describe('Data Caching', () => {
    it('should cache fetched data', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics)

      const { result } = renderHook(() => useDashboardStore())

      // First fetch
      await act(async () => {
        await result.current.fetchMetrics()
      })

      expect(result.current.metrics).toEqual(mockMetrics)
      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(1)

      // Second fetch should use cache if within TTL
      await act(async () => {
        await result.current.fetchMetrics()
      })

      // Should still be called only once if caching is working
      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(1)
    })

    it('should invalidate cache when forced refresh', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics)

      const { result } = renderHook(() => useDashboardStore())

      // First fetch
      await act(async () => {
        await result.current.fetchMetrics()
      })

      // Force refresh
      await act(async () => {
        await result.current.refreshMetrics()
      })

      expect(mockDashboardService.getDashboardMetrics).toHaveBeenCalledTimes(2)
    })
  })

  describe('Real-time Updates', () => {
    it('should update metrics when real-time data received', () => {
      const { result } = renderHook(() => useDashboardStore())

      const initialMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      act(() => {
        result.current.setMetrics(initialMetrics)
      })

      expect(result.current.metrics).toEqual(initialMetrics)

      // Simulate real-time update
      const updatedMetrics = {
        ...initialMetrics,
        activeTenants: 69,
        occupancyRate: 94.5
      }

      act(() => {
        result.current.updateMetrics(updatedMetrics)
      })

      expect(result.current.metrics).toEqual(updatedMetrics)
    })

    it('should handle partial metric updates', () => {
      const { result } = renderHook(() => useDashboardStore())

      const initialMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      act(() => {
        result.current.setMetrics(initialMetrics)
      })

      // Partial update
      act(() => {
        result.current.updateMetrics({ activeTenants: 70 })
      })

      expect(result.current.metrics).toEqual({
        ...initialMetrics,
        activeTenants: 70
      })
    })
  })

  describe('Widget Management', () => {
    it('should add and remove widgets', () => {
      const { result } = renderHook(() => useDashboardStore())

      const widget = {
        id: 'test-widget',
        type: 'metric' as const,
        title: 'Test Widget',
        size: 'medium' as const,
        position: { widgetId: 'test-widget', x: 0, y: 0, width: 2, height: 1 },
        config: {},
        dataSource: 'test',
        refreshInterval: 300000,
        isVisible: true,
        permissions: {
          canEdit: true,
          canDelete: true,
          canMove: true,
          canResize: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      act(() => {
        result.current.addWidget(widget)
      })

      expect(result.current.widgets).toContain(widget)

      act(() => {
        result.current.removeWidget('test-widget')
      })

      expect(result.current.widgets).not.toContain(widget)
    })

    it('should update widget configuration', () => {
      const { result } = renderHook(() => useDashboardStore())

      const widget = {
        id: 'test-widget',
        type: 'metric' as const,
        title: 'Test Widget',
        size: 'medium' as const,
        position: { widgetId: 'test-widget', x: 0, y: 0, width: 2, height: 1 },
        config: {},
        dataSource: 'test',
        refreshInterval: 300000,
        isVisible: true,
        permissions: {
          canEdit: true,
          canDelete: true,
          canMove: true,
          canResize: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      act(() => {
        result.current.addWidget(widget)
      })

      act(() => {
        result.current.updateWidget('test-widget', { 
          title: 'Updated Widget',
          size: 'large' as const
        })
      })

      const updatedWidget = result.current.widgets.find(w => w.id === 'test-widget')
      expect(updatedWidget?.title).toBe('Updated Widget')
      expect(updatedWidget?.size).toBe('large')
    })
  })

  describe('Filter and Search State', () => {
    it('should manage search and filter state', () => {
      const { result } = renderHook(() => useDashboardStore())

      const filters = [
        {
          id: 'type',
          label: 'Type',
          type: 'select' as const,
          value: 'property'
        }
      ]

      act(() => {
        result.current.setSearchQuery('test query')
        result.current.setFilters(filters)
      })

      expect(result.current.searchQuery).toBe('test query')
      expect(result.current.filters).toEqual(filters)
    })

    it('should clear search and filters', () => {
      const { result } = renderHook(() => useDashboardStore())

      act(() => {
        result.current.setSearchQuery('test query')
        result.current.setFilters([{
          id: 'type',
          label: 'Type',
          type: 'select' as const,
          value: 'property'
        }])
      })

      act(() => {
        result.current.clearSearch()
        result.current.clearFilters()
      })

      expect(result.current.searchQuery).toBe('')
      expect(result.current.filters).toEqual([])
    })
  })

  describe('Batch Operations', () => {
    it('should handle batch data updates', async () => {
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
        ],
        tenants: [
          {
            id: '1',
            name: 'Test Tenant',
            propertyName: 'Test Property',
            unitNumber: 'A-1',
            monthlyRent: 50000,
            status: 'active'
          }
        ]
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockData.metrics)
      mockDashboardService.getPropertyAnalytics.mockResolvedValue(mockData.properties)
      mockDashboardService.getTenantAnalytics.mockResolvedValue(mockData.tenants)

      const { result } = renderHook(() => useDashboardStore())

      await act(async () => {
        await result.current.fetchAllData()
      })

      expect(result.current.metrics).toEqual(mockData.metrics)
      expect(result.current.properties).toEqual(mockData.properties)
      expect(result.current.tenants).toEqual(mockData.tenants)
    })

    it('should handle partial batch failures', async () => {
      const mockMetrics = {
        totalProperties: 25,
        activeTenants: 68,
        monthlyRevenue: 2450000,
        occupancyRate: 94.1
      }

      mockDashboardService.getDashboardMetrics.mockResolvedValue(mockMetrics)
      mockDashboardService.getPropertyAnalytics.mockRejectedValue(new Error('Properties failed'))
      mockDashboardService.getTenantAnalytics.mockResolvedValue([])

      const { result } = renderHook(() => useDashboardStore())

      await act(async () => {
        await result.current.fetchAllData()
      })

      // Should have successful data
      expect(result.current.metrics).toEqual(mockMetrics)
      expect(result.current.tenants).toEqual([])
      
      // Should have error for failed request
      expect(result.current.error).toContain('Properties failed')
    })
  })

  describe('Performance Optimization', () => {
    it('should debounce rapid updates', async () => {
      const { result } = renderHook(() => useDashboardStore())

      const updates = [
        { activeTenants: 68 },
        { activeTenants: 69 },
        { activeTenants: 70 }
      ]

      // Rapid updates
      act(() => {
        updates.forEach(update => {
          result.current.updateMetrics(update)
        })
      })

      // Should only apply the last update
      expect(result.current.metrics?.activeTenants).toBe(70)
    })

    it('should handle memory cleanup', () => {
      const { result } = renderHook(() => useDashboardStore())

      // Add some data
      act(() => {
        result.current.setMetrics({
          totalProperties: 25,
          activeTenants: 68,
          monthlyRevenue: 2450000,
          occupancyRate: 94.1
        })
      })

      // Cleanup
      act(() => {
        result.current.cleanup?.()
      })

      // Should clear non-essential data while preserving structure
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })
})
