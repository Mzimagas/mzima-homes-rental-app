/**
 * Widget Grid System
 * Responsive grid layout for dashboard widgets with drag-and-drop support
 * Follows design system specifications for responsive breakpoints
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { DashboardWidget, WidgetSize } from '../../../presentation/stores/dashboardStore'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'
import WidgetFactory from '../widgets/WidgetFactory'

// Grid configuration
export interface GridConfig {
  columns: number
  gap: number
  minWidgetWidth: number
  maxWidgetWidth: number
  rowHeight: number
}

// Responsive grid configurations
const GRID_CONFIGS: Record<string, GridConfig> = {
  mobile: {
    columns: 1,
    gap: 16,
    minWidgetWidth: 280,
    maxWidgetWidth: 400,
    rowHeight: 200
  },
  tablet: {
    columns: 2,
    gap: 20,
    minWidgetWidth: 300,
    maxWidgetWidth: 500,
    rowHeight: 220
  },
  desktop: {
    columns: 4,
    gap: 24,
    minWidgetWidth: 250,
    maxWidgetWidth: 400,
    rowHeight: 240
  },
  wide: {
    columns: 6,
    gap: 24,
    minWidgetWidth: 200,
    maxWidgetWidth: 350,
    rowHeight: 240
  }
}

// Widget size mappings
const WIDGET_SIZE_MAP: Record<WidgetSize, { width: number; height: number }> = {
  small: { width: 1, height: 1 },
  medium: { width: 2, height: 1 },
  large: { width: 4, height: 2 },
  full: { width: 6, height: 1 }
}

// Grid item position
export interface GridPosition {
  x: number
  y: number
  width: number
  height: number
}

// Widget grid props
export interface WidgetGridProps {
  widgets: DashboardWidget[]
  isCustomizing?: boolean
  onWidgetMove?: (widgetId: string, position: GridPosition) => void
  onWidgetResize?: (widgetId: string, size: WidgetSize) => void
  onWidgetRemove?: (widgetId: string) => void
  className?: string
}

// Grid item component
interface GridItemProps {
  widget: DashboardWidget
  position: GridPosition
  gridConfig: GridConfig
  isCustomizing: boolean
  isDragging: boolean
  isResizing: boolean
  onDragStart: (widgetId: string, event: React.DragEvent) => void
  onDragEnd: () => void
  onResizeStart: (widgetId: string) => void
  onResizeEnd: () => void
  onRemove: (widgetId: string) => void
}

const GridItem: React.FC<GridItemProps> = ({
  widget,
  position,
  gridConfig,
  isCustomizing,
  isDragging,
  isResizing,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onResizeEnd,
  onRemove
}) => {
  const itemRef = useRef<HTMLDivElement>(null)
  
  // Calculate item styles based on grid position
  const getItemStyles = (): React.CSSProperties => {
    const { columns, gap, rowHeight } = gridConfig
    const columnWidth = `calc((100% - ${gap * (columns - 1)}px) / ${columns})`
    
    return {
      gridColumn: `${position.x + 1} / span ${position.width}`,
      gridRow: `${position.y + 1} / span ${position.height}`,
      minHeight: `${rowHeight * position.height + gap * (position.height - 1)}px`,
      transition: isDragging || isResizing ? 'none' : 'all 0.2s ease-in-out'
    }
  }
  
  // Handle drag start
  const handleDragStart = (event: React.DragEvent) => {
    if (!isCustomizing) {
      event.preventDefault()
      return
    }
    onDragStart(widget.id, event)
  }
  
  // Handle resize controls
  const renderResizeControls = () => {
    if (!isCustomizing || !widget.permissions.canResize) return null
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Corner resize handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-tl-md cursor-se-resize pointer-events-auto opacity-75 hover:opacity-100"
          onMouseDown={() => onResizeStart(widget.id)}
          title="Resize widget"
        />
        
        {/* Edge resize handles */}
        <div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-blue-500 rounded-t-md cursor-s-resize pointer-events-auto opacity-50 hover:opacity-75"
          onMouseDown={() => onResizeStart(widget.id)}
        />
        <div
          className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-blue-500 rounded-l-md cursor-e-resize pointer-events-auto opacity-50 hover:opacity-75"
          onMouseDown={() => onResizeStart(widget.id)}
        />
      </div>
    )
  }
  
  // Handle remove button
  const renderRemoveButton = () => {
    if (!isCustomizing || !widget.permissions.canDelete) return null
    
    return (
      <button
        onClick={() => onRemove(widget.id)}
        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10"
        title="Remove widget"
      >
        ×
      </button>
    )
  }

  return (
    <div
      ref={itemRef}
      style={getItemStyles()}
      className={`
        relative widget-grid-item
        ${isCustomizing ? 'cursor-move' : ''}
        ${isDragging ? 'opacity-50 z-50' : ''}
        ${isResizing ? 'z-40' : ''}
      `}
      draggable={isCustomizing && widget.permissions.canMove}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Widget content */}
      {WidgetFactory.create(widget, {
        isCustomizing,
        isDragging,
        isResizing,
        onRefresh: () => {
          // Handle widget refresh
        },
        onEdit: () => {
          // Handle widget edit
        },
        onRemove: () => onRemove(widget.id),
        onResize: (size: WidgetSize) => {
          // Handle widget resize
        }
      })}
      
      {/* Customization controls */}
      {renderResizeControls()}
      {renderRemoveButton()}
    </div>
  )
}

