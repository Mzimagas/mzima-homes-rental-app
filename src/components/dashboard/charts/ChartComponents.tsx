/**
 * Dashboard Chart Components
 * Comprehensive chart library integration with KES currency formatting and responsive design
 * Uses Recharts for React-native charts with TypeScript support
 */

'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Chart data interfaces
export interface ChartDataPoint {
  name: string
  value: number
  label?: string
  color?: string
  [key: string]: any
}

export interface TimeSeriesDataPoint {
  date: string
  value: number
  label?: string
  [key: string]: any
}

export interface MultiSeriesDataPoint {
  name: string
  [key: string]: string | number
}

// Chart configuration interfaces
export interface ChartConfig {
  width?: number
  height?: number
  margin?: { top: number; right: number; bottom: number; left: number }
  colors?: string[]
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  responsive?: boolean
  animate?: boolean
}

// KES currency formatter
const formatKES = (value: number, compact: boolean = false): string => {
  if (compact) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
  }
  
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Default chart colors
const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
]

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatValue?: (value: number) => string
  showLabel?: boolean
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  formatValue = (value) => formatKES(value, true),
  showLabel = true
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        {showLabel && label && (
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        )}
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-900">
              {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Revenue Line Chart Component
export interface RevenueLineChartProps {
  data: TimeSeriesDataPoint[]
  config?: ChartConfig
  className?: string
}

export const RevenueLineChart: React.FC<RevenueLineChartProps> = ({
  data,
  config = {},
  className = ''
}) => {
  const chartConfig = {
    height: 300,
    margin: { top: 20, right: 30, left: 20, bottom: 20 },
    showGrid: true,
    showTooltip: true,
    responsive: true,
    animate: true,
    ...config
  }

  return (
    <div className={`revenue-line-chart ${className}`}>
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        <LineChart data={data} margin={chartConfig.margin}>
          {chartConfig.showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          )}
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatKES(value, true)}
          />
          {chartConfig.showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatValue={(value) => formatKES(value)} />}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
            animationDuration={chartConfig.animate ? 1000 : 0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Occupancy Area Chart Component
export interface OccupancyAreaChartProps {
  data: TimeSeriesDataPoint[]
  config?: ChartConfig
  className?: string
}

export const OccupancyAreaChart: React.FC<OccupancyAreaChartProps> = ({
  data,
  config = {},
  className = ''
}) => {
  const chartConfig = {
    height: 250,
    margin: { top: 20, right: 30, left: 20, bottom: 20 },
    showGrid: true,
    showTooltip: true,
    responsive: true,
    animate: true,
    ...config
  }

  return (
    <div className={`occupancy-area-chart ${className}`}>
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        <AreaChart data={data} margin={chartConfig.margin}>
          {chartConfig.showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          )}
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          {chartConfig.showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatValue={(value) => `${value.toFixed(1)}%`} />}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.3}
            strokeWidth={2}
            animationDuration={chartConfig.animate ? 1000 : 0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Payment Methods Pie Chart Component
export interface PaymentMethodsPieChartProps {
  data: ChartDataPoint[]
  config?: ChartConfig
  className?: string
}

export const PaymentMethodsPieChart: React.FC<PaymentMethodsPieChartProps> = ({
  data,
  config = {},
  className = ''
}) => {
  const chartConfig = {
    height: 300,
    colors: DEFAULT_COLORS,
    showTooltip: true,
    showLegend: true,
    responsive: true,
    animate: true,
    ...config
  }

  const dataWithColors = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: item.color || chartConfig.colors![index % chartConfig.colors!.length]
    }))
  }, [data, chartConfig.colors])

  return (
    <div className={`payment-methods-pie-chart ${className}`}>
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        <PieChart>
          <Pie
            data={dataWithColors}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            animationDuration={chartConfig.animate ? 1000 : 0}
          >
            {dataWithColors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {chartConfig.showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatValue={(value) => formatKES(value)} />}
            />
          )}
          {chartConfig.showLegend && (
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Property Performance Bar Chart Component
export interface PropertyPerformanceBarChartProps {
  data: MultiSeriesDataPoint[]
  config?: ChartConfig
  className?: string
}

export const PropertyPerformanceBarChart: React.FC<PropertyPerformanceBarChartProps> = ({
  data,
  config = {},
  className = ''
}) => {
  const chartConfig = {
    height: 350,
    margin: { top: 20, right: 30, left: 20, bottom: 60 },
    colors: DEFAULT_COLORS,
    showGrid: true,
    showTooltip: true,
    showLegend: true,
    responsive: true,
    animate: true,
    ...config
  }

  return (
    <div className={`property-performance-bar-chart ${className}`}>
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        <BarChart data={data} margin={chartConfig.margin}>
          {chartConfig.showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          )}
          <XAxis 
            dataKey="name" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatKES(value, true)}
          />
          {chartConfig.showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatValue={(value) => formatKES(value)} />}
            />
          )}
          {chartConfig.showLegend && (
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
            />
          )}
          <Bar 
            dataKey="revenue" 
            fill={chartConfig.colors![0]}
            name="Monthly Revenue"
            animationDuration={chartConfig.animate ? 1000 : 0}
          />
          <Bar 
            dataKey="expenses" 
            fill={chartConfig.colors![1]}
            name="Monthly Expenses"
            animationDuration={chartConfig.animate ? 1000 : 0}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Cash Flow Chart Component (Combined Line and Bar)
