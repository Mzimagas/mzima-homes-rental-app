/**
 * Optimized Icon System
 * 
 * This module provides a centralized, tree-shakeable icon system that:
 * 1. Reduces bundle size by importing only used icons
 * 2. Provides consistent icon sizing and styling
 * 3. Enables easy icon replacement and theming
 * 4. Improves performance with lazy loading for rarely used icons
 */

import React, { lazy, Suspense } from 'react'

// Core icons that are used frequently - imported directly for performance
import {
  PlusIcon as HeroPlusIcon,
  TrashIcon as HeroTrashIcon,
  PencilIcon as HeroPencilIcon,
  EyeIcon as HeroEyeIcon,
  EyeSlashIcon as HeroEyeSlashIcon,
  CheckIcon as HeroCheckIcon,
  XMarkIcon as HeroXMarkIcon,
  ArrowLeftIcon as HeroArrowLeftIcon,
  ArrowRightIcon as HeroArrowRightIcon,
  ChevronDownIcon as HeroChevronDownIcon,
  ChevronUpIcon as HeroChevronUpIcon,
  MagnifyingGlassIcon as HeroMagnifyingGlassIcon,
  Cog6ToothIcon as HeroCog6ToothIcon,
  UserIcon as HeroUserIcon,
  HomeIcon as HeroHomeIcon,
  DocumentIcon as HeroDocumentIcon,
  CurrencyDollarIcon as HeroCurrencyDollarIcon,
} from '@heroicons/react/24/outline'

// Solid variants for active states
import {
  CheckIcon as HeroCheckIconSolid,
  XMarkIcon as HeroXMarkIconSolid,
  UserIcon as HeroUserIconSolid,
  HomeIcon as HeroHomeIconSolid,
} from '@heroicons/react/24/solid'

// Icon size variants
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<IconSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4', 
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
}

// Base icon props
interface BaseIconProps {
  size?: IconSize
  className?: string
  'aria-label'?: string
}

// Icon wrapper component for consistent styling
function IconWrapper({ 
  children, 
  size = 'md', 
  className = '',
  'aria-label': ariaLabel 
}: BaseIconProps & { children: React.ReactNode }) {
  return (
    <span 
      className={`inline-flex ${sizeClasses[size]} ${className}`}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      {children}
    </span>
  )
}

// Frequently used icons - optimized for performance
export function PlusIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroPlusIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function TrashIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroTrashIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function PencilIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroPencilIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function EyeIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroEyeIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function EyeSlashIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroEyeSlashIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function CheckIcon(props: BaseIconProps & { solid?: boolean }) {
  const { solid, ...iconProps } = props
  return (
    <IconWrapper {...iconProps}>
      {solid ? (
        <HeroCheckIconSolid className="h-full w-full" />
      ) : (
        <HeroCheckIcon className="h-full w-full" />
      )}
    </IconWrapper>
  )
}

export function XMarkIcon(props: BaseIconProps & { solid?: boolean }) {
  const { solid, ...iconProps } = props
  return (
    <IconWrapper {...iconProps}>
      {solid ? (
        <HeroXMarkIconSolid className="h-full w-full" />
      ) : (
        <HeroXMarkIcon className="h-full w-full" />
      )}
    </IconWrapper>
  )
}

export function ArrowLeftIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroArrowLeftIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function ArrowRightIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroArrowRightIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function ChevronDownIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroChevronDownIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function ChevronUpIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroChevronUpIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function MagnifyingGlassIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroMagnifyingGlassIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function Cog6ToothIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroCog6ToothIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function UserIcon(props: BaseIconProps & { solid?: boolean }) {
  const { solid, ...iconProps } = props
  return (
    <IconWrapper {...iconProps}>
      {solid ? (
        <HeroUserIconSolid className="h-full w-full" />
      ) : (
        <HeroUserIcon className="h-full w-full" />
      )}
    </IconWrapper>
  )
}

export function HomeIcon(props: BaseIconProps & { solid?: boolean }) {
  const { solid, ...iconProps } = props
  return (
    <IconWrapper {...iconProps}>
      {solid ? (
        <HeroHomeIconSolid className="h-full w-full" />
      ) : (
        <HeroHomeIcon className="h-full w-full" />
      )}
    </IconWrapper>
  )
}

export function DocumentIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroDocumentIcon className="h-full w-full" />
    </IconWrapper>
  )
}

export function CurrencyDollarIcon(props: BaseIconProps) {
  return (
    <IconWrapper {...props}>
      <HeroCurrencyDollarIcon className="h-full w-full" />
    </IconWrapper>
  )
}

// Loading fallback for lazy icons
function IconLoadingFallback({ size = 'md' }: { size?: IconSize }) {
  return (
    <div className={`${sizeClasses[size]} bg-gray-200 animate-pulse rounded`} />
  )
}

// Lazy-loaded icons for rarely used ones
export const LazyBellIcon = lazy(() => 
  import('@heroicons/react/24/outline').then(module => ({
    default: (props: BaseIconProps) => (
      <IconWrapper {...props}>
        <module.BellIcon className="h-full w-full" />
      </IconWrapper>
    )
  }))
)

export const LazyCalendarIcon = lazy(() => 
  import('@heroicons/react/24/outline').then(module => ({
    default: (props: BaseIconProps) => (
      <IconWrapper {...props}>
        <module.CalendarIcon className="h-full w-full" />
      </IconWrapper>
    )
  }))
)

// Wrapper for lazy icons with suspense
export function LazyIcon({ 
  children, 
  size = 'md' 
}: { 
  children: React.ReactNode
  size?: IconSize 
}) {
  return (
    <Suspense fallback={<IconLoadingFallback size={size} />}>
      {children}
    </Suspense>
  )
}

// Icon registry for dynamic loading
export const iconRegistry = {
  plus: PlusIcon,
  trash: TrashIcon,
  pencil: PencilIcon,
  eye: EyeIcon,
  'eye-slash': EyeSlashIcon,
  check: CheckIcon,
  'x-mark': XMarkIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  'cog-6-tooth': Cog6ToothIcon,
  user: UserIcon,
  home: HomeIcon,
  document: DocumentIcon,
  'currency-dollar': CurrencyDollarIcon,
} as const

export type IconName = keyof typeof iconRegistry

// Dynamic icon component
export function DynamicIcon({ 
  name, 
  ...props 
}: BaseIconProps & { name: IconName }) {
  const IconComponent = iconRegistry[name]
  return <IconComponent {...props} />
}

// Export all for convenience
export * from '@heroicons/react/24/outline'
export * from '@heroicons/react/24/solid'
