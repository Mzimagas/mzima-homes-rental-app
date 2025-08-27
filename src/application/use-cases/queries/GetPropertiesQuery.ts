/**
 * Get Properties Query
 * Handles property retrieval with filtering and pagination
 */

import { PropertyRepository, PropertySearchCriteria } from '../../../domain/repositories/PropertyRepository'
import { PropertyType, PropertyStatus, LifecycleStatus } from '../../../domain/entities/Property'

export interface GetPropertiesRequest {
  // Filtering
  ownerId?: string
  name?: string
  address?: string
  propertyType?: PropertyType
  status?: PropertyStatus
  lifecycleStatus?: LifecycleStatus
  minArea?: number
  maxArea?: number

  // Pagination
  page?: number
  limit?: number

  // Sorting
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'totalAreaAcres'
  sortOrder?: 'asc' | 'desc'
}

export interface PropertyDTO {
  id: string
  name: string
  address: {
    street?: string
    city?: string
    county?: string
    country: string
    postalCode?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
    fullAddress: string
    shortAddress: string
  }
  propertyType: PropertyType
  status: PropertyStatus
  lifecycleStatus: LifecycleStatus
  ownerId: string
  totalAreaAcres?: number
  description?: string
  amenities: string[]
  createdAt: string
  updatedAt: string
}

export interface GetPropertiesResponse {
  success: boolean
  data?: {
    properties: PropertyDTO[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }
  errors?: string[]
}

export class GetPropertiesQuery {
  constructor(private propertyRepository: PropertyRepository) {}

  async execute(request: GetPropertiesRequest = {}): Promise<GetPropertiesResponse> {
    try {
      // Validate and set defaults
      const page = Math.max(1, request.page || 1)
      const limit = Math.min(100, Math.max(1, request.limit || 20))
      const sortBy = request.sortBy || 'createdAt'
      const sortOrder = request.sortOrder || 'desc'

      // Build search criteria
      const searchCriteria: PropertySearchCriteria = {
        name: request.name,
        address: request.address,
        propertyType: request.propertyType,
        status: request.status,
        lifecycleStatus: request.lifecycleStatus,
        ownerId: request.ownerId,
        minArea: request.minArea,
        maxArea: request.maxArea
      }

      // Get properties from repository
      const allProperties = await this.propertyRepository.search(searchCriteria)

      // Sort properties
      const sortedProperties = this.sortProperties(allProperties, sortBy, sortOrder)

      // Apply pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedProperties = sortedProperties.slice(startIndex, endIndex)

      // Convert to DTOs
      const propertyDTOs = paginatedProperties.map(property => this.toDTO(property))

      // Build pagination info
      const total = allProperties.length
      const totalPages = Math.ceil(total / limit)

      const response: GetPropertiesResponse = {
        success: true,
        data: {
          properties: propertyDTOs,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1
          }
        }
      }

      return response

    } catch (error) {
      console.error('Error getting properties:', error)
      return {
        success: false,
        errors: ['An unexpected error occurred while retrieving properties']
      }
    }
  }

  private sortProperties(properties: any[], sortBy: string, sortOrder: string) {
    return properties.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'createdAt':
          aValue = a.createdAt.getTime()
          bValue = b.createdAt.getTime()
          break
        case 'updatedAt':
          aValue = a.updatedAt.getTime()
          bValue = b.updatedAt.getTime()
          break
        case 'totalAreaAcres':
          aValue = a.totalAreaAcres || 0
          bValue = b.totalAreaAcres || 0
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  private toDTO(property: any): PropertyDTO {
    return {
      id: property.id,
      name: property.name,
      address: {
        street: property.address.street,
        city: property.address.city,
        county: property.address.county,
        country: property.address.country,
        postalCode: property.address.postalCode,
        coordinates: property.address.coordinates,
        fullAddress: property.address.getFullAddress(),
        shortAddress: property.address.getShortAddress()
      },
      propertyType: property.propertyType,
      status: property.status,
      lifecycleStatus: property.lifecycleStatus,
      ownerId: property.ownerId,
      totalAreaAcres: property.totalAreaAcres,
      description: property.description,
      amenities: property.amenities,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString()
    }
  }
}
