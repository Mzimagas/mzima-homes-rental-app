/**
 * Property Status Changed Domain Event
 * Raised when a property's status changes
 */

import { DomainEvent } from './DomainEvent'
import { PropertyStatus } from '../types/PropertyTypes'

export class PropertyStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly propertyId: string,
    public readonly oldStatus: PropertyStatus,
    public readonly newStatus: PropertyStatus,
    public readonly reason?: string
  ) {
    super('PropertyStatusChanged', propertyId, {
      oldStatus,
      newStatus,
      reason
    })
  }

  getEventName(): string {
    return 'PropertyStatusChanged'
  }

  getAggregateId(): string {
    return this.propertyId
  }
}
