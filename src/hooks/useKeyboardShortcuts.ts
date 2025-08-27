import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  category?: string
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  preventDefault?: boolean
}

/**
 * Custom hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  preventDefault = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Allow Cmd/Ctrl+K even in inputs for global search
        if (!(event.key === 'k' && (event.metaKey || event.ctrlKey))) {
          return
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey
        const metaMatches = !!shortcut.metaKey === event.metaKey
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey
        const altMatches = !!shortcut.altKey === event.altKey

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          if (preventDefault) {
            event.preventDefault()
          }
          shortcut.action()
          break
        }
      }
    },
    [shortcuts, enabled, preventDefault]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    shortcuts,
  }
}

/**
 * Hook for dashboard-specific keyboard shortcuts
 */
export function useDashboardShortcuts(actions: {
  openSearch: () => void
  openFilters: () => void
  navigateToProperties: () => void
  navigateToTenants: () => void
  navigateToPayments: () => void
  navigateToReports: () => void
  toggleSidebar: () => void
  showHelp: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    // Global shortcuts
    {
      key: 'k',
      metaKey: true,
      action: actions.openSearch,
      description: 'Open global search',
      category: 'Global',
    },
    {
      key: 'k',
      ctrlKey: true,
      action: actions.openSearch,
      description: 'Open global search',
      category: 'Global',
    },
    {
      key: 'f',
      metaKey: true,
      shiftKey: true,
      action: actions.openFilters,
      description: 'Open search filters',
      category: 'Search',
    },
    {
      key: 'f',
      ctrlKey: true,
      shiftKey: true,
      action: actions.openFilters,
      description: 'Open search filters',
      category: 'Search',
    },

    // Navigation shortcuts
    {
      key: '1',
      metaKey: true,
      action: actions.navigateToProperties,
      description: 'Go to Properties',
      category: 'Navigation',
    },
    {
      key: '2',
      metaKey: true,
      action: actions.navigateToTenants,
      description: 'Go to Rental Management',
      category: 'Navigation',
    },
    {
      key: '3',
      metaKey: true,
      action: actions.navigateToPayments,
      description: 'Go to Payments',
      category: 'Navigation',
    },
    {
      key: '4',
      metaKey: true,
      action: actions.navigateToReports,
      description: 'Go to Reports',
      category: 'Navigation',
    },

    // UI shortcuts
    {
      key: 'b',
      metaKey: true,
      action: actions.toggleSidebar,
      description: 'Toggle sidebar',
      category: 'Interface',
    },
    {
      key: '/',
      action: actions.showHelp,
      description: 'Show keyboard shortcuts',
      category: 'Help',
    },
  ]

  return useKeyboardShortcuts({
    shortcuts,
    enabled: true,
    preventDefault: true,
  })
}

/**
 * Hook for search-specific keyboard shortcuts
 */
export function useSearchShortcuts(actions: {
  focusSearch: () => void
  clearSearch: () => void
  selectNext: () => void
  selectPrevious: () => void
  selectCurrent: () => void
  closeSearch: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'ArrowDown',
      action: actions.selectNext,
      description: 'Select next result',
      category: 'Search Navigation',
    },
    {
      key: 'ArrowUp',
      action: actions.selectPrevious,
      description: 'Select previous result',
      category: 'Search Navigation',
    },
    {
      key: 'Enter',
      action: actions.selectCurrent,
      description: 'Open selected result',
      category: 'Search Navigation',
    },
    {
      key: 'Escape',
      action: actions.closeSearch,
      description: 'Close search',
      category: 'Search Navigation',
    },
  ]

  return useKeyboardShortcuts({
    shortcuts,
    enabled: true,
    preventDefault: false, // Let the search component handle these
  })
}

/**
 * Component to display keyboard shortcuts help
 */
// Moved JSX component to components/ui/KeyboardShortcutsHelp.tsx to keep hooks pure
