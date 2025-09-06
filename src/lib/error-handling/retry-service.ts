/**
 * Retry Service for handling failed operations with intelligent backoff
 */

import { logError, logWarning, logInfo } from './error-logger'

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  jitter?: boolean
  retryCondition?: (error: Error) => boolean
  onRetry?: (attempt: number, error: Error) => void
  onSuccess?: (attempt: number) => void
  onFailure?: (error: Error, attempts: number) => void
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalTime: number
}

class RetryService {
  private defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: this.defaultRetryCondition,
    onRetry: () => {},
    onSuccess: () => {},
    onFailure: () => {},
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultOptions, ...options }
    const startTime = Date.now()
    let lastError: Error = new Error('Unknown error')

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        logInfo(`Executing operation (attempt ${attempt}/${config.maxAttempts})`)

        const result = await operation()

        const totalTime = Date.now() - startTime
        logInfo(`Operation succeeded on attempt ${attempt}`, { additionalData: { totalTime } })

        config.onSuccess(attempt)

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        logWarning(`Operation failed on attempt ${attempt}`, {
          additionalData: { error: lastError.message, attempt, maxAttempts: config.maxAttempts },
        })

        // Check if we should retry this error
        if (!config.retryCondition(lastError)) {
          logError(`Operation failed with non-retryable error: ${lastError.message}`)
          break
        }

        // If this is the last attempt, don't wait
        if (attempt === config.maxAttempts) {
          break
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config)

        logInfo(`Retrying in ${delay}ms...`)
        config.onRetry(attempt, lastError)

        await this.sleep(delay)
      }
    }

    const totalTime = Date.now() - startTime
    logError(`Operation failed after ${config.maxAttempts} attempts`, {
      additionalData: { totalTime, finalError: lastError.message },
    })

    config.onFailure(lastError, config.maxAttempts)

    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalTime,
    }
  }

  /**
   * Create a retryable version of a function
   */
  wrap<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: RetryOptions = {}
  ): (...args: T) => Promise<RetryResult<R>> {
    return (...args: T) => this.execute(() => fn(...args), options)
  }

  /**
   * Retry with exponential backoff
   */
  async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<RetryResult<T>> {
    return this.execute(operation, {
      maxAttempts,
      baseDelay: 1000,
      backoffMultiplier: 2,
      jitter: true,
    })
  }

  /**
   * Retry with linear backoff
   */
  async withLinearBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<RetryResult<T>> {
    return this.execute(operation, {
      maxAttempts,
      baseDelay: delay,
      backoffMultiplier: 1,
      jitter: false,
    })
  }

  /**
   * Retry only network errors
   */
  async retryNetworkErrors<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<RetryResult<T>> {
    return this.execute(operation, {
      maxAttempts,
      retryCondition: this.isNetworkError,
    })
  }

  /**
   * Retry with custom condition
   */
  async retryIf<T>(
    operation: () => Promise<T>,
    condition: (error: Error) => boolean,
    maxAttempts: number = 3
  ): Promise<RetryResult<T>> {
    return this.execute(operation, {
      maxAttempts,
      retryCondition: condition,
    })
  }

  private calculateDelay(attempt: number, config: Required<RetryOptions>): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)

    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay)

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }

    return Math.floor(delay)
  }

  private defaultRetryCondition(error: Error): boolean {
    const message = error.message.toLowerCase()

    // Retry network errors
    if (this.isNetworkError(error)) {
      return true
    }

    // Retry timeout errors
    if (message.includes('timeout')) {
      return true
    }

    // Retry rate limit errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return true
    }

    // Retry server errors (5xx)
    if (message.includes('internal server error') || message.includes('service unavailable')) {
      return true
    }

    // Don't retry client errors (4xx) except rate limits
    if (
      message.includes('bad request') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found')
    ) {
      return false
    }

    return true
  }

  private isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('offline') ||
      message.includes('no internet')
    )
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const retryService = new RetryService()

// Export utility functions
export const retry = <T>(operation: () => Promise<T>, options?: RetryOptions) =>
  retryService.execute(operation, options)

export const retryNetworkErrors = <T>(operation: () => Promise<T>, maxAttempts?: number) =>
  retryService.retryNetworkErrors(operation, maxAttempts)

export const withExponentialBackoff = <T>(operation: () => Promise<T>, maxAttempts?: number) =>
  retryService.withExponentialBackoff(operation, maxAttempts)

export const withLinearBackoff = <T>(
  operation: () => Promise<T>,
  maxAttempts?: number,
  delay?: number
) => retryService.withLinearBackoff(operation, maxAttempts, delay)

// Higher-order function for wrapping API calls
export function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options?: RetryOptions
) {
  return async (...args: T): Promise<R> => {
    const result = await retryService.execute(() => fn(...args), options)

    if (result.success) {
      return result.data!
    } else {
      throw result.error
    }
  }
}

// Specialized retry decorators
export function retryOnNetworkError<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  maxAttempts: number = 3
) {
  return withRetry(fn, {
    maxAttempts,
    retryCondition: (error) => retryService['isNetworkError'](error),
  })
}

export function retryWithBackoff<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
) {
  return withRetry(fn, {
    maxAttempts,
    baseDelay,
    backoffMultiplier: 2,
    jitter: true,
  })
}