/**
 * Main Widget Grid Component
 */
export const WidgetGrid: React.FC<WidgetGridProps> = ({
  widgets,
  isCustomizing = false,
  onWidgetMove,
  onWidgetResize,
  onWidgetRemove,
  className = ''
}) => {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [resizingWidget, setResizingWidget] = useState<string | null>(null)
  const [gridConfig, setGridConfig] = useState<GridConfig>(GRID_CONFIGS.desktop)
  const gridRef = useRef<HTMLDivElement>(null)
  
  // Responsive grid configuration
  useEffect(() => {
    const updateGridConfig = () => {
      const width = window.innerWidth
      
      if (width < 768) {
        setGridConfig(GRID_CONFIGS.mobile)
      } else if (width < 1024) {
        setGridConfig(GRID_CONFIGS.tablet)
      } else if (width < 1440) {
        setGridConfig(GRID_CONFIGS.desktop)
      } else {
        setGridConfig(GRID_CONFIGS.wide)
      }
    }
    
    updateGridConfig()
    window.addEventListener('resize', updateGridConfig)
    
    return () => window.removeEventListener('resize', updateGridConfig)
  }, [])
  
  // Calculate widget positions
  const calculatePositions = useCallback(() => {
    const positions = new Map<string, GridPosition>()
    const occupiedCells = new Set<string>()
    
    // Sort widgets by their current position or creation order
    const sortedWidgets = [...widgets].sort((a, b) => {
      const aPos = a.position
      const bPos = b.position
      
      if (aPos.y !== bPos.y) return aPos.y - bPos.y
      return aPos.x - bPos.x
    })
    
    sortedWidgets.forEach(widget => {
      const sizeConfig = WIDGET_SIZE_MAP[widget.size]
      let position: GridPosition
      
      // Try to use the widget's preferred position
      if (widget.position && isPositionAvailable(widget.position, occupiedCells, gridConfig.columns)) {
        position = widget.position
      } else {
        // Find the next available position
        position = findNextAvailablePosition(sizeConfig, occupiedCells, gridConfig.columns)
      }
      
      positions.set(widget.id, position)
      markCellsAsOccupied(position, occupiedCells)
    })
    
    return positions
  }, [widgets, gridConfig])
  
  // Check if position is available
  const isPositionAvailable = (
    position: GridPosition,
    occupiedCells: Set<string>,
    columns: number
  ): boolean => {
    // Check if position fits within grid
    if (position.x + position.width > columns) return false
    
    // Check if any cells are occupied
    for (let y = position.y; y < position.y + position.height; y++) {
      for (let x = position.x; x < position.x + position.width; x++) {
        if (occupiedCells.has(`${x},${y}`)) return false
      }
    }
    
    return true
  }
  
  // Find next available position
  const findNextAvailablePosition = (
    sizeConfig: { width: number; height: number },
    occupiedCells: Set<string>,
    columns: number
  ): GridPosition => {
    let y = 0
    
    while (true) {
      for (let x = 0; x <= columns - sizeConfig.width; x++) {
        const position: GridPosition = {
          x,
          y,
          width: Math.min(sizeConfig.width, columns),
          height: sizeConfig.height
        }
        
        if (isPositionAvailable(position, occupiedCells, columns)) {
          return position
        }
      }
      y++
    }
  }
  
  // Mark cells as occupied
  const markCellsAsOccupied = (position: GridPosition, occupiedCells: Set<string>) => {
    for (let y = position.y; y < position.y + position.height; y++) {
      for (let x = position.x; x < position.x + position.width; x++) {
        occupiedCells.add(`${x},${y}`)
      }
    }
  }
  
  // Handle drag start
  const handleDragStart = useCallback((widgetId: string, event: React.DragEvent) => {
    setDraggedWidget(widgetId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', widgetId)
  }, [])
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null)
  }, [])
  
  // Handle resize start
  const handleResizeStart = useCallback((widgetId: string) => {
    setResizingWidget(widgetId)
  }, [])
  
  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setResizingWidget(null)
  }, [])
  
  // Handle widget remove
  const handleWidgetRemove = useCallback((widgetId: string) => {
    if (onWidgetRemove) {
      onWidgetRemove(widgetId)
    }
  }, [onWidgetRemove])
  
  // Calculate grid styles
  const getGridStyles = (): React.CSSProperties => {
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${gridConfig.columns}, 1fr)`,
      gap: `${gridConfig.gap}px`,
      gridAutoRows: `${gridConfig.rowHeight}px`
    }
  }
  
  const positions = calculatePositions()

  return (
    <div
      ref={gridRef}
      className={`widget-grid ${className} ${isCustomizing ? 'customizing' : ''}`}
      style={getGridStyles()}
    >
      {widgets.map(widget => {
        const position = positions.get(widget.id)
        if (!position) return null
        
        return (
          <GridItem
            key={widget.id}
            widget={widget}
            position={position}
            gridConfig={gridConfig}
            isCustomizing={isCustomizing}
            isDragging={draggedWidget === widget.id}
            isResizing={resizingWidget === widget.id}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
            onRemove={handleWidgetRemove}
          />
        )
      })}
      
      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium mb-2">No widgets configured</h3>
          <p className="text-sm text-center">
            {isCustomizing 
              ? 'Add widgets to customize your dashboard'
              : 'Contact your administrator to configure dashboard widgets'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default WidgetGrid
