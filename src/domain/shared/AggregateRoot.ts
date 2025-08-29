/**
 * Aggregate Root Base Class
 * Base class for domain aggregates that can raise domain events
 */

import { DomainEvent } from '../events/DomainEvent'

export abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = []

  /**
   * Add a domain event to be published
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  /**
   * Get all domain events
   */
  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents]
  }

  /**
   * Clear all domain events
   */
  clearDomainEvents(): void {
    this._domainEvents = []
  }

  /**
   * Mark events as committed
   */
  markEventsAsCommitted(): void {
    this.clearDomainEvents()
  }
}
