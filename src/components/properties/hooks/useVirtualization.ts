import { useState, useEffect, useMemo, useCallback } from 'react'

interface VirtualizationConfig {
  itemHeight: number
  overscan: number
  threshold: number
  maxHeight: number
  enableVirtualization: boolean
}

interface UseVirtualizationOptions {
  itemCount: number
  baseItemHeight?: number
  overscanCount?: number
  virtualizationThreshold?: number
  maxContainerHeight?: number
  forceVirtualization?: boolean
}

interface UseVirtualizationReturn {
  config: VirtualizationConfig
  shouldVirtualize: boolean
  containerHeight: number
  visibleRange: { start: number; end: number }
  scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void
  resetAfterIndex: (index: number, shouldForceUpdate?: boolean) => void
}

/**
 * Hook for adaptive virtualization that adjusts based on screen size and item count
 */
export function useVirtualization({
  itemCount,
  baseItemHeight = 280,
  overscanCount = 5,
  virtualizationThreshold = 50,
  maxContainerHeight = 600,
  forceVirtualization = false,
}: UseVirtualizationOptions): UseVirtualizationReturn {
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })
  const [scrollPosition, setScrollPosition] = useState(0)

  // Track screen size for responsive adjustments
  useEffect(() => {
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  // Calculate adaptive configuration based on screen size
  const config = useMemo<VirtualizationConfig>(() => {
    const isMobile = screenSize.width < 768
    const isTablet = screenSize.width >= 768 && screenSize.width < 1024
    const isDesktop = screenSize.width >= 1024

    // Adjust item height based on screen size
    let itemHeight = baseItemHeight
    if (isMobile) {
      itemHeight = Math.max(baseItemHeight * 0.8, 200) // Smaller on mobile
    } else if (isTablet) {
      itemHeight = baseItemHeight * 0.9 // Slightly smaller on tablet
    }

    // Adjust overscan based on screen size and performance
    let overscan = overscanCount
    if (isMobile) {
      overscan = Math.max(overscanCount - 2, 2) // Less overscan on mobile for performance
    } else if (isDesktop) {
      overscan = overscanCount + 2 // More overscan on desktop for smoother scrolling
    }

    // Adjust max height based on screen size
    let maxHeight = maxContainerHeight
    if (isMobile) {
      maxHeight = Math.min(screenSize.height * 0.6, maxContainerHeight)
    } else if (isTablet) {
      maxHeight = Math.min(screenSize.height * 0.7, maxContainerHeight)
    }

    return {
      itemHeight,
      overscan,
      threshold: virtualizationThreshold,
      maxHeight,
      enableVirtualization: forceVirtualization || itemCount > virtualizationThreshold,
    }
  }, [screenSize, itemCount, baseItemHeight, overscanCount, virtualizationThreshold, maxContainerHeight, forceVirtualization])

  // Determine if virtualization should be used
  const shouldVirtualize = useMemo(() => {
    return config.enableVirtualization && itemCount > config.threshold
  }, [config.enableVirtualization, itemCount, config.threshold])

  // Calculate container height
  const containerHeight = useMemo(() => {
    if (!shouldVirtualize) {
      return Math.min(itemCount * config.itemHeight, config.maxHeight)
    }
    return Math.min(config.maxHeight, itemCount * config.itemHeight)
  }, [shouldVirtualize, itemCount, config.itemHeight, config.maxHeight])

  // Calculate visible range for non-virtualized lists
  const visibleRange = useMemo(() => {
    if (shouldVirtualize) {
      // For virtualized lists, react-window handles this
      return { start: 0, end: itemCount }
    }

    const itemsPerPage = Math.ceil(containerHeight / config.itemHeight)
    const startIndex = Math.floor(scrollPosition / config.itemHeight)
    const endIndex = Math.min(startIndex + itemsPerPage + config.overscan, itemCount)

    return {
      start: Math.max(0, startIndex - config.overscan),
      end: endIndex,
    }
  }, [shouldVirtualize, itemCount, containerHeight, config.itemHeight, config.overscan, scrollPosition])

  // Scroll to item function (for both virtualized and non-virtualized)
  const scrollToItem = useCallback((index: number, align: 'auto' | 'smart' | 'center' | 'end' | 'start' = 'auto') => {
    if (shouldVirtualize) {
      // This will be handled by the virtualized list component
      return
    }

    const targetPosition = index * config.itemHeight
    const container = document.querySelector('[data-virtualization-container]')
    
    if (container) {
      container.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      })
    }
  }, [shouldVirtualize, config.itemHeight])

  // Reset after index function (for dynamic sizing)
  const resetAfterIndex = useCallback((index: number, shouldForceUpdate = true) => {
    // This is primarily for variable-size lists
    // Implementation would depend on the specific virtualization library
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Reset after index ${index}, force update: ${shouldForceUpdate}`)
    }
  }, [])

  return {
    config,
    shouldVirtualize,
    containerHeight,
    visibleRange,
    scrollToItem,
    resetAfterIndex,
  }
}

/**
 * Hook for measuring item heights dynamically
 */
export function useItemMeasurement() {
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map())
  const [averageHeight, setAverageHeight] = useState(280)

  const measureItem = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const newMap = new Map(prev)
      newMap.set(index, height)
      
      // Update average height
      const heights = Array.from(newMap.values())
      const avg = heights.reduce((sum, h) => sum + h, 0) / heights.length
      setAverageHeight(avg)
      
      return newMap
    })
  }, [])

  const getItemHeight = useCallback((index: number) => {
    return itemHeights.get(index) || averageHeight
  }, [itemHeights, averageHeight])

  const resetMeasurements = useCallback(() => {
    setItemHeights(new Map())
    setAverageHeight(280)
  }, [])

  return {
    measureItem,
    getItemHeight,
    resetMeasurements,
    averageHeight,
    measuredCount: itemHeights.size,
  }
}

/**
 * Hook for infinite loading with virtualization
 */
export function useInfiniteVirtualization({
  hasNextPage = false,
  isNextPageLoading = false,
  loadNextPage,
  threshold = 5,
}: {
  hasNextPage?: boolean
  isNextPageLoading?: boolean
  loadNextPage?: () => Promise<void> | void
  threshold?: number
} = {}) {
  const [isLoading, setIsLoading] = useState(false)

  const isItemLoaded = useCallback((index: number, itemCount: number) => {
    return index < itemCount
  }, [])

  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    if (isLoading || !hasNextPage || !loadNextPage) {
      return
    }

    setIsLoading(true)
    try {
      await loadNextPage()
    } catch (error) {
      console.error('Failed to load more items:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasNextPage, loadNextPage])

  const shouldLoadMore = useCallback((visibleStartIndex: number, visibleStopIndex: number, totalItemCount: number) => {
    if (!hasNextPage || isLoading || isNextPageLoading) {
      return false
    }

    return visibleStopIndex >= totalItemCount - threshold
  }, [hasNextPage, isLoading, isNextPageLoading, threshold])

  return {
    isItemLoaded,
    loadMoreItems,
    shouldLoadMore,
    isLoading: isLoading || isNextPageLoading,
  }
}

/**
 * Performance monitoring hook for virtualization
 */
export function useVirtualizationPerformance() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    scrollPerformance: 0,
    memoryUsage: 0,
    frameDrops: 0,
  })

  const measureRenderTime = useCallback((startTime: number) => {
    const endTime = performance.now()
    const renderTime = endTime - startTime

    setMetrics(prev => ({
      ...prev,
      renderTime,
    }))

    return renderTime
  }, [])

  const trackScrollPerformance = useCallback(() => {
    let lastScrollTime = performance.now()
    let frameCount = 0
    let droppedFrames = 0

    const handleScroll = () => {
      const currentTime = performance.now()
      const timeDiff = currentTime - lastScrollTime
      
      frameCount++
      
      // Detect dropped frames (assuming 60fps target)
      if (timeDiff > 16.67 * 2) {
        droppedFrames++
      }

      setMetrics(prev => ({
        ...prev,
        scrollPerformance: frameCount > 0 ? (frameCount - droppedFrames) / frameCount : 1,
        frameDrops: droppedFrames,
      }))

      lastScrollTime = currentTime
    }

    return handleScroll
  }, [])

  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
      }))
    }
  }, [])

  return {
    metrics,
    measureRenderTime,
    trackScrollPerformance,
    measureMemoryUsage,
  }
}
