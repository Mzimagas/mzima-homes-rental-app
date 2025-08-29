import { useEffect, useRef, useState } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number
  resistance?: number
  enabled?: boolean
}

/**
 * Custom hook for implementing pull-to-refresh functionality
 */
export function usePullToRefresh(options: PullToRefreshOptions) {
  const { onRefresh, threshold = 80, resistance = 2.5, enabled = true } = options

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)

  const touchStart = useRef<number>(0)
  const scrollElement = useRef<HTMLElement | null>(null)

  const handleTouchStart = (e: TouchEvent) => {
    if (!enabled || isRefreshing) return

    const element = e.target as HTMLElement
    scrollElement.current = element.closest('[data-pull-to-refresh]') || document.documentElement

    // Only start pull if we're at the top of the scroll container
    if (scrollElement.current.scrollTop === 0) {
      touchStart.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!enabled || isRefreshing || !isPulling || touchStart.current === 0) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - touchStart.current

    if (deltaY > 0 && scrollElement.current?.scrollTop === 0) {
      // Apply resistance to the pull
      const distance = Math.min(deltaY / resistance, threshold * 1.5)
      setPullDistance(distance)

      // Prevent default scroll behavior when pulling
      e.preventDefault()
    }
  }

  const handleTouchEnd = async () => {
    if (!enabled || isRefreshing || !isPulling) return

    setIsPulling(false)

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold)

      try {
        await onRefresh()
      } catch (error) {
              } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }

    touchStart.current = 0
  }

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, isRefreshing, isPulling, pullDistance, threshold])

  const pullToRefreshProps = {
    'data-pull-to-refresh': true,
    style: {
      transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
      transition: isPulling ? 'none' : 'transform 0.3s ease-out',
    },
  }

  const refreshIndicatorProps = {
    style: {
      opacity: pullDistance > 0 ? Math.min(pullDistance / threshold, 1) : 0,
      transform: `translateY(${Math.max(pullDistance - 40, 0)}px) rotate(${pullDistance * 2}deg)`,
      transition: isPulling ? 'none' : 'all 0.3s ease-out',
    },
  }

  return {
    isRefreshing,
    isPulling,
    pullDistance,
    pullToRefreshProps,
    refreshIndicatorProps,
    isThresholdReached: pullDistance >= threshold,
  }
}
