import React from 'react'

export interface TabConfig {
  id: string
  label: string
  icon?: string
}

export interface TabNavigationProps {
  tabs: TabConfig[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  className?: string
}

export interface UseTabStateOptions {
  defaultTab: string
  persistKey?: string
}

export interface UseTabStateReturn {
  activeTab: string
  setActiveTab: (tab: string) => void
  isActiveTab: (tab: string) => boolean
}

/**
 * Custom hook for managing tab state with optional persistence
 */
export const useTabState = (options: UseTabStateOptions): UseTabStateReturn => {
  const { defaultTab, persistKey } = options
  const [activeTab, setActiveTabState] = React.useState<string>(defaultTab)

  // Load persisted tab on mount
  React.useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`tab:${persistKey}`)
        if (saved) {
          setActiveTabState(saved)
        }
      } catch (error) {
        console.warn('Failed to load persisted tab state:', error)
      }
    }
  }, [persistKey])

  // Persist tab changes
  const setActiveTab = React.useCallback((tab: string) => {
    setActiveTabState(tab)
    
    if (persistKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`tab:${persistKey}`, tab)
      } catch (error) {
        console.warn('Failed to persist tab state:', error)
      }
    }
  }, [persistKey])

  const isActiveTab = React.useCallback((tab: string) => {
    return activeTab === tab
  }, [activeTab])

  return {
    activeTab,
    setActiveTab,
    isActiveTab
  }
}

/**
 * Reusable tab navigation component with multiple variants
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  className = ''
}) => {
  const getTabClassName = (tab: TabConfig, isActive: boolean) => {
    const baseClasses = 'transition-colors focus:outline-none'
    
    switch (variant) {
      case 'pills':
        return `${baseClasses} flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${
          isActive
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`
      
      case 'underline':
        return `${baseClasses} py-2 px-1 border-b-2 font-medium text-sm ${
          isActive
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`
      
      default:
        return `${baseClasses} px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
          isActive
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-800'
        }`
    }
  }

  const getContainerClassName = () => {
    switch (variant) {
      case 'pills':
        return 'flex space-x-1'
      case 'underline':
        return '-mb-px flex space-x-8'
      default:
        return 'flex border-b border-gray-200'
    }
  }

  return (
    <div className={`${getContainerClassName()} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          data-tab={tab.id}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onTabChange(tab.id)
          }}
          className={getTabClassName(tab, activeTab === tab.id)}
        >
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Tab content wrapper with conditional rendering
 */
export interface TabContentProps {
  activeTab: string
  tabId: string
  children: React.ReactNode
  className?: string
}

export const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  tabId,
  children,
  className = ''
}) => {
  if (activeTab !== tabId) return null

  return (
    <div className={className}>
      {children}
    </div>
  )
}

/**
 * Complete tab container with navigation and content
 */
export interface TabContainerProps {
  tabs: TabConfig[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  navigationClassName?: string
  contentClassName?: string
  children: React.ReactNode
}

export const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  navigationClassName = '',
  contentClassName = '',
  children
}) => {
  return (
    <div>
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        variant={variant}
        className={navigationClassName}
      />
      <div className={contentClassName}>
        {children}
      </div>
    </div>
  )
}

/**
 * Property management specific tab configurations
 */
export const PROPERTY_TABS: TabConfig[] = [
  { id: 'details', label: 'Basic Info', icon: '🏠' },
  { id: 'documents', label: 'Documents', icon: '📁' },
  { id: 'financial', label: 'Payments', icon: '💰' }
]

export const HANDOVER_TABS: TabConfig[] = [
  { id: 'details', label: 'Basic Info', icon: '🏠' },
  { id: 'documents', label: 'Documents', icon: '📁' },
  { id: 'financial', label: 'Payments', icon: '💰' }
]

/**
 * Utility function to get tab label from id
 */
export const getTabLabel = (tabId: string): string => {
  switch (tabId) {
    case 'details':
      return 'Basic Info'
    case 'documents':
      return 'Documents'
    case 'financial':
      return 'Financial'
    default:
      return tabId.charAt(0).toUpperCase() + tabId.slice(1)
  }
}

/**
 * Utility function to validate tab navigation
 */
export const isValidTab = (tabId: string, validTabs: string[]): boolean => {
  return validTabs.includes(tabId)
}

/**
 * Hook for cross-component tab navigation
 */
export const useTabNavigation = (propertyId: string, onTabChange: (tab: string) => void) => {
  React.useEffect(() => {
    const handler = (event: Event) => {
      const e = event as CustomEvent<any>
      const detail = e.detail || {}
      
      if (detail.propertyId === propertyId && detail.tabName) {
        onTabChange(detail.tabName)
      }
    }

    window.addEventListener('navigateToTab', handler as EventListener)
    return () => window.removeEventListener('navigateToTab', handler as EventListener)
  }, [propertyId, onTabChange])
}

/**
 * Utility to trigger cross-component navigation
 */
export const triggerTabNavigation = (propertyId: string, tabName: string) => {
  const event = new CustomEvent('navigateToTab', {
    detail: { propertyId, tabName }
  })
  window.dispatchEvent(event)
}
