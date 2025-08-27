'use client'
import {
  type PropertyType,
  getPropertyTypeLabel,
  getPropertyTypeIcon,
  getPropertyTypeColor,
} from '../../lib/validation/property'

interface PropertyTypeBadgeProps {
  type: PropertyType
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'solid'
  showIcon?: boolean
  className?: string
}

export default function PropertyTypeBadge({
  type,
  size = 'md',
  variant = 'default',
  showIcon = true,
  className = '',
}: PropertyTypeBadgeProps) {
  const label = getPropertyTypeLabel(type)
  const icon = getPropertyTypeIcon(type)
  const color = getPropertyTypeColor(type)

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  // Color classes based on property type
  const colorClasses = {
    blue: {
      default: 'bg-blue-100 text-blue-700 border border-blue-200',
      outline: 'border border-blue-300 text-blue-700 bg-transparent',
      solid: 'bg-blue-600 text-white border border-blue-600',
    },
    purple: {
      default: 'bg-purple-100 text-purple-700 border border-purple-200',
      outline: 'border border-purple-300 text-purple-700 bg-transparent',
      solid: 'bg-purple-600 text-white border border-purple-600',
    },
    green: {
      default: 'bg-green-100 text-green-700 border border-green-200',
      outline: 'border border-green-300 text-green-700 bg-transparent',
      solid: 'bg-green-600 text-white border border-green-600',
    },
    amber: {
      default: 'bg-amber-100 text-amber-700 border border-amber-200',
      outline: 'border border-amber-300 text-amber-700 bg-transparent',
      solid: 'bg-amber-600 text-white border border-amber-600',
    },
    orange: {
      default: 'bg-orange-100 text-orange-700 border border-orange-200',
      outline: 'border border-orange-300 text-orange-700 bg-transparent',
      solid: 'bg-orange-600 text-white border border-orange-600',
    },
    emerald: {
      default: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      outline: 'border border-emerald-300 text-emerald-700 bg-transparent',
      solid: 'bg-emerald-600 text-white border border-emerald-600',
    },
    indigo: {
      default: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
      outline: 'border border-indigo-300 text-indigo-700 bg-transparent',
      solid: 'bg-indigo-600 text-white border border-indigo-600',
    },
    gray: {
      default: 'bg-gray-100 text-gray-700 border border-gray-200',
      outline: 'border border-gray-300 text-gray-700 bg-transparent',
      solid: 'bg-gray-600 text-white border border-gray-600',
    },
  }

  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors'
  const sizeClass = sizeClasses[size]
  const colorClass =
    colorClasses[color as keyof typeof colorClasses]?.[variant] || colorClasses.gray[variant]

  return (
    <span className={`${baseClasses} ${sizeClass} ${colorClass} ${className}`}>
      {showIcon && (
        <span className="mr-1.5" role="img" aria-label={`${label} icon`}>
          {icon}
        </span>
      )}
      {label}
    </span>
  )
}

// Utility component for property type with tooltip
interface PropertyTypeBadgeWithTooltipProps extends PropertyTypeBadgeProps {
  tooltip?: string
}

export function PropertyTypeBadgeWithTooltip({
  tooltip,
  ...props
}: PropertyTypeBadgeWithTooltipProps) {
  const badge = <PropertyTypeBadge {...props} />

  if (!tooltip) return badge

  return (
    <div className="relative group">
      {badge}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
}

// Compact version for use in lists
export function PropertyTypeBadgeCompact({
  type,
  className = '',
}: {
  type: PropertyType
  className?: string
}) {
  return (
    <PropertyTypeBadge
      type={type}
      size="sm"
      variant="default"
      showIcon={true}
      className={className}
    />
  )
}

// Large version for headers
export function PropertyTypeBadgeLarge({
  type,
  className = '',
}: {
  type: PropertyType
  className?: string
}) {
  return (
    <PropertyTypeBadge
      type={type}
      size="lg"
      variant="solid"
      showIcon={true}
      className={className}
    />
  )
}
