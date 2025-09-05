/**
 * Metric Widget Component
 * Displays key performance indicators with trends, progress bars, and KES formatting
 * Following design system specifications for metric display
 */

'use client'

import React, { useMemo } from 'react'
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  MinusIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { BaseWidget, BaseWidgetProps } from './BaseWidget'
import { DashboardMetric } from '../../../presentation/stores/dashboardStore'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'

// Metric widget specific props
export interface MetricWidgetProps extends Omit<BaseWidgetProps, 'children'> {
  metricId: string
  showTrend?: boolean
  showProgress?: boolean
  showTarget?: boolean
  compact?: boolean
}

// Format KES currency values
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
    // Compact formatting for charts (e.g., 2.5M, 150K)
    if (value >= 1000000) {
      return `${showSymbol ? 'KES ' : ''}${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${showSymbol ? 'KES ' : ''}${(value / 1000).toFixed(1)}K`
    }
  }

  // Standard formatting
  return new Intl.NumberFormat('en-KE', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'KES',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

// Format percentage values
const formatPercentageValue = (value: number, precision: number = 1): string => {
  return `${value.toFixed(precision)}%`
}

// Format number values with K/M suffixes
const formatNumberValue = (value: number, compact: boolean = false): string => {
  if (compact) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
  }
  
  return new Intl.NumberFormat('en-KE').format(value)
}

// Get metric icon based on key
const getMetricIcon = (metricKey: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    total_properties: BuildingOfficeIcon,
    total_tenants: UserGroupIcon,
    monthly_revenue: CurrencyDollarIcon,
    occupancy_rate: ChartBarIcon,
    collection_rate: ChartBarIcon,
    outstanding_amount: ExclamationTriangleIcon
  }
  
  return iconMap[metricKey] || ChartBarIcon
}

// Get trend icon and color
const getTrendDisplay = (trend: 'up' | 'down' | 'stable', trendPercentage?: number) => {
  const icons = {
    up: ArrowTrendingUpIcon,
    down: ArrowTrendingDownIcon,
    stable: MinusIcon
  }
  
  const colors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
  }
  
  const bgColors = {
    up: 'bg-green-50',
    down: 'bg-red-50',
    stable: 'bg-gray-50'
  }
  
  const Icon = icons[trend]
  
  return {
    Icon,
    colorClass: colors[trend],
    bgColorClass: bgColors[trend],
    displayValue: trendPercentage ? `${trendPercentage > 0 ? '+' : ''}${trendPercentage}%` : ''
  }
}

// Main MetricWidget component
export const MetricWidget: React.FC<MetricWidgetProps> = ({
  metricId,
  showTrend = true,
  showProgress = true,
  showTarget = true,
  compact = false,
  ...baseProps
}) => {
  // Get metric data from store
  const metric = useDashboardStore(state => state.getMetric(metricId))
  
  // Format the metric value based on its format type
  const formattedValue = useMemo(() => {
    if (!metric) return '—'
    
    const value = typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value
    
    switch (metric.format) {
      case 'currency':
        return formatKESValue(value, { compact })
      case 'percentage':
        return formatPercentageValue(value)
      case 'number':
        return formatNumberValue(value, compact)
      case 'text':
      default:
        return metric.value.toString()
    }
  }, [metric, compact])
  
  // Get trend display information
  const trendDisplay = useMemo(() => {
    if (!metric || !showTrend) return null
    return getTrendDisplay(metric.trend, metric.trendPercentage)
  }, [metric, showTrend])
  
  // Calculate progress percentage for progress bar
  const progressPercentage = useMemo(() => {
    if (!metric || !metric.thresholds?.target || !showProgress) return null
    
    const value = typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value
    const target = metric.thresholds.target
    
    return Math.min((value / target) * 100, 100)
  }, [metric, showProgress])
  
  // Get metric icon
  const MetricIcon = useMemo(() => {
    if (!metric) return ChartBarIcon
    return getMetricIcon(metric.key)
  }, [metric])
  
  // Determine alert status based on thresholds
  const alertStatus = useMemo(() => {
    if (!metric || !metric.thresholds) return 'normal'
    
    const value = typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value
    const { warning, critical } = metric.thresholds
    
    if (critical !== undefined && value <= critical) return 'critical'
    if (warning !== undefined && value <= warning) return 'warning'
    return 'normal'
  }, [metric])
  
  if (!metric) {
    return (
      <BaseWidget {...baseProps} error="Metric not found">
        <div className="text-center text-gray-500">
          <ChartBarIcon className="w-8 h-8 mx-auto mb-2" />
          <p>Metric not available</p>
        </div>
      </BaseWidget>
    )
  }
  
  return (
    <BaseWidget {...baseProps}>
      <div className={`metric-widget ${compact ? 'metric-compact' : ''}`}>
        {/* Metric header with icon */}
        <div className="metric-header flex items-center mb-4">
          <div className={`
            metric-icon p-2 rounded-lg mr-3
            ${alertStatus === 'critical' ? 'bg-red-100 text-red-600' : 
              alertStatus === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
              'bg-blue-100 text-blue-600'}
          `}>
            <MetricIcon className="w-5 h-5" />
          </div>
          
          {!compact && (
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                {metric.key.replace(/_/g, ' ')}
              </div>
            </div>
          )}
        </div>
        
        {/* Main metric value */}
        <div className="metric-value-container mb-3">
          <div className="metric-value text-3xl font-bold text-gray-900 leading-none">
            {formattedValue}
            {metric.unit && metric.format !== 'currency' && metric.format !== 'percentage' && (
              <span className="metric-unit text-lg font-medium text-gray-600 ml-1">
                {metric.unit}
              </span>
            )}
          </div>
        </div>
        
        {/* Trend indicator */}
        {trendDisplay && (
          <div className={`
            metric-trend flex items-center space-x-1 mb-3 px-2 py-1 rounded-md text-sm font-medium
            ${trendDisplay.bgColorClass}
          `}>
            <trendDisplay.Icon className={`w-4 h-4 ${trendDisplay.colorClass}`} />
            <span className={trendDisplay.colorClass}>
              {trendDisplay.displayValue}
            </span>
            <span className="text-gray-600 text-xs">vs last period</span>
          </div>
        )}
        
        {/* Progress bar */}
        {progressPercentage !== null && showProgress && (
          <div className="metric-progress mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Progress to target</span>
              <span className="text-xs font-medium text-gray-700">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="metric-progress-bar w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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
        {showTarget && metric.thresholds?.target && (
          <div className="metric-target text-xs text-gray-500">
            Target: {metric.format === 'currency' 
              ? formatKESValue(metric.thresholds.target, { compact: true })
              : metric.format === 'percentage'
              ? formatPercentageValue(metric.thresholds.target)
              : formatNumberValue(metric.thresholds.target, true)
            }
          </div>
        )}
        
        {/* Alert indicators */}
        {alertStatus !== 'normal' && (
          <div className={`
            metric-alert mt-2 px-2 py-1 rounded text-xs font-medium
            ${alertStatus === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}
          `}>
            {alertStatus === 'critical' ? '⚠️ Critical' : '⚠️ Warning'}
          </div>
        )}
        
        {/* Last updated */}
        <div className="metric-footer mt-3 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            Updated {new Date(metric.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </BaseWidget>
  )
}

export default MetricWidget
