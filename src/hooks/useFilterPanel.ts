'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export interface UseFilterPanelOptions {
  defaultCollapsed?: boolean
  persistKey?: string
  autoCollapseOnMobile?: boolean
  autoHideDelay?: number
  enableClickOutside?: boolean
  excludeRefs?: React.RefObject<HTMLElement>[]
}

export interface UseFilterPanelReturn {
  isCollapsed: boolean
  toggleCollapse: () => void
  setCollapsed: (collapsed: boolean) => void
  isMobile: boolean
  panelRef: React.RefObject<HTMLDivElement>
}

export function useFilterPanel(options: UseFilterPanelOptions = {}): UseFilterPanelReturn {
  const {
    defaultCollapsed = true, // Changed default to true for auto-hide behavior
    persistKey = 'filter-panel-state',
    autoCollapseOnMobile = true,
    autoHideDelay = 1000,
    enableClickOutside = true,
    excludeRefs = []
  } = options

  // Ref for click-outside detection
  const panelRef = useRef<HTMLDivElement>(null)

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false)

  // Initialize collapsed state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check mobile first
      const mobile = window.innerWidth < 768
      if (autoCollapseOnMobile && mobile) {
        return true
      }

      // Try to load from localStorage
      if (persistKey) {
        try {
          const saved = localStorage.getItem(persistKey)
          if (saved !== null) {
            return JSON.parse(saved)
          }
        } catch (error) {
          // eslint-disable-next-line no-console
        console.warn('Failed to load filter panel state:', error)
        }
      }
    }
    return defaultCollapsed
  })

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      if (autoCollapseOnMobile && mobile && !isCollapsed) {
        setIsCollapsed(true)
      }
    }

    // Set initial mobile state
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [autoCollapseOnMobile, isCollapsed])

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && persistKey) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(isCollapsed))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to save filter panel state:', error)
      }
    }
  }, [isCollapsed, persistKey])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed)
  }, [])

  // Click-outside detection to auto-hide filter panel
  useEffect(() => {
    if (!enableClickOutside || isCollapsed) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Check if click is inside the main panel
      if (panelRef.current && panelRef.current.contains(target)) {
        return
      }

      // Check if click is inside any excluded elements
      const isInsideExcluded = excludeRefs.some(ref =>
        ref.current && ref.current.contains(target)
      )

      if (!isInsideExcluded) {
        // Only auto-hide if the click is outside the panel and excluded elements
        setIsCollapsed(true)
      }
    }

    // Add event listener with a small delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [enableClickOutside, isCollapsed, excludeRefs])

  return {
    isCollapsed,
    toggleCollapse,
    setCollapsed,
    isMobile,
    panelRef
  }
}
