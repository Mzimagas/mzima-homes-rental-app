/**
 * Property Domain Types
 * 
 * Shared types to prevent circular dependencies between entities and events
 */

export type PropertyType = 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND' | 'TOWNHOUSE'
export type PropertyStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
export type LifecycleStatus = 'ACQUISITION' | 'SUBDIVISION' | 'HANDOVER' | 'RENTAL_READY' | 'DISPOSED'

export interface PropertyLocation {
  lat?: number
  lng?: number
  address?: string
  county?: string
  locality?: string
}

export interface PropertyFinancials {
  purchasePrice?: number
  currentValue?: number
  expectedRentalIncome?: number
  acquisitionCosts?: number
  handoverCosts?: number
  subdivisionCosts?: number
}

export interface PropertyDimensions {
  totalAreaSqm?: number
  totalAreaAcres?: number
  buildingAreaSqm?: number
  plotAreaSqm?: number
}

export interface PropertyDates {
  acquisitionDate?: Date
  subdivisionDate?: Date
  handoverDate?: Date
  purchaseCompletionDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PropertyMetadata {
  notes?: string
  tags?: string[]
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
}

// Property creation data
export interface CreatePropertyData {
  name: string
  type: PropertyType
  status?: PropertyStatus
  lifecycleStatus?: LifecycleStatus
  location?: PropertyLocation
  financials?: PropertyFinancials
  dimensions?: PropertyDimensions
  metadata?: PropertyMetadata
}

// Property update data
export interface UpdatePropertyData {
  name?: string
  type?: PropertyType
  status?: PropertyStatus
  lifecycleStatus?: LifecycleStatus
  location?: Partial<PropertyLocation>
  financials?: Partial<PropertyFinancials>
  dimensions?: Partial<PropertyDimensions>
  metadata?: Partial<PropertyMetadata>
}

// Property validation rules
export interface PropertyValidationRules {
  nameMinLength: number
  nameMaxLength: number
  requiredFields: string[]
  allowedTransitions: Record<PropertyStatus, PropertyStatus[]>
  lifecycleTransitions: Record<LifecycleStatus, LifecycleStatus[]>
}

// Default validation rules
export const DEFAULT_PROPERTY_VALIDATION: PropertyValidationRules = {
  nameMinLength: 3,
  nameMaxLength: 100,
  requiredFields: ['name', 'type'],
  allowedTransitions: {
    AVAILABLE: ['OCCUPIED', 'MAINTENANCE', 'INACTIVE'],
    OCCUPIED: ['AVAILABLE', 'MAINTENANCE'],
    MAINTENANCE: ['AVAILABLE', 'INACTIVE'],
    INACTIVE: ['AVAILABLE', 'MAINTENANCE']
  },
  lifecycleTransitions: {
    ACQUISITION: ['SUBDIVISION', 'HANDOVER', 'RENTAL_READY'],
    SUBDIVISION: ['HANDOVER', 'RENTAL_READY'],
    HANDOVER: ['RENTAL_READY'],
    RENTAL_READY: ['DISPOSED'],
    DISPOSED: []
  }
}

// Property search and filter types
export interface PropertyFilters {
  status?: PropertyStatus[]
  type?: PropertyType[]
  lifecycleStatus?: LifecycleStatus[]
  location?: {
    county?: string
    locality?: string
    radius?: number
    center?: { lat: number; lng: number }
  }
  financials?: {
    minPrice?: number
    maxPrice?: number
    minRentalIncome?: number
    maxRentalIncome?: number
  }
  dimensions?: {
    minArea?: number
    maxArea?: number
  }
  dateRange?: {
    field: keyof PropertyDates
    from?: Date
    to?: Date
  }
}

export interface PropertySortOptions {
  field: string
  direction: 'asc' | 'desc'
}

export interface PropertySearchOptions {
  filters?: PropertyFilters
  sort?: PropertySortOptions
  pagination?: {
    page: number
    limit: number
  }
  includeInactive?: boolean
}

// Property statistics types
export interface PropertyStatistics {
  totalProperties: number
  propertiesByStatus: Record<PropertyStatus, number>
  propertiesByType: Record<PropertyType, number>
  propertiesByLifecycle: Record<LifecycleStatus, number>
  totalValue: number
  totalArea: number
  averagePropertyValue: number
  averagePropertySize: number
  totalExpectedRentalIncome: number
}

// Property business rules
export interface PropertyBusinessRules {
  canChangeStatus(from: PropertyStatus, to: PropertyStatus): boolean
  canAdvanceLifecycle(from: LifecycleStatus, to: LifecycleStatus): boolean
  isReadyForHandover(property: any): boolean
  isReadyForRental(property: any): boolean
  calculatePropertyValue(property: any): number
}
