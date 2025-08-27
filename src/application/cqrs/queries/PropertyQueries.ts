/**
 * Property CQRS Queries
 * Read operations for property data retrieval
 */

import { BaseQuery, Query, QueryResult, QueryHandler, QueryOptions } from '../Query'
import { PropertyRepository, PropertySearchCriteria } from '../../../domain/repositories/PropertyRepository'

// Property DTOs for read models
export interface PropertyListItemDTO {
  id: string
  name: string
  address: string
  propertyType: string
  status: string
  lifecycleStatus: string
  ownerId: string
  totalAreaAcres?: number
  amenitiesCount: number
  createdAt: string
  updatedAt: string
}

export interface PropertyDetailDTO extends PropertyListItemDTO {
  description?: string
  amenities: string[]
  coordinates?: { latitude: number; longitude: number }
  fullAddress: string
  shortAddress: string
}

export interface PropertyStatsDTO {
  totalProperties: number
  propertiesByStatus: Record<string, number>
  propertiesByType: Record<string, number>
  propertiesByLifecycle: Record<string, number>
  totalArea: number
  averageArea: number
}

// Get Properties Query
export class GetPropertiesQuery extends BaseQuery {
  constructor(
    public readonly criteria: {
      ownerId?: string
      name?: string
      address?: string
      propertyType?: string
      status?: string
      lifecycleStatus?: string
      minArea?: number
      maxArea?: number
    } = {},
    public readonly options: QueryOptions = {},
    userId?: string
  ) {
    super(
      'GetProperties',
      userId,
      `properties:${JSON.stringify({ criteria, options })}`,
      300000 // 5 minutes cache
    )
  }
}

export class GetPropertiesQueryHandler implements QueryHandler<GetPropertiesQuery> {
  constructor(private propertyRepository: PropertyRepository) {}

  canHandle(query: Query): boolean {
    return query.type === 'GetProperties'
  }

  async handle(query: GetPropertiesQuery): Promise<QueryResult<PropertyListItemDTO[]>> {
    try {
      const startTime = Date.now()

      // Convert query criteria to repository search criteria
      const searchCriteria: PropertySearchCriteria = {
        name: query.criteria.name,
        address: query.criteria.address,
        propertyType: query.criteria.propertyType as any,
        status: query.criteria.status as any,
        lifecycleStatus: query.criteria.lifecycleStatus as any,
        ownerId: query.criteria.ownerId,
        minArea: query.criteria.minArea,
        maxArea: query.criteria.maxArea
      }

      // Get properties from repository
      const properties = await this.propertyRepository.search(searchCriteria)

      // Apply additional filtering if needed
      let filteredProperties = properties

      if (query.options.filters) {
        filteredProperties = this.applyFilters(properties, query.options.filters)
      }

      // Apply sorting
      if (query.options.sorts) {
        filteredProperties = this.applySorting(filteredProperties, query.options.sorts)
      }

      // Calculate pagination
      const total = filteredProperties.length
      let paginatedProperties = filteredProperties

      if (query.options.pagination) {
        const { page, limit } = query.options.pagination
        const offset = (page - 1) * limit
        paginatedProperties = filteredProperties.slice(offset, offset + limit)
      }

      // Convert to DTOs
      const propertyDTOs = paginatedProperties.map(this.toListItemDTO)

      const executionTime = Date.now() - startTime

      return {
        success: true,
        data: propertyDTOs,
        metadata: {
          totalCount: total,
          currentPage: query.options.pagination?.page || 1,
          pageCount: query.options.pagination ? Math.ceil(total / query.options.pagination.limit) : 1,
          hasNext: query.options.pagination ? 
            (query.options.pagination.page * query.options.pagination.limit) < total : false,
          hasPrevious: query.options.pagination ? query.options.pagination.page > 1 : false,
          executionTime
        }
      }

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      }
    }
  }

  private toListItemDTO(property: any): PropertyListItemDTO {
    return {
      id: property.id,
      name: property.name,
      address: property.address.getShortAddress(),
      propertyType: property.propertyType,
      status: property.status,
      lifecycleStatus: property.lifecycleStatus,
      ownerId: property.ownerId,
      totalAreaAcres: property.totalAreaAcres,
      amenitiesCount: property.amenities.length,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString()
    }
  }

  private applyFilters(properties: any[], filters: any[]): any[] {
    return properties.filter(property => {
      return filters.every(filter => {
        const value = this.getPropertyValue(property, filter.field)
        return this.evaluateFilter(value, filter.operator, filter.value)
      })
    })
  }

  private applySorting(properties: any[], sorts: any[]): any[] {
    return properties.sort((a, b) => {
      for (const sort of sorts) {
        const aValue = this.getPropertyValue(a, sort.field)
        const bValue = this.getPropertyValue(b, sort.field)
        
        let comparison = 0
        if (aValue < bValue) comparison = -1
        else if (aValue > bValue) comparison = 1
        
        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison
        }
      }
      return 0
    })
  }

  private getPropertyValue(property: any, field: string): any {
    const parts = field.split('.')
    let value = property
    for (const part of parts) {
      value = value?.[part]
    }
    return value
  }

  private evaluateFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'eq': return value === filterValue
      case 'ne': return value !== filterValue
      case 'gt': return value > filterValue
      case 'gte': return value >= filterValue
      case 'lt': return value < filterValue
      case 'lte': return value <= filterValue
      case 'in': return Array.isArray(filterValue) && filterValue.includes(value)
      case 'nin': return Array.isArray(filterValue) && !filterValue.includes(value)
      case 'contains': return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
      case 'startsWith': return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase())
      case 'endsWith': return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase())
      default: return true
    }
  }
}

