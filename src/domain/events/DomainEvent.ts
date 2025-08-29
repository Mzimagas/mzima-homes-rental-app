/**
 * Base Domain Event
 * Abstract base class for all domain events
 */

export abstract class DomainEvent {
  public readonly occurredOn: Date
  public readonly eventId: string
  public readonly eventType: string
  public readonly aggregateId: string
  public readonly payload: Record<string, any>
  public readonly version: number
  public readonly occurredAt: Date

  constructor(eventType: string, aggregateId: string, payload: Record<string, any> = {}, version: number = 1) {
    this.occurredOn = new Date()
    this.occurredAt = this.occurredOn // Alias for compatibility
    this.eventId = this.generateEventId()
    this.eventType = eventType
    this.aggregateId = aggregateId
    this.payload = payload
    this.version = version
  }

  getEventName(): string {
    return this.eventType
  }

  getAggregateId(): string {
    return this.aggregateId
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
