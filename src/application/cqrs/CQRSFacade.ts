/**
 * CQRS Facade
 * Unified interface for command and query operations
 */

import { Command, CommandResult, CommandBus } from './Command'
import { Query, QueryResult, QueryBus } from './Query'
import { DefaultCommandBus } from './CommandBus'
import { DefaultQueryBus } from './QueryBus'

// Property Commands and Queries
import {
  CreatePropertyCommand,
  CreatePropertyCommandHandler,
  UpdatePropertyCommand,
  UpdatePropertyCommandHandler,
  ChangePropertyStatusCommand,
  ChangePropertyStatusCommandHandler,
  DeletePropertyCommand,
  DeletePropertyCommandHandler,
  BulkUpdatePropertiesCommand,
  BulkUpdatePropertiesCommandHandler
} from './commands/PropertyCommands'

import {
  GetPropertiesQuery,
  GetPropertiesQueryHandler,
  GetPropertyByIdQuery,
  GetPropertyByIdQueryHandler,
  GetPropertyStatsQuery,
  GetPropertyStatsQueryHandler,
  SearchPropertiesQuery,
  SearchPropertiesQueryHandler
} from './queries/PropertyQueries'

// Middleware
import {
  LoggingCommandMiddleware,
  LoggingQueryMiddleware,
  ValidationCommandMiddleware,
  AuthorizationCommandMiddleware,
  AuthorizationQueryMiddleware,
  PerformanceCommandMiddleware,
  PerformanceQueryMiddleware,
  CircuitBreakerCommandMiddleware,
  RateLimitingCommandMiddleware
} from './middleware/CQRSMiddleware'

// Cache implementation
import { InMemoryQueryCache } from './cache/InMemoryQueryCache'

// Dependencies
import { PropertyRepository } from '../../domain/repositories/PropertyRepository'
import { PropertyDomainService } from '../../domain/services/PropertyDomainService'
import { DomainEventPublisher } from '../interfaces/DomainEventPublisher'

export interface CQRSConfig {
  enableLogging?: boolean
  enablePerformanceMonitoring?: boolean
  enableCircuitBreaker?: boolean
  enableRateLimit?: boolean
  cacheEnabled?: boolean
  cacheTtlMs?: number
  circuitBreakerThreshold?: number
  rateLimitMaxRequests?: number
  rateLimitWindowMs?: number
}

export class CQRSFacade {
  private commandBus: CommandBus
  private queryBus: QueryBus
  private performanceCommandMiddleware?: PerformanceCommandMiddleware
  private performanceQueryMiddleware?: PerformanceQueryMiddleware
  private circuitBreakerMiddleware?: CircuitBreakerCommandMiddleware

  constructor(
    private propertyRepository: PropertyRepository,
    private propertyDomainService: PropertyDomainService,
    private eventPublisher: DomainEventPublisher,
    private config: CQRSConfig = {}
  ) {
    this.commandBus = new DefaultCommandBus()
    this.queryBus = new DefaultQueryBus(
      config.cacheEnabled ? new InMemoryQueryCache(config.cacheTtlMs) : undefined
    )

    this.setupMiddleware()
    this.registerHandlers()
  }

  // Command operations
  async executeCommand<T extends Command>(command: T): Promise<CommandResult> {
    return this.commandBus.send(command)
  }

  // Query operations
  async executeQuery<T extends Query>(query: T): Promise<QueryResult> {
    return this.queryBus.send(query)
  }

  // Property-specific command methods
  async createProperty(data: {
    name: string
    address: {
      street?: string
      city?: string
      county?: string
      country: string
      postalCode?: string
      coordinates?: { latitude: number; longitude: number }
    }
    propertyType: 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND' | 'TOWNHOUSE'
    ownerId: string
    totalAreaAcres?: number
    description?: string
    amenities?: string[]
  }, userId?: string): Promise<CommandResult<{ propertyId: string }>> {
    const command = new CreatePropertyCommand(data, userId)
    return this.executeCommand(command)
  }

  async updateProperty(
    propertyId: string,
    updates: {
      name?: string
      description?: string
      amenities?: string[]
      totalAreaAcres?: number
    },
    userId?: string
  ): Promise<CommandResult<void>> {
    const command = new UpdatePropertyCommand(propertyId, updates, userId)
    return this.executeCommand(command)
  }

  async changePropertyStatus(
    propertyId: string,
    newStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE',
    reason?: string,
    userId?: string
  ): Promise<CommandResult<void>> {
    const command = new ChangePropertyStatusCommand(propertyId, newStatus, reason, userId)
    return this.executeCommand(command)
  }

  async deleteProperty(propertyId: string, userId?: string): Promise<CommandResult<void>> {
    const command = new DeletePropertyCommand(propertyId, userId)
    return this.executeCommand(command)
  }

  async bulkUpdateProperties(
    propertyIds: string[],
    updates: {
      status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
      amenities?: { add?: string[]; remove?: string[] }
    },
    userId?: string
  ): Promise<CommandResult<{ updatedCount: number; errors: string[] }>> {
    const command = new BulkUpdatePropertiesCommand(propertyIds, updates, userId)
    return this.executeCommand(command)
  }

  // Property-specific query methods
  async getProperties(criteria: {
    ownerId?: string
    name?: string
    address?: string
    propertyType?: string
    status?: string
    lifecycleStatus?: string
    minArea?: number
    maxArea?: number
  } = {}, options: {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}, userId?: string) {
    const queryOptions = {
      pagination: options.page && options.limit ? {
        page: options.page,
        limit: options.limit
      } : undefined,
      sorts: options.sortBy ? [{
        field: options.sortBy,
        direction: options.sortOrder || 'asc'
      }] : undefined
    }

    const query = new GetPropertiesQuery(criteria, queryOptions, userId)
    return this.executeQuery(query)
  }