// Get Property by ID Query
export class GetPropertyByIdQuery extends BaseQuery {
  constructor(
    public readonly propertyId: string,
    userId?: string
  ) {
    super(
      'GetPropertyById',
      userId,
      `property:${propertyId}`,
      600000 // 10 minutes cache
    )
  }
}

export class GetPropertyByIdQueryHandler implements QueryHandler<GetPropertyByIdQuery> {
  constructor(private propertyRepository: PropertyRepository) {}

  canHandle(query: Query): boolean {
    return query.type === 'GetPropertyById'
  }

  async handle(query: GetPropertyByIdQuery): Promise<QueryResult<PropertyDetailDTO | null>> {
    try {
      const startTime = Date.now()
      
      const property = await this.propertyRepository.findById(query.propertyId)
      
      if (!property) {
        return {
          success: true,
          data: null,
          metadata: {
            executionTime: Date.now() - startTime
          }
        }
      }

      const propertyDTO: PropertyDetailDTO = {
        id: property.id,
        name: property.name,
        address: property.address.getShortAddress(),
        fullAddress: property.address.getFullAddress(),
        shortAddress: property.address.getShortAddress(),
        propertyType: property.propertyType,
        status: property.status,
        lifecycleStatus: property.lifecycleStatus,
        ownerId: property.ownerId,
        totalAreaAcres: property.totalAreaAcres,
        description: property.description,
        amenities: property.amenities,
        amenitiesCount: property.amenities.length,
        coordinates: property.address.coordinates,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt.toISOString()
      }

      return {
        success: true,
        data: propertyDTO,
        metadata: {
          executionTime: Date.now() - startTime
        }
      }

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      }
    }
  }
}

// Get Property Statistics Query
export class GetPropertyStatsQuery extends BaseQuery {
  constructor(
    public readonly ownerId?: string,
    userId?: string
  ) {
    super(
      'GetPropertyStats',
      userId,
      `property-stats:${ownerId || 'all'}`,
      180000 // 3 minutes cache
    )
  }
}

export class GetPropertyStatsQueryHandler implements QueryHandler<GetPropertyStatsQuery> {
  constructor(private propertyRepository: PropertyRepository) {}

  canHandle(query: Query): boolean {
    return query.type === 'GetPropertyStats'
  }

