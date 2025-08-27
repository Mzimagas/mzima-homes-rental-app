/**
 * Base Domain Event
 * Abstract base class for all domain events
 */

export abstract class DomainEvent {
  public readonly occurredOn: Date
  public readonly eventId: string

  constructor() {
    this.occurredOn = new Date()
    this.eventId = this.generateEventId()
  }

  abstract getEventName(): string
  abstract getAggregateId(): string

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
