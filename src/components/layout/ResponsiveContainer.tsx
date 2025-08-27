'use client'

import React from 'react'

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  mobileLayout?: 'stack' | 'grid' | 'flex'
}

export default function ResponsiveContainer({
  children,
  className = '',
  maxWidth = 'full',
  padding = 'md',
  mobileLayout = 'stack',
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  }

  const paddingClasses = {
    none: '',
    sm: 'px-2 py-2 sm:px-4 sm:py-4',
    md: 'px-4 py-4 sm:px-6 sm:py-6',
    lg: 'px-6 py-6 sm:px-8 sm:py-8',
  }

  const mobileLayoutClasses = {
    stack: 'flex flex-col space-y-4 md:space-y-6',
    grid: 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6',
    flex: 'flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0',
  }

  return (
    <div
      className={`
      w-full mx-auto
      ${maxWidthClasses[maxWidth]}
      ${paddingClasses[padding]}
      ${mobileLayoutClasses[mobileLayout]}
      ${className}
    `}
    >
      {children}
    </div>
  )
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = '',
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2 md:gap-4',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
  }

  const gridClasses = `
    grid
    grid-cols-${columns.mobile || 1}
    md:grid-cols-${columns.tablet || 2}
    lg:grid-cols-${columns.desktop || 3}
    ${gapClasses[gap]}
  `

  return <div className={`${gridClasses} ${className}`}>{children}</div>
}

// Responsive Card Component
interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  mobileFullWidth?: boolean
}

export function ResponsiveCard({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  border = true,
  mobileFullWidth = true,
}: ResponsiveCardProps) {
  const paddingClasses = {
    sm: 'p-3 md:p-4',
    md: 'p-4 md:p-6',
    lg: 'p-6 md:p-8',
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }

  return (
    <div
      className={`
      bg-white rounded-lg
      ${paddingClasses[padding]}
      ${shadowClasses[shadow]}
      ${border ? 'border border-gray-200' : ''}
      ${mobileFullWidth ? 'w-full' : ''}
      ${className}
    `}
    >
      {children}
    </div>
  )
}

// Responsive Stack Component
interface ResponsiveStackProps {
  children: React.ReactNode
  spacing?: 'sm' | 'md' | 'lg'
  direction?: 'vertical' | 'horizontal' | 'responsive'
  align?: 'start' | 'center' | 'end' | 'stretch'
  className?: string
}

export function ResponsiveStack({
  children,
  spacing = 'md',
  direction = 'vertical',
  align = 'stretch',
  className = '',
}: ResponsiveStackProps) {
  const spacingClasses = {
    sm: 'space-y-2 md:space-y-3',
    md: 'space-y-4 md:space-y-6',
    lg: 'space-y-6 md:space-y-8',
  }

  const horizontalSpacingClasses = {
    sm: 'space-x-2 md:space-x-3',
    md: 'space-x-4 md:space-x-6',
    lg: 'space-x-6 md:space-x-8',
  }

  const directionClasses = {
    vertical: 'flex flex-col',
    horizontal: 'flex flex-row',
    responsive: 'flex flex-col md:flex-row',
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  }

  const isHorizontal = direction === 'horizontal' || direction === 'responsive'

  return (
    <div
      className={`
      ${directionClasses[direction]}
      ${alignClasses[align]}
      ${isHorizontal ? horizontalSpacingClasses[spacing] : spacingClasses[spacing]}
      ${direction === 'responsive' ? 'md:space-y-0' : ''}
      ${className}
    `}
    >
      {children}
    </div>
  )
}

// Responsive Text Component
interface ResponsiveTextProps {
  children: React.ReactNode
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  color?: 'gray' | 'black' | 'blue' | 'red' | 'green'
  className?: string
  responsive?: boolean
}

export function ResponsiveText({
  children,
  size = 'base',
  weight = 'normal',
  color = 'gray',
  className = '',
  responsive = true,
}: ResponsiveTextProps) {
  const sizeClasses = responsive
    ? {
        xs: 'text-xs md:text-sm',
        sm: 'text-sm md:text-base',
        base: 'text-base md:text-lg',
        lg: 'text-lg md:text-xl',
        xl: 'text-xl md:text-2xl',
        '2xl': 'text-2xl md:text-3xl',
        '3xl': 'text-3xl md:text-4xl',
      }
    : {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
      }

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  }

  const colorClasses = {
    gray: 'text-gray-900',
    black: 'text-black',
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
  }

  return (
    <span
      className={`
      ${sizeClasses[size]}
      ${weightClasses[weight]}
      ${colorClasses[color]}
      ${className}
    `}
    >
      {children}
    </span>
  )
}
