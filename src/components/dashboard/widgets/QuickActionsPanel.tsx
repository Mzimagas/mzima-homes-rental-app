/**
 * Quick Actions Panel Widget
 * Contextual quick actions following properties module patterns for common dashboard operations
 * Features role-based actions, recent actions tracking, and keyboard shortcuts
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  PlusIcon,
  UserPlusIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  HomeIcon,
  PhoneIcon,
  EnvelopeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useDashboardContext } from '../../../contexts/DashboardContextProvider'
import { useAuth } from '../../../lib/auth-context'

// Quick action interfaces
export interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  hoverColor: string
  category: 'property' | 'tenant' | 'financial' | 'report' | 'communication' | 'system'
  action: () => void | Promise<void>
  shortcut?: string
  requiresPermission?: string[]
  contextual?: boolean
  priority: 'high' | 'medium' | 'low'
  disabled?: boolean
}

export interface RecentAction {
  id: string
  label: string
  timestamp: Date
  category: string
  icon: React.ComponentType<any>
  data?: any
}

// Component props
export interface QuickActionsPanelProps {
  layout?: 'grid' | 'list' | 'compact'
  showCategories?: boolean
  showRecent?: boolean
  maxActions?: number
  className?: string
}

// Action categories
const ACTION_CATEGORIES = {
  property: { label: 'Property', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  tenant: { label: 'Tenant', color: 'text-green-600', bgColor: 'bg-green-50' },
  financial: { label: 'Financial', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  report: { label: 'Reports', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  communication: { label: 'Communication', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  system: { label: 'System', color: 'text-gray-600', bgColor: 'bg-gray-50' }
}

// Individual action button component
interface ActionButtonProps {
  action: QuickAction
  layout: 'grid' | 'list' | 'compact'
  onClick: (action: QuickAction) => void
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, layout, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(action)
  }, [action, onClick])

  const getButtonClasses = () => {
    const baseClasses = `
      relative group transition-all duration-200 rounded-lg border border-gray-200
      ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:scale-102'}
      ${action.bgColor} ${action.hoverColor}
    `
    
    switch (layout) {
      case 'compact':
        return `${baseClasses} p-2 flex items-center space-x-2`
      case 'list':
        return `${baseClasses} p-4 flex items-center space-x-4`
      default:
        return `${baseClasses} p-4 flex flex-col items-center text-center space-y-3`
    }
  }

  const getIconSize = () => {
    switch (layout) {
      case 'compact': return 'w-4 h-4'
      case 'list': return 'w-5 h-5'
      default: return 'w-8 h-8'
    }
  }

  const getTitleSize = () => {
    switch (layout) {
      case 'compact': return 'text-sm'
      case 'list': return 'text-base'
      default: return 'text-sm'
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={action.disabled}
      className={getButtonClasses()}
      title={action.description}
    >
      {/* Icon */}
      <div className={`
        ${layout === 'grid' ? 'p-2 rounded-lg' : ''} 
        ${action.color} 
        ${layout === 'grid' ? action.bgColor : ''}
      `}>
        <action.icon className={getIconSize()} />
      </div>
      
      {/* Content */}
      <div className={layout === 'compact' ? 'flex-1 text-left' : ''}>
        <h3 className={`font-medium text-gray-900 ${getTitleSize()}`}>
          {action.label}
        </h3>
        {layout !== 'compact' && (
          <p className="text-xs text-gray-600 mt-1">{action.description}</p>
        )}
      </div>
      
      {/* Shortcut indicator */}
      {action.shortcut && layout !== 'compact' && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
            {action.shortcut}
          </span>
        </div>
      )}
      
      {/* Priority indicator */}
      {action.priority === 'high' && (
        <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full"></div>
      )}
    </button>
  )
}

// Recent actions component
interface RecentActionsProps {
  actions: RecentAction[]
  onActionClick: (action: RecentAction) => void
}