  async getPropertyById(propertyId: string, userId?: string) {
    const query = new GetPropertyByIdQuery(propertyId, userId)
    return this.executeQuery(query)
  }

  async getPropertyStats(ownerId?: string, userId?: string) {
    const query = new GetPropertyStatsQuery(ownerId, userId)
    return this.executeQuery(query)
  }

  async searchProperties(
    searchTerm: string,
    filters: {
      propertyTypes?: string[]
      statuses?: string[]
      ownerIds?: string[]
      minArea?: number
      maxArea?: number
    } = {},
    options: {
      limit?: number
      includeInactive?: boolean
    } = {},
    userId?: string
  ) {
    const query = new SearchPropertiesQuery(searchTerm, filters, options, userId)
    return this.executeQuery(query)
  }

  // Performance and monitoring
  getCommandMetrics() {
    return this.performanceCommandMiddleware?.getMetrics() || []
  }

  getQueryMetrics() {
    return this.performanceQueryMiddleware?.getMetrics() || []
  }

  getCommandPerformanceStats() {
    if (!this.performanceCommandMiddleware) return null
    
    const metrics = this.performanceCommandMiddleware.getMetrics()
    const commandTypes = [...new Set(metrics.map(m => m.commandType))]
    
    return {
      totalCommands: metrics.length,
      commandTypes: commandTypes.map(type => ({
        type,
        averageTime: this.performanceCommandMiddleware!.getAverageExecutionTime(type),
        successRate: this.performanceCommandMiddleware!.getSuccessRate(type)
      }))
    }
  }

  getQueryPerformanceStats() {
    if (!this.performanceQueryMiddleware) return null
    
    const metrics = this.performanceQueryMiddleware.getMetrics()
    const queryTypes = [...new Set(metrics.map(m => m.queryType))]
    
    return {
      totalQueries: metrics.length,
      queryTypes: queryTypes.map(type => ({
        type,
        cacheHitRate: this.performanceQueryMiddleware!.getCacheHitRate(type)
      }))
    }
  }

  getCircuitBreakerStatus() {
    if (!this.circuitBreakerMiddleware) return null
    
    const commandTypes = ['CreateProperty', 'UpdateProperty', 'ChangePropertyStatus', 'DeleteProperty']
    
    return commandTypes.map(type => ({
      commandType: type,
      state: this.circuitBreakerMiddleware!.getCircuitState(type)
    }))
  }

  // Cache management
  async invalidateQueryCache(pattern?: string) {
    await this.queryBus.invalidateCache(pattern)
  }

  async invalidateCache(pattern?: string) {
    await this.queryBus.invalidateCache(pattern)
  }

  // Event subscriptions
  onCommandEvent(listener: (event: any) => void) {
    return (this.commandBus as DefaultCommandBus).onEvent(listener)
  }

  onQueryEvent(listener: (event: any) => void) {
    return (this.queryBus as DefaultQueryBus).onEvent(listener)
  }

  private setupMiddleware() {
    // Command middleware
    if (this.config.enableLogging) {
      this.commandBus.addMiddleware(new LoggingCommandMiddleware())
    }

    if (this.config.enablePerformanceMonitoring) {
      this.performanceCommandMiddleware = new PerformanceCommandMiddleware()
      this.commandBus.addMiddleware(this.performanceCommandMiddleware)
    }

    if (this.config.enableCircuitBreaker) {
      this.circuitBreakerMiddleware = new CircuitBreakerCommandMiddleware(
        this.config.circuitBreakerThreshold
      )
      this.commandBus.addMiddleware(this.circuitBreakerMiddleware)
    }

    if (this.config.enableRateLimit) {
      this.commandBus.addMiddleware(new RateLimitingCommandMiddleware(
        this.config.rateLimitMaxRequests,
        this.config.rateLimitWindowMs
      ))
    }

    // Query middleware
    if (this.config.enableLogging) {
      this.queryBus.addMiddleware(new LoggingQueryMiddleware())
    }

    if (this.config.enablePerformanceMonitoring) {
      this.performanceQueryMiddleware = new PerformanceQueryMiddleware()
      this.queryBus.addMiddleware(this.performanceQueryMiddleware)
    }
  }

  private registerHandlers() {
    // Register command handlers
    this.commandBus.register(
      'CreateProperty',
      new CreatePropertyCommandHandler(
        this.propertyRepository,
        this.propertyDomainService,
        this.eventPublisher
      )
    )

    this.commandBus.register(
      'UpdateProperty',
      new UpdatePropertyCommandHandler(
        this.propertyRepository,
        this.propertyDomainService
      )
    )

    this.commandBus.register(
      'ChangePropertyStatus',
      new ChangePropertyStatusCommandHandler(
        this.propertyRepository,
        this.eventPublisher
      )
    )

    this.commandBus.register(
      'DeleteProperty',
      new DeletePropertyCommandHandler(this.propertyRepository)
    )

    this.commandBus.register(
      'BulkUpdateProperties',
      new BulkUpdatePropertiesCommandHandler(
        this.propertyRepository,
        this.eventPublisher
      )
    )

    // Register query handlers
    this.queryBus.register(
      'GetProperties',
      new GetPropertiesQueryHandler(this.propertyRepository)
    )

    this.queryBus.register(
      'GetPropertyById',
      new GetPropertyByIdQueryHandler(this.propertyRepository)
    )

    this.queryBus.register(
      'GetPropertyStats',
      new GetPropertyStatsQueryHandler(this.propertyRepository)
    )

    this.queryBus.register(
      'SearchProperties',
      new SearchPropertiesQueryHandler(this.propertyRepository)
    )
  }
}
