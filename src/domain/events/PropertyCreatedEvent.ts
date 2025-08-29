/**
 * Property Created Domain Event
 * Raised when a new property is created
 */

import { DomainEvent } from './DomainEvent'

export class PropertyCreatedEvent extends DomainEvent {
  constructor(
    public readonly propertyId: string,
    public readonly propertyName: string,
    public readonly ownerId: string
  ) {
    super('PropertyCreated', propertyId, {
      propertyName,
      ownerId
    })
  }

  getEventName(): string {
    return 'PropertyCreated'
  }

  getAggregateId(): string {
    return this.propertyId
  }
}
