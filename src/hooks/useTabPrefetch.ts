/**
 * Hook for prefetching tab data to improve navigation performance
 */

import { useEffect, useRef, useCallback } from 'react'
import { ActiveTab } from '../components/properties/types/property-management.types'

interface TabPrefetchOptions {
  enabled?: boolean
  prefetchDelay?: number
  prefetchOnHover?: boolean
}

interface TabPrefetchData {
  [key: string]: {
    data: any
    timestamp: number
    expiry: number
  }
}

class TabPrefetchService {
  private cache: TabPrefetchData = {}
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private prefetchPromises: Map<string, Promise<any>> = new Map()

  async prefetchTabData(tab: ActiveTab): Promise<void> {
    const cacheKey = `tab-${tab}`

    // Check if already cached and fresh
    if (this.isCached(cacheKey)) {
      return
    }

    // Check if already prefetching
    if (this.prefetchPromises.has(cacheKey)) {
      return this.prefetchPromises.get(cacheKey)
    }

    // Start prefetching based on tab type
    const prefetchPromise = this.fetchTabData(tab)
      .then((data) => {
        this.cache[cacheKey] = {
          data,
          timestamp: Date.now(),
          expiry: Date.now() + this.CACHE_DURATION,
        }
        this.prefetchPromises.delete(cacheKey)
        return data
      })
      .catch((error) => {
        this.prefetchPromises.delete(cacheKey)
        console.warn(`Failed to prefetch ${tab} tab data:`, error)
        return null
      })

    this.prefetchPromises.set(cacheKey, prefetchPromise)
    return prefetchPromise
  }

  getCachedTabData(tab: ActiveTab): any | null {
    const cacheKey = `tab-${tab}`
    const cached = this.cache[cacheKey]

    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }

    return null
  }

  private isCached(key: string): boolean {
    const cached = this.cache[key]
    return cached && Date.now() < cached.expiry
  }

  private async fetchTabData(tab: ActiveTab): Promise<any> {
    // Simulate data fetching for different tabs
    // In real implementation, this would call the actual services

    switch (tab) {
      case 'purchase':
        // Prefetch purchase pipeline data
        try {
          const { PurchasePipelineService } = await import(
            '../components/properties/services/purchase-pipeline.service'
          )
          return await PurchasePipelineService.loadPurchases()
        } catch (error) {
          console.warn('Failed to prefetch purchase data:', error)
          return null
        }

      case 'subdivision':
        // Prefetch subdivision data
        try {
          const { SubdivisionService } = await import('../lib/services/subdivision')
          return await SubdivisionService.loadSubdivisions()
        } catch (error) {
          console.warn('Failed to prefetch subdivision data:', error)
          return null
        }

      case 'handover':
        // Prefetch handover data
        try {
          // Import handover service when available
          return await this.fetchHandoverData()
        } catch (error) {
          console.warn('Failed to prefetch handover data:', error)
          return null
        }

      default:
        return null
    }
  }

  private async fetchHandoverData(): Promise<any> {
    // Placeholder for handover data fetching
    // This would be replaced with actual handover service call
    return new Promise((resolve) => setTimeout(() => resolve([]), 100))
  }

  clearCache(): void {
    this.cache = {}
    this.prefetchPromises.clear()
  }

  clearExpiredCache(): void {
    const now = Date.now()
    Object.keys(this.cache).forEach((key) => {
      if (this.cache[key].expiry < now) {
        delete this.cache[key]
      }
    })
  }
}

// Singleton instance
const tabPrefetchService = new TabPrefetchService()

export function useTabPrefetch(options: TabPrefetchOptions = {}) {
  const { enabled = true, prefetchDelay = 200, prefetchOnHover = true } = options

  const prefetchTimeoutRef = useRef<NodeJS.Timeout>()
  const prefetchedTabsRef = useRef<Set<ActiveTab>>(new Set())

  // Prefetch tab data
  const prefetchTab = useCallback(
    async (tab: ActiveTab) => {
      if (!enabled || prefetchedTabsRef.current.has(tab)) return

      try {
        prefetchedTabsRef.current.add(tab)
        await tabPrefetchService.prefetchTabData(tab)
      } catch (error) {
        prefetchedTabsRef.current.delete(tab)
        console.warn(`Failed to prefetch ${tab} tab:`, error)
      }
    },
    [enabled]
  )

  // Handle tab hover for prefetching
  const handleTabHover = useCallback(
    (tab: ActiveTab) => {
      if (!prefetchOnHover) return

      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }

      prefetchTimeoutRef.current = setTimeout(() => {
        prefetchTab(tab)
      }, prefetchDelay)
    },
    [prefetchTab, prefetchOnHover, prefetchDelay]
  )

  // Cancel prefetch
  const cancelPrefetch = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }
  }, [])

  // Get cached data for a tab
  const getCachedData = useCallback((tab: ActiveTab) => {
    return tabPrefetchService.getCachedTabData(tab)
  }, [])

  // Prefetch adjacent tabs when a tab becomes active
  const prefetchAdjacentTabs = useCallback(
    (currentTab: ActiveTab) => {
      const tabOrder: ActiveTab[] = ['properties', 'purchase', 'subdivision', 'handover']
      const currentIndex = tabOrder.indexOf(currentTab)

      // Prefetch next and previous tabs
      const adjacentTabs = [tabOrder[currentIndex - 1], tabOrder[currentIndex + 1]].filter(
        Boolean
      ) as ActiveTab[]

      adjacentTabs.forEach((tab) => {
        setTimeout(() => prefetchTab(tab), 500) // Delay to not interfere with current tab loading
      })
    },
    [prefetchTab]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }
    }
  }, [])

  // Auto-cleanup expired cache every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        tabPrefetchService.clearExpiredCache()
      },
      5 * 60 * 1000
    )

    return () => clearInterval(interval)
  }, [])

  return {
    prefetchTab,
    handleTabHover,
    cancelPrefetch,
    getCachedData,
    prefetchAdjacentTabs,
    clearCache: tabPrefetchService.clearCache.bind(tabPrefetchService),
  }
}

export { tabPrefetchService }
export default useTabPrefetch