const RecentActions: React.FC<RecentActionsProps> = ({ actions, onActionClick }) => {
  if (actions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <ClockIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent actions</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onActionClick(action)}
          className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <div className="p-1 bg-gray-100 rounded">
            <action.icon className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{action.label}</p>
            <p className="text-xs text-gray-500">
              {action.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}

/**
 * Main Quick Actions Panel Component
 */
export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  layout = 'grid',
  showCategories = true,
  showRecent = true,
  maxActions = 12,
  className = ''
}) => {
  const { user } = useAuth()
  const { state, actions: contextActions } = useDashboardContext()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [recentActions, setRecentActions] = useState<RecentAction[]>([])

  // Define available quick actions
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'add-property',
      label: 'Add Property',
      description: 'Register a new property in the system',
      icon: BuildingOfficeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      category: 'property',
      priority: 'high',
      action: () => {
        // Navigate to add property page
        window.location.href = '/properties/add'
      },
      shortcut: 'Ctrl+P'
    },
    {
      id: 'add-tenant',
      label: 'Add Tenant',
      description: 'Register a new tenant and create tenancy agreement',
      icon: UserPlusIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      category: 'tenant',
      priority: 'high',
      action: () => {
        // Navigate to add tenant page
        window.location.href = '/tenants/add'
      },
      shortcut: 'Ctrl+T'
    },
    {
      id: 'record-payment',
      label: 'Record Payment',
      description: 'Record a new rent payment from tenant',
      icon: CurrencyDollarIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      hoverColor: 'hover:bg-yellow-100',
      category: 'financial',
      priority: 'high',
      action: () => {
        // Navigate to record payment page
        window.location.href = '/payments/add'
      },
      shortcut: 'Ctrl+R'
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      description: 'Create financial or property performance reports',
      icon: DocumentTextIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      category: 'report',
      priority: 'medium',
      action: () => {
        // Navigate to reports page
        window.location.href = '/reports'
      },
      shortcut: 'Ctrl+G'
    },
    {
      id: 'property-search',
      label: 'Search Properties',
      description: 'Find properties by name, location, or type',
      icon: MagnifyingGlassIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      hoverColor: 'hover:bg-indigo-100',
      category: 'property',
      priority: 'medium',
      action: () => {
        // Focus search input or open search modal
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
      shortcut: 'Ctrl+F'
    },
    {
      id: 'contact-tenant',
      label: 'Contact Tenant',
      description: 'Send message or call tenant',
      icon: PhoneIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      category: 'communication',
      priority: 'medium',
      action: () => {
        // Open contact modal or navigate to communications
        console.log('Contact tenant action')
      },
      contextual: true
    },
    {
      id: 'export-data',
      label: 'Export Data',
      description: 'Export dashboard data to Excel or PDF',
      icon: ArrowDownTrayIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      category: 'report',
      priority: 'low',
      action: () => {
        // Trigger export functionality
        console.log('Export data action')
      }
    },
    {
      id: 'print-report',
      label: 'Print Report',
      description: 'Print current dashboard view',
      icon: PrinterIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100',
      category: 'report',
      priority: 'low',
      action: () => {
        window.print()
      },
      shortcut: 'Ctrl+P'
    },
    {
      id: 'dashboard-settings',
      label: 'Dashboard Settings',
      description: 'Customize dashboard layout and preferences',
      icon: Cog6ToothIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100',
      category: 'system',
      priority: 'low',
      action: () => {
        // Open settings modal
        console.log('Dashboard settings action')
      }
    }
  ], [])

  // Filter actions based on category and context
  const filteredActions = useMemo(() => {
    let actions = quickActions

    // Filter by category
    if (selectedCategory !== 'all') {
      actions = actions.filter(action => action.category === selectedCategory)
    }

    // Add contextual actions based on current state
    if (state.selectedProperty || state.selectedTenant) {
      actions = actions.filter(action => !action.contextual || 
        (action.contextual && (state.selectedProperty || state.selectedTenant))
      )
    }

    // Limit number of actions
    return actions.slice(0, maxActions)
  }, [quickActions, selectedCategory, state.selectedProperty, state.selectedTenant, maxActions])

  // Handle action click
  const handleActionClick = useCallback(async (action: QuickAction) => {
    if (action.disabled) return

    try {
      await action.action()
      
      // Add to recent actions
      const recentAction: RecentAction = {
        id: `recent-${action.id}-${Date.now()}`,
        label: action.label,
        timestamp: new Date(),
        category: action.category,
        icon: action.icon
      }
      
      setRecentActions(prev => [recentAction, ...prev.slice(0, 4)]) // Keep last 5
      
      // Add to context actions
      contextActions.addRecentAction({
        id: recentAction.id,
        type: action.category,
        label: action.label,
        icon: action.id,
        timestamp: new Date(),
        data: { actionId: action.id }
      })
    } catch (error) {
      console.error('Action failed:', error)
    }
  }, [contextActions])

  // Handle recent action click
  const handleRecentActionClick = useCallback((recentAction: RecentAction) => {
    const originalAction = quickActions.find(a => a.id === recentAction.data?.actionId)
    if (originalAction) {
      handleActionClick(originalAction)
    }
  }, [quickActions, handleActionClick])

  // Get grid classes based on layout
  const getGridClasses = () => {
    switch (layout) {
      case 'list':
        return 'space-y-2'
      case 'compact':
        return 'grid grid-cols-2 gap-2'
      default:
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
    }
  }

  return (
    <div className={`quick-actions-panel ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        {showCategories && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {Object.entries(ACTION_CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>{category.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Actions Grid */}
      <div className={getGridClasses()}>
        {filteredActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            layout={layout}
            onClick={handleActionClick}
          />
        ))}
      </div>

      {/* Recent Actions */}
      {showRecent && recentActions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Actions</h4>
          <RecentActions
            actions={recentActions}
            onActionClick={handleRecentActionClick}
          />
        </div>
      )}

      {/* Empty state */}
      {filteredActions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <PlusIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No actions available for the selected category</p>
        </div>
      )}
    </div>
  )
}

export default QuickActionsPanel
