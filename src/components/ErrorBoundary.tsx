'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { errorLogger, logError, ErrorCategory } from '../lib/error-handling/error-logger'
import { retryService } from '../lib/error-handling/retry-service'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableRetry?: boolean
  retryAttempts?: number
  category?: ErrorCategory
  isolate?: boolean // Isolate this boundary to prevent error propagation
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
  isRetrying: boolean
  errorId?: string
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0,
      isRetrying: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with comprehensive context
    const errorId = logError(error, {
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        category: this.props.category || 'ui',
        isolate: this.props.isolate || false,
        retryCount: this.state.retryCount,
      },
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    this.setState({
      error,
      errorInfo,
      errorId,
    })

    // Auto-retry for certain types of errors
    if (this.props.enableRetry && this.shouldAutoRetry(error)) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  render() {
    if (this.state.hasError) {
            if (this.props.fallback) {
        return this.props.fallback
      }

      // Show retry loading state
      if (this.state.isRetrying) {
        return this.renderRetryingState()
      }

      // Default error UI with enhanced features
      return this.renderErrorState()
    }

    return this.props.children
  }

  private renderRetryingState() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="text-blue-600">
            <svg
              className="mx-auto h-12 w-12 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recovering...</h1>
            <p className="text-gray-600 mt-2">
              Attempting to recover from the error. Please wait...
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Retry attempt {this.state.retryCount} of {this.props.retryAttempts || 3}
            </p>
          </div>
        </div>
      </div>
    )
  }

  private renderErrorState() {
    const errorCategory = this.categorizeError(this.state.error!)
    const userFriendlyMessage = this.getUserFriendlyMessage(this.state.error!, errorCategory)
    const canRetry =
      this.props.enableRetry && this.state.retryCount < (this.props.retryAttempts || 3)

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className={`${this.getErrorIconColor(errorCategory)}`}>
            {this.getErrorIcon(errorCategory)}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {this.getErrorTitle(errorCategory)}
            </h1>
            <p className="text-gray-600 mt-2">{userFriendlyMessage}</p>
            {this.state.errorId && (
              <p className="text-xs text-gray-400 mt-2">Error ID: {this.state.errorId}</p>
            )}
          </div>

          <div className="space-y-4">
            {canRetry && (
              <button
                onClick={() => this.handleRetry()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={this.state.isRetrying}
              >
                {this.state.isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
            )}

            <button
              onClick={() => this.handleReset()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
            >
              Reset Component
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>

          {this.state.retryCount > 0 && (
            <div className="text-sm text-gray-500">Previous attempts: {this.state.retryCount}</div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <details className="text-left bg-gray-100 p-4 rounded">
              <summary className="cursor-pointer font-semibold">
                Error Details (Development)
              </summary>
              <div className="text-sm mt-2 space-y-2">
                <div>
                  <strong>Message:</strong> {this.state.error?.message}
                </div>
                <div>
                  <strong>Category:</strong> {errorCategory}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1">{this.state.error?.stack}</pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    )
  }
  private shouldAutoRetry(error: Error): boolean {
    const message = error.message.toLowerCase()

    // Auto-retry network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return true
    }

    // Auto-retry temporary server errors
    if (message.includes('service unavailable') || message.includes('internal server error')) {
      return true
    }

    return false
  }

  private scheduleRetry(): void {
    if (this.state.retryCount >= (this.props.retryAttempts || 3)) {
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000) // Exponential backoff, max 10s

    this.setState({ isRetrying: true })

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry()
    }, delay)
  }

  private handleRetry(): void {
    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }))
  }

  private handleReset(): void {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isRetrying: false,
      errorId: undefined,
    })
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('network') || message.includes('fetch')) return 'network'
    if (message.includes('auth')) return 'authentication'
    if (message.includes('permission') || message.includes('forbidden')) return 'authorization'
    if (message.includes('validation') || message.includes('invalid')) return 'validation'
    if (message.includes('not found')) return 'not_found'

    return 'unknown'
  }

  private getUserFriendlyMessage(error: Error, category: string): string {
    switch (category) {
      case 'network':
        return 'Network connection error. Please check your internet connection and try again.'
      case 'authentication':
        return 'Authentication error. Please log in again.'
      case 'authorization':
        return "You don't have permission to access this resource."
      case 'validation':
        return 'Invalid data provided. Please check your input and try again.'
      case 'not_found':
        return 'The requested resource was not found.'
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.'
    }
  }

  private getErrorTitle(category: string): string {
    switch (category) {
      case 'network':
        return 'Connection Problem'
      case 'authentication':
        return 'Authentication Required'
      case 'authorization':
        return 'Access Denied'
      case 'validation':
        return 'Invalid Input'
      case 'not_found':
        return 'Not Found'
      default:
        return 'Something Went Wrong'
    }
  }

  private getErrorIconColor(category: string): string {
    switch (category) {
      case 'network':
        return 'text-orange-600'
      case 'authentication':
        return 'text-blue-600'
      case 'authorization':
        return 'text-red-600'
      case 'validation':
        return 'text-yellow-600'
      case 'not_found':
        return 'text-gray-600'
      default:
        return 'text-red-600'
    }
  }

  private getErrorIcon(category: string): React.ReactElement {
    const iconClass = 'mx-auto h-12 w-12'

    switch (category) {
      case 'network':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
          </svg>
        )
      case 'authentication':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        )
      case 'authorization':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
            />
          </svg>
        )
      default:
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        )
    }
  }
}

export default ErrorBoundary
