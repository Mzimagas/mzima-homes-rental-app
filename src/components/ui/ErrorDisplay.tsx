/**
 * Error Display Component
 * Reusable component for displaying errors with consistent styling
 */

'use client'

import React, { memo } from 'react'
import { SubdivisionError } from '../../types/subdivision'

interface ErrorDisplayProps {
  error: SubdivisionError | null
  title?: string
  className?: string
  onRetry?: () => void
  onDismiss?: () => void
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = memo(({
  error,
  title = 'Error',
  className = '',
  onRetry,
  onDismiss
}) => {
  if (!error) return null

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="text-red-400 text-xl" role="img" aria-label="Error">⚠️</div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.message}</p>
            {error.code && (
              <p className="mt-1 text-xs text-red-600">Error Code: {error.code}</p>
            )}
          </div>
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-sm text-red-600 hover:text-red-800 px-3 py-1 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

ErrorDisplay.displayName = 'ErrorDisplay'

export default ErrorDisplay
