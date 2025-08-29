/**
 * Tenant Created Domain Event
 * Raised when a new tenant is created
 */

import { DomainEvent } from './DomainEvent'

export class TenantCreatedEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly fullName: string,
    public readonly nationalId: string
  ) {
    super('TenantCreated', tenantId, {
      tenantName,
      nationalId
    })
  }

  getEventName(): string {
    return 'TenantCreated'
  }

  getAggregateId(): string {
    return this.tenantId
  }
}
