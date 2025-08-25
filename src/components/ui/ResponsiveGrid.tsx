'use client'

import React, { ReactNode } from 'react'

interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  cols?: {
    mobile?: 1 | 2
    tablet?: 1 | 2 | 3
    desktop?: 1 | 2 | 3 | 4 | 5 | 6
  }
  gap?: 'sm' | 'md' | 'lg'
  minItemWidth?: string
}

/**
 * Responsive grid component optimized for mobile-first design
 */
export default function ResponsiveGrid({
  children,
  className = '',
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  minItemWidth
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  }

  const getGridCols = () => {
    const { mobile = 1, tablet = 2, desktop = 3 } = cols
    
    if (minItemWidth) {
      return `grid-cols-[repeat(auto-fit,minmax(${minItemWidth},1fr))]`
    }
    
    return `grid-cols-${mobile} sm:grid-cols-${tablet} lg:grid-cols-${desktop}`
  }

  return (
    <div className={`grid ${getGridCols()} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}
