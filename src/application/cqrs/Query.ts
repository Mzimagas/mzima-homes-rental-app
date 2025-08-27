/**
 * CQRS Query Infrastructure
 * Base classes and interfaces for query operations
 */

// Base query interface
export interface Query {
  readonly type: string
  readonly timestamp: Date
  readonly correlationId: string
  readonly userId?: string
  readonly cacheKey?: string
  readonly cacheTtl?: number
}

// Query result interface
export interface QueryResult<T = any> {
  success: boolean
  data?: T
  errors?: string[]
  metadata?: {
    totalCount?: number
    pageCount?: number
    currentPage?: number
    hasNext?: boolean
    hasPrevious?: boolean
    executionTime?: number
    fromCache?: boolean
    cacheExpiry?: Date
  }
}

// Query handler interface
export interface QueryHandler<TQuery extends Query, TResult = any> {
  handle(query: TQuery): Promise<QueryResult<TResult>>
  canHandle(query: Query): boolean
}

// Base query class
export abstract class BaseQuery implements Query {
  public readonly type: string
  public readonly timestamp: Date
  public readonly correlationId: string
  public readonly userId?: string
  public readonly cacheKey?: string
  public readonly cacheTtl?: number

  constructor(
    type: string, 
    userId?: string, 
    cacheKey?: string, 
    cacheTtl: number = 300000 // 5 minutes default
  ) {
    this.type = type
    this.timestamp = new Date()
    this.correlationId = this.generateCorrelationId()
    this.userId = userId
    this.cacheKey = cacheKey
    this.cacheTtl = cacheTtl
  }

  private generateCorrelationId(): string {
    return `qry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Query bus interface
export interface QueryBus {
  send<T extends Query>(query: T): Promise<QueryResult>
  register<T extends Query>(
    queryType: string,
    handler: QueryHandler<T>
  ): void
  addMiddleware(middleware: QueryMiddleware): void
}

// Query middleware interface
export interface QueryMiddleware {
  execute<T extends Query>(
    query: T,
    next: (query: T) => Promise<QueryResult>
  ): Promise<QueryResult>
}

// Query cache interface
export interface QueryCache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  invalidate(key: string): Promise<void>
  invalidatePattern(pattern: string): Promise<void>
  clear(): Promise<void>
}

// Query projection interface
export interface QueryProjection<TSource, TTarget> {
  project(source: TSource): TTarget
  projectMany(sources: TSource[]): TTarget[]
}

// Query filter interface
export interface QueryFilter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith'
  value: any
}

// Query sort interface
export interface QuerySort {
  field: string
  direction: 'asc' | 'desc'
}

// Query pagination interface
export interface QueryPagination {
  page: number
  limit: number
  offset?: number
}

// Advanced query options
export interface QueryOptions {
  filters?: QueryFilter[]
  sorts?: QuerySort[]
  pagination?: QueryPagination
  includes?: string[]
  excludes?: string[]
  groupBy?: string[]
  aggregations?: QueryAggregation[]
}

// Query aggregation interface
export interface QueryAggregation {
  field: string
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct'
  alias?: string
}

// Read model interface
export interface ReadModel {
  id: string
  version: number
  lastUpdated: Date
  [key: string]: any
}

// Query event interface
export interface QueryEvent {
  type: 'query:started' | 'query:completed' | 'query:cached' | 'query:failed'
  query: Query
  result?: QueryResult
  error?: Error
  timestamp: Date
}

// Query performance metrics
export interface QueryMetrics {
  queryType: string
  executionTime: number
  resultCount: number
  cacheHit: boolean
  timestamp: Date
  userId?: string
}

// Query subscription interface (for real-time updates)
export interface QuerySubscription {
  id: string
  query: Query
  callback: (result: QueryResult) => void
  isActive: boolean
  lastUpdate: Date
}

// Query optimization hints
export interface QueryHints {
  useIndex?: string[]
  forceRefresh?: boolean
  maxExecutionTime?: number
  priority?: 'low' | 'normal' | 'high'
}
