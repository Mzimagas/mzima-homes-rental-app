/**
 * CQRS Command Infrastructure
 * Base classes and interfaces for command operations
 */

// Base command interface
export interface Command {
  readonly type: string
  readonly timestamp: Date
  readonly correlationId: string
  readonly userId?: string
}

// Command result interface
export interface CommandResult<T = any> {
  success: boolean
  data?: T
  errors?: string[]
  warnings?: string[]
  metadata?: Record<string, any>
}

// Command handler interface
export interface CommandHandler<TCommand extends Command, TResult = any> {
  handle(command: TCommand): Promise<CommandResult<TResult>>
  canHandle(command: Command): boolean
}

// Base command class
export abstract class BaseCommand implements Command {
  public readonly type: string
  public readonly timestamp: Date
  public readonly correlationId: string
  public readonly userId?: string

  constructor(type: string, userId?: string) {
    this.type = type
    this.timestamp = new Date()
    this.correlationId = this.generateCorrelationId()
    this.userId = userId
  }

  private generateCorrelationId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Command validation interface
export interface CommandValidator<T extends Command> {
  validate(command: T): Promise<ValidationResult>
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Command middleware interface
export interface CommandMiddleware {
  execute<T extends Command>(
    command: T,
    next: (command: T) => Promise<CommandResult>
  ): Promise<CommandResult>
}

// Command bus interface
export interface CommandBus {
  send<T extends Command>(command: T): Promise<CommandResult>
  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void
  addMiddleware(middleware: CommandMiddleware): void
}

// Command audit interface
export interface CommandAudit {
  commandId: string
  type: string
  userId?: string
  timestamp: Date
  duration: number
  success: boolean
  errors?: string[]
  metadata?: Record<string, any>
}

// Command event interface
export interface CommandEvent {
  type: 'command:started' | 'command:completed' | 'command:failed'
  command: Command
  result?: CommandResult
  error?: Error
  timestamp: Date
}

// Command context interface
export interface CommandContext {
  userId?: string
  tenantId?: string
  permissions: string[]
  metadata: Record<string, any>
}

// Optimistic update interface
export interface OptimisticUpdate<T> {
  id: string
  type: string
  data: T
  rollback: () => void
  confirm: () => void
}

// Command retry policy
export interface RetryPolicy {
  maxAttempts: number
  backoffMs: number
  retryableErrors: string[]
}

// Command timeout configuration
export interface TimeoutConfig {
  timeoutMs: number
  onTimeout: (command: Command) => void
}
