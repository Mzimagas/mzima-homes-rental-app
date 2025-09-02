/**
 * Property Domain Entity
 * Core business entity representing a rental property
 */

import { Address } from '../value-objects/Address'
import { Money } from '../value-objects/Money'
import { DomainEvent } from '../events/DomainEvent'
import { PropertyCreatedEvent } from '../events/PropertyCreatedEvent'
import { PropertyStatusChangedEvent } from '../events/PropertyStatusChangedEvent'

// Import types from shared module to prevent circular dependencies
import type {
  PropertyType,
  PropertyStatus,
  LifecycleStatus,
  PropertyLocation,
  PropertyFinancials,
  PropertyDimensions,
  PropertyDates,
  PropertyMetadata,
  CreatePropertyData,
  UpdatePropertyData
} from '../types/PropertyTypes'

// Re-export for backward compatibility
export type {
  PropertyType,
  PropertyStatus,
  LifecycleStatus,
  PropertyLocation,
  PropertyFinancials,
  PropertyDimensions,
  PropertyDates,
  PropertyMetadata,
  CreatePropertyData,
  UpdatePropertyData
}

export interface PropertyProps {
  id: string
  name: string
  address: Address
  propertyType: PropertyType
  status: PropertyStatus
  lifecycleStatus: LifecycleStatus
  ownerId: string
  totalAreaAcres?: number
  description?: string
  amenities?: string[]
  createdAt: Date
  updatedAt: Date
}

export class Property {
  private _id: string
  private _name: string
  private _address: Address
  private _propertyType: PropertyType
  private _status: PropertyStatus
  private _lifecycleStatus: LifecycleStatus
  private _ownerId: string
  private _totalAreaAcres?: number
  private _description?: string
  private _amenities: string[]
  private _createdAt: Date
  private _updatedAt: Date
  private _domainEvents: DomainEvent[] = []

  constructor(props: PropertyProps) {
    this.validateProps(props)
    
    this._id = props.id
    this._name = props.name
    this._address = props.address
    this._propertyType = props.propertyType
    this._status = props.status
    this._lifecycleStatus = props.lifecycleStatus
    this._ownerId = props.ownerId
    this._totalAreaAcres = props.totalAreaAcres
    this._description = props.description
    this._amenities = props.amenities || []
    this._createdAt = props.createdAt
    this._updatedAt = props.updatedAt

    // Raise domain event for new properties
    if (this.isNewProperty()) {
      this.addDomainEvent(new PropertyCreatedEvent(this._id, this._name, this._ownerId))
    }
  }

  // Getters
  get id(): string { return this._id }
  get name(): string { return this._name }
  get address(): Address { return this._address }
  get propertyType(): PropertyType { return this._propertyType }
  get status(): PropertyStatus { return this._status }
  get lifecycleStatus(): LifecycleStatus { return this._lifecycleStatus }
  get ownerId(): string { return this._ownerId }
  get totalAreaAcres(): number | undefined { return this._totalAreaAcres }
  get description(): string | undefined { return this._description }
  get amenities(): string[] { return [...this._amenities] }
  get createdAt(): Date { return new Date(this._createdAt) }
  get updatedAt(): Date { return new Date(this._updatedAt) }

  // Business methods
  updateName(newName: string): void {
    if (!newName.trim()) {
      throw new Error('Property name cannot be empty')
    }
    
    this._name = newName.trim()
    this.touch()
  }

  updateDescription(description: string): void {
    this._description = description.trim() || undefined
    this.touch()
  }

  changeStatus(newStatus: PropertyStatus, reason?: string): void {
    if (this._status === newStatus) {
      return
    }

    this.validateStatusTransition(this._status, newStatus)
    
    const oldStatus = this._status
    this._status = newStatus
    this.touch()

    this.addDomainEvent(new PropertyStatusChangedEvent(
      this._id,
      oldStatus,
      newStatus,
      reason
    ))
  }

  changeLifecycleStatus(newLifecycleStatus: LifecycleStatus): void {
    if (this._lifecycleStatus === newLifecycleStatus) {
      return
    }

    this.validateLifecycleTransition(this._lifecycleStatus, newLifecycleStatus)
    
    this._lifecycleStatus = newLifecycleStatus
    this.touch()
  }

  addAmenity(amenity: string): void {
    const trimmedAmenity = amenity.trim()
    if (!trimmedAmenity) {
      throw new Error('Amenity cannot be empty')
    }

    if (this._amenities.includes(trimmedAmenity)) {
      return
    }

    this._amenities.push(trimmedAmenity)
    this.touch()
  }

  removeAmenity(amenity: string): void {
    const index = this._amenities.indexOf(amenity)
    if (index > -1) {
      this._amenities.splice(index, 1)
      this.touch()
    }
  }

  updateAddress(newAddress: Address): void {
    this._address = newAddress
    this.touch()
  }

  // Business rules
  canBeRented(): boolean {
    return this._status === 'AVAILABLE' && 
           this._lifecycleStatus === 'RENTAL_READY'
  }

  canBeSubdivided(): boolean {
    return this._propertyType === 'LAND' && 
           this._lifecycleStatus === 'ACQUISITION'
  }

  canBeHandedOver(): boolean {
    return this._lifecycleStatus === 'SUBDIVISION'
  }

  isAvailableForMaintenance(): boolean {
    return this._status !== 'MAINTENANCE'
  }

  // Domain events
  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents]
  }

  clearDomainEvents(): void {
    this._domainEvents = []
  }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  private validateProps(props: PropertyProps): void {
    if (!props.id) throw new Error('Property ID is required')
    if (!props.name.trim()) throw new Error('Property name is required')
    if (!props.ownerId) throw new Error('Owner ID is required')
    if (props.totalAreaAcres !== undefined && props.totalAreaAcres <= 0) {
      throw new Error('Total area must be positive')
    }
  }

  private validateStatusTransition(from: PropertyStatus, to: PropertyStatus): void {
    const validTransitions: Record<PropertyStatus, PropertyStatus[]> = {
      'AVAILABLE': ['OCCUPIED', 'MAINTENANCE', 'INACTIVE'],
      'OCCUPIED': ['AVAILABLE', 'MAINTENANCE'],
      'MAINTENANCE': ['AVAILABLE', 'INACTIVE'],
      'INACTIVE': ['AVAILABLE', 'MAINTENANCE']
    }

    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid status transition from ${from} to ${to}`)
    }
  }

  private validateLifecycleTransition(from: LifecycleStatus, to: LifecycleStatus): void {
    const validTransitions: Record<LifecycleStatus, LifecycleStatus[]> = {
      'ACQUISITION': ['SUBDIVISION', 'RENTAL_READY'],
      'SUBDIVISION': ['HANDOVER'],
      'HANDOVER': ['RENTAL_READY'],
      'RENTAL_READY': ['DISPOSED'],
      'DISPOSED': []
    }

    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid lifecycle transition from ${from} to ${to}`)
    }
  }

  private isNewProperty(): boolean {
    const now = new Date()
    const timeDiff = now.getTime() - this._createdAt.getTime()
    return timeDiff < 1000 // Created within the last second
  }

  private touch(): void {
    this._updatedAt = new Date()
  }
}
