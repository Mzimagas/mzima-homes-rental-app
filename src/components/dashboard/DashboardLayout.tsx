/**
 * Dashboard Layout Component
 * Main layout component following PropertyManagementTabs.tsx patterns
 * Provides responsive design, navigation integration, and widget management
 */

'use client'

import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useAuth } from '../../lib/auth-context'
import { useDashboardContext } from '../../contexts/DashboardContextProvider'
import { useDashboardData, useOptimizedDashboard } from '../../hooks/useDashboardData'
import { useRealTimeDashboard } from '../../hooks/useRealTimeDashboard'
import { ResponsiveContainer } from '../layout/ResponsiveContainer'
import { LoadingSpinner } from '../ui/loading'
import { ErrorMessage } from '../ui/error'

// Lazy load dashboard sections for better performance
const DashboardOverview = lazy(() => import('./sections/DashboardOverview'))
const PropertyAnalytics = lazy(() => import('./sections/PropertyAnalytics'))
const FinancialDashboard = lazy(() => import('./sections/FinancialDashboard'))
const TenantManagement = lazy(() => import('./sections/TenantManagement'))
const ReportsSection = lazy(() => import('./sections/ReportsSection'))

// Dashboard tab configuration
export type DashboardTab = 'overview' | 'properties' | 'financial' | 'tenants' | 'reports'

export interface DashboardTabConfig {
  id: DashboardTab
  label: string
  icon: string
  description: string
  color: string
  gradient: string
  borderColor: string
  hoverGradient: string
}

const DASHBOARD_TABS: DashboardTabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📊',
    description: 'Key metrics, alerts, and quick actions for property management',
    color: 'blue',
    gradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    hoverGradient: 'hover:from-blue-100 hover:to-indigo-100'
  },
  {
    id: 'properties',
    label: 'Property Analytics',
    icon: '🏠',
    description: 'Occupancy rates, performance metrics, and property insights',
    color: 'green',
    gradient: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    hoverGradient: 'hover:from-green-100 hover:to-emerald-100'
  },
  {
    id: 'financial',
    label: 'Financial Dashboard',
    icon: '💰',
    description: 'Revenue tracking, payment analytics, and financial reports',
    color: 'yellow',
    gradient: 'from-yellow-50 to-amber-50',
    borderColor: 'border-yellow-200',
    hoverGradient: 'hover:from-yellow-100 hover:to-amber-100'
  },
  {
    id: 'tenants',
    label: 'Tenant Management',
    icon: '👥',
    description: 'Tenant analytics, lease tracking, and satisfaction metrics',
    color: 'purple',
    gradient: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    hoverGradient: 'hover:from-purple-100 hover:to-violet-100'
  },
  {
    id: 'reports',
    label: 'Reports & Export',
    icon: '📈',
    description: 'Generate reports, export data, and view historical trends',
    color: 'indigo',
    gradient: 'from-indigo-50 to-blue-50',
    borderColor: 'border-indigo-200',
    hoverGradient: 'hover:from-indigo-100 hover:to-blue-100'
  }
]

// Dashboard layout props
export interface DashboardLayoutProps {
  initialTab?: DashboardTab
  className?: string
}

// Skeleton components for loading states
const DashboardSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 4 }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  </div>
)

/**
 * Dashboard Navigation Component
 */
