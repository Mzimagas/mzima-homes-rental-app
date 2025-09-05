/**
 * Widget Factory
 * Centralized widget creation and registration system following factory pattern
 * Handles lazy loading, error boundaries, and widget type management
 */

'use client'

import React, { Suspense, lazy, ComponentType } from 'react'
import { DashboardWidget, WidgetType } from '../../../presentation/stores/dashboardStore'
import { BaseWidgetProps, WidgetSkeleton } from './BaseWidget'
import { ErrorMessage } from '../../ui/error'

// Lazy-loaded widget components
const LazyMetricWidget = lazy(() => import('./MetricWidget'))
const LazyChartWidget = lazy(() => import('./ChartWidget'))
const LazyTableWidget = lazy(() => import('./TableWidget'))
const LazyQuickActionsWidget = lazy(() => import('./QuickActionsWidget'))
const LazyNotificationWidget = lazy(() => import('./NotificationWidget'))

// Widget component map type
type WidgetComponentMap = Map<WidgetType, ComponentType<BaseWidgetProps>>

// Widget error boundary
interface WidgetErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode; widget: DashboardWidget },
  WidgetErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; widget: DashboardWidget }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Widget ${this.props.widget.id} (${this.props.widget.type}) error:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="widget-error-boundary">
          <WidgetSkeleton size={this.props.widget.size} />
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
            <ErrorMessage
              title="Widget Error"
              message={`Failed to load ${this.props.widget.title}`}
              onRetry={() => this.setState({ hasError: false, error: undefined })}
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Widget suspense wrapper
interface WidgetSuspenseWrapperProps {
  widget: DashboardWidget
  children: React.ReactNode
}

const WidgetSuspenseWrapper: React.FC<WidgetSuspenseWrapperProps> = ({ 
  widget, 
  children 
}) => (
  <WidgetErrorBoundary widget={widget}>
    <Suspense fallback={<WidgetSkeleton size={widget.size} />}>
      {children}
    </Suspense>
  </WidgetErrorBoundary>
)

// Widget Factory class
export class WidgetFactory {
  private static widgets: WidgetComponentMap = new Map()
  private static initialized = false

  /**
   * Initialize the widget factory with default widgets
   */
  private static initialize() {
    if (this.initialized) return

    // Register default widget types
    this.widgets.set('metric', LazyMetricWidget as ComponentType<BaseWidgetProps>)
    this.widgets.set('chart', LazyChartWidget as ComponentType<BaseWidgetProps>)
    this.widgets.set('table', LazyTableWidget as ComponentType<BaseWidgetProps>)
    this.widgets.set('quickActions', LazyQuickActionsWidget as ComponentType<BaseWidgetProps>)
    this.widgets.set('notifications', LazyNotificationWidget as ComponentType<BaseWidgetProps>)

    this.initialized = true
  }

  /**
   * Register a new widget type
   */
  static register(type: WidgetType, component: ComponentType<BaseWidgetProps>) {
    this.initialize()
    this.widgets.set(type, component)
  }

  /**
   * Unregister a widget type
   */
  static unregister(type: WidgetType) {
    this.initialize()
    this.widgets.delete(type)
  }

  /**
   * Create a widget component instance
   */
  static create(
    widget: DashboardWidget, 
    props: Partial<BaseWidgetProps> = {}
  ): React.ReactElement | null {
    this.initialize()

    const Component = this.widgets.get(widget.type)
    if (!Component) {
      console.warn(`Widget type ${widget.type} not registered`)
      return (
        <WidgetSkeleton size={widget.size} />
      )
    }

    // Merge widget-specific props based on type
    const widgetProps = this.getWidgetSpecificProps(widget, props)

    return (
      <WidgetSuspenseWrapper key={widget.id} widget={widget}>
        <Component
          widget={widget}
          {...widgetProps}
          {...props}
        />
      </WidgetSuspenseWrapper>
    )
  }

