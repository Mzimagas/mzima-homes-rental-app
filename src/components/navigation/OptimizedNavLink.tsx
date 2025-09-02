/**
 * Optimized Navigation Link Component
 * Provides smooth, seamless navigation with preloading and prefetching
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { useOptimizedLink } from '../../hooks/useNavigationOptimization'

interface OptimizedNavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  activeClassName?: string
  isActive?: boolean
  onClick?: () => void
  prefetch?: boolean
}

export default function OptimizedNavLink({
  href,
  children,
  className = '',
  activeClassName = '',
  isActive = false,
  onClick,
  prefetch = true
}: OptimizedNavLinkProps) {
  const optimizedLinkProps = useOptimizedLink(href)

  const handleClick = (e: React.MouseEvent) => {
    // Call custom onClick if provided
    onClick?.()
    
    // Use optimized navigation
    optimizedLinkProps.onClick(e)
  }

  const finalClassName = `${className} ${isActive ? activeClassName : ''}`.trim()

  return (
    <Link
      href={href}
      className={finalClassName}
      prefetch={prefetch}
      onClick={handleClick}
      onMouseEnter={optimizedLinkProps.onMouseEnter}
      onMouseLeave={optimizedLinkProps.onMouseLeave}
      onFocus={optimizedLinkProps.onFocus}
      onBlur={optimizedLinkProps.onBlur}
    >
      {children}
    </Link>
  )
}

// Specialized navigation link for sidebar
export function SidebarNavLink({
  href,
  children,
  isActive,
  icon,
  onClick
}: {
  href: string
  children: React.ReactNode
  isActive: boolean
  icon?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <OptimizedNavLink
      href={href}
      onClick={onClick}
      isActive={isActive}
      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'bg-blue-100 text-blue-900'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon && (
        <div className="flex items-center justify-center w-6 h-6 mr-3">
          {icon}
        </div>
      )}
      <span>{children}</span>
    </OptimizedNavLink>
  )
}

// Mobile navigation link with touch optimization
export function MobileNavLink({
  href,
  children,
  isActive,
  icon,
  onClick
}: {
  href: string
  children: React.ReactNode
  isActive: boolean
  icon?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <OptimizedNavLink
      href={href}
      onClick={onClick}
      isActive={isActive}
      className={`group flex items-center px-4 py-4 text-base font-medium rounded-l-md transition-colors duration-200 ${
        isActive
          ? 'bg-blue-100 text-blue-900 border-r-4 border-blue-500'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
      }`}
      style={{ minHeight: '56px' }}
    >
      {icon && (
        <div className="flex items-center justify-center w-6 h-6 mr-4">
          {icon}
        </div>
      )}
      <span className="flex-1">{children}</span>
      {isActive && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
    </OptimizedNavLink>
  )
}
