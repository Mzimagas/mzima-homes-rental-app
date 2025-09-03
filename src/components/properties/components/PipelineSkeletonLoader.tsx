/**
 * Skeleton Loading Components for Pipeline Managers
 * Provides consistent loading states across all workflow tabs
 */

import React from 'react'
import SkeletonLoader from '../../ui/SkeletonLoader'

interface PipelineSkeletonProps {
  type: 'purchase' | 'subdivision' | 'handover' | 'properties'
  itemCount?: number
}

export const PipelineSkeletonLoader: React.FC<PipelineSkeletonProps> = ({
  type,
  itemCount = 3,
}) => {
  const getThemeColor = () => {
    switch (type) {
      case 'purchase':
        return 'green'
      case 'subdivision':
        return 'orange'
      case 'handover':
        return 'purple'
      case 'properties':
        return 'blue'
      default:
        return 'gray'
    }
  }

  const theme = getThemeColor()

  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader height="2rem" width="16rem" />
          <SkeletonLoader height="1rem" width="24rem" />
        </div>
        <div className="flex items-center space-x-3">
          <SkeletonLoader height="2.5rem" width="8rem" />
          <SkeletonLoader height="2.5rem" width="6rem" />
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="flex items-center space-x-4">
        <SkeletonLoader height="2.5rem" width="20rem" />
        <SkeletonLoader height="2.5rem" width="8rem" />
      </div>

      {/* Pipeline Items Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <PipelineItemSkeleton key={index} type={type} />
        ))}
      </div>
    </div>
  )
}

const PipelineItemSkeleton: React.FC<{ type: string }> = ({ type }) => {
  return (
    <div
      className={`border border-${type === 'purchase' ? 'green' : type === 'subdivision' ? 'orange' : type === 'handover' ? 'purple' : 'blue'}-200 rounded-lg bg-white shadow-sm`}
    >
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SkeletonLoader variant="circular" width="3rem" height="3rem" />
            <div className="space-y-2">
              <SkeletonLoader height="1.25rem" width="12rem" />
              <SkeletonLoader height="0.875rem" width="16rem" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <SkeletonLoader height="2rem" width="6rem" />
            <SkeletonLoader height="2rem" width="4rem" />
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-1">
              <SkeletonLoader height="0.75rem" width="4rem" />
              <SkeletonLoader height="1rem" width="8rem" />
            </div>
          ))}
        </div>

        {/* Progress Bar Skeleton */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonLoader height="0.875rem" width="6rem" />
            <SkeletonLoader height="0.875rem" width="3rem" />
          </div>
          <SkeletonLoader height="0.5rem" width="100%" />
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SkeletonLoader height="1.5rem" width="5rem" />
            <SkeletonLoader height="1.5rem" width="5rem" />
          </div>
          <div className="flex items-center space-x-2">
            <SkeletonLoader height="2rem" width="6rem" />
            <SkeletonLoader height="2rem" width="8rem" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Specialized skeleton for different pipeline types
export const PurchasePipelineSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount }) => (
  <PipelineSkeletonLoader type="purchase" itemCount={itemCount} />
)

export const SubdivisionPipelineSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount }) => (
  <PipelineSkeletonLoader type="subdivision" itemCount={itemCount} />
)

export const HandoverPipelineSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount }) => (
  <PipelineSkeletonLoader type="handover" itemCount={itemCount} />
)

export const PropertiesTabSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount }) => (
  <PipelineSkeletonLoader type="properties" itemCount={itemCount} />
)

// Compact skeleton for tab switching
export const TabSwitchSkeleton: React.FC<{ type: PipelineSkeletonProps['type'] }> = ({ type }) => {
  const getThemeColor = () => {
    switch (type) {
      case 'purchase':
        return 'green'
      case 'subdivision':
        return 'orange'
      case 'handover':
        return 'purple'
      case 'properties':
        return 'blue'
      default:
        return 'gray'
    }
  }

  const theme = getThemeColor()

  return (
    <div className="space-y-4 animate-pulse">
      {/* Quick header */}
      <div className="flex items-center justify-between">
        <SkeletonLoader height="1.5rem" width="12rem" />
        <SkeletonLoader height="2rem" width="6rem" />
      </div>

      {/* Compact items */}
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className={`border border-${theme}-200 rounded-lg p-4 bg-${theme}-50`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SkeletonLoader variant="circular" width="2rem" height="2rem" />
              <div className="space-y-1">
                <SkeletonLoader height="1rem" width="8rem" />
                <SkeletonLoader height="0.75rem" width="12rem" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <SkeletonLoader height="1.5rem" width="4rem" />
              <SkeletonLoader height="1.5rem" width="4rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PipelineSkeletonLoader
