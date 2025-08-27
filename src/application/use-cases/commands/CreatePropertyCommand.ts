/**
 * Create Property Command
 * Handles the creation of new properties
 */

import { Property, PropertyType, PropertyStatus, LifecycleStatus } from '../../../domain/entities/Property'
import { Address } from '../../../domain/value-objects/Address'
import { PropertyRepository } from '../../../domain/repositories/PropertyRepository'
import { PropertyDomainService } from '../../../domain/services/PropertyDomainService'
import { DomainEventPublisher } from '../../interfaces/DomainEventPublisher'

export interface CreatePropertyRequest {
  name: string
  address: {
    street?: string
    city?: string
    county?: string
    country?: string
    postalCode?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  propertyType: PropertyType
  ownerId: string
  totalAreaAcres?: number
  description?: string
  amenities?: string[]
}

export interface CreatePropertyResponse {
  success: boolean
  propertyId?: string
  errors?: string[]
}

export class CreatePropertyCommand {
  constructor(
    private propertyRepository: PropertyRepository,
    private propertyDomainService: PropertyDomainService,
    private eventPublisher: DomainEventPublisher
  ) {}

  async execute(request: CreatePropertyRequest): Promise<CreatePropertyResponse> {
    try {
      // Validate input
      const validationErrors = await this.validateRequest(request)
      if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors }
      }

      // Check name uniqueness within owner's portfolio
      const isNameUnique = await this.propertyDomainService.validatePropertyNameUniqueness(
        request.name,
        request.ownerId
      )

      if (!isNameUnique) {
        return { 
          success: false, 
          errors: ['Property name already exists in your portfolio'] 
        }
      }

      // Create domain objects
      const address = new Address(request.address)
      const propertyId = this.generatePropertyId()

      const property = new Property({
        id: propertyId,
        name: request.name,
        address,
        propertyType: request.propertyType,
        status: 'INACTIVE' as PropertyStatus, // New properties start as inactive
        lifecycleStatus: 'ACQUISITION' as LifecycleStatus, // Start in acquisition phase
        ownerId: request.ownerId,
        totalAreaAcres: request.totalAreaAcres,
        description: request.description,
        amenities: request.amenities,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Save to repository
      await this.propertyRepository.save(property)

      // Publish domain events
      const domainEvents = property.getDomainEvents()
      for (const event of domainEvents) {
        await this.eventPublisher.publish(event)
      }
      property.clearDomainEvents()

      return { success: true, propertyId }

    } catch (error) {
      console.error('Error creating property:', error)
      return { 
        success: false, 
        errors: ['An unexpected error occurred while creating the property'] 
      }
    }
  }

  private async validateRequest(request: CreatePropertyRequest): Promise<string[]> {
    const errors: string[] = []

    // Required fields
    if (!request.name?.trim()) {
      errors.push('Property name is required')
    }

    if (!request.ownerId?.trim()) {
      errors.push('Owner ID is required')
    }

    if (!request.propertyType) {
      errors.push('Property type is required')
    }

    if (!request.address?.country?.trim()) {
      errors.push('Country is required in address')
    }

    // Business rules
    if (request.totalAreaAcres !== undefined && request.totalAreaAcres <= 0) {
      errors.push('Total area must be positive')
    }

    if (request.name && request.name.length > 100) {
      errors.push('Property name cannot exceed 100 characters')
    }

    if (request.description && request.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters')
    }

    // Validate coordinates if provided
    if (request.address?.coordinates) {
      const { latitude, longitude } = request.address.coordinates
      if (latitude < -90 || latitude > 90) {
        errors.push('Invalid latitude: must be between -90 and 90')
      }
      if (longitude < -180 || longitude > 180) {
        errors.push('Invalid longitude: must be between -180 and 180')
      }
    }

    // Validate amenities
    if (request.amenities) {
      if (request.amenities.length > 20) {
        errors.push('Cannot have more than 20 amenities')
      }
      
      const invalidAmenities = request.amenities.filter(amenity => 
        !amenity.trim() || amenity.length > 50
      )
      
      if (invalidAmenities.length > 0) {
        errors.push('Each amenity must be 1-50 characters long')
      }
    }

    return errors
  }

  private generatePropertyId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