  async handle(query: GetPropertyStatsQuery): Promise<QueryResult<PropertyStatsDTO>> {
    try {
      const startTime = Date.now()

      // Get properties based on owner filter
      const properties = query.ownerId 
        ? await this.propertyRepository.findByOwnerId(query.ownerId)
        : await this.propertyRepository.findAll()

      // Calculate statistics
      const stats: PropertyStatsDTO = {
        totalProperties: properties.length,
        propertiesByStatus: await this.propertyRepository.countByStatus(),
        propertiesByType: await this.propertyRepository.countByType(),
        propertiesByLifecycle: await this.propertyRepository.countByLifecycleStatus(),
        totalArea: properties.reduce((sum, p) => sum + (p.totalAreaAcres || 0), 0),
        averageArea: 0
      }

      // Calculate average area
      const propertiesWithArea = properties.filter(p => p.totalAreaAcres && p.totalAreaAcres > 0)
      if (propertiesWithArea.length > 0) {
        stats.averageArea = stats.totalArea / propertiesWithArea.length
      }

      return {
        success: true,
        data: stats,
        metadata: {
          executionTime: Date.now() - startTime,
          calculatedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      }
    }
  }
}

// Search Properties Query
export class SearchPropertiesQuery extends BaseQuery {
  constructor(
    public readonly searchTerm: string,
    public readonly filters: {
      propertyTypes?: string[]
      statuses?: string[]
      ownerIds?: string[]
      minArea?: number
      maxArea?: number
    } = {},
    public readonly options: {
      limit?: number
      includeInactive?: boolean
    } = {},
    userId?: string
  ) {
    super(
      'SearchProperties',
      userId,
      `search:${searchTerm}:${JSON.stringify(filters)}:${JSON.stringify(options)}`,
      60000 // 1 minute cache for search results
    )
  }
}

export class SearchPropertiesQueryHandler implements QueryHandler<SearchPropertiesQuery> {
  constructor(private propertyRepository: PropertyRepository) {}

  canHandle(query: Query): boolean {
    return query.type === 'SearchProperties'
  }

  async handle(query: SearchPropertiesQuery): Promise<QueryResult<PropertyListItemDTO[]>> {
    try {
      const startTime = Date.now()

      // Build search criteria
      const searchCriteria: PropertySearchCriteria = {
        name: query.searchTerm,
        address: query.searchTerm,
        propertyType: query.filters.propertyTypes?.[0] as any,
        status: query.filters.statuses?.[0] as any,
        ownerId: query.filters.ownerIds?.[0],
        minArea: query.filters.minArea,
        maxArea: query.filters.maxArea
      }

      // Get all matching properties
      let properties = await this.propertyRepository.search(searchCriteria)

      // Additional filtering for multiple values
      if (query.filters.propertyTypes && query.filters.propertyTypes.length > 1) {
        properties = properties.filter(p => query.filters.propertyTypes!.includes(p.propertyType))
      }

      if (query.filters.statuses && query.filters.statuses.length > 1) {
        properties = properties.filter(p => query.filters.statuses!.includes(p.status))
      }

      if (query.filters.ownerIds && query.filters.ownerIds.length > 1) {
        properties = properties.filter(p => query.filters.ownerIds!.includes(p.ownerId))
      }

      // Filter out inactive properties unless explicitly included
      if (!query.options.includeInactive) {
        properties = properties.filter(p => p.status !== 'INACTIVE')
      }

      // Apply limit
      if (query.options.limit) {
        properties = properties.slice(0, query.options.limit)
      }

      // Convert to DTOs
      const propertyDTOs = properties.map(property => ({
        id: property.id,
        name: property.name,
        address: property.address.getShortAddress(),
        propertyType: property.propertyType,
        status: property.status,
        lifecycleStatus: property.lifecycleStatus,
        ownerId: property.ownerId,
        totalAreaAcres: property.totalAreaAcres,
        amenitiesCount: property.amenities.length,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt.toISOString()
      }))

      return {
        success: true,
        data: propertyDTOs,
        metadata: {
          totalCount: propertyDTOs.length,
          executionTime: Date.now() - startTime,
          searchTerm: query.searchTerm,
          filtersApplied: Object.keys(query.filters).length
        }
      }

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      }
    }
  }
}
