'use client'

import React from 'react';
import {
  PropertyCardVariant,
  PropertyCardTheme,
  getPropertyCardClasses,
  getPropertyCardVariant
} from '../utils/property-card-styles';

interface PropertyCardProps {
  children: React.ReactNode;
  variant?: PropertyCardVariant;
  theme?: PropertyCardTheme;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;

  // Auto-detect variant from status
  status?: string;
  lifecycle?: string;
  hasErrors?: boolean;

  // Accessibility
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;

  // Mobile optimization
  mobileOptimized?: boolean;
}

/**
 * PropertyCard - Consistent border-based card component for all property displays
 * 
 * Features:
 * - Border-based visual hierarchy instead of background colors
 * - Responsive design with mobile optimizations
 * - Auto-detection of variant from status/lifecycle
 * - Accessibility support
 * - Consistent hover and interaction states
 */
export default function PropertyCard({
  children,
  variant,
  theme = 'default',
  interactive = true,
  onClick,
  className = '',
  status,
  lifecycle,
  hasErrors = false,
  role,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  mobileOptimized = true,
}: PropertyCardProps) {
  // Auto-detect variant if not explicitly provided
  const finalVariant = variant || getPropertyCardVariant(status, lifecycle, hasErrors);

  // Generate CSS classes
  const cardClasses = getPropertyCardClasses(finalVariant, {
    interactive,
    mobile: mobileOptimized,
    customClasses: className,
    theme,
  });
  
  // Determine if this should be a button or div
  const isButton = interactive && onClick;
  
  // Common props
  const commonProps = {
    className: cardClasses,
    role: role || (isButton ? 'button' : undefined),
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...(isButton && {
      onClick,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      },
      tabIndex: 0,
    }),
  };
  
  if (isButton) {
    return (
      <button
        {...commonProps}
        className={`${cardClasses} text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
      >
        {children}
      </button>
    );
  }
  
  return (
    <div {...commonProps}>
      {children}
    </div>
  );
}

/**
 * PropertyCardHeader - Standardized header section for property cards
 */
export function PropertyCardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * PropertyCardContent - Main content area for property cards
 */
export function PropertyCardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * PropertyCardFooter - Footer section for actions and additional info
 */
export function PropertyCardFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

/**
 * PropertyCardGrid - Responsive grid container for property cards
 */
export function PropertyCardGrid({
  children,
  className = '',
  columns = { sm: 1, md: 2, lg: 3 },
}: {
  children: React.ReactNode;
  className?: string;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}) {
  const gridClasses = [
    'grid gap-6',
    `grid-cols-${columns.sm || 1}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}
