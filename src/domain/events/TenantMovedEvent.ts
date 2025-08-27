/**
 * Tenant Moved Domain Event
 * Raised when a tenant moves to a different unit or vacates
 */

import { DomainEvent } from './DomainEvent'

export class TenantMovedEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly oldUnitId?: string,
    public readonly newUnitId?: string,
    public readonly leaseStartDate?: Date,
    public readonly leaseEndDate?: Date
  ) {
    super()
  }

  getEventName(): string {
    return 'TenantMoved'
  }

  getAggregateId(): string {
    return this.tenantId
  }

  isVacating(): boolean {
    return this.oldUnitId !== undefined && this.newUnitId === undefined
  }

  isMovingIn(): boolean {
    return this.oldUnitId === undefined && this.newUnitId !== undefined
  }

  isTransferring(): boolean {
    return this.oldUnitId !== undefined && this.newUnitId !== undefined
  }
}
