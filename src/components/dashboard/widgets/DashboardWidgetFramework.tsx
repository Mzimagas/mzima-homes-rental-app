/**
 * Dashboard Widget Framework
 * Comprehensive widget system with enhanced BaseWidget, widget registry, and configuration management
 * Provides loading states, error handling, responsive behavior, and widget lifecycle management
 */

'use client'

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BaseWidget, BaseWidgetProps, WidgetSkeleton } from './BaseWidget'
import { DashboardWidget, WidgetSize, WidgetType } from '../../../presentation/stores/dashboardStore'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'

// Enhanced widget configuration
export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  description?: string
  size: WidgetSize
  refreshInterval?: number
  autoRefresh?: boolean
  dependencies?: string[]
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canMove: boolean
    canResize: boolean
    canRefresh: boolean
  }
  settings?: Record<string, any>
  metadata?: Record<string, any>
}

// Widget lifecycle hooks
export interface WidgetLifecycleHooks {
  onMount?: (widgetId: string) => void
  onUnmount?: (widgetId: string) => void
  onRefresh?: (widgetId: string) => Promise<void>
  onError?: (widgetId: string, error: Error) => void
  onResize?: (widgetId: string, newSize: WidgetSize) => void
  onMove?: (widgetId: string, newPosition: { x: number; y: number }) => void
}

// Widget state management
export interface WidgetState {
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refreshCount: number
  isVisible: boolean
  isActive: boolean
}

// Enhanced widget props
export interface EnhancedWidgetProps extends Omit<BaseWidgetProps, 'widget'> {
  config: WidgetConfig
  state: WidgetState
  hooks?: WidgetLifecycleHooks
  children?: React.ReactNode
}

// Widget error fallback component
interface WidgetErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  widgetConfig: WidgetConfig
}

const WidgetErrorFallback: React.FC<WidgetErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  widgetConfig
}) => (
  <div className="widget-error-fallback p-6 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center space-x-3 mb-4">
      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
        <span className="text-red-600 text-sm">⚠️</span>
      </div>
      <div>
        <h3 className="text-red-900 font-medium">Widget Error</h3>
        <p className="text-red-700 text-sm">{widgetConfig.title}</p>
      </div>
    </div>
    
    <div className="bg-red-100 rounded p-3 mb-4">
      <p className="text-red-800 text-sm font-mono">{error.message}</p>
    </div>
    
    <div className="flex space-x-2">
      <button
        onClick={resetErrorBoundary}
        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
      <button
        onClick={() => console.error('Widget Error:', error)}
        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
      >
        Report Issue
      </button>
    </div>
  </div>
)

/**
 * Enhanced Widget Container with lifecycle management
 */
export const EnhancedWidget: React.FC<EnhancedWidgetProps> = ({
  config,
  state,
  hooks,
  children,
  className = '',
  ...baseProps
}) => {
  const [internalState, setInternalState] = useState<WidgetState>(state)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(false)

  // Update internal state when prop state changes
  useEffect(() => {
    setInternalState(state)
  }, [state])

  // Mount/unmount lifecycle
  useEffect(() => {
    mountedRef.current = true
    hooks?.onMount?.(config.id)

    return () => {
      mountedRef.current = false
      hooks?.onUnmount?.(config.id)
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [config.id, hooks])

  // Auto-refresh setup
  useEffect(() => {
    if (!config.autoRefresh || !config.refreshInterval || !mountedRef.current) {
      return
    }

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(async () => {
        if (mountedRef.current && hooks?.onRefresh) {
          try {
            await hooks.onRefresh(config.id)
            setInternalState(prev => ({
              ...prev,
              refreshCount: prev.refreshCount + 1,
              lastUpdated: new Date()
            }))
          } catch (error) {
            hooks?.onError?.(config.id, error as Error)
          }
        }
        scheduleRefresh()
      }, config.refreshInterval)
    }

    scheduleRefresh()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [config.autoRefresh, config.refreshInterval, config.id, hooks])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!hooks?.onRefresh) return

    setInternalState(prev => ({ ...prev, loading: true, error: null }))

    try {
      await hooks.onRefresh(config.id)
      setInternalState(prev => ({
        ...prev,
        loading: false,
        refreshCount: prev.refreshCount + 1,
        lastUpdated: new Date()
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Refresh failed'
      setInternalState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      hooks?.onError?.(config.id, error as Error)
    }
  }, [config.id, hooks])

  // Handle resize
  const handleResize = useCallback((newSize: WidgetSize) => {
    hooks?.onResize?.(config.id, newSize)
  }, [config.id, hooks])

  // Handle move
  const handleMove = useCallback((newPosition: { x: number; y: number }) => {
    hooks?.onMove?.(config.id, newPosition)
  }, [config.id, hooks])

  // Convert config to widget format for BaseWidget
  const widgetData: DashboardWidget = {
    id: config.id,
    type: config.type,
    title: config.title,
    size: config.size,
    position: { widgetId: config.id, x: 0, y: 0, width: 1, height: 1 },
    config: config.settings || {},
    dataSource: config.metadata?.dataSource || 'default',
    refreshInterval: config.refreshInterval || 300000,
    isVisible: internalState.isVisible,
    permissions: config.permissions,
    createdAt: new Date().toISOString(),
    updatedAt: internalState.lastUpdated?.toISOString() || new Date().toISOString()
  }

  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <WidgetErrorFallback {...props} widgetConfig={config} />
      )}
      onError={(error) => hooks?.onError?.(config.id, error)}
    >
      <BaseWidget
        widget={widgetData}
        loading={internalState.loading}
        error={internalState.error}
        onRefresh={config.permissions.canRefresh ? handleRefresh : undefined}
        onResize={config.permissions.canResize ? handleResize : undefined}
        onMove={config.permissions.canMove ? handleMove : undefined}
        className={`enhanced-widget ${className}`}
        {...baseProps}
      >
        {children}
      </BaseWidget>
    </ErrorBoundary>
  )
}

