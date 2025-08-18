'use client'

import { useState, ReactNode } from 'react'

export interface TabItem {
  id: string
  name: string
  count?: number
  icon?: ReactNode
  disabled?: boolean
  badge?: {
    text: string
    variant: 'success' | 'warning' | 'error' | 'info'
  }
}

interface EnhancedTabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline' | 'cards'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function EnhancedTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  size = 'md',
  className = ''
}: EnhancedTabsProps) {
  const sizeClasses = {
    sm: 'text-sm px-3 py-2',
    md: 'text-sm px-4 py-3',
    lg: 'text-base px-6 py-4'
  }

  const getBadgeClasses = (badgeVariant: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return variants[badgeVariant as keyof typeof variants] || variants.info
  }

  const renderTab = (tab: TabItem) => {
    const isActive = activeTab === tab.id
    const baseClasses = `
      relative inline-flex items-center justify-center font-medium transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${sizeClasses[size]}
      ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `

    let variantClasses = ''
    
    switch (variant) {
      case 'pills':
        variantClasses = isActive
          ? 'bg-blue-600 text-white shadow-lg transform scale-105'
          : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 hover:border-gray-300'
        break
      case 'cards':
        variantClasses = isActive
          ? 'bg-white text-blue-600 shadow-lg border-2 border-blue-200 transform translate-y-[-2px]'
          : 'bg-gray-50 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200 hover:shadow-md hover:border-gray-300'
        break
      case 'underline':
      default:
        variantClasses = isActive
          ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
          : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
        break
    }

    return (
      <button
        key={tab.id}
        onClick={() => !tab.disabled && onTabChange(tab.id)}
        disabled={tab.disabled}
        className={`${baseClasses} ${variantClasses} group`}
        role="tab"
        aria-selected={isActive}
        aria-controls={`tabpanel-${tab.id}`}
      >
        {/* Icon */}
        {tab.icon && (
          <span className={`${tab.name ? 'mr-2' : ''} flex-shrink-0`}>
            {tab.icon}
          </span>
        )}

        {/* Tab Name */}
        <span className="flex items-center">
          {tab.name}
          
          {/* Count */}
          {tab.count !== undefined && (
            <span className={`
              ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium
              ${isActive 
                ? variant === 'pills' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
              }
            `}>
              {tab.count}
            </span>
          )}
        </span>

        {/* Badge */}
        {tab.badge && (
          <span className={`
            ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
            ${getBadgeClasses(tab.badge.variant)}
          `}>
            {tab.badge.text}
          </span>
        )}

        {/* Active indicator for pills and cards */}
        {isActive && (variant === 'pills' || variant === 'cards') && (
          <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
        )}
      </button>
    )
  }

  const containerClasses = {
    default: 'flex space-x-1',
    pills: 'flex space-x-2',
    underline: 'flex space-x-8 border-b border-gray-200',
    cards: 'flex space-x-2 p-1 bg-gray-100 rounded-lg'
  }

  return (
    <div className={`${containerClasses[variant]} ${className}`} role="tablist">
      {tabs.map(renderTab)}
    </div>
  )
}

// Enhanced Tab Content Container
interface TabContentProps {
  activeTab: string
  children: ReactNode
  className?: string
}

export function TabContent({ activeTab, children, className = '' }: TabContentProps) {
  return (
    <div 
      className={`mt-6 ${className}`}
      role="tabpanel"
      id={`tabpanel-${activeTab}`}
      aria-labelledby={`tab-${activeTab}`}
    >
      {children}
    </div>
  )
}

// Enhanced Card Component for Tab Content
interface TabCardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function TabCard({ 
  title, 
  subtitle, 
  action, 
  children, 
  className = '',
  padding = 'md'
}: TabCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div className={`
      bg-white rounded-xl shadow-sm border border-gray-200 
      hover:shadow-md transition-shadow duration-200
      ${paddingClasses[padding]} ${className}
    `}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-6">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0 ml-4">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// Stats Grid Component for Tab Content
interface StatItem {
  label: string
  value: string | number
  change?: {
    value: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: ReactNode
}

interface StatsGridProps {
  stats: StatItem[]
  columns?: 2 | 3 | 4
  className?: string
}

export function StatsGrid({ stats, columns = 4, className = '' }: StatsGridProps) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={`grid ${gridClasses[columns]} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              {stat.change && (
                <div className={`flex items-center mt-2 text-sm ${
                  stat.change.type === 'increase' ? 'text-green-600' :
                  stat.change.type === 'decrease' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.change.type === 'increase' && (
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.change.type === 'decrease' && (
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.change.value}
                </div>
              )}
            </div>
            {stat.icon && (
              <div className="flex-shrink-0 text-gray-400">
                {stat.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
