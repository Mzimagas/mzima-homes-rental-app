/**
 * Dashboard Navigation System
 * Standalone navigation component following WorkflowNavigation.tsx patterns
 * Provides responsive navigation with tab management and active state handling
 */

'use client'

import { useState, useCallback } from 'react'
import { useDashboardContext } from '../../../contexts/DashboardContextProvider'

// Navigation types
export type DashboardTab = 'overview' | 'properties' | 'financial' | 'tenants' | 'reports' | 'settings'

export interface DashboardTabConfig {
  id: DashboardTab
  label: string
  icon: string
  description: string
  color: string
  gradient: string
  borderColor: string
  hoverGradient: string
  activeGradient: string
  textColor: string
  activeTextColor: string
  badge?: number | string
  disabled?: boolean
}

// Navigation configuration
const DASHBOARD_TABS: DashboardTabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📊',
    description: 'Key metrics, alerts, and quick actions for property management',
    color: 'blue',
    gradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    hoverGradient: 'hover:from-blue-100 hover:to-indigo-100',
    activeGradient: 'from-blue-100 to-indigo-100',
    textColor: 'text-blue-800',
    activeTextColor: 'text-blue-900'
  },
  {
    id: 'properties',
    label: 'Properties',
    icon: '🏠',
    description: 'Occupancy rates, performance metrics, and property insights',
    color: 'green',
    gradient: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    hoverGradient: 'hover:from-green-100 hover:to-emerald-100',
    activeGradient: 'from-green-100 to-emerald-100',
    textColor: 'text-green-800',
    activeTextColor: 'text-green-900'
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: '💰',
    description: 'Revenue tracking, payment analytics, and financial reports',
    color: 'yellow',
    gradient: 'from-yellow-50 to-amber-50',
    borderColor: 'border-yellow-200',
    hoverGradient: 'hover:from-yellow-100 hover:to-amber-100',
    activeGradient: 'from-yellow-100 to-amber-100',
    textColor: 'text-yellow-800',
    activeTextColor: 'text-yellow-900'
  },
  {
    id: 'tenants',
    label: 'Tenants',
    icon: '👥',
    description: 'Tenant analytics, lease tracking, and satisfaction metrics',
    color: 'purple',
    gradient: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    hoverGradient: 'hover:from-purple-100 hover:to-violet-100',
    activeGradient: 'from-purple-100 to-violet-100',
    textColor: 'text-purple-800',
    activeTextColor: 'text-purple-900'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: '📈',
    description: 'Generate reports, export data, and view historical trends',
    color: 'indigo',
    gradient: 'from-indigo-50 to-blue-50',
    borderColor: 'border-indigo-200',
    hoverGradient: 'hover:from-indigo-100 hover:to-blue-100',
    activeGradient: 'from-indigo-100 to-blue-100',
    textColor: 'text-indigo-800',
    activeTextColor: 'text-indigo-900'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    description: 'Dashboard preferences, user settings, and system configuration',
    color: 'gray',
    gradient: 'from-gray-50 to-slate-50',
    borderColor: 'border-gray-200',
    hoverGradient: 'hover:from-gray-100 hover:to-slate-100',
    activeGradient: 'from-gray-100 to-slate-100',
    textColor: 'text-gray-800',
    activeTextColor: 'text-gray-900'
  }
]

// Navigation props
export interface DashboardNavigationProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onTabHover?: (tab: DashboardTab) => void
  onTabLeave?: () => void
  variant?: 'full' | 'compact' | 'minimal'
  showBadges?: boolean
  className?: string
}

/**
 * Individual Tab Button Component
 */