interface DashboardNavigationProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onTabHover?: (tab: DashboardTab) => void
  onTabLeave?: () => void
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  activeTab,
  onTabChange,
  onTabHover,
  onTabLeave
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
        Property Management Dashboard
      </h1>
      
      {/* Desktop Navigation */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-3">
        {DASHBOARD_TABS.map((tab) => (
          <DashboardTabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => onTabHover?.(tab.id)}
            onMouseLeave={() => onTabLeave?.()}
          />
        ))}
      </div>
      
      {/* Tablet Navigation */}
      <div className="hidden md:grid md:grid-cols-3 lg:hidden gap-3">
        {DASHBOARD_TABS.slice(0, 3).map((tab) => (
          <DashboardTabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => onTabHover?.(tab.id)}
            onMouseLeave={() => onTabLeave?.()}
          />
        ))}
      </div>
      
      {/* Mobile Navigation - Horizontal Scroll */}
      <div className="md:hidden">
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {DASHBOARD_TABS.map((tab) => (
            <DashboardTabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              compact
            />
          ))}
        </div>
      </div>
      
      {/* Secondary navigation for tablet/mobile */}
      {(activeTab === 'tenants' || activeTab === 'reports') && (
        <div className="md:flex lg:hidden mt-3 space-x-2">
          {DASHBOARD_TABS.slice(3).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Dashboard Tab Button Component
 */
interface DashboardTabButtonProps {
  tab: DashboardTabConfig
  isActive: boolean
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  compact?: boolean
}

const DashboardTabButton: React.FC<DashboardTabButtonProps> = ({
  tab,
  isActive,
  onClick,
  onMouseEnter,
  onMouseLeave,
  compact = false
}) => {
  const getButtonClasses = () => {
    const baseClasses = `
      bg-gradient-to-br rounded-lg transition-all duration-200 hover:scale-102 cursor-pointer border-2
      ${compact ? 'py-2 px-3 min-w-[120px]' : 'py-4 px-3'}
    `
    
    if (isActive) {
      return `${baseClasses} ${tab.gradient} ${tab.borderColor} shadow-md ring-2 ring-${tab.color}-300 ring-opacity-50 scale-102`
    }
    
    return `${baseClasses} ${tab.gradient} ${tab.borderColor} hover:shadow-md ${tab.hoverGradient}`
  }
  
  const getTextClasses = (element: 'title' | 'description') => {
    const colorMap = {
      title: isActive ? `text-${tab.color}-900` : `text-${tab.color}-800`,
      description: isActive ? `text-${tab.color}-700` : `text-${tab.color}-600`
    }
    
    return `transition-colors ${colorMap[element]}`
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={getButtonClasses()}
    >
      <div className={`flex ${compact ? 'flex-row items-center space-x-2' : 'flex-col items-center text-center space-y-2'}`}>
        <div className={`
          ${compact ? 'w-6 h-6' : 'w-10 h-10'} 
          rounded-full flex items-center justify-center text-lg transition-colors
          ${isActive ? `bg-${tab.color}-200` : `bg-${tab.color}-100`}
        `}>
          {tab.icon}
        </div>
        <div className={compact ? 'text-left' : ''}>
          <h3 className={`font-bold ${compact ? 'text-sm' : 'text-base'} ${getTextClasses('title')}`}>
            {tab.label}
          </h3>
          {!compact && (
            <p className={`text-xs mt-1 ${getTextClasses('description')} opacity-90`}>
              {tab.description}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

/**
 * Main Dashboard Layout Component
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  initialTab = 'overview',
  className = ''
}) => {
  const { user } = useAuth()
  const { state, actions } = useDashboardContext()
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab)
  
  // Initialize dashboard data
  const {
    stats,
    metrics,
    widgets,
    alerts,
    loading,
    error,
    isInitialized,
    refreshAll
  } = useOptimizedDashboard({
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  })
  
  // Real-time updates
  const { connected: realTimeConnected } = useRealTimeDashboard({
    autoConnect: true,
    subscriptions: ['dashboard', 'metrics', 'alerts']
  })

  // Tab change handler with context update
  const handleTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab)
    actions.setCurrentTab(tab)
  }, [actions])

  // Tab hover handler for prefetching
  const handleTabHover = useCallback((tab: DashboardTab) => {
    // Prefetch data for hovered tab
    // Implementation would depend on specific tab requirements
  }, [])

  // Error boundary for tab content
  if (error) {
    return (
      <ResponsiveContainer className={className}>
        <ErrorMessage
          title="Dashboard Error"
          message={error}
          onRetry={refreshAll}
        />
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer className={`dashboard-layout ${className}`}>
      {/* Dashboard Navigation */}
      <DashboardNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onTabHover={handleTabHover}
      />

      {/* Real-time connection indicator */}
      {realTimeConnected && (
        <div className="mb-4 flex items-center justify-end">
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live updates active</span>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <Suspense fallback={<DashboardSkeleton itemCount={6} />}>
            <DashboardOverview
              stats={stats.data}
              metrics={metrics.data}
              alerts={alerts.data}
              widgets={widgets.data}
              loading={loading}
              onRefresh={refreshAll}
            />
          </Suspense>
        )}

        {activeTab === 'properties' && (
          <Suspense fallback={<DashboardSkeleton itemCount={4} />}>
            <PropertyAnalytics
              loading={loading}
              onRefresh={refreshAll}
            />
          </Suspense>
        )}

        {activeTab === 'financial' && (
          <Suspense fallback={<DashboardSkeleton itemCount={5} />}>
            <FinancialDashboard
              loading={loading}
              onRefresh={refreshAll}
            />
          </Suspense>
        )}

        {activeTab === 'tenants' && (
          <Suspense fallback={<DashboardSkeleton itemCount={4} />}>
            <TenantManagement
              loading={loading}
              onRefresh={refreshAll}
            />
          </Suspense>
        )}

        {activeTab === 'reports' && (
          <Suspense fallback={<DashboardSkeleton itemCount={3} />}>
            <ReportsSection
              loading={loading}
              onRefresh={refreshAll}
            />
          </Suspense>
        )}
      </div>
    </ResponsiveContainer>
  )
}

export default DashboardLayout
