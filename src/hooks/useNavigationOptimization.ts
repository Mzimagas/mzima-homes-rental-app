/**
 * Navigation Optimization Hook
 * Provides smooth, seamless navigation between dashboard sections
 */

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ComponentPreloader } from '../presentation/utils/dynamicImports'

interface NavigationCache {
  [route: string]: {
    data?: any
    timestamp: number
    preloaded: boolean
  }
}

interface NavigationOptimizationOptions {
  preloadDelay?: number
  cacheTimeout?: number
  enablePrefetch?: boolean
  enablePreload?: boolean
  enableLogging?: boolean
}

export function useNavigationOptimization(options: NavigationOptimizationOptions = {}) {
  const {
    preloadDelay = 100,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    enablePrefetch = true,
    enablePreload = true,
    enableLogging = process.env.NODE_ENV === 'development'
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const cacheRef = useRef<NavigationCache>({})
  const preloadTimeoutRef = useRef<NodeJS.Timeout>()
  const loggedRoutesRef = useRef<Set<string>>(new Set())

  // Route to component mapping for preloading
  const routeComponentMap = {
    '/dashboard': ['Dashboard', 'Analytics'],
    '/dashboard/properties': ['PropertyList', 'PropertyForm', 'PropertySearch'],
    '/dashboard/rental-management': ['TenantList', 'TenantForm', 'LeaseManagement'],
    '/dashboard/accounting': ['ExpenseTracking', 'IncomeTracking'],
    '/dashboard/administration': ['UserManagement', 'Settings'],
    '/dashboard/notifications': ['NotificationCenter', 'Settings'],
    '/dashboard/reports': ['Analytics', 'PropertyReports']
  }

  // Preload components for a specific route
  const preloadRoute = useCallback(async (route: string) => {
    if (!enablePreload) return

    const cache = cacheRef.current[route]
    const now = Date.now()

    // Skip if already preloaded and cache is fresh
    if (cache?.preloaded && (now - cache.timestamp) < cacheTimeout) {
      return
    }

    try {
      // Preload route components
      const components = routeComponentMap[route as keyof typeof routeComponentMap] || []
      await ComponentPreloader.preloadMultiple(components)

      // Prefetch the route
      if (enablePrefetch) {
        router.prefetch(route)
      }

      // Update cache
      cacheRef.current[route] = {
        timestamp: now,
        preloaded: true
      }

      // Log only once per route and only in development
      if (enableLogging && !loggedRoutesRef.current.has(route)) {
        loggedRoutesRef.current.add(route)
        console.log(`🚀 Preloaded route: ${route}`)
      }
    } catch (error) {
      if (enableLogging) {
        console.warn(`Failed to preload route ${route}:`, error)
      }
    }
  }, [router, enablePrefetch, enablePreload, cacheTimeout, enableLogging])

  // Optimized navigation function
  const navigateOptimized = useCallback(async (route: string) => {
    // Start navigation immediately
    const navigationPromise = router.push(route)

    // Preload next likely routes in background
    const nextRoutes = getNextLikelyRoutes(route)
    nextRoutes.forEach(nextRoute => {
      setTimeout(() => preloadRoute(nextRoute), preloadDelay)
    })

    return navigationPromise
  }, [router, preloadRoute, preloadDelay])

  // Preload on hover/focus for smooth navigation
  const handleLinkHover = useCallback((route: string) => {
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current)
    }

    preloadTimeoutRef.current = setTimeout(() => {
      preloadRoute(route)
    }, 50) // Small delay to avoid excessive preloading
  }, [preloadRoute])

  // Cancel preload on mouse leave
  const handleLinkLeave = useCallback(() => {
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current)
    }
  }, [])

  // Preload current route and likely next routes on mount
  useEffect(() => {
    // Preload current route
    preloadRoute(pathname)

    // Preload likely next routes
    const nextRoutes = getNextLikelyRoutes(pathname)
    nextRoutes.forEach((route, index) => {
      setTimeout(() => preloadRoute(route), (index + 1) * preloadDelay)
    })
  }, [pathname, preloadRoute, preloadDelay])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
    }
  }, [])

  return {
    navigateOptimized,
    preloadRoute,
    handleLinkHover,
    handleLinkLeave,
    isRoutePreloaded: (route: string) => {
      const cache = cacheRef.current[route]
      return cache?.preloaded && (Date.now() - cache.timestamp) < cacheTimeout
    }
  }
}

// Predict next likely routes based on current route
function getNextLikelyRoutes(currentRoute: string): string[] {
  const routePatterns: Record<string, string[]> = {
    '/dashboard': [
      '/dashboard/properties',
      '/dashboard/rental-management',
      '/dashboard/notifications'
    ],
    '/dashboard/properties': [
      '/dashboard/rental-management',
      '/dashboard/accounting',
      '/dashboard/reports'
    ],
    '/dashboard/rental-management': [
      '/dashboard/properties',
      '/dashboard/accounting',
      '/dashboard/notifications'
    ],
    '/dashboard/accounting': [
      '/dashboard/properties',
      '/dashboard/rental-management',
      '/dashboard/reports'
    ],
    '/dashboard/administration': [
      '/dashboard/notifications',
      '/dashboard/reports',
      '/dashboard'
    ],
    '/dashboard/notifications': [
      '/dashboard',
      '/dashboard/properties',
      '/dashboard/rental-management'
    ],
    '/dashboard/reports': [
      '/dashboard/accounting',
      '/dashboard/properties',
      '/dashboard'
    ]
  }

  return routePatterns[currentRoute] || []
}

// Enhanced link component props for optimization
export interface OptimizedLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

// Global navigation optimization instance to prevent multiple hook calls
let globalNavigationOptimization: ReturnType<typeof useNavigationOptimization> | null = null

// Hook for optimized link behavior - uses global instance to prevent multiple hook calls
export function useOptimizedLink(href: string) {
  const router = useRouter()

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (globalNavigationOptimization) {
      globalNavigationOptimization.navigateOptimized(href)
    } else {
      // Fallback to regular navigation
      router.push(href)
    }
  }, [href, router])

  const handleMouseEnter = useCallback(() => {
    if (globalNavigationOptimization) {
      globalNavigationOptimization.handleLinkHover(href)
    }
  }, [href])

  const handleMouseLeave = useCallback(() => {
    if (globalNavigationOptimization) {
      globalNavigationOptimization.handleLinkLeave()
    }
  }, [])

  return {
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleMouseEnter, // Also preload on focus for keyboard navigation
    onBlur: handleMouseLeave
  }
}

// Function to set the global navigation optimization instance
export function setGlobalNavigationOptimization(instance: ReturnType<typeof useNavigationOptimization>) {
  globalNavigationOptimization = instance
}