export interface CashFlowChartProps {
  data: MultiSeriesDataPoint[]
  config?: ChartConfig
  className?: string
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  data,
  config = {},
  className = ''
}) => {
  const chartConfig = {
    height: 350,
    margin: { top: 20, right: 30, left: 20, bottom: 20 },
    colors: DEFAULT_COLORS,
    showGrid: true,
    showTooltip: true,
    showLegend: true,
    responsive: true,
    animate: true,
    ...config
  }

  return (
    <div className={`cash-flow-chart ${className}`}>
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        <BarChart data={data} margin={chartConfig.margin}>
          {chartConfig.showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          )}
          <XAxis 
            dataKey="name" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatKES(value, true)}
          />
          {chartConfig.showTooltip && (
            <Tooltip 
              content={<CustomTooltip formatValue={(value) => formatKES(value)} />}
            />
          )}
          {chartConfig.showLegend && (
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
            />
          )}
          <Bar 
            dataKey="income" 
            fill={chartConfig.colors![0]}
            name="Income"
            animationDuration={chartConfig.animate ? 1000 : 0}
          />
          <Bar 
            dataKey="expenses" 
            fill={chartConfig.colors![4]}
            name="Expenses"
            animationDuration={chartConfig.animate ? 1000 : 0}
          />
          <Line
            type="monotone"
            dataKey="netFlow"
            stroke={chartConfig.colors![2]}
            strokeWidth={3}
            name="Net Cash Flow"
            animationDuration={chartConfig.animate ? 1000 : 0}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart Container Component with Loading and Error States
export interface ChartContainerProps {
  title: string
  children: React.ReactNode
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  className?: string
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  loading = false,
  error = null,
  onRefresh,
  className = ''
}) => {
  if (error) {
    return (
      <div className={`chart-container bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm mb-4">Failed to load chart data</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`chart-container bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`chart-container bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh chart data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// Chart utilities and helpers
export const ChartUtils = {
  formatKES,
  DEFAULT_COLORS,

  // Generate chart data from raw data
  generateTimeSeriesData: (rawData: any[], dateKey: string, valueKey: string): TimeSeriesDataPoint[] => {
    return rawData.map(item => ({
      date: new Date(item[dateKey]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: item[valueKey],
      ...item
    }))
  },

  // Generate multi-series data
  generateMultiSeriesData: (rawData: any[], nameKey: string, valueKeys: string[]): MultiSeriesDataPoint[] => {
    return rawData.map(item => {
      const result: MultiSeriesDataPoint = { name: item[nameKey] }
      valueKeys.forEach(key => {
        result[key] = item[key]
      })
      return result
    })
  },

  // Calculate percentage data for pie charts
  calculatePercentages: (data: ChartDataPoint[]): ChartDataPoint[] => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map(item => ({
      ...item,
      percentage: (item.value / total) * 100
    }))
  },

  // Get responsive chart height based on screen size
  getResponsiveHeight: (baseHeight: number = 300): number => {
    if (typeof window === 'undefined') return baseHeight

    const width = window.innerWidth
    if (width < 768) return Math.max(baseHeight * 0.8, 200) // Mobile
    if (width < 1024) return baseHeight * 0.9 // Tablet
    return baseHeight // Desktop
  }
}

// Export all chart components
export {
  formatKES,
  DEFAULT_COLORS,
  CustomTooltip
}
