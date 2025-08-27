/**
 * Notification Hub
 * Central hub for routing and managing real-time notifications
 */

import { WebSocketManager, WebSocketMessage } from './WebSocketManager'
import { DomainEvent } from '../../domain/events/DomainEvent'

export interface NotificationChannel {
  id: string
  name: string
  pattern: string
  subscribers: Set<string>
  isActive: boolean
  metadata?: Record<string, any>
}

export interface NotificationSubscriber {
  id: string
  userId?: string
  channels: string[]
  callback: (notification: RealtimeNotification) => void
  filters?: NotificationFilter[]
  isActive: boolean
}

export interface RealtimeNotification {
  id: string
  type: string
  title: string
  message: string
  data?: any
  priority: 'low' | 'normal' | 'high' | 'urgent'
  channels: string[]
  targetUsers?: string[]
  timestamp: Date
  expiresAt?: Date
  metadata?: Record<string, any>
}

export interface NotificationFilter {
  field: string
  operator: 'eq' | 'ne' | 'contains' | 'in'
  value: any
}

export class NotificationHub {
  private channels = new Map<string, NotificationChannel>()
  private subscribers = new Map<string, NotificationSubscriber>()
  private notificationHistory: RealtimeNotification[] = []
  private maxHistorySize = 1000

  constructor(private webSocketManager: WebSocketManager) {
    this.setupDefaultChannels()
    this.setupWebSocketHandlers()
  }

  // Channel Management
  createChannel(name: string, pattern: string, metadata?: Record<string, any>): string {
    const id = this.generateChannelId()
    
    const channel: NotificationChannel = {
      id,
      name,
      pattern,
      subscribers: new Set(),
      isActive: true,
      metadata
    }

    this.channels.set(id, channel)
    console.log(`Created notification channel: ${name}`)
    
    return id
  }

  getChannel(channelId: string): NotificationChannel | null {
    return this.channels.get(channelId) || null
  }

  getChannelByName(name: string): NotificationChannel | null {
    for (const channel of this.channels.values()) {
      if (channel.name === name) {
        return channel
      }
    }
    return null
  }

  activateChannel(channelId: string): void {
    const channel = this.channels.get(channelId)
    if (channel) {
      channel.isActive = true
    }
  }

  deactivateChannel(channelId: string): void {
    const channel = this.channels.get(channelId)
    if (channel) {
      channel.isActive = false
    }
  }

  // Subscription Management
  subscribe(
    userId: string,
    channels: string[],
    callback: (notification: RealtimeNotification) => void,
    filters?: NotificationFilter[]
  ): string {
    const id = this.generateSubscriberId()
    
    const subscriber: NotificationSubscriber = {
      id,
      userId,
      channels,
      callback,
      filters,
      isActive: true
    }

    this.subscribers.set(id, subscriber)

    // Add subscriber to channels
    channels.forEach(channelName => {
      const channel = this.getChannelByName(channelName)
      if (channel) {
        channel.subscribers.add(id)
      }
    })

    console.log(`User ${userId} subscribed to channels: ${channels.join(', ')}`)
    return id
  }

