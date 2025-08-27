'use client'

import React, { ReactNode } from 'react'

interface MobileTableColumn {
  key: string
  label: string
  render?: (value: any, row: any) => ReactNode
  mobileHidden?: boolean
  priority?: 'high' | 'medium' | 'low'
}

interface MobileTableProps {
  data: any[]
  columns: MobileTableColumn[]
  className?: string
  onRowClick?: (row: any) => void
  loading?: boolean
  emptyMessage?: string
  mobileCardView?: boolean
}

/**
 * Mobile-optimized table component that switches to card view on small screens
 */
export default function MobileTable({
  data,
  columns,
  className = '',
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  mobileCardView = true,
}: MobileTableProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">{emptyMessage}</div>
      </div>
    )
  }

  // Mobile card view
  if (mobileCardView) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {data.map((row, index) => {
            const highPriorityColumns = columns.filter(
              (col) => col.priority === 'high' || !col.priority
            )
            const mediumPriorityColumns = columns.filter((col) => col.priority === 'medium')

            return (
              <div
                key={index}
                onClick={() => onRowClick?.(row)}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${
                  onRowClick
                    ? 'cursor-pointer active:scale-[0.98] transition-transform duration-150'
                    : ''
                }`}
                style={{ minHeight: onRowClick ? '44px' : 'auto' }}
              >
                {/* High priority fields - always visible */}
                <div className="space-y-2">
                  {highPriorityColumns.map((column) => (
                    <div key={column.key} className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-900 flex-1">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Medium priority fields - smaller text */}
                {mediumPriorityColumns.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    {mediumPriorityColumns.map((column) => (
                      <div key={column.key} className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{column.label}:</span>
                        <span className="text-xs text-gray-700">
                          {column.render ? column.render(row[column.key], row) : row[column.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tap indicator for clickable rows */}
                {onRowClick && (
                  <div className="mt-3 flex justify-end">
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Standard table view only
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.mobileHidden ? 'hidden sm:table-cell' : ''
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                    column.mobileHidden ? 'hidden sm:table-cell' : ''
                  }`}
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
