/**
 * Real-time Domain Events
 * Enhanced domain events for real-time notifications and updates
 */

import { DomainEvent } from './DomainEvent'

// Property Events
export class PropertyCreatedEvent extends DomainEvent {
  constructor(
    public readonly propertyId: string,
    public readonly propertyData: {
      name: string
      address: string
      propertyType: string
      ownerId: string
    }
  ) {
    super('PropertyCreated', propertyId, {
      propertyId,
      ...propertyData
    })
  }
}

export class PropertyStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly propertyId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly reason?: string
  ) {
    super('PropertyStatusChanged', propertyId, {
      propertyId,
      previousStatus,
      newStatus,
      reason
    })
  }
}

export class PropertyUpdatedEvent extends DomainEvent {
  constructor(
    public readonly propertyId: string,
    public readonly updates: Record<string, any>,
    public readonly updatedBy: string
  ) {
    super('PropertyUpdated', propertyId, {
      propertyId,
      updates,
      updatedBy
    })
  }
}

// Tenant Events
export class TenantCreatedEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly tenantData: {
      fullName: string
      email?: string
      phone: string
      propertyId?: string
    }
  ) {
    super('TenantCreated', tenantId, {
      tenantId,
      ...tenantData
    })
  }
}

export class TenantMovedEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly fromPropertyId: string | null,
    public readonly toPropertyId: string | null,
    public readonly moveDate: Date
  ) {
    super('TenantMoved', tenantId, {
      tenantId,
      fromPropertyId,
      toPropertyId,
      moveDate
    })
  }
}

export class TenantStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly reason?: string
  ) {
    super('TenantStatusChanged', tenantId, {
      tenantId,
      previousStatus,
      newStatus,
      reason
    })
  }
}

// Lease Events
export class LeaseCreatedEvent extends DomainEvent {
  constructor(
    public readonly leaseId: string,
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly monthlyRent: number
  ) {
    super('LeaseCreated', leaseId, {
      leaseId,
      tenantId,
      propertyId,
      startDate,
      endDate,
      monthlyRent
    })
  }
}

export class LeaseExpiringWarningEvent extends DomainEvent {
  constructor(
    public readonly leaseId: string,
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly expirationDate: Date,
    public readonly daysUntilExpiration: number
  ) {
    super('LeaseExpiringWarning', leaseId, {
      leaseId,
      tenantId,
      propertyId,
      expirationDate,
      daysUntilExpiration,
      urgency: daysUntilExpiration <= 30 ? 'high' : 'normal'
    })
  }
}

export class LeaseRenewedEvent extends DomainEvent {
  constructor(
    public readonly oldLeaseId: string,
    public readonly newLeaseId: string,
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly newEndDate: Date,
    public readonly newMonthlyRent: number
  ) {
    super('LeaseRenewed', newLeaseId, {
      oldLeaseId,
      newLeaseId,
      tenantId,
      propertyId,
      newEndDate,
      newMonthlyRent
    })
  }
}

// Payment Events
export class PaymentReceivedEvent extends DomainEvent {
  constructor(
    public readonly paymentId: string,
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly paymentMethod: string,
    public readonly paymentDate: Date
  ) {
    super('PaymentReceived', paymentId, {
      paymentId,
      tenantId,
      propertyId,
      amount,
      currency,
      paymentMethod,
      paymentDate
    })
  }
}

export class PaymentOverdueEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly overdueAmount: number,
    public readonly daysPastDue: number,
    public readonly dueDate: Date
  ) {
    super('PaymentOverdue', tenantId, {
      tenantId,
      propertyId,
      overdueAmount,
      daysPastDue,
      dueDate,
      severity: daysPastDue > 30 ? 'critical' : daysPastDue > 7 ? 'high' : 'normal'
    })
  }
}

export class PaymentReminderSentEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly reminderType: 'gentle' | 'firm' | 'final',
    public readonly dueDate: Date,
    public readonly amount: number
  ) {
    super('PaymentReminderSent', tenantId, {
      tenantId,
      propertyId,
      reminderType,
      dueDate,
      amount
    })
  }
}

// Maintenance Events
export class MaintenanceRequestedEvent extends DomainEvent {
  constructor(
    public readonly requestId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly description: string,
    public readonly priority: 'low' | 'normal' | 'high' | 'emergency',
    public readonly category: string
  ) {
    super('MaintenanceRequested', requestId, {
      requestId,
      propertyId,
      tenantId,
      description,
      priority,
      category
    })
  }
}

export class MaintenanceStatusUpdatedEvent extends DomainEvent {
  constructor(
    public readonly requestId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly updatedBy: string,
    public readonly notes?: string
  ) {
    super('MaintenanceStatusUpdated', requestId, {
      requestId,
      propertyId,
      tenantId,
      previousStatus,
      newStatus,
      updatedBy,
      notes
    })
  }
}

