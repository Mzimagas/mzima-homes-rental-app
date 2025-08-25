'use client'

import React from 'react'

interface SkeletonLoaderProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table'
  lines?: number
  height?: string
  width?: string
  animated?: boolean
}

/**
 * Skeleton loader component for better perceived performance on mobile
 */
export default function SkeletonLoader({
  className = '',
  variant = 'rectangular',
  lines = 1,
  height,
  width,
  animated = true
}: SkeletonLoaderProps) {
  const baseClasses = `bg-gray-200 ${animated ? 'animate-pulse' : ''} ${className}`

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} h-4 rounded`}
            style={{
              width: index === lines - 1 ? '75%' : '100%',
              height: height || '1rem'
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'circular') {
    return (
      <div
        className={`${baseClasses} rounded-full`}
        style={{
          width: width || height || '2.5rem',
          height: height || width || '2.5rem'
        }}
      />
    )
  }

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} rounded-lg p-4 space-y-3`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded animate-pulse" />
            <div className="h-3 bg-gray-300 rounded w-3/4 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded animate-pulse" />
          <div className="h-3 bg-gray-300 rounded w-5/6 animate-pulse" />
          <div className="h-3 bg-gray-300 rounded w-4/6 animate-pulse" />
        </div>
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="space-y-3">
        {/* Table header */}
        <div className="flex space-x-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-4 bg-gray-300 rounded animate-pulse flex-1"
            />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: lines }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: 4 }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-6 bg-gray-200 rounded animate-pulse flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} rounded`}
      style={{
        width: width || '100%',
        height: height || '1rem'
      }}
    />
  )
}

/**
 * Skeleton loader for mobile cards
 */
export function MobileCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-start space-x-3">
            <SkeletonLoader variant="circular" width="2.5rem" height="2.5rem" />
            <div className="flex-1 space-y-2">
              <SkeletonLoader height="1.25rem" width="60%" />
              <SkeletonLoader height="1rem" width="40%" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <SkeletonLoader height="0.875rem" />
            <SkeletonLoader height="0.875rem" width="80%" />
          </div>
          <div className="mt-4 flex justify-between items-center">
            <SkeletonLoader height="1rem" width="30%" />
            <SkeletonLoader height="2rem" width="4rem" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for dashboard stats
 */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonLoader height="1rem" width="4rem" />
              <SkeletonLoader height="2rem" width="3rem" />
            </div>
            <SkeletonLoader variant="circular" width="3rem" height="3rem" />
          </div>
        </div>
      ))}
    </div>
  )
}
