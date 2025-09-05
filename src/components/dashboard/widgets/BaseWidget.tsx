/**
 * Base Widget Component
 * Foundation component for all dashboard widgets following design system patterns
 * Provides common functionality: loading, error handling, refresh, and responsive design
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { 
  ArrowPathIcon, 
  Cog6ToothIcon, 
  EllipsisVerticalIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline'
import { ResponsiveCard } from '../../layout/ResponsiveContainer'
import { LoadingSpinner } from '../../ui/loading'
import { ErrorMessage } from '../../ui/error'
import { DashboardWidget, WidgetSize } from '../../../presentation/stores/dashboardStore'

// Widget props interface
export interface BaseWidgetProps {
  widget: DashboardWidget
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onEdit?: () => void
  onRemove?: () => void
  onResize?: (size: WidgetSize) => void
  onMove?: (position: { x: number; y: number }) => void
  className?: string
  children?: React.ReactNode
  // Customization props
  isCustomizing?: boolean
  isDragging?: boolean
  isResizing?: boolean
}

// Widget header component
interface WidgetHeaderProps {
  title: string
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onEdit?: () => void
  onRemove?: () => void
  onResize?: (size: WidgetSize) => void
  isCustomizing?: boolean
  showActions?: boolean
}

const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  title,
  loading = false,
  error = null,
  onRefresh,
  onEdit,
  onRemove,
  onResize,
  isCustomizing = false,
  showActions = true
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRefresh = useCallback(() => {
    if (onRefresh && !loading) {
      onRefresh()
    }
  }, [onRefresh, loading])

  return (
    <div className="widget-header flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <h3 className="widget-title text-lg font-semibold text-gray-900 truncate">
          {title}
        </h3>
        {error && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-red-500 rounded-full" title="Error occurred" />
          </div>
        )}
      </div>
      
      {showActions && (
        <div className="flex items-center space-x-1">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="widget-action-btn p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh widget"
            title="Refresh"
          >
            <ArrowPathIcon 
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
            />
          </button>

          {/* Settings/More actions menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="widget-action-btn p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
              aria-label="Widget options"
              title="Options"
            >
              <EllipsisVerticalIcon className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit()
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Configure</span>
                  </button>
                )}
                
                {onResize && (
                  <>
                    <button
                      onClick={() => {
                        onResize('small')
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <ArrowsPointingInIcon className="w-4 h-4" />
                      <span>Make Smaller</span>
                    </button>
                    <button
                      onClick={() => {
                        onResize('large')
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <ArrowsPointingOutIcon className="w-4 h-4" />
                      <span>Make Larger</span>
                    </button>
                  </>
                )}

                {isCustomizing && onRemove && (
                  <>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={() => {
                        onRemove()
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <span>Remove Widget</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Widget content wrapper
interface WidgetContentProps {
  children: React.ReactNode
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  minHeight?: string
}

const WidgetContent: React.FC<WidgetContentProps> = ({
  children,
  loading = false,
  error = null,
  onRetry,
  minHeight = '120px'
}) => {
  if (error) {
    return (
      <div className="widget-content" style={{ minHeight }}>
        <ErrorMessage
          title="Widget Error"
          message={error}
          onRetry={onRetry}
          className="border-0 bg-transparent p-0"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div 
        className="widget-content flex items-center justify-center" 
        style={{ minHeight }}
      >
        <div className="flex flex-col items-center space-y-2">
          <LoadingSpinner size="md" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="widget-content" style={{ minHeight }}>
      {children}
    </div>
  )
}

// Main BaseWidget component
export const BaseWidget: React.FC<BaseWidgetProps> = ({
  widget,
  loading = false,
  error = null,
  onRefresh,
  onEdit,
  onRemove,
  onResize,
  onMove,
  className = '',
  children,
  isCustomizing = false,
  isDragging = false,
  isResizing = false
}) => {
  const widgetRef = useRef<HTMLDivElement>(null)

  // Widget size classes
  const sizeClasses = {
    small: 'widget-size-small',
    medium: 'widget-size-medium', 
    large: 'widget-size-large',
    full: 'widget-size-full'
  }

  // Drag and drop handlers (placeholder for future implementation)
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!isCustomizing) {
      e.preventDefault()
      return
    }
    
    e.dataTransfer.setData('text/plain', widget.id)
    e.dataTransfer.effectAllowed = 'move'
  }, [isCustomizing, widget.id])

  const handleDragEnd = useCallback(() => {
    // Handle drag end
  }, [])

  // Retry handler for errors
  const handleRetry = useCallback(() => {
    if (onRefresh) {
      onRefresh()
    }
  }, [onRefresh])

  return (
    <div
      ref={widgetRef}
      className={`
        dashboard-widget
        ${sizeClasses[widget.size]}
        ${isCustomizing ? 'widget-customizing' : ''}
        ${isDragging ? 'widget-dragging' : ''}
        ${isResizing ? 'widget-resizing' : ''}
        ${className}
      `}
      data-widget-id={widget.id}
      data-widget-type={widget.type}
      draggable={isCustomizing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ResponsiveCard
        className={`
          h-full transition-all duration-200 ease-in-out
          ${isCustomizing ? 'ring-2 ring-blue-200 ring-opacity-50' : ''}
          ${isDragging ? 'opacity-50 transform rotate-2' : ''}
          ${error ? 'border-red-200 bg-red-50' : ''}
        `}
        padding="md"
        shadow={isDragging ? 'lg' : 'md'}
      >
        <WidgetHeader
          title={widget.title}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          onEdit={onEdit}
          onRemove={onRemove}
          onResize={onResize}
          isCustomizing={isCustomizing}
        />
        
        <WidgetContent
          loading={loading}
          error={error}
          onRetry={handleRetry}
        >
          {children}
        </WidgetContent>
      </ResponsiveCard>
    </div>
  )
}

// Widget skeleton for loading states
export const WidgetSkeleton: React.FC<{ 
  size: WidgetSize
  className?: string 
}> = ({ size, className = '' }) => {
  const sizeClasses = {
    small: 'widget-size-small',
    medium: 'widget-size-medium',
    large: 'widget-size-large', 
    full: 'widget-size-full'
  }

  return (
    <div className={`dashboard-widget ${sizeClasses[size]} ${className}`}>
      <ResponsiveCard className="h-full">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            <div className="flex space-x-1">
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </ResponsiveCard>
    </div>
  )
}

export default BaseWidget
