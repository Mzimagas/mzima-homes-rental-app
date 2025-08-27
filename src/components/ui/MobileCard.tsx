'use client'

import React, { ReactNode } from 'react'

interface MobileCardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  shadow?: 'sm' | 'md' | 'lg'
  rounded?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  touchOptimized?: boolean
}

/**
 * Mobile-optimized card component with touch-friendly interactions
 */
export default function MobileCard({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  rounded = 'md',
  onClick,
  touchOptimized = true,
}: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }

  const roundedClasses = {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
  }

  const baseClasses = `
    bg-white 
    ${shadowClasses[shadow]} 
    ${roundedClasses[rounded]} 
    ${paddingClasses[padding]}
    ${touchOptimized ? 'touch-manipulation' : ''}
    ${onClick ? 'cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98]' : ''}
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ')

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        style={touchOptimized ? { minHeight: '44px' } : undefined}
      >
        {children}
      </button>
    )
  }

  return <div className={baseClasses}>{children}</div>
}
