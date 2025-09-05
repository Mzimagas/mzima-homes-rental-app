/**
 * Table Widget Component
 * Placeholder for data table widget
 * Will be fully implemented in the data visualization phase
 */

'use client'

import React from 'react'
import { TableCellsIcon } from '@heroicons/react/24/outline'
import { BaseWidget, BaseWidgetProps } from './BaseWidget'

export interface TableWidgetProps extends Omit<BaseWidgetProps, 'children'> {
  columns?: string[]
  pageSize?: number
  sortable?: boolean
  filterable?: boolean
}

export const TableWidget: React.FC<TableWidgetProps> = ({
  columns = [],
  pageSize = 10,
  sortable = true,
  filterable = true,
  ...baseProps
}) => {
  return (
    <BaseWidget {...baseProps}>
      <div className="table-widget h-full flex flex-col items-center justify-center text-gray-500">
        <TableCellsIcon className="w-12 h-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">Table Widget</h3>
        <p className="text-sm text-center">
          Data table with sorting and filtering
        </p>
        <div className="mt-4 text-xs text-gray-400">
          <p>Columns: {columns.length || 'Auto'}</p>
          <p>Page Size: {pageSize}</p>
          <p>Sortable: {sortable ? 'Yes' : 'No'}</p>
          <p>Filterable: {filterable ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </BaseWidget>
  )
}

export default TableWidget
