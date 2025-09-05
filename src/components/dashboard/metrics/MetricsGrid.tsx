/**
 * Metrics Grid Component
 * Replaces ResponsiveDashboardGrid with enhanced real-time data, KES formatting, and trend indicators
 * Features responsive design, loading states, and interactive metric cards
 */

'use client'

import React, { useMemo, useCallback } from 'react'
import { 
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { ResponsiveContainer } from '../../layout/ResponsiveContainer'
import { LoadingSpinner } from '../../ui/loading'
import { ErrorMessage } from '../../ui/error'
import { useDashboardMetrics, useRealTimeMetrics } from '../../../hooks/useDashboardData'
import { DashboardMetric } from '../../../presentation/stores/dashboardStore'

// Metric card configuration
export interface MetricCardConfig {
  id: string
  title: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  borderColor: string
  iconBg: string
  format: 'currency' | 'percentage' | 'number' | 'text'
  showTrend?: boolean
  showProgress?: boolean
  showTarget?: boolean
  priority: 'high' | 'medium' | 'low'
}

// Default metric configurations
const METRIC_CONFIGS: Record<string, MetricCardConfig> = {
  'metric-properties': {
    id: 'metric-properties',
    title: 'Total Properties',
    icon: BuildingOfficeIcon,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    format: 'number',
    showTrend: false,
    showProgress: false,
    showTarget: false,
    priority: 'medium'
  },
  'metric-tenants': {
    id: 'metric-tenants',
    title: 'Active Tenants',
    icon: UserGroupIcon,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-100',
    format: 'number',
    showTrend: true,
    showProgress: true,
    showTarget: true,
    priority: 'high'
  },
  'metric-revenue': {
    id: 'metric-revenue',
    title: 'Monthly Revenue',
    icon: CurrencyDollarIcon,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    format: 'currency',
    showTrend: true,
    showProgress: true,
    showTarget: true,
    priority: 'high'
  },
  'metric-occupancy': {
    id: 'metric-occupancy',
    title: 'Occupancy Rate',
    icon: ChartBarIcon,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconBg: 'bg-purple-100',
    format: 'percentage',
    showTrend: true,
    showProgress: true,
    showTarget: true,
    priority: 'high'
  },
  'metric-collection': {
    id: 'metric-collection',
    title: 'Collection Rate',
    icon: ChartBarIcon,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    format: 'percentage',
    showTrend: true,
    showProgress: true,
    showTarget: true,
    priority: 'high'
  },
  'metric-outstanding': {
    id: 'metric-outstanding',
    title: 'Outstanding Amount',
    icon: ExclamationTriangleIcon,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
    format: 'currency',
    showTrend: true,
    showProgress: false,
    showTarget: false,
    priority: 'high'
  }
}

// KES currency formatter
const formatKESValue = (
  value: number,
  options: {
    compact?: boolean
    precision?: number
    showSymbol?: boolean
  } = {}
): string => {
  const { compact = false, precision = 0, showSymbol = true } = options

  if (compact) {
    if (value >= 1000000) {
      return `${showSymbol ? 'KES ' : ''}${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${showSymbol ? 'KES ' : ''}${(value / 1000).toFixed(1)}K`
    }
  }

  return new Intl.NumberFormat('en-KE', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'KES',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

// Format metric value based on type
const formatMetricValue = (metric: DashboardMetric, compact: boolean = false): string => {
  const value = typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value

  switch (metric.format) {
    case 'currency':
      return formatKESValue(value, { compact })
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'number':
      return compact && value >= 1000 
        ? value >= 1000000 
          ? `${(value / 1000000).toFixed(1)}M`
          : `${(value / 1000).toFixed(1)}K`
        : new Intl.NumberFormat('en-KE').format(value)
    case 'text':
    default:
      return metric.value.toString()
  }
}

// Get trend icon and styling
const getTrendDisplay = (trend: 'up' | 'down' | 'stable', trendPercentage?: number) => {
  const icons = {
    up: ArrowTrendingUpIcon,
    down: ArrowTrendingDownIcon,
    stable: MinusIcon
  }
  
  const colors = {
    up: 'text-green-600 bg-green-100',
    down: 'text-red-600 bg-red-100',
    stable: 'text-gray-600 bg-gray-100'
  }
  
  const Icon = icons[trend]
  const colorClass = colors[trend]
  const displayValue = trendPercentage ? `${trendPercentage > 0 ? '+' : ''}${trendPercentage}%` : ''
  
  return { Icon, colorClass, displayValue }
}

// Individual metric card component
interface MetricCardProps {
  metric: DashboardMetric
  config: MetricCardConfig
  onClick?: (metricId: string) => void
  compact?: boolean
}

const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  config,
  onClick,
  compact = false
}) => {
  const formattedValue = formatMetricValue(metric, compact)
  const trendDisplay = config.showTrend ? getTrendDisplay(metric.trend, metric.trendPercentage) : null
  
  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!config.showProgress || !metric.thresholds?.target) return null
    
    const value = typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value
    const target = metric.thresholds.target
    
    return Math.min((value / target) * 100, 100)
  }, [metric, config.showProgress])
  
  // Determine alert status
  const alertStatus = useMemo(() => {
    if (!metric.thresholds) return 'normal'
    
    const value = typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value
    const { warning, critical } = metric.thresholds
    
    if (critical !== undefined && value <= critical) return 'critical'
    if (warning !== undefined && value <= warning) return 'warning'
    return 'normal'
  }, [metric])
  
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(metric.id)
    }
  }, [onClick, metric.id])

  return (
    <div
      className={`
        metric-card relative rounded-lg border-2 transition-all duration-200 cursor-pointer
        ${config.bgColor} ${config.borderColor}
        hover:shadow-md hover:scale-102
        ${alertStatus === 'critical' ? 'ring-2 ring-red-300 ring-opacity-50' : 
          alertStatus === 'warning' ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''}
        ${compact ? 'p-4' : 'p-6'}
      `}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`
          ${compact ? 'w-8 h-8' : 'w-10 h-10'} 
          rounded-lg flex items-center justify-center
          ${config.iconBg}
        `}>
          <config.icon className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} ${config.color}`} />
        </div>
        
        {alertStatus !== 'normal' && (
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${alertStatus === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}
          `}>
            {alertStatus === 'critical' ? 'Critical' : 'Warning'}
          </div>
        )}
      </div>
      
      {/* Title */}
      <h3 className={`
        font-medium text-gray-600 mb-2
        ${compact ? 'text-sm' : 'text-base'}
      `}>
        {config.title}
      </h3>
      
      {/* Value */}
      <div className={`
        font-bold text-gray-900 mb-3
        ${compact ? 'text-xl' : 'text-2xl'}
      `}>
        {formattedValue}
        {metric.unit && metric.format !== 'currency' && metric.format !== 'percentage' && (
          <span className={`
            font-medium text-gray-600 ml-1
            ${compact ? 'text-sm' : 'text-base'}
          `}>
            {metric.unit}
          </span>
        )}
      </div>
      
      {/* Trend indicator */}
      {trendDisplay && (
        <div className={`
          flex items-center space-x-1 mb-3 px-2 py-1 rounded-md text-sm font-medium
          ${trendDisplay.colorClass}
        `}>
          <trendDisplay.Icon className="w-4 h-4" />
          <span>{trendDisplay.displayValue}</span>
          <span className="text-gray-600 text-xs">vs last period</span>
        </div>
      )}
      
      {/* Progress bar */}
      {progressPercentage !== null && config.showProgress && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Progress to target</span>
            <span className="text-xs font-medium text-gray-700">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`
                h-full rounded-full transition-all duration-300 ease-in-out
                ${progressPercentage >= 100 ? 'bg-green-500' : 
                  progressPercentage >= 75 ? 'bg-blue-500' : 
                  progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}
              `}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Target information */}
      {config.showTarget && metric.thresholds?.target && (
        <div className="text-xs text-gray-500">
          Target: {metric.format === 'currency' 
            ? formatKESValue(metric.thresholds.target, { compact: true })
            : metric.format === 'percentage'
            ? `${metric.thresholds.target}%`
            : new Intl.NumberFormat('en-KE').format(metric.thresholds.target)
          }
        </div>
      )}
      
      {/* Last updated */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
        {new Date(metric.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  )
}

// Main metrics grid props
export interface MetricsGridProps {
  metricIds?: string[]
  onMetricClick?: (metricId: string) => void
  autoRefresh?: boolean
  refreshInterval?: number
  compact?: boolean
  columns?: number
  className?: string
}

/**
 * Main Metrics Grid Component
 */
export const MetricsGrid: React.FC<MetricsGridProps> = ({
  metricIds,
  onMetricClick,
  autoRefresh = true,
  refreshInterval = 300000,
  compact = false,
  columns,
  className = ''
}) => {
  // Fetch metrics data
  const { data: metrics, loading, error, refreshMetrics } = useDashboardMetrics({
    metricIds,
    autoRefresh,
    refreshInterval
  })
  
  // Real-time metrics updates
  const { connected: realTimeConnected } = useRealTimeMetrics(metricIds)
  
  // Filter and sort metrics
  const displayMetrics = useMemo(() => {
    if (!metrics) return []
    
    const filtered = metricIds 
      ? metrics.filter(m => metricIds.includes(m.id))
      : metrics
    
    // Sort by priority and then by ID for consistent ordering
    return filtered.sort((a, b) => {
      const configA = METRIC_CONFIGS[a.id]
      const configB = METRIC_CONFIGS[b.id]
      
      if (configA && configB) {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const priorityDiff = priorityOrder[configA.priority] - priorityOrder[configB.priority]
        if (priorityDiff !== 0) return priorityDiff
      }
      
      return a.id.localeCompare(b.id)
    })
  }, [metrics, metricIds])
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refreshMetrics(metricIds)
  }, [refreshMetrics, metricIds])
  
  // Determine grid columns
  const gridColumns = columns || (compact ? 6 : 3)
  
  if (error) {
    return (
      <ResponsiveContainer className={className}>
        <ErrorMessage
          title="Metrics Error"
          message={error}
          onRetry={handleRefresh}
        />
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer className={`metrics-grid ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Key Metrics</h2>
          <p className="text-sm text-gray-600">
            Real-time property management metrics
            {realTimeConnected && (
              <span className="ml-2 inline-flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </span>
            )}
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Refresh'}
        </button>
      </div>
      
      {/* Metrics Grid */}
      {loading && displayMetrics.length === 0 ? (
        <div className={`
          grid gap-6
          grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(gridColumns, 4)} xl:grid-cols-${gridColumns}
        `}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border-2 border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`
          grid gap-6
          grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(gridColumns, 4)} xl:grid-cols-${gridColumns}
        `}>
          {displayMetrics.map(metric => {
            const config = METRIC_CONFIGS[metric.id] || METRIC_CONFIGS['metric-properties']
            
            return (
              <MetricCard
                key={metric.id}
                metric={metric}
                config={config}
                onClick={onMetricClick}
                compact={compact}
              />
            )
          })}
        </div>
      )}
      
      {/* Empty state */}
      {!loading && displayMetrics.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No metrics available</h3>
          <p className="text-gray-600">Metrics will appear here once data is available.</p>
        </div>
      )}
    </ResponsiveContainer>
  )
}

export default MetricsGrid
