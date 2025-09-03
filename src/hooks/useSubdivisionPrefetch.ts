/**
 * Hook for prefetching subdivision data on navigation hints
 */

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { subdivisionPrefetchService } from '../lib/services/subdivision-prefetch'
import { SubdivisionService } from '../lib/services/subdivision'

interface SubdivisionPrefetchOptions {
  enabled?: boolean
  prefetchOnHover?: boolean
  prefetchOnFocus?: boolean
  prefetchDelay?: number
}

export function useSubdivisionPrefetch(options: SubdivisionPrefetchOptions = {}) {
  const {
    enabled = true,
    prefetchOnHover = true,
    prefetchOnFocus = true,
    prefetchDelay = 100
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const prefetchTimeoutRef = useRef<NodeJS.Timeout>()
  const hasPrefetchedRef = useRef(false)

  // Prefetch subdivision data
  const prefetchSubdivisionData = async () => {
    if (!enabled || hasPrefetchedRef.current) return

    // Check if we're in browser environment
    if (typeof window === 'undefined') return

    try {
      hasPrefetchedRef.current = true

      // Use prefetch service instead of direct service call
      await subdivisionPrefetchService.prefetchAllSubdivisions()

      // Clear expired cache
      subdivisionPrefetchService.clearExpiredCache()
    } catch (error) {
      // Silent fail for prefetching
      hasPrefetchedRef.current = false
    }
  }

  // Prefetch on navigation hints
  const handleNavigationHint = () => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }

    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchSubdivisionData()
    }, prefetchDelay)
  }

  // Cancel prefetch
  const cancelPrefetch = () => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }
  }

  // Auto-prefetch if already on properties page
  useEffect(() => {
    if (pathname.includes('/properties') && !pathname.includes('/subdivision')) {
      // User is on properties page, likely to navigate to subdivision
      const timer = setTimeout(() => {
        prefetchSubdivisionData()
      }, 2000) // Prefetch after 2 seconds on properties page

      return () => clearTimeout(timer)
    }
  }, [pathname])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }
    }
  }, [])

  return {
    prefetchSubdivisionData,
    handleNavigationHint,
    cancelPrefetch,
    isPrefetched: hasPrefetchedRef.current
  }
}

// Hook for subdivision navigation link optimization
export function useSubdivisionNavLink(href: string) {
  const { handleNavigationHint, cancelPrefetch } = useSubdivisionPrefetch()

  const handleMouseEnter = () => {
    if (href.includes('subdivision')) {
      handleNavigationHint()
    }
  }

  const handleMouseLeave = () => {
    cancelPrefetch()
  }

  const handleFocus = () => {
    if (href.includes('subdivision')) {
      handleNavigationHint()
    }
  }

  const handleBlur = () => {
    cancelPrefetch()
  }

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur
  }
}
