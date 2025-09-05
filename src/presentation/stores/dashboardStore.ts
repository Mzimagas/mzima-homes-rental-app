/**
 * Dashboard Store
 * Centralized state management for dashboard using Zustand
 * Following propertyStore.ts patterns with normalized state, caching, and real-time updates
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { 
  NormalizedState, 
  BaseStoreState, 
  FilterState, 
  PaginationState, 
  SelectionState,
  CacheState,
  AsyncState
} from './types'
import {
  normalizeEntities,
  denormalizeEntities,
  addEntityToNormalized,
  updateEntityInNormalized,
  removeEntityFromNormalized,
  upsertEntityInNormalized,
  upsertManyEntitiesInNormalized,
  createPagination,
  updatePagination,
  createCache,
  isCacheValid,
  debounce
} from './utils'

// Dashboard entity types
export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  size: WidgetSize
  position: WidgetPosition
  config: WidgetConfig
  dataSource: string
  refreshInterval: number
  isVisible: boolean
  permissions: WidgetPermissions
  createdAt: string
  updatedAt: string
}

export interface DashboardMetric {
  id: string
  key: string
  value: number | string
  previousValue?: number | string
  trend: 'up' | 'down' | 'stable'
  trendPercentage?: number
  unit: string
  format: MetricFormat
  thresholds: MetricThresholds
  lastUpdated: string
}

export interface DashboardAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  source: string
  isRead: boolean
  isResolved: boolean
  createdAt: string
  resolvedAt?: string
}

export interface DashboardLayout {
  id: string
  name: string
  isDefault: boolean
  widgetPositions: WidgetPosition[]
  createdAt: string
  updatedAt: string
}

// Supporting types
export type WidgetType = 'metric' | 'chart' | 'table' | 'quickActions' | 'notifications' | 'custom'
export type WidgetSize = 'small' | 'medium' | 'large' | 'full'
export type AlertType = 'payment' | 'maintenance' | 'lease' | 'system' | 'financial'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type MetricFormat = 'currency' | 'percentage' | 'number' | 'text'

export interface WidgetPosition {
  widgetId: string
  x: number
  y: number
  width: number
  height: number
}

export interface WidgetConfig {
  refreshInterval?: number
  chartType?: string
  dataFilters?: Record<string, any>
  displayOptions?: Record<string, any>
}

export interface WidgetPermissions {
  canEdit: boolean
  canDelete: boolean
  canMove: boolean
  canResize: boolean
}

export interface MetricThresholds {
  warning?: number
  critical?: number
  target?: number
}

// Dashboard-specific filter state
export interface DashboardFilterState extends Omit<FilterState, 'propertyTypes' | 'paymentMethods'> {
  widgetTypes: WidgetType[]
  alertSeverities: AlertSeverity[]
  metricCategories: string[]
  timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  properties: string[]
  tenants: string[]
}

// Real-time state
export interface RealTimeState {
  connected: boolean
  lastSyncTimestamp: Date | null
  pendingUpdates: PendingUpdate[]
  subscriptions: string[]
}

export interface PendingUpdate {
  id: string
  type: 'metric' | 'alert' | 'widget'
  entityId: string
  data: any
  timestamp: Date
}

// Customization state
export interface CustomizationState {
  isCustomizing: boolean
  draggedWidget: string | null
  layoutPreferences: LayoutPreferences
  widgetPreferences: Record<string, WidgetConfig>
}

export interface LayoutPreferences {
  activeLayout: string
  gridSize: number
  snapToGrid: boolean
  showGrid: boolean
  compactMode: boolean
}

// Dashboard store state
export interface DashboardStoreState extends BaseStoreState {
  // Normalized entities
  entities: {
    widgets: NormalizedState<DashboardWidget>
    metrics: NormalizedState<DashboardMetric>
    alerts: NormalizedState<DashboardAlert>
    layouts: NormalizedState<DashboardLayout>
  }
  
  // UI state
  filters: DashboardFilterState
  pagination: PaginationState
  selection: SelectionState<DashboardWidget>
  
  // Dashboard-specific state
  realTime: RealTimeState
  customization: CustomizationState
  
  // Cache and sync
  cache: CacheState
  syncState: AsyncState
  
  // Computed state
  visibleWidgets: string[]
  activeMetrics: string[]
  criticalAlerts: string[]
  filteredWidgetIds: string[]
}

// Dashboard store actions
export interface DashboardStoreActions {
  // Widget management
  addWidget: (widget: DashboardWidget) => void
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void
  removeWidget: (id: string) => void
  setWidgets: (widgets: DashboardWidget[]) => void
  upsertWidget: (widget: DashboardWidget) => void
  reorderWidgets: (widgetIds: string[]) => void
  
  // Metric management
  addMetric: (metric: DashboardMetric) => void
  updateMetric: (id: string, updates: Partial<DashboardMetric>) => void
  setMetrics: (metrics: DashboardMetric[]) => void
  upsertMetrics: (metrics: DashboardMetric[]) => void
  
  // Alert management
  addAlert: (alert: DashboardAlert) => void
  updateAlert: (id: string, updates: Partial<DashboardAlert>) => void
  markAlertAsRead: (id: string) => void
  markAlertAsResolved: (id: string) => void
  setAlerts: (alerts: DashboardAlert[]) => void
  clearReadAlerts: () => void
  
  // Layout management
  setActiveLayout: (layoutId: string) => void
  saveLayout: (layout: DashboardLayout) => void
  deleteLayout: (layoutId: string) => void
  resetLayout: () => void
  
  // Real-time operations
  connectRealTime: () => void
  disconnectRealTime: () => void
  handleRealTimeUpdate: (update: PendingUpdate) => void
  addSubscription: (subscription: string) => void
  removeSubscription: (subscription: string) => void
  
  // Customization operations
  startCustomizing: () => void
  stopCustomizing: () => void
  setDraggedWidget: (widgetId: string | null) => void
  updateLayoutPreferences: (preferences: Partial<LayoutPreferences>) => void
  updateWidgetPreferences: (widgetId: string, preferences: WidgetConfig) => void
  
  // Filter operations
  setFilter: (key: keyof DashboardFilterState, value: any) => void
  clearFilters: () => void
  setTimeRange: (timeRange: DashboardFilterState['timeRange']) => void
  
  // Data operations
  refreshMetrics: (metricIds?: string[]) => Promise<void>
  refreshAllData: () => Promise<void>
  
  // Cache operations
  invalidateCache: () => void
  refreshCache: () => void
  
  // Computed getters
  getWidget: (id: string) => DashboardWidget | undefined
  getMetric: (id: string) => DashboardMetric | undefined
  getAlert: (id: string) => DashboardAlert | undefined
  getVisibleWidgets: () => DashboardWidget[]
  getCriticalAlerts: () => DashboardAlert[]
  getActiveMetrics: () => DashboardMetric[]
  getLayoutPreferences: () => LayoutPreferences
}

// Initial state
const initialState: DashboardStoreState = {
  // Base state
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Normalized entities
  entities: {
    widgets: { byId: {}, allIds: [] },
    metrics: { byId: {}, allIds: [] },
    alerts: { byId: {}, allIds: [] },
    layouts: { byId: {}, allIds: [] }
  },
  
  // UI state
  filters: {
    searchTerm: '',
    dateRange: { start: null, end: null },
    status: [],
    widgetTypes: [],
    alertSeverities: [],
    metricCategories: [],
    timeRange: 'month',
    properties: [],
    tenants: [],
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  pagination: createPagination(1, 20, 0),
  selection: {
    selectedId: null,
    selectedItem: null,
    multiSelection: []
  },
  
  // Dashboard-specific state
  realTime: {
    connected: false,
    lastSyncTimestamp: null,
    pendingUpdates: [],
    subscriptions: []
  },
  customization: {
    isCustomizing: false,
    draggedWidget: null,
    layoutPreferences: {
      activeLayout: 'default',
      gridSize: 12,
      snapToGrid: true,
      showGrid: false,
      compactMode: false
    },
    widgetPreferences: {}
  },
  
  // Cache and sync
  cache: createCache(5), // 5 minutes TTL
  syncState: 'idle',
  
  // Computed state
  visibleWidgets: [],
  activeMetrics: [],
  criticalAlerts: [],
  filteredWidgetIds: []
}

// Debounced filter update
const debouncedFilterUpdate = debounce((get: any, set: any) => {
  const state = get()
  const allWidgets = denormalizeEntities(state.entities.widgets)

  // Apply filters to widgets
  const filteredWidgets = allWidgets.filter((widget: DashboardWidget) => {
    // Search term filter
    if (state.filters.searchTerm) {
      const searchLower = state.filters.searchTerm.toLowerCase()
      if (!widget.title.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Widget type filter
    if (state.filters.widgetTypes.length > 0) {
      if (!state.filters.widgetTypes.includes(widget.type)) {
        return false
      }
    }

    // Visibility filter
    if (!widget.isVisible) {
      return false
    }

    return true
  })

  const filteredWidgetIds = filteredWidgets.map(w => w.id)
  const visibleWidgets = filteredWidgets.filter(w => w.isVisible).map(w => w.id)

  // Get critical alerts
  const allAlerts = denormalizeEntities(state.entities.alerts)
  const criticalAlerts = allAlerts
    .filter((alert: DashboardAlert) =>
      alert.severity === 'critical' && !alert.isResolved
    )
    .map(a => a.id)

  // Get active metrics
  const allMetrics = denormalizeEntities(state.entities.metrics)
  const activeMetrics = allMetrics.map(m => m.id)

  set((draft: any) => {
    draft.filteredWidgetIds = filteredWidgetIds
    draft.visibleWidgets = visibleWidgets
    draft.criticalAlerts = criticalAlerts
    draft.activeMetrics = activeMetrics
  })
}, 300)

// Create the store
export const useDashboardStore = create<DashboardStoreState & DashboardStoreActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Widget management
        addWidget: (widget) => set((draft) => {
          draft.entities.widgets = addEntityToNormalized(draft.entities.widgets, widget)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        updateWidget: (id, updates) => set((draft) => {
          draft.entities.widgets = updateEntityInNormalized(draft.entities.widgets, id, updates)
          draft.lastUpdated = new Date()

          // Update selection if needed
          if (draft.selection.selectedId === id && draft.selection.selectedItem) {
            draft.selection.selectedItem = { ...draft.selection.selectedItem, ...updates }
          }

          debouncedFilterUpdate(get, set)
        }),

        removeWidget: (id) => set((draft) => {
          draft.entities.widgets = removeEntityFromNormalized(draft.entities.widgets, id)
          draft.lastUpdated = new Date()

          // Clear selection if removed
          if (draft.selection.selectedId === id) {
            draft.selection.selectedId = null
            draft.selection.selectedItem = null
          }

          // Remove from multi-selection
          draft.selection.multiSelection = draft.selection.multiSelection.filter(selectedId => selectedId !== id)

          debouncedFilterUpdate(get, set)
        }),

        setWidgets: (widgets) => set((draft) => {
          draft.entities.widgets = normalizeEntities(widgets)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        upsertWidget: (widget) => set((draft) => {
          draft.entities.widgets = upsertEntityInNormalized(draft.entities.widgets, widget)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        reorderWidgets: (widgetIds) => set((draft) => {
          draft.entities.widgets.allIds = widgetIds
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        // Metric management
        addMetric: (metric) => set((draft) => {
          draft.entities.metrics = addEntityToNormalized(draft.entities.metrics, metric)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        updateMetric: (id, updates) => set((draft) => {
          draft.entities.metrics = updateEntityInNormalized(draft.entities.metrics, id, updates)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        setMetrics: (metrics) => set((draft) => {
          draft.entities.metrics = normalizeEntities(metrics)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        upsertMetrics: (metrics) => set((draft) => {
          draft.entities.metrics = upsertManyEntitiesInNormalized(draft.entities.metrics, metrics)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        // Alert management
        addAlert: (alert) => set((draft) => {
          draft.entities.alerts = addEntityToNormalized(draft.entities.alerts, alert)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        updateAlert: (id, updates) => set((draft) => {
          draft.entities.alerts = updateEntityInNormalized(draft.entities.alerts, id, updates)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        markAlertAsRead: (id) => set((draft) => {
          draft.entities.alerts = updateEntityInNormalized(draft.entities.alerts, id, {
            isRead: true
          })
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        markAlertAsResolved: (id) => set((draft) => {
          draft.entities.alerts = updateEntityInNormalized(draft.entities.alerts, id, {
            isResolved: true,
            resolvedAt: new Date().toISOString()
          })
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        setAlerts: (alerts) => set((draft) => {
          draft.entities.alerts = normalizeEntities(alerts)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        clearReadAlerts: () => set((draft) => {
          const allAlerts = denormalizeEntities(draft.entities.alerts)
          const unreadAlerts = allAlerts.filter((alert: DashboardAlert) => !alert.isRead)
          draft.entities.alerts = normalizeEntities(unreadAlerts)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        // Layout management
        setActiveLayout: (layoutId) => set((draft) => {
          draft.customization.layoutPreferences.activeLayout = layoutId
          draft.lastUpdated = new Date()
        }),

        saveLayout: (layout) => set((draft) => {
          draft.entities.layouts = upsertEntityInNormalized(draft.entities.layouts, layout)
          draft.lastUpdated = new Date()
        }),

        deleteLayout: (layoutId) => set((draft) => {
          draft.entities.layouts = removeEntityFromNormalized(draft.entities.layouts, layoutId)

          // Reset to default if deleted layout was active
          if (draft.customization.layoutPreferences.activeLayout === layoutId) {
            draft.customization.layoutPreferences.activeLayout = 'default'
          }

          draft.lastUpdated = new Date()
        }),

        resetLayout: () => set((draft) => {
          draft.customization.layoutPreferences.activeLayout = 'default'
          draft.customization.widgetPreferences = {}
          draft.lastUpdated = new Date()
        }),

        // Real-time operations
        connectRealTime: () => set((draft) => {
          draft.realTime.connected = true
          draft.realTime.lastSyncTimestamp = new Date()
        }),

        disconnectRealTime: () => set((draft) => {
          draft.realTime.connected = false
          draft.realTime.pendingUpdates = []
          draft.realTime.subscriptions = []
        }),

        handleRealTimeUpdate: (update) => set((draft) => {
          // Add to pending updates
          draft.realTime.pendingUpdates.push(update)

          // Apply update based on type
          switch (update.type) {
            case 'metric':
              if (draft.entities.metrics.byId[update.entityId]) {
                draft.entities.metrics = updateEntityInNormalized(
                  draft.entities.metrics,
                  update.entityId,
                  update.data
                )
              }
              break
            case 'alert':
              draft.entities.alerts = upsertEntityInNormalized(draft.entities.alerts, {
                id: update.entityId,
                ...update.data
              })
              break
            case 'widget':
              if (draft.entities.widgets.byId[update.entityId]) {
                draft.entities.widgets = updateEntityInNormalized(
                  draft.entities.widgets,
                  update.entityId,
                  update.data
                )
              }
              break
          }

          draft.realTime.lastSyncTimestamp = new Date()
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),

        addSubscription: (subscription) => set((draft) => {
          if (!draft.realTime.subscriptions.includes(subscription)) {
            draft.realTime.subscriptions.push(subscription)
          }
        }),

        removeSubscription: (subscription) => set((draft) => {
          draft.realTime.subscriptions = draft.realTime.subscriptions.filter(s => s !== subscription)
        }),

        // Customization operations
        startCustomizing: () => set((draft) => {
          draft.customization.isCustomizing = true
        }),

        stopCustomizing: () => set((draft) => {
          draft.customization.isCustomizing = false
          draft.customization.draggedWidget = null
        }),

        setDraggedWidget: (widgetId) => set((draft) => {
          draft.customization.draggedWidget = widgetId
        }),

        updateLayoutPreferences: (preferences) => set((draft) => {
          draft.customization.layoutPreferences = {
            ...draft.customization.layoutPreferences,
            ...preferences
          }
          draft.lastUpdated = new Date()
        }),

        updateWidgetPreferences: (widgetId, preferences) => set((draft) => {
          draft.customization.widgetPreferences[widgetId] = {
            ...draft.customization.widgetPreferences[widgetId],
            ...preferences
          }
          draft.lastUpdated = new Date()
        }),

        // Filter operations
        setFilter: (key, value) => set((draft) => {
          (draft.filters as any)[key] = value
          debouncedFilterUpdate(get, set)
        }),

        clearFilters: () => set((draft) => {
          draft.filters = {
            ...initialState.filters,
            timeRange: draft.filters.timeRange // Preserve time range
          }
          debouncedFilterUpdate(get, set)
        }),

        setTimeRange: (timeRange) => set((draft) => {
          draft.filters.timeRange = timeRange
          debouncedFilterUpdate(get, set)
        }),

        // Data operations
        refreshMetrics: async (metricIds) => {
          set((draft) => {
            draft.loading = true
            draft.error = null
          })

          try {
            // This will be implemented when we create the service layer
            // const metrics = await DashboardService.refreshMetrics(metricIds)
            // set((draft) => {
            //   draft.entities.metrics = upsertManyEntitiesInNormalized(draft.entities.metrics, metrics)
            //   draft.loading = false
            //   draft.lastUpdated = new Date()
            // })

            // Placeholder for now
            set((draft) => {
              draft.loading = false
              draft.lastUpdated = new Date()
            })
          } catch (error) {
            set((draft) => {
              draft.loading = false
              draft.error = error instanceof Error ? error.message : 'Failed to refresh metrics'
            })
          }
        },

        refreshAllData: async () => {
          set((draft) => {
            draft.loading = true
            draft.error = null
          })

          try {
            // This will be implemented when we create the service layer
            // const data = await DashboardService.loadDashboardData()
            // set((draft) => {
            //   draft.entities.widgets = normalizeEntities(data.widgets)
            //   draft.entities.metrics = normalizeEntities(data.metrics)
            //   draft.entities.alerts = normalizeEntities(data.alerts)
            //   draft.loading = false
            //   draft.lastUpdated = new Date()
            // })

            // Placeholder for now
            set((draft) => {
              draft.loading = false
              draft.lastUpdated = new Date()
            })
          } catch (error) {
            set((draft) => {
              draft.loading = false
              draft.error = error instanceof Error ? error.message : 'Failed to refresh dashboard data'
            })
          }
        },

        // Cache operations
        invalidateCache: () => set((draft) => {
          draft.cache.isValid = false
        }),

        refreshCache: () => set((draft) => {
          draft.cache = createCache(5)
        }),

        // Computed getters
        getWidget: (id) => {
          const state = get()
          return state.entities.widgets.byId[id]
        },

        getMetric: (id) => {
          const state = get()
          return state.entities.metrics.byId[id]
        },

        getAlert: (id) => {
          const state = get()
          return state.entities.alerts.byId[id]
        },

        getVisibleWidgets: () => {
          const state = get()
          return state.visibleWidgets.map(id => state.entities.widgets.byId[id]).filter(Boolean)
        },

        getCriticalAlerts: () => {
          const state = get()
          return state.criticalAlerts.map(id => state.entities.alerts.byId[id]).filter(Boolean)
        },

        getActiveMetrics: () => {
          const state = get()
          return state.activeMetrics.map(id => state.entities.metrics.byId[id]).filter(Boolean)
        },

        getLayoutPreferences: () => {
          const state = get()
          return state.customization.layoutPreferences
        }
      })),
      {
        name: 'dashboard-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          entities: {
            widgets: state.entities.widgets,
            layouts: state.entities.layouts
          },
          customization: {
            layoutPreferences: state.customization.layoutPreferences,
            widgetPreferences: state.customization.widgetPreferences
          },
          filters: {
            timeRange: state.filters.timeRange
          }
        })
      }
    ),
    {
      name: 'dashboard-store'
    }
  )
)

// Selector hooks for optimized component subscriptions
export const useDashboardWidgets = () => useDashboardStore(state => state.getVisibleWidgets())
export const useDashboardMetrics = () => useDashboardStore(state => state.getActiveMetrics())
export const useDashboardAlerts = () => useDashboardStore(state => state.getCriticalAlerts())
export const useDashboardLoading = () => useDashboardStore(state => state.loading)
export const useDashboardError = () => useDashboardStore(state => state.error)
export const useDashboardRealTime = () => useDashboardStore(state => state.realTime)
export const useDashboardCustomization = () => useDashboardStore(state => state.customization)

// Action hooks for cleaner component usage
export const useDashboardActions = () => {
  const store = useDashboardStore()
  return {
    addWidget: store.addWidget,
    updateWidget: store.updateWidget,
    removeWidget: store.removeWidget,
    updateMetric: store.updateMetric,
    markAlertAsRead: store.markAlertAsRead,
    markAlertAsResolved: store.markAlertAsResolved,
    startCustomizing: store.startCustomizing,
    stopCustomizing: store.stopCustomizing,
    setFilter: store.setFilter,
    setTimeRange: store.setTimeRange,
    refreshMetrics: store.refreshMetrics,
    refreshAllData: store.refreshAllData
  }
}
