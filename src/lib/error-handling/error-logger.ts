/**
 * Advanced Error Logging Service
 * Provides comprehensive error tracking, categorization, and reporting
 */

export interface ErrorContext {
  userId?: string
  userAgent?: string
  url?: string
  timestamp: number
  sessionId?: string
  buildVersion?: string
  environment: 'development' | 'production' | 'staging'
  additionalData?: Record<string, any>
}

export interface ErrorReport {
  id: string
  message: string
  stack?: string
  category: ErrorCategory
  severity: ErrorSeverity
  context: ErrorContext
  fingerprint: string
  count: number
  firstSeen: number
  lastSeen: number
}

export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'database'
  | 'ui'
  | 'business_logic'
  | 'external_service'
  | 'unknown'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

class ErrorLogger {
  private errors: Map<string, ErrorReport> = new Map()
  private maxErrors = 1000
  private sessionId: string
  private environment: 'development' | 'production' | 'staging'

  constructor() {
    this.sessionId = this.generateSessionId()
    this.environment = (process.env.NODE_ENV as any) || 'development'

    // Set up global error handlers
    this.setupGlobalHandlers()
  }

  /**
   * Log an error with context
   */
  logError(error: Error | string, context: Partial<ErrorContext> = {}): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    const category = this.categorizeError(errorObj)
    const severity = this.determineSeverity(errorObj, category)
    const fingerprint = this.generateFingerprint(errorObj)

    const fullContext: ErrorContext = {
      userId: this.getCurrentUserId(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'unknown',
      environment: this.environment,
      ...context,
    }

    const errorId = this.generateErrorId()

    // Check if we've seen this error before
    const existingError = this.errors.get(fingerprint)
    if (existingError) {
      existingError.count++
      existingError.lastSeen = Date.now()
      existingError.context = fullContext // Update with latest context
    } else {
      const errorReport: ErrorReport = {
        id: errorId,
        message: errorObj.message,
        stack: errorObj.stack,
        category,
        severity,
        context: fullContext,
        fingerprint,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      }

      this.errors.set(fingerprint, errorReport)

      // Clean up old errors if we exceed the limit
      if (this.errors.size > this.maxErrors) {
        this.cleanupOldErrors()
      }
    }

    // Log to console in development
    if (this.environment === 'development') {
      console.group(`🚨 Error [${category}] [${severity}]`)
      console.error('Message:', errorObj.message)
      console.error('Stack:', errorObj.stack)
      console.error('Context:', fullContext)
      console.groupEnd()
    }

    // Send to external service in production
    if (this.environment === 'production') {
      this.sendToExternalService(this.errors.get(fingerprint)!)
    }

    return errorId
  }

  /**
   * Log a warning
   */
  logWarning(message: string, context: Partial<ErrorContext> = {}): void {
    console.warn('⚠️ Warning:', message, context)

    // Store warnings for analysis
    this.logError(new Error(`[WARNING] ${message}`), {
      ...context,
      additionalData: { ...context.additionalData, isWarning: true },
    })
  }

  /**
   * Log an info message
   */
  logInfo(message: string, context: Partial<ErrorContext> = {}): void {
    if (this.environment === 'development') {
      console.info('ℹ️ Info:', message, context)
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    recentErrors: ErrorReport[]
  } {
    const errors = Array.from(this.errors.values())

    const errorsByCategory = errors.reduce(
      (acc, error) => {
        acc[error.category] = (acc[error.category] || 0) + error.count
        return acc
      },
      {} as Record<ErrorCategory, number>
    )

    const errorsBySeverity = errors.reduce(
      (acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + error.count
        return acc
      },
      {} as Record<ErrorSeverity, number>
    )

    const recentErrors = errors.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 10)

    return {
      totalErrors: errors.reduce((sum, error) => sum + error.count, 0),
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
    }
  }

  /**
   * Clear all stored errors
   */
  clearErrors(): void {
    this.errors.clear()
  }

  /**
   * Export errors for analysis
   */
  exportErrors(): ErrorReport[] {
    return Array.from(this.errors.values())
  }

  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        additionalData: { type: 'unhandledrejection', reason: event.reason },
      })
    })

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        additionalData: {
          type: 'global_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network'
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'authentication'
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return 'authorization'
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation'
    }
    if (message.includes('database') || message.includes('sql') || stack.includes('supabase')) {
      return 'database'
    }
    if (stack.includes('react') || stack.includes('component')) {
      return 'ui'
    }
    if (message.includes('business') || message.includes('rule')) {
      return 'business_logic'
    }
    if (message.includes('api') || message.includes('service')) {
      return 'external_service'
    }

    return 'unknown'
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    const message = error.message.toLowerCase()

    // Critical errors
    if (category === 'authentication' || category === 'database') {
      return 'critical'
    }
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical'
    }

    // High severity
    if (category === 'authorization' || category === 'business_logic') {
      return 'high'
    }
    if (message.includes('error') && !message.includes('warning')) {
      return 'high'
    }

    // Medium severity
    if (category === 'network' || category === 'external_service') {
      return 'medium'
    }

    return 'low'
  }

  private generateFingerprint(error: Error): string {
    // Create a unique fingerprint for the error based on message and stack
    const key = `${error.message}:${error.stack?.split('\n')[1] || ''}`
    return btoa(key)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16)
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      const user = (window as any).__USER_ID__ || localStorage.getItem('userId')
      return user || undefined
    }
    return undefined
  }

  private cleanupOldErrors(): void {
    const errors = Array.from(this.errors.entries())
    const sortedByAge = errors.sort(([, a], [, b]) => a.firstSeen - b.firstSeen)

    // Remove oldest 20% of errors
    const toRemove = Math.floor(errors.length * 0.2)
    for (let i = 0; i < toRemove; i++) {
      this.errors.delete(sortedByAge[i][0])
    }
  }

  private async sendToExternalService(error: ErrorReport): Promise<void> {
    try {
      // In a real implementation, you would send to Sentry, LogRocket, etc.
      // For now, we'll just store it locally
      const stored = localStorage.getItem('errorReports') || '[]'
      const reports = JSON.parse(stored)
      reports.push(error)

      // Keep only last 100 reports in localStorage
      if (reports.length > 100) {
        reports.splice(0, reports.length - 100)
      }

      localStorage.setItem('errorReports', JSON.stringify(reports))
    } catch (e) {
      console.error('Failed to store error report:', e)
    }
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger()

// Export utility functions
export const logError = (error: Error | string, context?: Partial<ErrorContext>) =>
  errorLogger.logError(error, context)

export const logWarning = (message: string, context?: Partial<ErrorContext>) =>
  errorLogger.logWarning(message, context)

export const logInfo = (message: string, context?: Partial<ErrorContext>) =>
  errorLogger.logInfo(message, context)