interface TabButtonProps {
  tab: DashboardTabConfig
  isActive: boolean
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  variant: 'full' | 'compact' | 'minimal'
  showBadge?: boolean
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  isActive,
  onClick,
  onMouseEnter,
  onMouseLeave,
  variant,
  showBadge = false
}) => {
  const getButtonClasses = () => {
    const baseClasses = `
      relative bg-gradient-to-br rounded-lg transition-all duration-200 cursor-pointer border-2
      ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-102'}
    `
    
    const sizeClasses = {
      full: 'py-4 px-4',
      compact: 'py-3 px-3',
      minimal: 'py-2 px-3'
    }
    
    if (isActive) {
      return `${baseClasses} ${sizeClasses[variant]} ${tab.activeGradient} ${tab.borderColor} shadow-md ring-2 ring-${tab.color}-300 ring-opacity-50 scale-102`
    }
    
    return `${baseClasses} ${sizeClasses[variant]} ${tab.gradient} ${tab.borderColor} hover:shadow-md ${tab.hoverGradient}`
  }
  
  const getContentLayout = () => {
    switch (variant) {
      case 'minimal':
        return 'flex-row items-center space-x-2'
      case 'compact':
        return 'flex-col items-center space-y-1'
      default:
        return 'flex-col items-center text-center space-y-2'
    }
  }
  
  const getIconSize = () => {
    switch (variant) {
      case 'minimal':
        return 'w-5 h-5'
      case 'compact':
        return 'w-7 h-7'
      default:
        return 'w-10 h-10'
    }
  }
  
  const getTitleSize = () => {
    switch (variant) {
      case 'minimal':
        return 'text-sm'
      case 'compact':
        return 'text-sm'
      default:
        return 'text-base'
    }
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={tab.disabled}
      className={getButtonClasses()}
      aria-label={`Switch to ${tab.label} tab`}
      title={tab.description}
    >
      <div className={`flex ${getContentLayout()}`}>
        {/* Icon with badge */}
        <div className="relative">
          <div className={`
            ${getIconSize()} rounded-full flex items-center justify-center text-lg transition-colors
            ${isActive ? `bg-${tab.color}-200` : `bg-${tab.color}-100`}
          `}>
            {tab.icon}
          </div>
          
          {/* Badge */}
          {showBadge && tab.badge && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {tab.badge}
            </div>
          )}
        </div>
        
        {/* Text content */}
        <div className={variant === 'minimal' ? 'text-left' : ''}>
          <h3 className={`font-bold ${getTitleSize()} ${isActive ? tab.activeTextColor : tab.textColor} transition-colors`}>
            {tab.label}
          </h3>
          {variant === 'full' && (
            <p className={`text-xs mt-1 ${isActive ? tab.activeTextColor : tab.textColor} opacity-75 transition-colors`}>
              {tab.description}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

/**
 * Mobile Navigation Drawer
 */
interface MobileNavProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  isOpen: boolean
  onClose: () => void
}

const MobileNavDrawer: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose
}) => {
  const handleTabSelect = (tab: DashboardTab) => {
    onTabChange(tab)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 md:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          
          <nav className="space-y-2">
            {DASHBOARD_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                disabled={tab.disabled}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors
                  ${activeTab === tab.id 
                    ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-500' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs text-gray-500">{tab.description}</div>
                </div>
                {tab.badge && (
                  <div className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {tab.badge}
                  </div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  )
}

/**
 * Main Dashboard Navigation Component
 */
export const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  activeTab,
  onTabChange,
  onTabHover,
  onTabLeave,
  variant = 'full',
  showBadges = true,
  className = ''
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { state } = useDashboardContext()
  
  // Update tab badges based on dashboard state
  const getTabsWithBadges = useCallback(() => {
    return DASHBOARD_TABS.map(tab => {
      let badge: number | string | undefined
      
      switch (tab.id) {
        case 'overview':
          badge = state.contextualActions.length > 0 ? state.contextualActions.length : undefined
          break
        case 'financial':
          // Would show number of pending payments or overdue items
          badge = undefined
          break
        case 'tenants':
          // Would show number of lease expirations or issues
          badge = undefined
          break
        default:
          badge = tab.badge
      }
      
      return { ...tab, badge }
    })
  }, [state.contextualActions])

  const tabsWithBadges = getTabsWithBadges()

  return (
    <>
      <div className={`dashboard-navigation ${className}`}>
        {/* Desktop/Tablet Navigation */}
        <div className="hidden md:block">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Property Management Dashboard
            </h1>
            
            {/* Navigation Grid */}
            <div className={`
              grid gap-3
              ${variant === 'minimal' ? 'grid-cols-6' : 
                variant === 'compact' ? 'grid-cols-3 lg:grid-cols-6' : 
                'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'}
            `}>
              {tabsWithBadges.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => onTabChange(tab.id)}
                  onMouseEnter={() => onTabHover?.(tab.id)}
                  onMouseLeave={() => onTabLeave?.()}
                  variant={variant}
                  showBadge={showBadges}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Header */}
        <div className="md:hidden">
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Open navigation menu"
              >
                ☰
              </button>
              
              <h1 className="text-lg font-semibold text-gray-900">
                {tabsWithBadges.find(tab => tab.id === activeTab)?.label || 'Dashboard'}
              </h1>
              
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </div>
          
          {/* Mobile Tab Indicator */}
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="text-lg">
                {tabsWithBadges.find(tab => tab.id === activeTab)?.icon}
              </span>
              <span>
                {tabsWithBadges.find(tab => tab.id === activeTab)?.description}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        activeTab={activeTab}
        onTabChange={onTabChange}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </>
  )
}

export default DashboardNavigation
