/**
 * User-friendly error message component with retry functionality
 */

import React from 'react'
import { logError } from '../lib/error-handling/error-logger'
import { retryService } from '../lib/error-handling/retry-service'

interface ErrorMessageProps {
  error?: Error | string | null
  title?: string
  description?: string
  showRetry?: boolean
  onRetry?: () => void | Promise<void>
  onDismiss?: () => void
  className?: string
  variant?: 'error' | 'warning' | 'info'
  size?: 'sm' | 'md' | 'lg'
}

export function ErrorMessage({
  error,
  title,
  description,
  showRetry = false,
  onRetry,
  onDismiss,
  className = '',
  variant = 'error',
  size = 'md',
}: ErrorMessageProps) {
  const [isRetrying, setIsRetrying] = React.useState(false)

  if (!error && !title) return null

  const errorMessage = typeof error === 'string' ? error : error?.message || ''
  const displayTitle = title || getErrorTitle(errorMessage)
  const displayDescription = description || getUserFriendlyMessage(errorMessage)

  const handleRetry = async () => {
    if (!onRetry) return

    setIsRetrying(true)
    try {
      await onRetry()
    } catch (retryError) {
      logError(retryError instanceof Error ? retryError : new Error(String(retryError)), {
        additionalData: { context: 'error_message_retry', originalError: errorMessage },
      })
    } finally {
      setIsRetrying(false)
    }
  }

  const variantStyles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  }

  const sizeStyles = {
    sm: {
      container: 'p-3',
      icon: 'h-4 w-4',
      title: 'text-sm font-medium',
      description: 'text-sm',
      button: 'px-2 py-1 text-xs',
    },
    md: {
      container: 'p-4',
      icon: 'h-5 w-5',
      title: 'text-base font-medium',
      description: 'text-sm',
      button: 'px-3 py-2 text-sm',
    },
    lg: {
      container: 'p-6',
      icon: 'h-6 w-6',
      title: 'text-lg font-medium',
      description: 'text-base',
      button: 'px-4 py-2 text-base',
    },
  }

  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]

  return (
    <div className={`border rounded-lg ${styles.container} ${sizes.container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <ErrorIcon variant={variant} className={`${styles.icon} ${sizes.icon}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={sizes.title}>{displayTitle}</h3>
          {displayDescription && (
            <div className={`mt-2 ${sizes.description}`}>
              <p>{displayDescription}</p>
            </div>
          )}
          {(showRetry || onDismiss) && (
            <div className="mt-4 flex space-x-2">
              {showRetry && onRetry && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className={`inline-flex items-center rounded-md ${styles.button} ${sizes.button} font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isRetrying ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Retrying...
                    </>
                  ) : (
                    'Try Again'
                  )}
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`inline-flex items-center rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 ${sizes.button} font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${styles.icon} hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ErrorIcon({
  variant,
  className,
}: {
  variant: 'error' | 'warning' | 'info'
  className: string
}) {
  switch (variant) {
    case 'error':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'warning':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'info':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      )
  }
}

function getErrorTitle(errorMessage: string): string {
  const message = errorMessage.toLowerCase()

  if (message.includes('network') || message.includes('fetch')) return 'Connection Error'
  if (message.includes('auth')) return 'Authentication Error'
  if (message.includes('permission') || message.includes('forbidden')) return 'Access Denied'
  if (message.includes('validation') || message.includes('invalid')) return 'Invalid Input'
  if (message.includes('not found')) return 'Not Found'
  if (message.includes('timeout')) return 'Request Timeout'

  return 'Error'
}

function getUserFriendlyMessage(errorMessage: string): string {
  const message = errorMessage.toLowerCase()

  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }
  if (message.includes('auth')) {
    return 'Your session has expired. Please log in again.'
  }
  if (message.includes('permission') || message.includes('forbidden')) {
    return "You don't have permission to perform this action."
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Please check your input and try again.'
  }
  if (message.includes('not found')) {
    return 'The requested item could not be found.'
  }
  if (message.includes('timeout')) {
    return 'The request took too long to complete. Please try again.'
  }
  if (message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.'
  }

  return 'An unexpected error occurred. Please try again or contact support if the problem persists.'
}

// Hook for using error messages with automatic retry
export function useErrorMessage() {
  const [error, setError] = React.useState<Error | string | null>(null)
  const [isRetrying, setIsRetrying] = React.useState(false)

  const showError = React.useCallback((error: Error | string) => {
    setError(error)
    logError(typeof error === 'string' ? new Error(error) : error)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const retryWithError = React.useCallback(async (operation: () => Promise<void>) => {
    setIsRetrying(true)
    try {
      await operation()
      setError(null)
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError : String(retryError))
    } finally {
      setIsRetrying(false)
    }
  }, [])

  return {
    error,
    isRetrying,
    showError,
    clearError,
    retryWithError,
  }
}
