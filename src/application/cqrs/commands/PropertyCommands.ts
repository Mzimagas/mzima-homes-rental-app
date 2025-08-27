/**
 * Property CQRS Commands
 * Write operations for property management
 */

import { BaseCommand, Command, CommandResult, CommandHandler } from '../Command'
import { Property } from '../../../domain/entities/Property'
import { Address } from '../../../domain/value-objects/Address'
import { PropertyRepository } from '../../../domain/repositories/PropertyRepository'
import { PropertyDomainService } from '../../../domain/services/PropertyDomainService'
import { DomainEventPublisher } from '../../interfaces/DomainEventPublisher'

// Create Property Command
export class CreatePropertyCommand extends BaseCommand {
  constructor(
    public readonly data: {
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
    },
    userId?: string
  ) {
    super('CreateProperty', userId)
  }
}

export class CreatePropertyCommandHandler implements CommandHandler<CreatePropertyCommand> {
  constructor(
    private propertyRepository: PropertyRepository,
    private propertyDomainService: PropertyDomainService,
    private eventPublisher: DomainEventPublisher
  ) {}

  canHandle(command: Command): boolean {
    return command.type === 'CreateProperty'
  }

  async handle(command: CreatePropertyCommand): Promise<CommandResult<{ propertyId: string }>> {
    try {
      // Validate business rules
      const isNameUnique = await this.propertyDomainService.validatePropertyNameUniqueness(
        command.data.name,
        command.data.ownerId
      )

      if (!isNameUnique) {
        return {
          success: false,
          errors: ['Property name already exists in your portfolio']
        }
      }

      // Create domain objects
      const address = new Address(command.data.address)
      const propertyId = this.generatePropertyId()

      const property = new Property({
        id: propertyId,
        name: command.data.name,
        address,
        propertyType: command.data.propertyType,
        status: 'INACTIVE',
        lifecycleStatus: 'ACQUISITION',
        ownerId: command.data.ownerId,
        totalAreaAcres: command.data.totalAreaAcres,
        description: command.data.description,
        amenities: command.data.amenities || [],
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

      return {
        success: true,
        data: { propertyId },
        metadata: {
          correlationId: command.correlationId,
          timestamp: command.timestamp
        }
      }

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      }
    }
  }

  private generatePropertyId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Update Property Command
export class UpdatePropertyCommand extends BaseCommand {
  constructor(
    public readonly propertyId: string,
    public readonly updates: {
      name?: string
      description?: string
      amenities?: string[]
      totalAreaAcres?: number
    },
    userId?: string
  ) {
    super('UpdateProperty', userId)
  }
}

export class UpdatePropertyCommandHandler implements CommandHandler<UpdatePropertyCommand> {
  constructor(
    private propertyRepository: PropertyRepository,
    private propertyDomainService: PropertyDomainService
  ) {}

  canHandle(command: Command): boolean {
    return command.type === 'UpdateProperty'
  }

  async handle(command: UpdatePropertyCommand): Promise<CommandResult<void>> {
    try {
      const property = await this.propertyRepository.findById(command.propertyId)
      
      if (!property) {
        return {
          success: false,
          errors: ['Property not found']
        }
      }

      // Apply updates
      if (command.updates.name) {
        // Check name uniqueness if name is being changed
        if (command.updates.name !== property.name) {
          const isNameUnique = await this.propertyDomainService.validatePropertyNameUniqueness(
            command.updates.name,
            property.ownerId,
            property.id
          )

          if (!isNameUnique) {
            return {
              success: false,
              errors: ['Property name already exists in your portfolio']
            }
          }
        }

        property.updateName(command.updates.name)
      }

      if (command.updates.description !== undefined) {
        property.updateDescription(command.updates.description)
      }

      if (command.updates.amenities) {
        // Clear existing amenities and add new ones
        property.amenities.forEach(amenity => property.removeAmenity(amenity))
        command.updates.amenities.forEach(amenity => property.addAmenity(amenity))
      }

      // Save updated property
      await this.propertyRepository.save(property)

      return {
        success: true,
        metadata: {
          correlationId: command.correlationId,
          timestamp: command.timestamp
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

// Change Property Status Command
export class ChangePropertyStatusCommand extends BaseCommand {
  constructor(
    public readonly propertyId: string,
    public readonly newStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE',
    public readonly reason?: string,
    userId?: string
  ) {
    super('ChangePropertyStatus', userId)
  }
}

export class ChangePropertyStatusCommandHandler implements CommandHandler<ChangePropertyStatusCommand> {
  constructor(
    private propertyRepository: PropertyRepository,
    private eventPublisher: DomainEventPublisher
  ) {}

  canHandle(command: Command): boolean {
    return command.type === 'ChangePropertyStatus'
  }

  async handle(command: ChangePropertyStatusCommand): Promise<CommandResult<void>> {
    try {
      const property = await this.propertyRepository.findById(command.propertyId)
      
      if (!property) {
        return {
          success: false,
          errors: ['Property not found']
        }
      }

      // Change status (domain logic will validate the transition)
      property.changeStatus(command.newStatus, command.reason)

      // Save updated property
      await this.propertyRepository.save(property)

      // Publish domain events
      const domainEvents = property.getDomainEvents()
      for (const event of domainEvents) {
        await this.eventPublisher.publish(event)
      }
      property.clearDomainEvents()

      return {
        success: true,
        metadata: {
          correlationId: command.correlationId,
          timestamp: command.timestamp,
          previousStatus: property.status,
          newStatus: command.newStatus
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

// Delete Property Command
export class DeletePropertyCommand extends BaseCommand {
  constructor(
    public readonly propertyId: string,
    userId?: string
  ) {
    super('DeleteProperty', userId)
  }
}

export class DeletePropertyCommandHandler implements CommandHandler<DeletePropertyCommand> {
  constructor(
    private propertyRepository: PropertyRepository
  ) {}

  canHandle(command: Command): boolean {
    return command.type === 'DeleteProperty'
  }

  async handle(command: DeletePropertyCommand): Promise<CommandResult<void>> {
    try {
      const property = await this.propertyRepository.findById(command.propertyId)
      
      if (!property) {
        return {
          success: false,
          errors: ['Property not found']
        }
      }

      // Business rule: Can only delete inactive properties
      if (property.status !== 'INACTIVE') {
        return {
          success: false,
          errors: ['Can only delete inactive properties. Please change status to inactive first.']
        }
      }

      // Delete property
      await this.propertyRepository.delete(command.propertyId)

      return {
        success: true,
        metadata: {
          correlationId: command.correlationId,
          timestamp: command.timestamp,
          deletedPropertyName: property.name
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

// Bulk Update Properties Command
export class BulkUpdatePropertiesCommand extends BaseCommand {
  constructor(
    public readonly propertyIds: string[],
    public readonly updates: {
      status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
      amenities?: { add?: string[]; remove?: string[] }
    },
    userId?: string
  ) {
    super('BulkUpdateProperties', userId)
  }
}

export class BulkUpdatePropertiesCommandHandler implements CommandHandler<BulkUpdatePropertiesCommand> {
  constructor(
    private propertyRepository: PropertyRepository,
    private eventPublisher: DomainEventPublisher
  ) {}

  canHandle(command: Command): boolean {
    return command.type === 'BulkUpdateProperties'
  }

  async handle(command: BulkUpdatePropertiesCommand): Promise<CommandResult<{ updatedCount: number; errors: string[] }>> {
    const errors: string[] = []
    let updatedCount = 0

    try {
      const properties = await this.propertyRepository.findByIds(command.propertyIds)
      
      if (properties.length === 0) {
        return {
          success: false,
          errors: ['No properties found with the provided IDs']
        }
      }

      for (const property of properties) {
        try {
          // Apply status update
          if (command.updates.status) {
            property.changeStatus(command.updates.status)
          }

          // Apply amenity updates
          if (command.updates.amenities) {
            if (command.updates.amenities.remove) {
              command.updates.amenities.remove.forEach(amenity => {
                property.removeAmenity(amenity)
              })
            }
            
            if (command.updates.amenities.add) {
              command.updates.amenities.add.forEach(amenity => {
                property.addAmenity(amenity)
              })
            }
          }

          await this.propertyRepository.save(property)

          // Publish domain events
          const domainEvents = property.getDomainEvents()
          for (const event of domainEvents) {
            await this.eventPublisher.publish(event)
          }
          property.clearDomainEvents()

          updatedCount++

        } catch (error) {
          errors.push(`Failed to update property ${property.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: updatedCount > 0,
        data: { updatedCount, errors },
        warnings: errors.length > 0 ? [`${errors.length} properties failed to update`] : undefined,
        metadata: {
          correlationId: command.correlationId,
          timestamp: command.timestamp,
          totalRequested: command.propertyIds.length,
          successfulUpdates: updatedCount,
          failedUpdates: errors.length
        }
      }

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        data: { updatedCount, errors }
      }
    }
  }
}