  /**
   * Get widget-specific props based on widget type and configuration
   */
  private static getWidgetSpecificProps(
    widget: DashboardWidget, 
    baseProps: Partial<BaseWidgetProps>
  ): Partial<BaseWidgetProps> {
    const commonProps = {
      key: widget.id,
      ...baseProps
    }

    switch (widget.type) {
      case 'metric':
        return {
          ...commonProps,
          // Add metric-specific props from widget config
          ...(widget.config.metricId && { metricId: widget.config.metricId }),
          ...(widget.config.showTrend !== undefined && { showTrend: widget.config.showTrend }),
          ...(widget.config.showProgress !== undefined && { showProgress: widget.config.showProgress }),
          ...(widget.config.compact !== undefined && { compact: widget.config.compact })
        }

      case 'chart':
        return {
          ...commonProps,
          // Add chart-specific props from widget config
          ...(widget.config.chartType && { chartType: widget.config.chartType }),
          ...(widget.config.dataSource && { dataSource: widget.config.dataSource }),
          ...(widget.config.timeRange && { timeRange: widget.config.timeRange }),
          ...(widget.config.showLegend !== undefined && { showLegend: widget.config.showLegend })
        }

      case 'table':
        return {
          ...commonProps,
          // Add table-specific props from widget config
          ...(widget.config.columns && { columns: widget.config.columns }),
          ...(widget.config.pageSize && { pageSize: widget.config.pageSize }),
          ...(widget.config.sortable !== undefined && { sortable: widget.config.sortable }),
          ...(widget.config.filterable !== undefined && { filterable: widget.config.filterable })
        }

      case 'quickActions':
        return {
          ...commonProps,
          // Add quick actions specific props
          ...(widget.config.actions && { actions: widget.config.actions }),
          ...(widget.config.layout && { layout: widget.config.layout })
        }

      case 'notifications':
        return {
          ...commonProps,
          // Add notification-specific props
          ...(widget.config.maxItems && { maxItems: widget.config.maxItems }),
          ...(widget.config.showUnreadOnly !== undefined && { showUnreadOnly: widget.config.showUnreadOnly }),
          ...(widget.config.autoRefresh !== undefined && { autoRefresh: widget.config.autoRefresh })
        }

      default:
        return commonProps
    }
  }

  /**
   * Get all available widget types
   */
  static getAvailableTypes(): WidgetType[] {
    this.initialize()
    return Array.from(this.widgets.keys())
  }

  /**
   * Check if a widget type is registered
   */
  static isRegistered(type: WidgetType): boolean {
    this.initialize()
    return this.widgets.has(type)
  }

  /**
   * Get widget type metadata
   */
  static getWidgetMetadata(type: WidgetType) {
    const metadata = {
      metric: {
        name: 'Metric Widget',
        description: 'Display key performance indicators with trends and progress',
        icon: '📊',
        category: 'Analytics',
        defaultSize: 'small' as const,
        configurable: ['metricId', 'showTrend', 'showProgress', 'compact']
      },
      chart: {
        name: 'Chart Widget',
        description: 'Visualize data with interactive charts and graphs',
        icon: '📈',
        category: 'Analytics',
        defaultSize: 'large' as const,
        configurable: ['chartType', 'dataSource', 'timeRange', 'showLegend']
      },
      table: {
        name: 'Table Widget',
        description: 'Display tabular data with sorting and filtering',
        icon: '📋',
        category: 'Data',
        defaultSize: 'full' as const,
        configurable: ['columns', 'pageSize', 'sortable', 'filterable']
      },
      quickActions: {
        name: 'Quick Actions',
        description: 'Provide shortcuts to common tasks and operations',
        icon: '⚡',
        category: 'Actions',
        defaultSize: 'medium' as const,
        configurable: ['actions', 'layout']
      },
      notifications: {
        name: 'Notifications',
        description: 'Show alerts, messages, and system notifications',
        icon: '🔔',
        category: 'Communication',
        defaultSize: 'medium' as const,
        configurable: ['maxItems', 'showUnreadOnly', 'autoRefresh']
      },
      custom: {
        name: 'Custom Widget',
        description: 'Custom widget implementation',
        icon: '🔧',
        category: 'Custom',
        defaultSize: 'medium' as const,
        configurable: []
      }
    }

    return metadata[type] || {
      name: 'Unknown Widget',
      description: 'Unknown widget type',
      icon: '❓',
      category: 'Unknown',
      defaultSize: 'medium' as const,
      configurable: []
    }
  }

  /**
   * Create a default widget configuration for a given type
   */
  static createDefaultWidget(type: WidgetType, overrides: Partial<DashboardWidget> = {}): DashboardWidget {
    const metadata = this.getWidgetMetadata(type)
    const now = new Date().toISOString()

    return {
      id: crypto.randomUUID(),
      type,
      title: metadata.name,
      size: metadata.defaultSize,
      position: { widgetId: '', x: 0, y: 0, width: 1, height: 1 },
      config: {},
      dataSource: 'default',
      refreshInterval: 300000, // 5 minutes
      isVisible: true,
      permissions: {
        canEdit: true,
        canDelete: true,
        canMove: true,
        canResize: true
      },
      createdAt: now,
      updatedAt: now,
      ...overrides
    }
  }
}

// Export factory instance and helper functions
export default WidgetFactory

// Helper hook for widget creation
export const useWidgetFactory = () => {
  return {
    createWidget: WidgetFactory.create,
    getAvailableTypes: WidgetFactory.getAvailableTypes,
    getWidgetMetadata: WidgetFactory.getWidgetMetadata,
    createDefaultWidget: WidgetFactory.createDefaultWidget,
    isRegistered: WidgetFactory.isRegistered
  }
}
