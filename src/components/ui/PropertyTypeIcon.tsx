"use client"
import { type PropertyType, getPropertyTypeLabel, getPropertyTypeColor } from '../../lib/validation/property'

interface PropertyTypeIconProps {
  type: PropertyType
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'emoji' | 'svg' | 'background'
  className?: string
}

// SVG icon components for each property type
const PropertyTypeSVGs = {
  HOME: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  HOSTEL: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  STALL: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  RESIDENTIAL_LAND: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  COMMERCIAL_LAND: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8h4m-4 4h4" />
    </svg>
  ),
  AGRICULTURAL_LAND: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  MIXED_USE_LAND: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
    </svg>
  )
}

// Emoji icons for each property type
const PropertyTypeEmojis = {
  HOME: '🏠',
  HOSTEL: '🏢',
  STALL: '🏪',
  RESIDENTIAL_LAND: '🏞️',
  COMMERCIAL_LAND: '🏗️',
  AGRICULTURAL_LAND: '🌾',
  MIXED_USE_LAND: '🏘️'
}

export default function PropertyTypeIcon({ 
  type, 
  size = 'md', 
  variant = 'svg',
  className = '' 
}: PropertyTypeIconProps) {
  const label = getPropertyTypeLabel(type)
  const color = getPropertyTypeColor(type)

  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  }

  const emojiSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl'
  }

  // Color classes for SVG icons
  const colorClasses = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
    gray: 'text-gray-600'
  }

  // Background color classes
  const backgroundClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    orange: 'bg-orange-100 text-orange-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    gray: 'bg-gray-100 text-gray-600'
  }

  if (variant === 'emoji') {
    return (
      <span 
        className={`${emojiSizeClasses[size]} ${className}`}
        role="img" 
        aria-label={`${label} icon`}
        title={label}
      >
        {PropertyTypeEmojis[type]}
      </span>
    )
  }

  if (variant === 'background') {
    const SVGComponent = PropertyTypeSVGs[type]
    const backgroundClass = backgroundClasses[color as keyof typeof backgroundClasses] || backgroundClasses.gray
    
    return (
      <div 
        className={`inline-flex items-center justify-center rounded-full p-2 ${backgroundClass} ${className}`}
        title={label}
      >
        <SVGComponent className={sizeClasses[size]} />
      </div>
    )
  }

  // Default SVG variant
  const SVGComponent = PropertyTypeSVGs[type]
  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.gray

  return (
    <SVGComponent 
      className={`${sizeClasses[size]} ${colorClass} ${className}`}
      title={label}
    />
  )
}

// Utility components for common use cases
export function PropertyTypeIconSmall({ type, className = '' }: { type: PropertyType; className?: string }) {
  return <PropertyTypeIcon type={type} size="sm" variant="svg" className={className} />
}

export function PropertyTypeIconLarge({ type, className = '' }: { type: PropertyType; className?: string }) {
  return <PropertyTypeIcon type={type} size="lg" variant="background" className={className} />
}

export function PropertyTypeIconEmoji({ type, size = 'md', className = '' }: { type: PropertyType; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <PropertyTypeIcon type={type} size={size} variant="emoji" className={className} />
}

// Icon with label component
interface PropertyTypeIconWithLabelProps {
  type: PropertyType
  size?: 'sm' | 'md' | 'lg'
  iconVariant?: 'emoji' | 'svg' | 'background'
  className?: string
}

export function PropertyTypeIconWithLabel({ 
  type, 
  size = 'md', 
  iconVariant = 'svg',
  className = '' 
}: PropertyTypeIconWithLabelProps) {
  const label = getPropertyTypeLabel(type)
  
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const spacingClasses = {
    sm: 'space-x-1.5',
    md: 'space-x-2',
    lg: 'space-x-3'
  }

  return (
    <div className={`inline-flex items-center ${spacingClasses[size]} ${className}`}>
      <PropertyTypeIcon type={type} size={size} variant={iconVariant} />
      <span className={`${textSizeClasses[size]} font-medium`}>
        {label}
      </span>
    </div>
  )
}
