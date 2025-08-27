/**
 * Command Bus Implementation
 * Handles command routing, middleware, and execution
 */

import {
  Command,
  CommandResult,
  CommandHandler,
  CommandBus,
  CommandMiddleware,
  CommandEvent,
  CommandAudit,
  RetryPolicy,
  TimeoutConfig
} from './Command'

export class DefaultCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler<any>>()
  private middlewares: CommandMiddleware[] = []
  private eventListeners: Array<(event: CommandEvent) => void> = []
  private auditLog: CommandAudit[] = []
  private retryPolicies = new Map<string, RetryPolicy>()
  private timeoutConfigs = new Map<string, TimeoutConfig>()

  async send<T extends Command>(command: T): Promise<CommandResult> {
    const startTime = Date.now()
    
    try {
      // Emit command started event
      this.emitEvent({
        type: 'command:started',
        command,
        timestamp: new Date()
      })

      // Find handler
      const handler = this.findHandler(command)
      if (!handler) {
        const error = `No handler found for command type: ${command.type}`
        this.auditCommand(command, startTime, false, [error])
        return {
          success: false,
          errors: [error]
        }
      }

      // Execute with middleware chain
      const result = await this.executeWithMiddleware(command, handler)

      // Audit the command
      this.auditCommand(command, startTime, result.success, result.errors)

      // Emit completion event
      this.emitEvent({
        type: 'command:completed',
        command,
        result,
        timestamp: new Date()
      })

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Audit the failed command
      this.auditCommand(command, startTime, false, [errorMessage])

      // Emit failure event
      this.emitEvent({
        type: 'command:failed',
        command,
        error: error instanceof Error ? error : new Error(errorMessage),
        timestamp: new Date()
      })

      return {
        success: false,
        errors: [errorMessage]
      }
    }
  }

  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler)
  }

  addMiddleware(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware)
  }

  // Retry policy management
  setRetryPolicy(commandType: string, policy: RetryPolicy): void {
    this.retryPolicies.set(commandType, policy)
  }

  // Timeout configuration
  setTimeoutConfig(commandType: string, config: TimeoutConfig): void {
    this.timeoutConfigs.set(commandType, config)
  }

  // Event subscription
  onEvent(listener: (event: CommandEvent) => void): () => void {
    this.eventListeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  // Audit log access
  getAuditLog(filter?: {
    commandType?: string
    userId?: string
    success?: boolean
    fromDate?: Date
    toDate?: Date
  }): CommandAudit[] {
    let filtered = this.auditLog

    if (filter) {
      filtered = filtered.filter(audit => {
        if (filter.commandType && audit.type !== filter.commandType) return false
        if (filter.userId && audit.userId !== filter.userId) return false
        if (filter.success !== undefined && audit.success !== filter.success) return false
        if (filter.fromDate && audit.timestamp < filter.fromDate) return false
        if (filter.toDate && audit.timestamp > filter.toDate) return false
        return true
      })
    }

    return filtered
  }

  // Performance metrics
  getPerformanceMetrics(): {
    totalCommands: number
    successRate: number
    averageExecutionTime: number
    commandTypeStats: Record<string, {
      count: number
      successRate: number
      averageTime: number
    }>
  } {
    const total = this.auditLog.length
    const successful = this.auditLog.filter(a => a.success).length
    const totalTime = this.auditLog.reduce((sum, a) => sum + a.duration, 0)

    const commandTypeStats: Record<string, any> = {}
    
    this.auditLog.forEach(audit => {
      if (!commandTypeStats[audit.type]) {
        commandTypeStats[audit.type] = {
          count: 0,
          successful: 0,
          totalTime: 0
        }
      }
      
      const stats = commandTypeStats[audit.type]
      stats.count++
      if (audit.success) stats.successful++
      stats.totalTime += audit.duration
    })

    // Calculate rates and averages
    Object.keys(commandTypeStats).forEach(type => {
      const stats = commandTypeStats[type]
      stats.successRate = stats.count > 0 ? (stats.successful / stats.count) * 100 : 0
      stats.averageTime = stats.count > 0 ? stats.totalTime / stats.count : 0
      delete stats.successful
      delete stats.totalTime
    })

    return {
      totalCommands: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageExecutionTime: total > 0 ? totalTime / total : 0,
      commandTypeStats
    }
  }

  // Clear audit log (for maintenance)
  clearAuditLog(olderThan?: Date): void {
    if (olderThan) {
      this.auditLog = this.auditLog.filter(audit => audit.timestamp >= olderThan)
    } else {
      this.auditLog = []
    }
  }

  private findHandler<T extends Command>(command: T): CommandHandler<T> | null {
    const handler = this.handlers.get(command.type)
    return handler && handler.canHandle(command) ? handler : null
  }

  private async executeWithMiddleware<T extends Command>(
    command: T,
    handler: CommandHandler<T>
  ): Promise<CommandResult> {
    // Create execution chain
    const executeHandler = async (cmd: T): Promise<CommandResult> => {
      // Apply timeout if configured
      const timeoutConfig = this.timeoutConfigs.get(command.type)
      if (timeoutConfig) {
        return this.executeWithTimeout(cmd, handler, timeoutConfig)
      }
      
      // Apply retry policy if configured
      const retryPolicy = this.retryPolicies.get(command.type)
      if (retryPolicy) {
        return this.executeWithRetry(cmd, handler, retryPolicy)
      }
      
      return handler.handle(cmd)
    }

    // Apply middleware in reverse order
    let next = executeHandler
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i]
      const currentNext = next
      next = (cmd: T) => middleware.execute(cmd, currentNext)
    }

    return next(command)
  }

  private async executeWithTimeout<T extends Command>(
    command: T,
    handler: CommandHandler<T>,
    config: TimeoutConfig
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        config.onTimeout(command)
        resolve({
          success: false,
          errors: [`Command timed out after ${config.timeoutMs}ms`]
        })
      }, config.timeoutMs)

      handler.handle(command)
        .then(result => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          resolve({
            success: false,
            errors: [error.message || 'Unknown error']
          })
        })
    })
  }

  private async executeWithRetry<T extends Command>(
    command: T,
    handler: CommandHandler<T>,
    policy: RetryPolicy
  ): Promise<CommandResult> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        const result = await handler.handle(command)
        
        // If successful or non-retryable error, return immediately
        if (result.success || !this.isRetryableError(result.errors, policy)) {
          return result
        }
        
        lastError = new Error(result.errors?.join(', ') || 'Command failed')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Check if error is retryable
        if (!this.isRetryableError([lastError.message], policy)) {
          break
        }
      }

      // Wait before retry (except on last attempt)
      if (attempt < policy.maxAttempts) {
        await this.delay(policy.backoffMs * attempt)
      }
    }

    return {
      success: false,
      errors: [lastError?.message || 'Command failed after retries']
    }
  }

  private isRetryableError(errors: string[] | undefined, policy: RetryPolicy): boolean {
    if (!errors || errors.length === 0) return false
    
    return errors.some(error => 
      policy.retryableErrors.some(retryableError => 
        error.toLowerCase().includes(retryableError.toLowerCase())
      )
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private emitEvent(event: CommandEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in command event listener:', error)
      }
    })
  }

  private auditCommand(
    command: Command,
    startTime: number,
    success: boolean,
    errors?: string[]
  ): void {
    const audit: CommandAudit = {
      commandId: command.correlationId,
      type: command.type,
      userId: command.userId,
      timestamp: command.timestamp,
      duration: Date.now() - startTime,
      success,
      errors,
      metadata: {
        correlationId: command.correlationId
      }
    }

    this.auditLog.push(audit)

    // Keep only last 1000 audit entries to prevent memory issues
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000)
    }
  }
}
