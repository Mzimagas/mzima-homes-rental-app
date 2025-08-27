/**
 * Domain Event Publisher Interface
 * Defines the contract for publishing domain events
 */

import { DomainEvent } from '../../domain/events/DomainEvent'

export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>
  publishBatch(events: DomainEvent[]): Promise<void>
}