export class MaintenanceCompletedEvent extends DomainEvent {
  constructor(
    public readonly requestId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly completedBy: string,
    public readonly completionDate: Date,
    public readonly cost?: number,
    public readonly notes?: string
  ) {
    super('MaintenanceCompleted', requestId, {
      requestId,
      propertyId,
      tenantId,
      completedBy,
      completionDate,
      cost,
      notes
    })
  }
}

// Communication Events
export class MessageSentEvent extends DomainEvent {
  constructor(
    public readonly messageId: string,
    public readonly fromUserId: string,
    public readonly toUserId: string,
    public readonly subject: string,
    public readonly content: string,
    public readonly messageType: 'email' | 'sms' | 'in_app',
    public readonly relatedEntityId?: string,
    public readonly relatedEntityType?: string
  ) {
    super('MessageSent', messageId, {
      messageId,
      fromUserId,
      toUserId,
      subject,
      content,
      messageType,
      relatedEntityId,
      relatedEntityType
    })
  }
}

export class NotificationDeliveredEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly channel: string,
    public readonly deliveryStatus: 'delivered' | 'failed' | 'pending',
    public readonly deliveryTime: Date,
    public readonly errorMessage?: string
  ) {
    super('NotificationDelivered', notificationId, {
      notificationId,
      userId,
      channel,
      deliveryStatus,
      deliveryTime,
      errorMessage
    })
  }
}

// System Events
export class UserLoginEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly loginTime: Date,
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly loginMethod: 'password' | 'mfa' | 'sso'
  ) {
    super('UserLogin', userId, {
      userId,
      loginTime,
      ipAddress,
      userAgent,
      loginMethod
    })
  }
}

export class SystemAlertEvent extends DomainEvent {
  constructor(
    public readonly alertId: string,
    public readonly alertType: 'info' | 'warning' | 'error' | 'critical',
    public readonly title: string,
    public readonly message: string,
    public readonly affectedUsers?: string[],
    public readonly metadata?: Record<string, any>
  ) {
    super('SystemAlert', alertId, {
      alertId,
      alertType,
      title,
      message,
      affectedUsers,
      metadata
    })
  }
}

// Event Factory for creating events from data
export class RealtimeEventFactory {
  static createPropertyEvent(
    eventType: string,
    propertyId: string,
    data: any
  ): DomainEvent {
    switch (eventType) {
      case 'PropertyCreated':
        return new PropertyCreatedEvent(propertyId, data)
      case 'PropertyStatusChanged':
        return new PropertyStatusChangedEvent(
          propertyId,
          data.previousStatus,
          data.newStatus,
          data.reason
        )
      case 'PropertyUpdated':
        return new PropertyUpdatedEvent(propertyId, data.updates, data.updatedBy)
      default:
        throw new Error(`Unknown property event type: ${eventType}`)
    }
  }

  static createTenantEvent(
    eventType: string,
    tenantId: string,
    data: any
  ): DomainEvent {
    switch (eventType) {
      case 'TenantCreated':
        return new TenantCreatedEvent(tenantId, data)
      case 'TenantMoved':
        return new TenantMovedEvent(
          tenantId,
          data.fromPropertyId,
          data.toPropertyId,
          data.moveDate
        )
      case 'TenantStatusChanged':
        return new TenantStatusChangedEvent(
          tenantId,
          data.previousStatus,
          data.newStatus,
          data.reason
        )
      default:
        throw new Error(`Unknown tenant event type: ${eventType}`)
    }
  }

  static createPaymentEvent(
    eventType: string,
    entityId: string,
    data: any
  ): DomainEvent {
    switch (eventType) {
      case 'PaymentReceived':
        return new PaymentReceivedEvent(
          data.paymentId,
          data.tenantId,
          data.propertyId,
          data.amount,
          data.currency,
          data.paymentMethod,
          data.paymentDate
        )
      case 'PaymentOverdue':
        return new PaymentOverdueEvent(
          data.tenantId,
          data.propertyId,
          data.overdueAmount,
          data.daysPastDue,
          data.dueDate
        )
      default:
        throw new Error(`Unknown payment event type: ${eventType}`)
    }
  }

  static createMaintenanceEvent(
    eventType: string,
    requestId: string,
    data: any
  ): DomainEvent {
    switch (eventType) {
      case 'MaintenanceRequested':
        return new MaintenanceRequestedEvent(
          requestId,
          data.propertyId,
          data.tenantId,
          data.description,
          data.priority,
          data.category
        )
      case 'MaintenanceStatusUpdated':
        return new MaintenanceStatusUpdatedEvent(
          requestId,
          data.propertyId,
          data.tenantId,
          data.previousStatus,
          data.newStatus,
          data.updatedBy,
          data.notes
        )
      case 'MaintenanceCompleted':
        return new MaintenanceCompletedEvent(
          requestId,
          data.propertyId,
          data.tenantId,
          data.completedBy,
          data.completionDate,
          data.cost,
          data.notes
        )
      default:
        throw new Error(`Unknown maintenance event type: ${eventType}`)
    }
  }
}
