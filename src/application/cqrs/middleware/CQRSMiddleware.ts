/**
 * CQRS Middleware
 * Common middleware for commands and queries
 */

import { Command, CommandResult, CommandMiddleware } from '../Command'
import { Query, QueryResult, QueryMiddleware } from '../Query'

// Logging Middleware
export class LoggingCommandMiddleware implements CommandMiddleware {
  async execute<T extends Command>(
    command: T,
    next: (command: T) => Promise<CommandResult>
  ): Promise<CommandResult> {
    const startTime = Date.now()
    
    console.log(`[COMMAND] Starting: ${command.type}`, {
      correlationId: command.correlationId,
      userId: command.userId,
      timestamp: command.timestamp
    })

    try {
      const result = await next(command)
      const duration = Date.now() - startTime

      console.log(`[COMMAND] Completed: ${command.type}`, {
        correlationId: command.correlationId,
        success: result.success,
        duration,
        errors: result.errors?.length || 0
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error(`[COMMAND] Failed: ${command.type}`, {
        correlationId: command.correlationId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }
}

export class LoggingQueryMiddleware implements QueryMiddleware {
  async execute<T extends Query>(
    query: T,
    next: (query: T) => Promise<QueryResult>
  ): Promise<QueryResult> {
    const startTime = Date.now()
    
    console.log(`[QUERY] Starting: ${query.type}`, {
      correlationId: query.correlationId,
      userId: query.userId,
      cacheKey: query.cacheKey
    })

    try {
      const result = await next(query)
      const duration = Date.now() - startTime

      console.log(`[QUERY] Completed: ${query.type}`, {
        correlationId: query.correlationId,
        success: result.success,
        duration,
        fromCache: result.metadata?.fromCache || false,
        resultCount: result.data ? (Array.isArray(result.data) ? result.data.length : 1) : 0
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error(`[QUERY] Failed: ${query.type}`, {
        correlationId: query.correlationId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }
}

// Validation Middleware
export class ValidationCommandMiddleware implements CommandMiddleware {
  constructor(
    private validators: Map<string, (command: any) => Promise<{ isValid: boolean; errors: string[] }>>
  ) {}

  async execute<T extends Command>(
    command: T,
    next: (command: T) => Promise<CommandResult>
  ): Promise<CommandResult> {
    const validator = this.validators.get(command.type)
    
    if (validator) {
      const validation = await validator(command)
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        }
      }
    }

    return next(command)
  }
}

// Authorization Middleware
export class AuthorizationCommandMiddleware implements CommandMiddleware {
  constructor(
    private authorizationRules: Map<string, (command: any, userId?: string) => Promise<boolean>>
  ) {}

  async execute<T extends Command>(
    command: T,
    next: (command: T) => Promise<CommandResult>
  ): Promise<CommandResult> {
    const authRule = this.authorizationRules.get(command.type)
    
    if (authRule) {
      const isAuthorized = await authRule(command, command.userId)
      
      if (!isAuthorized) {
        return {
          success: false,
          errors: ['Unauthorized to execute this command']
        }
      }
    }

    return next(command)
  }
}

export class AuthorizationQueryMiddleware implements QueryMiddleware {
  constructor(
    private authorizationRules: Map<string, (query: any, userId?: string) => Promise<boolean>>
  ) {}

  async execute<T extends Query>(
    query: T,
    next: (query: T) => Promise<QueryResult>
  ): Promise<QueryResult> {
    const authRule = this.authorizationRules.get(query.type)
    
    if (authRule) {
      const isAuthorized = await authRule(query, query.userId)
      
      if (!isAuthorized) {
        return {
          success: false,
          errors: ['Unauthorized to execute this query']
        }
      }
    }

    return next(query)
  }
}

// Performance Monitoring Middleware
export class PerformanceCommandMiddleware implements CommandMiddleware {
  private metrics: Array<{
    commandType: string
    duration: number
    success: boolean
    timestamp: Date
    userId?: string
  }> = []

  async execute<T extends Command>(
    command: T,
    next: (command: T) => Promise<CommandResult>
  ): Promise<CommandResult> {
    const startTime = Date.now()
    
    try {
      const result = await next(command)
      
      this.recordMetric({
        commandType: command.type,
        duration: Date.now() - startTime,
        success: result.success,
        timestamp: new Date(),
        userId: command.userId
      })

      return result
    } catch (error) {
      this.recordMetric({
        commandType: command.type,
        duration: Date.now() - startTime,
        success: false,
        timestamp: new Date(),
        userId: command.userId
      })

      throw error
    }
  }

  getMetrics(): typeof this.metrics {
    return [...this.metrics]
  }

  getAverageExecutionTime(commandType?: string): number {
    const filtered = commandType 
      ? this.metrics.filter(m => m.commandType === commandType)
      : this.metrics

    if (filtered.length === 0) return 0

    const totalTime = filtered.reduce((sum, m) => sum + m.duration, 0)
    return totalTime / filtered.length
  }

  getSuccessRate(commandType?: string): number {
    const filtered = commandType 
      ? this.metrics.filter(m => m.commandType === commandType)
      : this.metrics

    if (filtered.length === 0) return 0

    const successful = filtered.filter(m => m.success).length
    return (successful / filtered.length) * 100
  }

  private recordMetric(metric: typeof this.metrics[0]): void {
    this.metrics.push(metric)
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }
}

export class PerformanceQueryMiddleware implements QueryMiddleware {
  private metrics: Array<{
    queryType: string
    duration: number
    success: boolean
    cacheHit: boolean
    resultCount: number
    timestamp: Date
    userId?: string
  }> = []

  async execute<T extends Query>(
    query: T,
    next: (query: T) => Promise<QueryResult>
  ): Promise<QueryResult> {
    const startTime = Date.now()
    
    try {
      const result = await next(query)
      
      this.recordMetric({
        queryType: query.type,
        duration: Date.now() - startTime,
        success: result.success,
        cacheHit: result.metadata?.fromCache || false,
        resultCount: result.data ? (Array.isArray(result.data) ? result.data.length : 1) : 0,
        timestamp: new Date(),
        userId: query.userId
      })

      return result
    } catch (error) {
      this.recordMetric({
        queryType: query.type,
        duration: Date.now() - startTime,
        success: false,
        cacheHit: false,
        resultCount: 0,
        timestamp: new Date(),
        userId: query.userId
      })

      throw error
    }
  }

  getMetrics(): typeof this.metrics {
    return [...this.metrics]
  }

  getCacheHitRate(queryType?: string): number {
    const filtered = queryType 
      ? this.metrics.filter(m => m.queryType === queryType)
      : this.metrics

    if (filtered.length === 0) return 0

    const cacheHits = filtered.filter(m => m.cacheHit).length
    return (cacheHits / filtered.length) * 100
  }
}

// Circuit Breaker Middleware
export class CircuitBreakerCommandMiddleware implements CommandMiddleware {
  private failures = new Map<string, number>()
  private lastFailureTime = new Map<string, number>()
  private readonly failureThreshold: number
  private readonly recoveryTimeMs: number

  constructor(failureThreshold: number = 5, recoveryTimeMs: number = 60000) {
    this.failureThreshold = failureThreshold
    this.recoveryTimeMs = recoveryTimeMs
  }

  async execute<T extends Command>(
    command: T,
    next: (command: T) => Promise<CommandResult>
  ): Promise<CommandResult> {
    const commandType = command.type
    const failures = this.failures.get(commandType) || 0
    const lastFailure = this.lastFailureTime.get(commandType) || 0

    // Check if circuit is open
    if (failures >= this.failureThreshold) {
      const timeSinceLastFailure = Date.now() - lastFailure
      
      if (timeSinceLastFailure < this.recoveryTimeMs) {
        return {
          success: false,
          errors: [`Circuit breaker is open for ${commandType}. Try again later.`]
        }
      } else {
        // Reset circuit breaker
        this.failures.set(commandType, 0)
      }
    }

    try {
      const result = await next(command)
      
      if (result.success) {
        // Reset failure count on success
        this.failures.set(commandType, 0)
      } else {
        // Increment failure count
        this.failures.set(commandType, failures + 1)
        this.lastFailureTime.set(commandType, Date.now())
      }

      return result
    } catch (error) {
      // Increment failure count on exception
      this.failures.set(commandType, failures + 1)
      this.lastFailureTime.set(commandType, Date.now())
      
      throw error
    }
  }

  getCircuitState(commandType: string): 'closed' | 'open' | 'half-open' {
    const failures = this.failures.get(commandType) || 0
    const lastFailure = this.lastFailureTime.get(commandType) || 0

    if (failures < this.failureThreshold) {
      return 'closed'
    }

    const timeSinceLastFailure = Date.now() - lastFailure
    return timeSinceLastFailure >= this.recoveryTimeMs ? 'half-open' : 'open'
  }
}

// Rate Limiting Middleware
export class RateLimitingCommandMiddleware implements CommandMiddleware {
  private requests = new Map<string, number[]>()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async execute<T extends Command>(
    command: T,
    next: (command: T) => Promise<CommandResult>
  ): Promise<CommandResult> {
    const key = command.userId || 'anonymous'
    const now = Date.now()
    
    // Get request timestamps for this user
    const userRequests = this.requests.get(key) || []
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < this.windowMs)
    
    // Check rate limit
    if (validRequests.length >= this.maxRequests) {
      return {
        success: false,
        errors: ['Rate limit exceeded. Please try again later.']
      }
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(key, validRequests)

    return next(command)
  }

  getRemainingRequests(userId?: string): number {
    const key = userId || 'anonymous'
    const now = Date.now()
    const userRequests = this.requests.get(key) || []
    const validRequests = userRequests.filter(timestamp => now - timestamp < this.windowMs)
    
    return Math.max(0, this.maxRequests - validRequests.length)
  }
}