/**
 * Widget Registry for managing widget types and configurations
 */
class WidgetRegistry {
  private static instance: WidgetRegistry
  private widgets = new Map<WidgetType, {
    component: React.ComponentType<any>
    defaultConfig: Partial<WidgetConfig>
    dependencies?: string[]
  }>()

  static getInstance(): WidgetRegistry {
    if (!WidgetRegistry.instance) {
      WidgetRegistry.instance = new WidgetRegistry()
    }
    return WidgetRegistry.instance
  }

  register(
    type: WidgetType,
    component: React.ComponentType<any>,
    defaultConfig: Partial<WidgetConfig> = {},
    dependencies: string[] = []
  ) {
    this.widgets.set(type, {
      component,
      defaultConfig,
      dependencies
    })
  }

  unregister(type: WidgetType) {
    this.widgets.delete(type)
  }

  get(type: WidgetType) {
    return this.widgets.get(type)
  }

  getAll() {
    return Array.from(this.widgets.entries())
  }

  createDefaultConfig(type: WidgetType, overrides: Partial<WidgetConfig> = {}): WidgetConfig {
    const registration = this.widgets.get(type)
    if (!registration) {
      throw new Error(`Widget type ${type} not registered`)
    }

    return {
      id: crypto.randomUUID(),
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
      size: 'medium',
      refreshInterval: 300000,
      autoRefresh: true,
      dependencies: registration.dependencies || [],
      permissions: {
        canEdit: true,
        canDelete: true,
        canMove: true,
        canResize: true,
        canRefresh: true
      },
      ...registration.defaultConfig,
      ...overrides
    }
  }
}

// Export singleton instance
export const widgetRegistry = WidgetRegistry.getInstance()

/**
 * Widget Manager Hook for managing widget lifecycle
 */
export function useWidgetManager(widgetId: string) {
  const store = useDashboardStore()
  const [widgetState, setWidgetState] = useState<WidgetState>({
    loading: false,
    error: null,
    lastUpdated: null,
    refreshCount: 0,
    isVisible: true,
    isActive: true
  })

  // Get widget from store
  const widget = store.getWidget(widgetId)

  // Lifecycle hooks
  const hooks: WidgetLifecycleHooks = {
    onMount: useCallback((id: string) => {
      console.log(`Widget ${id} mounted`)
      setWidgetState(prev => ({ ...prev, isActive: true }))
    }, []),

    onUnmount: useCallback((id: string) => {
      console.log(`Widget ${id} unmounted`)
      setWidgetState(prev => ({ ...prev, isActive: false }))
    }, []),

    onRefresh: useCallback(async (id: string) => {
      console.log(`Refreshing widget ${id}`)
      // Trigger refresh in store
      await store.refreshMetrics([id])
    }, [store]),

    onError: useCallback((id: string, error: Error) => {
      console.error(`Widget ${id} error:`, error)
      setWidgetState(prev => ({ ...prev, error: error.message }))
    }, []),

    onResize: useCallback((id: string, newSize: WidgetSize) => {
      store.updateWidget(id, { size: newSize })
    }, [store]),

    onMove: useCallback((id: string, newPosition: { x: number; y: number }) => {
      store.updateWidget(id, {
        position: {
          ...widget?.position || { widgetId: id, width: 1, height: 1 },
          x: newPosition.x,
          y: newPosition.y
        }
      })
    }, [store, widget])
  }

  return {
    widgetState,
    setWidgetState,
    hooks,
    widget
  }
}

/**
 * Widget Factory with enhanced error handling and lazy loading
 */
export function createWidget(
  config: WidgetConfig,
  props: Partial<EnhancedWidgetProps> = {}
): React.ReactElement {
  const registration = widgetRegistry.get(config.type)
  
  if (!registration) {
    return (
      <WidgetSkeleton size={config.size} className="widget-not-found">
        <div className="p-4 text-center text-gray-500">
          <p>Widget type "{config.type}" not found</p>
        </div>
      </WidgetSkeleton>
    )
  }

  const Component = registration.component

  return (
    <Suspense fallback={<WidgetSkeleton size={config.size} />}>
      <EnhancedWidget
        config={config}
        state={{
          loading: false,
          error: null,
          lastUpdated: null,
          refreshCount: 0,
          isVisible: true,
          isActive: true
        }}
        {...props}
      >
        <Component {...props} />
      </EnhancedWidget>
    </Suspense>
  )
}

export default EnhancedWidget