  unsubscribe(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId)
    if (subscriber) {
      // Remove from channels
      subscriber.channels.forEach(channelName => {
        const channel = this.getChannelByName(channelName)
        if (channel) {
          channel.subscribers.delete(subscriberId)
        }
      })

      this.subscribers.delete(subscriberId)
      console.log(`Unsubscribed: ${subscriberId}`)
    }
  }

  // Notification Publishing
  async publish(notification: RealtimeNotification): Promise<void> {
    // Add to history
    this.addToHistory(notification)

    // Route to appropriate channels
    const targetChannels = this.getTargetChannels(notification)
    
    for (const channel of targetChannels) {
      if (channel.isActive) {
        await this.publishToChannel(notification, channel)
      }
    }

    // Send via WebSocket
    this.webSocketManager.send({
      type: 'notification',
      payload: notification,
      timestamp: new Date(),
      correlationId: notification.id
    })

    console.log(`Published notification: ${notification.type}`)
  }

  async publishDomainEvent(event: DomainEvent): Promise<void> {
    const notification = this.convertDomainEventToNotification(event)
    await this.publish(notification)
  }

  // Bulk operations
  async publishToUsers(
    userIds: string[],
    notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'targetUsers'>
  ): Promise<void> {
    const fullNotification: RealtimeNotification = {
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date(),
      targetUsers: userIds
    }

    await this.publish(fullNotification)
  }

  async publishToChannel(
    notification: RealtimeNotification,
    channel: NotificationChannel
  ): Promise<void> {
    const subscribers = this.getChannelSubscribers(channel.id)
    
    for (const subscriber of subscribers) {
      if (this.shouldReceiveNotification(subscriber, notification)) {
        try {
          subscriber.callback(notification)
        } catch (error) {
          console.error(`Notification callback error for subscriber ${subscriber.id}:`, error)
        }
      }
    }
  }

  // Query operations
  getNotificationHistory(
    userId?: string,
    channels?: string[],
    limit: number = 50
  ): RealtimeNotification[] {
    let filtered = this.notificationHistory

    if (userId) {
      filtered = filtered.filter(n => 
        !n.targetUsers || n.targetUsers.includes(userId)
      )
    }

    if (channels && channels.length > 0) {
      filtered = filtered.filter(n => 
        n.channels.some(c => channels.includes(c))
      )
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  getActiveSubscribers(): NotificationSubscriber[] {
    return Array.from(this.subscribers.values()).filter(s => s.isActive)
  }

  getChannelStats(): Array<{
    channel: string
    subscriberCount: number
    isActive: boolean
  }> {
    return Array.from(this.channels.values()).map(channel => ({
      channel: channel.name,
      subscriberCount: channel.subscribers.size,
      isActive: channel.isActive
    }))
  }

  // Private methods
  private setupDefaultChannels(): void {
    // Property-related notifications
    this.createChannel('property_updates', 'property:*', {
      description: 'Property creation, updates, and status changes'
    })

    // Tenant-related notifications
    this.createChannel('tenant_updates', 'tenant:*', {
      description: 'Tenant activities and lease updates'
    })

    // Payment notifications
    this.createChannel('payment_alerts', 'payment:*', {
      description: 'Payment confirmations and overdue alerts'
    })

    // Maintenance notifications
    this.createChannel('maintenance_updates', 'maintenance:*', {
      description: 'Maintenance requests and updates'
    })

    // System notifications
    this.createChannel('system_alerts', 'system:*', {
      description: 'System-wide alerts and announcements'
    })
  }

  private setupWebSocketHandlers(): void {
    this.webSocketManager.on('message', (message: WebSocketMessage) => {
      if (message.type === 'notification') {
        // Handle incoming notifications from server
        this.handleIncomingNotification(message.payload)
      }
    })

    this.webSocketManager.on('connected', () => {
      console.log('NotificationHub: WebSocket connected')
    })

    this.webSocketManager.on('disconnected', () => {
      console.log('NotificationHub: WebSocket disconnected')
    })
  }

  private handleIncomingNotification(notification: RealtimeNotification): void {
    // Route to local subscribers
    const targetChannels = this.getTargetChannels(notification)
    
    targetChannels.forEach(channel => {
      if (channel.isActive) {
        this.publishToChannel(notification, channel)
      }
    })
  }

  private getTargetChannels(notification: RealtimeNotification): NotificationChannel[] {
    return notification.channels
      .map(channelName => this.getChannelByName(channelName))
      .filter(channel => channel !== null) as NotificationChannel[]
  }

  private getChannelSubscribers(channelId: string): NotificationSubscriber[] {
    const channel = this.channels.get(channelId)
    if (!channel) return []

    return Array.from(channel.subscribers)
      .map(subscriberId => this.subscribers.get(subscriberId))
      .filter(subscriber => subscriber && subscriber.isActive) as NotificationSubscriber[]
  }

  private shouldReceiveNotification(
    subscriber: NotificationSubscriber,
    notification: RealtimeNotification
  ): boolean {
    // Check target users
    if (notification.targetUsers && notification.targetUsers.length > 0) {
      if (!subscriber.userId || !notification.targetUsers.includes(subscriber.userId)) {
        return false
      }
    }

    // Apply filters
    if (subscriber.filters && subscriber.filters.length > 0) {
      return subscriber.filters.every(filter => 
        this.evaluateFilter(notification, filter)
      )
    }

    return true
  }

  private evaluateFilter(notification: RealtimeNotification, filter: NotificationFilter): boolean {
    const value = this.getNotificationValue(notification, filter.field)
    
    switch (filter.operator) {
      case 'eq':
        return value === filter.value
      case 'ne':
        return value !== filter.value
      case 'contains':
        return String(value).includes(String(filter.value))
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value)
      default:
        return true
    }
  }

  private getNotificationValue(notification: RealtimeNotification, field: string): any {
    const parts = field.split('.')
    let value: any = notification
    
    for (const part of parts) {
      value = value?.[part]
    }
    
    return value
  }

  private convertDomainEventToNotification(event: DomainEvent): RealtimeNotification {
    return {
      id: this.generateNotificationId(),
      type: event.eventType,
      title: this.generateNotificationTitle(event),
      message: this.generateNotificationMessage(event),
      data: event.payload,
      priority: this.determineNotificationPriority(event),
      channels: this.determineNotificationChannels(event),
      timestamp: event.occurredAt,
      metadata: {
        aggregateId: event.aggregateId,
        eventVersion: event.version
      }
    }
  }

  private generateNotificationTitle(event: DomainEvent): string {
    const titleMap: Record<string, string> = {
      'PropertyCreated': 'New Property Added',
      'PropertyStatusChanged': 'Property Status Updated',
      'TenantMoved': 'Tenant Moved',
      'PaymentReceived': 'Payment Received',
      'MaintenanceRequested': 'Maintenance Request'
    }

    return titleMap[event.eventType] || event.eventType
  }

  private generateNotificationMessage(event: DomainEvent): string {
    // Generate user-friendly message based on event type and payload
    return `${event.eventType} occurred at ${event.occurredAt.toLocaleString()}`
  }

  private determineNotificationPriority(event: DomainEvent): RealtimeNotification['priority'] {
    const urgentEvents = ['PaymentOverdue', 'MaintenanceEmergency', 'SecurityAlert']
    const highEvents = ['PaymentReceived', 'LeaseExpiring', 'MaintenanceRequested']
    
    if (urgentEvents.includes(event.eventType)) return 'urgent'
    if (highEvents.includes(event.eventType)) return 'high'
    
    return 'normal'
  }

  private determineNotificationChannels(event: DomainEvent): string[] {
    const channelMap: Record<string, string[]> = {
      'PropertyCreated': ['property_updates'],
      'PropertyStatusChanged': ['property_updates'],
      'TenantMoved': ['tenant_updates'],
      'PaymentReceived': ['payment_alerts'],
      'PaymentOverdue': ['payment_alerts'],
      'MaintenanceRequested': ['maintenance_updates']
    }

    return channelMap[event.eventType] || ['system_alerts']
  }

  private addToHistory(notification: RealtimeNotification): void {
    this.notificationHistory.push(notification)
    
    // Maintain history size limit
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(-this.maxHistorySize)
    }
  }

  private generateChannelId(): string {
    return `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSubscriberId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
