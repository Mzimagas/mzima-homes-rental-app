# Dashboard Technical Architecture

## Executive Summary

This document defines the technical architecture for the new dashboard system, establishing component structure, state management approach, API integration patterns, and caching strategies based on successful patterns from the properties module implementation.

## Architecture Overview

### 1. **System Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Frontend                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Dashboard Pages │  │ Widget Library  │  │ Navigation  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Dashboard Store │  │ Real-time Sync  │  │ Cache Layer │  │
│  │   (Zustand)     │  │   (WebSocket)   │  │ (Multi-tier)│  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ API Integration │  │ Error Handling  │  │ Performance │  │
│  │   (Batch APIs)  │  │   (Boundaries)  │  │ (Monitoring)│  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Dashboard APIs  │  │ Batch Endpoints │  │ WebSocket   │  │
│  │ /api/dashboard  │  │ /api/batch/*    │  │ Real-time   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Authentication  │  │ Data Validation │  │ Rate Limiting│ │
│  │   (Supabase)    │  │   (Zod/Joi)     │  │ (Redis)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Supabase DB     │  │ Redis Cache     │  │ File Storage│  │
│  │ (PostgreSQL)    │  │ (Session/Cache) │  │ (Reports)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## State Management Architecture

### 1. **Dashboard Store Structure (Following propertyStore.ts Patterns)**

```typescript
// Dashboard Store Interface
export interface DashboardStoreState extends BaseStoreState {
  // Normalized entities
  entities: {
    widgets: NormalizedState<DashboardWidget>
    metrics: NormalizedState<DashboardMetric>
    alerts: NormalizedState<DashboardAlert>
    layouts: NormalizedState<DashboardLayout>
  }

  // UI state
  activeLayout: string
  customization: {
    isCustomizing: boolean
    draggedWidget: string | null
    layoutPreferences: LayoutPreferences
  }
  filters: DashboardFilterState
  timeRange: TimeRangeState

  // Real-time state
  realTimeConnected: boolean
  lastSyncTimestamp: Date | null
  pendingUpdates: PendingUpdate[]

  // Cache and performance
  cache: CacheState
  performance: PerformanceMetrics

  // Computed state
  visibleWidgets: string[]
  activeMetrics: string[]
  criticalAlerts: string[]
}
```

### 2. **Store Implementation Pattern**

```typescript
// Dashboard Store Actions
export interface DashboardStoreActions {
  // Widget management
  addWidget: (widget: DashboardWidget) => void
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void
  removeWidget: (id: string) => void
  reorderWidgets: (widgetIds: string[]) => void

  // Layout management
  setActiveLayout: (layoutId: string) => void
  saveLayout: (layout: DashboardLayout) => void
  resetLayout: () => void

  // Data operations
  refreshMetrics: (metricIds?: string[]) => Promise<void>
  refreshAllData: () => Promise<void>

  // Real-time operations
  connectRealTime: () => void
  disconnectRealTime: () => void
  handleRealTimeUpdate: (update: RealTimeUpdate) => void

  // Cache operations
  invalidateCache: (tags?: string[]) => void
  preloadData: (keys: string[]) => Promise<void>
}
```

### 3. **Normalized State Structure**

```typescript
// Widget Entity Structure
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
  createdAt: Date
  updatedAt: Date
}

// Metric Entity Structure
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
  lastUpdated: Date
}

// Alert Entity Structure
export interface DashboardAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  source: string
  isRead: boolean
  isResolved: boolean
  createdAt: Date
  resolvedAt?: Date
}
```

## Component Architecture

### 1. **Component Hierarchy**

```
DashboardContainer
├── DashboardHeader
│   ├── DashboardTitle
│   ├── GlobalSearch
│   ├── NotificationCenter
│   └── UserMenu
├── DashboardNavigation
│   ├── TabNavigation
│   ├── FilterPanel
│   └── ViewControls
├── DashboardContent
│   ├── WidgetGrid
│   │   ├── MetricWidget
│   │   ├── ChartWidget
│   │   ├── TableWidget
│   │   └── CustomWidget
│   ├── QuickActionsPanel
│   └── RecentActivityFeed
└── DashboardFooter
    ├── PerformanceIndicator
    ├── LastUpdated
    └── ExportActions
```

### 2. **Base Widget Component Pattern**

```typescript
// Base Widget Component
export interface BaseWidgetProps {
  id: string
  title: string
  size: WidgetSize
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onEdit?: () => void
  onRemove?: () => void
  className?: string
}

export const BaseWidget: React.FC<BaseWidgetProps> = ({
  id,
  title,
  size,
  loading = false,
  error = null,
  onRefresh,
  onEdit,
  onRemove,
  className,
  children
}) => {
  return (
    <div
      className={cn(
        'dashboard-widget',
        `widget-size-${size}`,
        className
      )}
      data-widget-id={id}
    >
      <WidgetHeader
        title={title}
        loading={loading}
        onRefresh={onRefresh}
        onEdit={onEdit}
        onRemove={onRemove}
      />
      <WidgetContent error={error}>
        {children}
      </WidgetContent>
    </div>
  )
}
```

### 3. **Widget Factory Pattern**

```typescript
// Widget Factory
export class WidgetFactory {
  private static widgets = new Map<WidgetType, React.ComponentType<any>>()

  static register(type: WidgetType, component: React.ComponentType<any>) {
    this.widgets.set(type, component)
  }

  static create(widget: DashboardWidget): React.ReactElement | null {
    const Component = this.widgets.get(widget.type)
    if (!Component) {
      console.warn(`Widget type ${widget.type} not registered`)
      return null
    }

    return <Component key={widget.id} widget={widget} />
  }

  static getAvailableTypes(): WidgetType[] {
    return Array.from(this.widgets.keys())
  }
}

// Widget Registration
WidgetFactory.register('metric', MetricWidget)
WidgetFactory.register('chart', ChartWidget)
WidgetFactory.register('table', TableWidget)
WidgetFactory.register('quickActions', QuickActionsWidget)
WidgetFactory.register('notifications', NotificationWidget)
```

## API Integration Architecture

### 1. **Dashboard API Endpoints**

```typescript
// Dashboard API Structure
interface DashboardAPIEndpoints {
  // Batch data loading
  '/api/dashboard/batch': {
    GET: (params: DashboardBatchParams) => DashboardBatchResponse
    POST: (body: DashboardBatchRequest) => DashboardBatchResponse
  }

  // Real-time metrics
  '/api/dashboard/metrics': {
    GET: (params: MetricsParams) => MetricsResponse
    POST: (body: MetricsRequest) => MetricsResponse
  }

  // Widget management
  '/api/dashboard/widgets': {
    GET: () => WidgetResponse[]
    POST: (body: CreateWidgetRequest) => WidgetResponse
    PUT: (id: string, body: UpdateWidgetRequest) => WidgetResponse
    DELETE: (id: string) => void
  }

  // Layout management
  '/api/dashboard/layouts': {
    GET: () => LayoutResponse[]
    POST: (body: CreateLayoutRequest) => LayoutResponse
    PUT: (id: string, body: UpdateLayoutRequest) => LayoutResponse
  }

  // Export functionality
  '/api/dashboard/export': {
    POST: (body: ExportRequest) => ExportResponse
  }
}
```

### 2. **Service Layer Pattern (Following consolidated-property.service.ts)**

```typescript
// Dashboard Service
export class DashboardService {
  private static readonly BASE_URL = '/api/dashboard'

  /**
   * Execute API call with consistent error handling
   */
  private static async executeWithErrorHandling<T>(
    operation: () => Promise<Response>,
    operationName: string,
    defaultValue: T
  ): Promise<T> {
    try {
      const response = await operation()

      if (!response.ok) {
        throw new Error(`${operationName} failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Dashboard Service - ${operationName}:`, error)

      // Return default value for graceful degradation
      return defaultValue
    }
  }

  /**
   * Load dashboard data in batch
   */
  static async loadDashboardBatch(
    params: DashboardBatchParams
  ): Promise<DashboardBatchResponse> {
    return this.executeWithErrorHandling(
      () => fetch(`${this.BASE_URL}/batch?${new URLSearchParams(params)}`),
      'loadDashboardBatch',
      { widgets: [], metrics: [], alerts: [], stats: {} }
    )
  }

  /**
   * Refresh specific metrics
   */
  static async refreshMetrics(
    metricKeys: string[]
  ): Promise<DashboardMetric[]> {
    return this.executeWithErrorHandling(
      () => fetch(`${this.BASE_URL}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: metricKeys })
      }),
      'refreshMetrics',
      []
    )
  }

  /**
   * Save widget configuration
   */
  static async saveWidget(
    widget: DashboardWidget
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.BASE_URL}/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(widget)
      })

      if (!response.ok) {
        throw new Error(`Save widget failed: ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
```

## Caching Strategy Architecture

### 1. **Multi-Tier Caching System (Following useCachedData.ts Patterns)**

```typescript
// Dashboard Cache Manager
export class DashboardCacheManager {
  private static readonly CACHE_KEYS = {
    METRICS: 'dashboard:metrics',
    WIDGETS: 'dashboard:widgets',
    LAYOUTS: 'dashboard:layouts',
    ALERTS: 'dashboard:alerts'
  }

  private static readonly TTL = {
    METRICS: 30 * 1000,      // 30 seconds
    WIDGETS: 5 * 60 * 1000,  // 5 minutes
    LAYOUTS: 60 * 60 * 1000, // 1 hour
    ALERTS: 10 * 1000        // 10 seconds
  }

  /**
   * Get cached dashboard data with fallback
   */
  static async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.TTL.METRICS
  ): Promise<T> {
    // Try memory cache first
    const memoryCache = dataCache.get<T>(key)
    if (memoryCache) {
      return memoryCache
    }

    // Try localStorage cache
    const localCache = this.getFromLocalStorage<T>(key)
    if (localCache && this.isCacheValid(localCache.timestamp, ttl)) {
      dataCache.set(key, localCache.data, { ttl })
      return localCache.data
    }

    // Fetch fresh data
    const freshData = await fetcher()

    // Cache in both memory and localStorage
    dataCache.set(key, freshData, { ttl })
    this.setToLocalStorage(key, freshData)

    return freshData
  }

  /**
   * Invalidate cache by tags
   */
  static invalidateByTags(tags: string[]): void {
    tags.forEach(tag => {
      dataCache.deleteByTag(tag)
      this.removeFromLocalStorage(tag)
    })
  }

  /**
   * Preload critical dashboard data
   */
  static async preloadCriticalData(): Promise<void> {
    const preloadTasks = [
      this.getCachedData(
        this.CACHE_KEYS.METRICS,
        () => DashboardService.loadDashboardBatch({ include: ['metrics'] }),
        this.TTL.METRICS
      ),
      this.getCachedData(
        this.CACHE_KEYS.ALERTS,
        () => DashboardService.loadDashboardBatch({ include: ['alerts'] }),
        this.TTL.ALERTS
      )
    ]

    await Promise.allSettled(preloadTasks)
  }

  private static getFromLocalStorage<T>(key: string): { data: T; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(`dashboard_cache_${key}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  private static setToLocalStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`dashboard_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch {
      // Ignore localStorage errors
    }
  }

  private static isCacheValid(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl
  }
}
```

### 2. **Real-time Data Synchronization**

```typescript
// Real-time Dashboard Manager
export class RealTimeDashboardManager {
  private static instance: RealTimeDashboardManager
  private websocket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  static getInstance(): RealTimeDashboardManager {
    if (!this.instance) {
      this.instance = new RealTimeDashboardManager()
    }
    return this.instance
  }

  /**
   * Connect to real-time updates
   */
  connect(): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      this.websocket = new WebSocket(this.getWebSocketURL())

      this.websocket.onopen = () => {
        console.log('Dashboard real-time connection established')
        this.reconnectAttempts = 0
        this.subscribeToChannels()
      }

      this.websocket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data))
      }

      this.websocket.onclose = () => {
        console.log('Dashboard real-time connection closed')
        this.scheduleReconnect()
      }

      this.websocket.onerror = (error) => {
        console.error('Dashboard real-time connection error:', error)
      }
    } catch (error) {
      console.error('Failed to establish real-time connection:', error)
      this.scheduleReconnect()
    }
  }

  /**
   * Handle incoming real-time messages
   */
  private handleMessage(message: RealTimeMessage): void {
    const { type, payload } = message

    switch (type) {
      case 'METRIC_UPDATE':
        this.handleMetricUpdate(payload)
        break
      case 'ALERT_NEW':
        this.handleNewAlert(payload)
        break
      case 'PROPERTY_CHANGE':
        this.handlePropertyChange(payload)
        break
      default:
        console.warn('Unknown real-time message type:', type)
    }
  }

  /**
   * Handle metric updates
   */
  private handleMetricUpdate(payload: MetricUpdatePayload): void {
    const dashboardStore = useDashboardStore.getState()

    // Update metric in store
    dashboardStore.updateMetric(payload.metricId, {
      value: payload.value,
      previousValue: payload.previousValue,
      trend: payload.trend,
      lastUpdated: new Date()
    })

    // Invalidate related cache
    DashboardCacheManager.invalidateByTags(['metrics', payload.metricId])
  }

  private getWebSocketURL(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/dashboard/ws`
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        this.connect()
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
    }
  }
}
```

## Performance Optimization Architecture

### 1. **Lazy Loading and Code Splitting**

```typescript
// Lazy-loaded Dashboard Components
export const LazyDashboardComponents = {
  // Core widgets
  MetricWidget: lazy(() => import('../widgets/MetricWidget')),
  ChartWidget: lazy(() => import('../widgets/ChartWidget')),
  TableWidget: lazy(() => import('../widgets/TableWidget')),

  // Advanced widgets
  AnalyticsWidget: lazy(() => import('../widgets/AnalyticsWidget')),
  ReportWidget: lazy(() => import('../widgets/ReportWidget')),
  CustomWidget: lazy(() => import('../widgets/CustomWidget')),

  // Dashboard sections
  DashboardCustomizer: lazy(() => import('../components/DashboardCustomizer')),
  ExportManager: lazy(() => import('../components/ExportManager')),
  AdvancedFilters: lazy(() => import('../components/AdvancedFilters'))
}

// Widget Suspense Wrapper
export const SuspenseWidget: React.FC<{
  type: WidgetType
  widget: DashboardWidget
}> = ({ type, widget }) => {
  const Component = LazyDashboardComponents[type]

  if (!Component) {
    return <WidgetError message={`Unknown widget type: ${type}`} />
  }

  return (
    <Suspense fallback={<WidgetSkeleton size={widget.size} />}>
      <Component widget={widget} />
    </Suspense>
  )
}
```

### 2. **Virtualization for Large Datasets**

```typescript
// Virtual Dashboard Grid
export const VirtualDashboardGrid: React.FC<{
  widgets: DashboardWidget[]
  onWidgetUpdate: (id: string, updates: Partial<DashboardWidget>) => void
}> = ({ widgets, onWidgetUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 })

  // Calculate visible widgets based on scroll position
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scrollTop = container.scrollTop
    const containerHeight = container.clientHeight
    const itemHeight = 200 // Average widget height

    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      widgets.length,
      start + Math.ceil(containerHeight / itemHeight) + 2
    )

    setVisibleRange({ start, end })
  }, [widgets.length])

  // Throttled scroll handler
  const handleScroll = useCallback(
    throttle(calculateVisibleRange, 16), // 60fps
    [calculateVisibleRange]
  )

  useEffect(() => {
    calculateVisibleRange()
  }, [calculateVisibleRange])

  const visibleWidgets = widgets.slice(visibleRange.start, visibleRange.end)

  return (
    <div
      ref={containerRef}
      className="virtual-dashboard-grid"
      onScroll={handleScroll}
      style={{ height: '100%', overflow: 'auto' }}
    >
      <div style={{ height: visibleRange.start * 200 }} />
      {visibleWidgets.map((widget, index) => (
        <SuspenseWidget
          key={widget.id}
          type={widget.type}
          widget={widget}
        />
      ))}
      <div style={{ height: (widgets.length - visibleRange.end) * 200 }} />
    </div>
  )
}
```

### 3. **Performance Monitoring Integration**

```typescript
// Dashboard Performance Monitor
export class DashboardPerformanceMonitor {
  private static metrics: PerformanceMetrics = {
    renderTime: 0,
    dataFetchTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    errorRate: 0
  }

  /**
   * Track widget render performance
   */
  static trackWidgetRender(widgetId: string, renderTime: number): void {
    performance.mark(`widget-${widgetId}-render-end`)

    const measure = performance.measure(
      `widget-${widgetId}-render`,
      `widget-${widgetId}-render-start`,
      `widget-${widgetId}-render-end`
    )

    this.metrics.renderTime = measure.duration
    this.reportMetrics()
  }

  /**
   * Track data fetch performance
   */
  static trackDataFetch(operation: string, duration: number): void {
    this.metrics.dataFetchTime = duration

    // Report slow operations
    if (duration > 2000) {
      console.warn(`Slow dashboard operation: ${operation} took ${duration}ms`)
    }

    this.reportMetrics()
  }

  /**
   * Track cache performance
   */
  static trackCacheHit(hit: boolean): void {
    // Update cache hit rate using exponential moving average
    const alpha = 0.1
    this.metrics.cacheHitRate =
      alpha * (hit ? 1 : 0) + (1 - alpha) * this.metrics.cacheHitRate

    this.reportMetrics()
  }

  /**
   * Report metrics to monitoring service
   */
  private static reportMetrics(): void {
    // Send metrics to monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'dashboard_performance', {
        render_time: this.metrics.renderTime,
        data_fetch_time: this.metrics.dataFetchTime,
        cache_hit_rate: this.metrics.cacheHitRate
      })
    }
  }
}
```

## Error Handling and Resilience

### 1. **Error Boundary Pattern**

```typescript
// Dashboard Error Boundary
export class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo)

    // Report error to monitoring service
    this.reportError(error, errorInfo)
  }

  private reportError(error: Error, errorInfo: React.ErrorInfo): void {
    // Send error to monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          component_stack: errorInfo.componentStack
        }
      })
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DashboardErrorFallback
      return <FallbackComponent error={this.state.error} />
    }

    return this.props.children
  }
}

// Error Fallback Component
const DashboardErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="dashboard-error-fallback">
    <h2>Dashboard Error</h2>
    <p>Something went wrong while loading the dashboard.</p>
    {error && (
      <details>
        <summary>Error Details</summary>
        <pre>{error.message}</pre>
      </details>
    )}
    <button onClick={() => window.location.reload()}>
      Reload Dashboard
    </button>
  </div>
)
```

### 2. **Graceful Degradation Strategy**

```typescript
// Dashboard Resilience Manager
export class DashboardResilienceManager {
  /**
   * Handle API failures with graceful degradation
   */
  static async handleAPIFailure<T>(
    operation: () => Promise<T>,
    fallbackData: T,
    operationName: string
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      console.warn(`Dashboard API failure (${operationName}):`, error)

      // Try to get cached data
      const cachedData = DashboardCacheManager.getCachedData(
        operationName,
        () => Promise.resolve(fallbackData),
        0 // Accept any cached data
      )

      if (cachedData) {
        return cachedData
      }

      // Return fallback data
      return fallbackData
    }
  }

  /**
   * Handle widget failures
   */
  static handleWidgetFailure(
    widgetId: string,
    error: Error
  ): React.ReactElement {
    console.error(`Widget ${widgetId} failed:`, error)

    return (
      <div className="widget-error">
        <h4>Widget Error</h4>
        <p>This widget is temporarily unavailable.</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Review Date**: January 2025
```