import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
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
  preventDefault = true
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
    shortcuts
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
      category: 'Global'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: actions.openSearch,
      description: 'Open global search',
      category: 'Global'
    },
    {
      key: 'f',
      metaKey: true,
      shiftKey: true,
      action: actions.openFilters,
      description: 'Open search filters',
      category: 'Search'
    },
    {
      key: 'f',
      ctrlKey: true,
      shiftKey: true,
      action: actions.openFilters,
      description: 'Open search filters',
      category: 'Search'
    },
    
    // Navigation shortcuts
    {
      key: '1',
      metaKey: true,
      action: actions.navigateToProperties,
      description: 'Go to Properties',
      category: 'Navigation'
    },
    {
      key: '2',
      metaKey: true,
      action: actions.navigateToTenants,
      description: 'Go to Rental Management',
      category: 'Navigation'
    },
    {
      key: '3',
      metaKey: true,
      action: actions.navigateToPayments,
      description: 'Go to Payments',
      category: 'Navigation'
    },
    {
      key: '4',
      metaKey: true,
      action: actions.navigateToReports,
      description: 'Go to Reports',
      category: 'Navigation'
    },
    
    // UI shortcuts
    {
      key: 'b',
      metaKey: true,
      action: actions.toggleSidebar,
      description: 'Toggle sidebar',
      category: 'Interface'
    },
    {
      key: '/',
      action: actions.showHelp,
      description: 'Show keyboard shortcuts',
      category: 'Help'
    }
  ]

  return useKeyboardShortcuts({
    shortcuts,
    enabled: true,
    preventDefault: true
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
      category: 'Search Navigation'
    },
    {
      key: 'ArrowUp',
      action: actions.selectPrevious,
      description: 'Select previous result',
      category: 'Search Navigation'
    },
    {
      key: 'Enter',
      action: actions.selectCurrent,
      description: 'Open selected result',
      category: 'Search Navigation'
    },
    {
      key: 'Escape',
      action: actions.closeSearch,
      description: 'Close search',
      category: 'Search Navigation'
    }
  ]

  return useKeyboardShortcuts({
    shortcuts,
    enabled: true,
    preventDefault: false // Let the search component handle these
  })
}

/**
 * Component to display keyboard shortcuts help
 */
export function KeyboardShortcutsHelp({ 
  shortcuts, 
  isOpen, 
  onClose 
}: { 
  shortcuts: KeyboardShortcut[]
  isOpen: boolean
  onClose: () => void 
}) {
  if (!isOpen) return null

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || 'Other'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(shortcut)
    return groups
  }, {} as Record<string, KeyboardShortcut[]>)

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = []
    if (shortcut.metaKey) keys.push('⌘')
    if (shortcut.ctrlKey) keys.push('Ctrl')
    if (shortcut.shiftKey) keys.push('⇧')
    if (shortcut.altKey) keys.push('⌥')
    keys.push(shortcut.key.toUpperCase())
    return keys.join(' + ')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Press <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">/</kbd> to show this help again
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
