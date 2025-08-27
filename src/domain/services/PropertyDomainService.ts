/**
 * Property Domain Service
 * Contains business logic that doesn't belong to a single entity
 */

import { Property, PropertyStatus, LifecycleStatus } from '../entities/Property'
import { PropertyRepository } from '../repositories/PropertyRepository'

export class PropertyDomainService {
  constructor(private propertyRepository: PropertyRepository) {}

  /**
   * Validates if a property can be subdivided
   */
  async canSubdivideProperty(propertyId: string): Promise<{ canSubdivide: boolean; reason?: string }> {
    const property = await this.propertyRepository.findById(propertyId)
    
    if (!property) {
      return { canSubdivide: false, reason: 'Property not found' }
    }

    if (!property.canBeSubdivided()) {
      return { canSubdivide: false, reason: 'Property is not eligible for subdivision' }
    }

    // Check if property has minimum area for subdivision
    if (!property.totalAreaAcres || property.totalAreaAcres < 1) {
      return { canSubdivide: false, reason: 'Property must be at least 1 acre for subdivision' }
    }

    return { canSubdivide: true }
  }

  /**
   * Validates property handover readiness
   */
  async validateHandoverReadiness(propertyId: string): Promise<{ isReady: boolean; issues: string[] }> {
    const property = await this.propertyRepository.findById(propertyId)
    const issues: string[] = []

    if (!property) {
      return { isReady: false, issues: ['Property not found'] }
    }

    if (!property.canBeHandedOver()) {
      issues.push('Property lifecycle status does not allow handover')
    }

    if (property.status === 'MAINTENANCE') {
      issues.push('Property is currently under maintenance')
    }

    // Additional business rules can be added here
    // e.g., check for required documentation, inspections, etc.

    return { isReady: issues.length === 0, issues }
  }

  /**
   * Calculates property portfolio statistics for an owner
   */
  async calculatePortfolioStats(ownerId: string): Promise<{
    totalProperties: number
    totalArea: number
    propertiesByStatus: Record<PropertyStatus, number>
    propertiesByLifecycle: Record<LifecycleStatus, number>
    averagePropertySize: number
  }> {
    const properties = await this.propertyRepository.findByOwnerId(ownerId)
    
    const stats = {
      totalProperties: properties.length,
      totalArea: 0,
      propertiesByStatus: {} as Record<PropertyStatus, number>,
      propertiesByLifecycle: {} as Record<LifecycleStatus, number>,
      averagePropertySize: 0
    }

    // Initialize counters
    const statuses: PropertyStatus[] = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE']
    const lifecycles: LifecycleStatus[] = ['ACQUISITION', 'SUBDIVISION', 'HANDOVER', 'RENTAL_READY', 'DISPOSED']
    
    statuses.forEach(status => stats.propertiesByStatus[status] = 0)
    lifecycles.forEach(lifecycle => stats.propertiesByLifecycle[lifecycle] = 0)

    // Calculate statistics
    properties.forEach(property => {
      stats.propertiesByStatus[property.status]++
      stats.propertiesByLifecycle[property.lifecycleStatus]++
      
      if (property.totalAreaAcres) {
        stats.totalArea += property.totalAreaAcres
      }
    })

    stats.averagePropertySize = stats.totalProperties > 0 ? stats.totalArea / stats.totalProperties : 0

    return stats
  }

  /**
   * Finds properties that need attention (maintenance, expired leases, etc.)
   */
  async findPropertiesNeedingAttention(): Promise<{
    maintenanceRequired: Property[]
    handoverReady: Property[]
    acquisitionStalled: Property[]
  }> {
    const [maintenanceRequired, handoverReady, allProperties] = await Promise.all([
      this.propertyRepository.findPropertiesNeedingMaintenance(),
      this.propertyRepository.findPropertiesReadyForHandover(),
      this.propertyRepository.findPropertiesInAcquisition()
    ])

    // Find acquisition properties that might be stalled (older than 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const acquisitionStalled = allProperties.filter(property => 
      property.createdAt < sixMonthsAgo
    )

    return {
      maintenanceRequired,
      handoverReady,
      acquisitionStalled
    }
  }

  /**
   * Validates property name uniqueness within owner's portfolio
   */
  async validatePropertyNameUniqueness(name: string, ownerId: string, excludePropertyId?: string): Promise<boolean> {
    const ownerProperties = await this.propertyRepository.findByOwnerId(ownerId)
    
    return !ownerProperties.some(property => 
      property.name.toLowerCase() === name.toLowerCase() && 
      property.id !== excludePropertyId
    )
  }

  /**
   * Suggests optimal property status based on current conditions
   */
  async suggestOptimalStatus(propertyId: string): Promise<{ suggestedStatus: PropertyStatus; reason: string }> {
    const property = await this.propertyRepository.findById(propertyId)
    
    if (!property) {
      throw new Error('Property not found')
    }

    // Business logic for status suggestions
    if (property.lifecycleStatus !== 'RENTAL_READY') {
      return {
        suggestedStatus: 'INACTIVE',
        reason: 'Property is not ready for rental operations'
      }
    }

    if (property.status === 'MAINTENANCE') {
      return {
        suggestedStatus: 'AVAILABLE',
        reason: 'Consider making property available after maintenance completion'
      }
    }

    return {
      suggestedStatus: property.status,
      reason: 'Current status is optimal'
    }
  }
}
