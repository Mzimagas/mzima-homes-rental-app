/**
 * Chart Widget Component
 * Placeholder for chart visualization widget
 * Will be fully implemented in the data visualization phase
 */

'use client'

import React from 'react'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import { BaseWidget, BaseWidgetProps } from './BaseWidget'

export interface ChartWidgetProps extends Omit<BaseWidgetProps, 'children'> {
  chartType?: 'line' | 'bar' | 'pie' | 'area'
  dataSource?: string
  timeRange?: string
  showLegend?: boolean
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  chartType = 'line',
  dataSource = 'default',
  timeRange = 'month',
  showLegend = true,
  ...baseProps
}) => {
  return (
    <BaseWidget {...baseProps}>
      <div className="chart-widget h-full flex flex-col items-center justify-center text-gray-500">
        <ChartBarIcon className="w-12 h-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">Chart Widget</h3>
        <p className="text-sm text-center">
          {chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart visualization
        </p>
        <div className="mt-4 text-xs text-gray-400">
          <p>Data Source: {dataSource}</p>
          <p>Time Range: {timeRange}</p>
          <p>Legend: {showLegend ? 'Enabled' : 'Disabled'}</p>
        </div>
      </div>
    </BaseWidget>
  )
}

export default ChartWidget
