/**
 * In-Memory Event Publisher
 * Simple implementation of DomainEventPublisher for development and testing
 */

import { DomainEvent } from '../../domain/events/DomainEvent'
import { DomainEventPublisher } from '../../application/interfaces/DomainEventPublisher'

export type EventHandler = (event: DomainEvent) => Promise<void>

export class InMemoryEventPublisher implements DomainEventPublisher {
  private handlers: Map<string, EventHandler[]> = new Map()
  private globalHandlers: EventHandler[] = []

  async publish(event: DomainEvent): Promise<void> {
    try {
      // Execute specific event handlers
      const eventHandlers = this.handlers.get(event.getEventName()) || []
      await Promise.all(eventHandlers.map(handler => handler(event)))

      // Execute global handlers
      await Promise.all(this.globalHandlers.map(handler => handler(event)))

      console.log(`Published event: ${event.getEventName()}`, {
        eventId: event.eventId,
        aggregateId: event.getAggregateId(),
        occurredOn: event.occurredOn
      })
    } catch (error) {
      console.error(`Error publishing event ${event.getEventName()}:`, error)
      throw error
    }
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }

  // Event handler registration
  subscribe(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, [])
    }
    this.handlers.get(eventName)!.push(handler)
  }

  subscribeToAll(handler: EventHandler): void {
    this.globalHandlers.push(handler)
  }

  // Unsubscribe methods
  unsubscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  unsubscribeFromAll(handler: EventHandler): void {
    const index = this.globalHandlers.indexOf(handler)
    if (index > -1) {
      this.globalHandlers.splice(index, 1)
    }
  }

  // Clear all handlers
  clear(): void {
    this.handlers.clear()
    this.globalHandlers = []
  }

  // Get handler counts for debugging
  getHandlerCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    
    for (const [eventName, handlers] of this.handlers.entries()) {
      counts[eventName] = handlers.length
    }
    
    counts['__global__'] = this.globalHandlers.length
    
    return counts
  }
}
