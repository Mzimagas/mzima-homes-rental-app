/**
 * Responsive Design Hooks and Utilities
 * Comprehensive responsive design system for dashboard components
 * Provides viewport detection, breakpoint management, and responsive utilities
 */

import { useState, useEffect, useCallback, useMemo } from 'react'

// Breakpoint definitions following Tailwind CSS conventions
export const BREAKPOINTS = {
  sm: 640,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (laptops/desktops)
  xl: 1280,  // Extra large devices (large laptops/desktops)
  '2xl': 1536 // 2X Extra large devices (larger desktops)
} as const

export type Breakpoint = keyof typeof BREAKPOINTS
export type ViewportSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// Device type detection
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// Orientation type
export type Orientation = 'portrait' | 'landscape'

// Responsive configuration interface
export interface ResponsiveConfig {
  xs?: any
  sm?: any
  md?: any
  lg?: any
  xl?: any
  '2xl'?: any
}

// Viewport information interface
export interface ViewportInfo {
  width: number
  height: number
  size: ViewportSize
  deviceType: DeviceType
  orientation: Orientation
  isTouch: boolean
  pixelRatio: number
}

/**
 * Hook for detecting current viewport size and breakpoints
 */
export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        size: 'lg',
        deviceType: 'desktop',
        orientation: 'landscape',
        isTouch: false,
        pixelRatio: 1
      }
    }

    return getViewportInfo()
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setViewport(getViewportInfo())
    }

    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(() => {
        setViewport(getViewportInfo())
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return viewport
}

/**
 * Get current viewport information
 */
function getViewportInfo(): ViewportInfo {
  const width = window.innerWidth
  const height = window.innerHeight
  
  return {
    width,
    height,
    size: getViewportSize(width),
    deviceType: getDeviceType(width),
    orientation: width > height ? 'landscape' : 'portrait',
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    pixelRatio: window.devicePixelRatio || 1
  }
}

/**
 * Determine viewport size based on width
 */
function getViewportSize(width: number): ViewportSize {
  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
}

/**
 * Determine device type based on width
 */
function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.md) return 'mobile'
  if (width < BREAKPOINTS.lg) return 'tablet'
  return 'desktop'
}

/**
 * Hook for responsive values based on current viewport
 */
export function useResponsiveValue<T>(config: ResponsiveConfig & { default?: T }): T {
  const { size } = useViewport()
  
  return useMemo(() => {
    // Check from largest to smallest breakpoint
    const breakpointOrder: ViewportSize[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
    const currentIndex = breakpointOrder.indexOf(size)
    
    // Find the first defined value at or below current breakpoint
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i]
      if (config[breakpoint] !== undefined) {
        return config[breakpoint]
      }
    }
    
    return config.default
  }, [config, size])
}

/**
 * Hook for breakpoint-specific behavior
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const { width } = useViewport()
  
  return useMemo(() => {
    return width >= BREAKPOINTS[breakpoint]
  }, [width, breakpoint])
}

/**
 * Hook for media query matching
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    setMatches(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

/**
 * Hook for device-specific behavior
 */
export function useDeviceType(): DeviceType {
  const { deviceType } = useViewport()
  return deviceType
}

/**
 * Hook for touch device detection
 */
export function useTouchDevice(): boolean {
  const { isTouch } = useViewport()
  return isTouch
}

/**
 * Hook for orientation detection
 */
export function useOrientation(): Orientation {
  const { orientation } = useViewport()
  return orientation
}

/**
 * Hook for responsive grid columns
 */
export function useResponsiveColumns(
  config: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
    default?: number
  }
): number {
  return useResponsiveValue({ ...config, default: config.default || 1 })
}

/**
 * Hook for responsive spacing
 */
export function useResponsiveSpacing(
  config: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
    default?: number
  }
): number {
  return useResponsiveValue({ ...config, default: config.default || 16 })
}

/**
 * Responsive utility functions
 */
export const ResponsiveUtils = {
  /**
   * Get responsive class names based on viewport
   */
  getResponsiveClasses: (
    baseClass: string,
    config: ResponsiveConfig
  ): string => {
    const classes = [baseClass]
    
    Object.entries(config).forEach(([breakpoint, value]) => {
      if (value && breakpoint !== 'default') {
        classes.push(`${breakpoint}:${value}`)
      }
    })
    
    return classes.join(' ')
  },

  /**
   * Check if current viewport matches breakpoint
   */
  matchesBreakpoint: (breakpoint: Breakpoint): boolean => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= BREAKPOINTS[breakpoint]
  },

  /**
   * Get optimal image size for current viewport
   */
  getOptimalImageSize: (
    baseWidth: number,
    baseHeight: number,
    pixelRatio: number = 1
  ): { width: number; height: number } => {
    return {
      width: Math.round(baseWidth * pixelRatio),
      height: Math.round(baseHeight * pixelRatio)
    }
  },

  /**
   * Calculate responsive font size
   */
  getResponsiveFontSize: (
    baseSize: number,
    viewport: ViewportSize
  ): number => {
    const scaleFactor = {
      xs: 0.875,  // 14px if base is 16px
      sm: 0.9375, // 15px if base is 16px
      md: 1,      // 16px (base)
      lg: 1.0625, // 17px if base is 16px
      xl: 1.125,  // 18px if base is 16px
      '2xl': 1.25 // 20px if base is 16px
    }

    return baseSize * scaleFactor[viewport]
  },

  /**
   * Get safe area insets for mobile devices
   */
  getSafeAreaInsets: (): {
    top: number
    right: number
    bottom: number
    left: number
  } => {
    if (typeof window === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 }
    }

    const style = getComputedStyle(document.documentElement)
    
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0
    }
  }
}

/**
 * Higher-order component for responsive behavior
 */
export function withResponsive<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ResponsiveComponent(props: P) {
    const viewport = useViewport()
    
    return React.createElement(Component, {
      ...props,
      viewport
    } as P & { viewport: ViewportInfo })
  }
}

/**
 * Hook for responsive dashboard layout
 */
export function useDashboardLayout() {
  const viewport = useViewport()
  
  const layout = useMemo(() => {
    const { deviceType, size, orientation } = viewport
    
    return {
      // Grid configuration
      columns: useResponsiveColumns({
        xs: 1,
        sm: 2,
        md: 2,
        lg: 3,
        xl: 4,
        '2xl': 4
      }),
      
      // Spacing configuration
      spacing: useResponsiveSpacing({
        xs: 8,
        sm: 12,
        md: 16,
        lg: 20,
        xl: 24,
        '2xl': 24
      }),
      
      // Layout mode
      mode: deviceType === 'mobile' ? 'compact' : 'full',
      
      // Navigation style
      navigation: deviceType === 'mobile' ? 'drawer' : 'tabs',
      
      // Widget sizing
      widgetSize: deviceType === 'mobile' ? 'small' : 'medium',
      
      // Chart height
      chartHeight: deviceType === 'mobile' ? 200 : 300,
      
      // Show/hide elements
      showSidebar: deviceType !== 'mobile',
      showBreadcrumbs: deviceType !== 'mobile',
      compactMetrics: deviceType === 'mobile',
      
      // Touch optimizations
      touchOptimized: viewport.isTouch,
      minTouchTarget: viewport.isTouch ? 44 : 32
    }
  }, [viewport])
  
  return layout
}

export default useViewport
