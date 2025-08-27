/**
 * Property Repository Interface
 * Defines the contract for property data access
 */

import { Property, PropertyStatus, PropertyType, LifecycleStatus } from '../entities/Property'

export interface PropertySearchCriteria {
  name?: string
  address?: string
  propertyType?: PropertyType
  status?: PropertyStatus
  lifecycleStatus?: LifecycleStatus
  ownerId?: string
  minArea?: number
  maxArea?: number
}

export interface PropertyRepository {
  // Basic CRUD operations
  findById(id: string): Promise<Property | null>
  findByIds(ids: string[]): Promise<Property[]>
  save(property: Property): Promise<void>
  delete(id: string): Promise<void>

  // Query operations
  findAll(): Promise<Property[]>
  findByOwnerId(ownerId: string): Promise<Property[]>
  findByStatus(status: PropertyStatus): Promise<Property[]>
  findByLifecycleStatus(lifecycleStatus: LifecycleStatus): Promise<Property[]>
  search(criteria: PropertySearchCriteria): Promise<Property[]>

  // Business-specific queries
  findAvailableProperties(): Promise<Property[]>
  findPropertiesNeedingMaintenance(): Promise<Property[]>
  findPropertiesReadyForHandover(): Promise<Property[]>
  findPropertiesInAcquisition(): Promise<Property[]>

  // Aggregation queries
  countByStatus(): Promise<Record<PropertyStatus, number>>
  countByType(): Promise<Record<PropertyType, number>>
  countByLifecycleStatus(): Promise<Record<LifecycleStatus, number>>
  getTotalAreaByOwner(ownerId: string): Promise<number>

  // Existence checks
  existsByName(name: string): Promise<boolean>
  existsByAddress(address: string): Promise<boolean>
}
