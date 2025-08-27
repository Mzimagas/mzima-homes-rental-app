/**
 * Real-time Store
 * Manages real-time notifications, WebSocket connections, and live updates
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { WebSocketManager, createWebSocketManager } from '../../infrastructure/websocket/WebSocketManager'
import { NotificationHub, RealtimeNotification } from '../../infrastructure/websocket/NotificationHub'
import { usePropertyStore } from './propertyStore'
import { useTenantStore } from './tenantStore'
import { useUIStore } from './uiStore'

// Real-time connection state
export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  lastConnected?: Date
  reconnectAttempts: number
  error?: string
}

// Live notification state
export interface LiveNotification extends RealtimeNotification {
  isRead: boolean
  isArchived: boolean
  readAt?: Date
  archivedAt?: Date
}

// Real-time subscription
export interface RealtimeSubscription {
  id: string
  channels: string[]
  userId?: string
  isActive: boolean
  createdAt: Date
}

// Real-time store state
export interface RealtimeStoreState {
  // Connection management
  connection: ConnectionState
  webSocketManager: WebSocketManager | null
  notificationHub: NotificationHub | null
  
  // Notifications
  notifications: Record<string, LiveNotification>
  unreadCount: number
  
  // Subscriptions
  subscriptions: Record<string, RealtimeSubscription>
  
  // Live updates
  liveUpdates: {
    properties: string[] // Property IDs with pending updates
    tenants: string[] // Tenant IDs with pending updates
    lastUpdateTime: Date | null
  }
  
  // Settings
  settings: {
    enableRealtime: boolean
    enableNotifications: boolean
    enableSounds: boolean
    notificationChannels: string[]
    autoMarkAsRead: boolean
  }
}

// Real-time store actions
export interface RealtimeStoreActions {
  // Connection management
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
  
  // Subscription management
  subscribe: (channels: string[], userId?: string) => string
  unsubscribe: (subscriptionId: string) => void
  updateSubscription: (subscriptionId: string, channels: string[]) => void
  
  // Notification management
  addNotification: (notification: RealtimeNotification) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  archiveNotification: (notificationId: string) => void
  deleteNotification: (notificationId: string) => void
  clearNotifications: () => void
  
  // Live updates
  handleLiveUpdate: (updateType: string, entityId: string, data: any) => void
  clearLiveUpdates: () => void
  
  // Settings
  updateSettings: (settings: Partial<RealtimeStoreState['settings']>) => void
  
  // Utility
  getUnreadNotifications: () => LiveNotification[]
  getNotificationsByChannel: (channel: string) => LiveNotification[]
  getConnectionStats: () => any
}

// Initial state
const initialState: RealtimeStoreState = {
  connection: {
    status: 'disconnected',
    reconnectAttempts: 0
  },
  webSocketManager: null,
  notificationHub: null,
  notifications: {},
  unreadCount: 0,
  subscriptions: {},
  liveUpdates: {
    properties: [],
    tenants: [],
    lastUpdateTime: null
  },
  settings: {
    enableRealtime: true,
    enableNotifications: true,
    enableSounds: false,
    notificationChannels: ['property_updates', 'tenant_updates', 'payment_alerts'],
    autoMarkAsRead: false
  }
}

// Create the store
export const useRealtimeStore = create<RealtimeStoreState & RealtimeStoreActions>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // Connection management
      connect: async () => {
        const { settings } = get()
        if (!settings.enableRealtime) return

        set((draft) => {
          draft.connection.status = 'connecting'
          draft.connection.error = undefined
        })

        try {
          // Create WebSocket manager
          const wsManager = createWebSocketManager()
          const notificationHub = new NotificationHub(wsManager)

          // Set up event handlers
          wsManager.on('connected', () => {
            set((draft) => {
              draft.connection.status = 'connected'
              draft.connection.lastConnected = new Date()
              draft.connection.reconnectAttempts = 0
              draft.connection.error = undefined
            })

            // Show connection notification
            useUIStore.getState().addNotification({
              type: 'success',
              title: 'Connected',
              message: 'Real-time updates are now active',
              duration: 3000
            })
          })

          wsManager.on('disconnected', () => {
            set((draft) => {
              draft.connection.status = 'disconnected'
            })

            // Show disconnection notification
            useUIStore.getState().addNotification({
              type: 'warning',
              title: 'Disconnected',
              message: 'Real-time updates are temporarily unavailable',
              duration: 5000
            })
          })

          wsManager.on('error', (error) => {
            set((draft) => {
              draft.connection.error = error.error?.message || 'Connection error'
            })
          })

          // Set up notification handler
          const subscriptionId = notificationHub.subscribe(
            'current_user', // TODO: Get from auth context
            settings.notificationChannels,
            (notification) => {
              get().addNotification(notification)
            }
          )

          // Connect
          await wsManager.connect()

          set((draft) => {
            draft.webSocketManager = wsManager
            draft.notificationHub = notificationHub
            draft.subscriptions[subscriptionId] = {
              id: subscriptionId,
              channels: settings.notificationChannels,
              isActive: true,
              createdAt: new Date()
            }
          })

        } catch (error) {
          set((draft) => {
            draft.connection.status = 'disconnected'
            draft.connection.error = error instanceof Error ? error.message : 'Connection failed'
          })

          useUIStore.getState().addNotification({
            type: 'error',
            title: 'Connection Failed',
            message: 'Unable to establish real-time connection',
            duration: 5000
          })
        }
      },

      disconnect: () => {
        const { webSocketManager } = get()
        
        if (webSocketManager) {
          webSocketManager.disconnect()
        }

        set((draft) => {
          draft.connection.status = 'disconnected'
          draft.webSocketManager = null
          draft.notificationHub = null
          draft.subscriptions = {}
        })
      },

      reconnect: async () => {
        const { disconnect, connect } = get()
        disconnect()
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        await connect()
      },

      // Subscription management
      subscribe: (channels, userId) => {
        const { notificationHub } = get()
        if (!notificationHub) return ''

        const subscriptionId = notificationHub.subscribe(
          userId || 'current_user',
          channels,
          (notification) => {
            get().addNotification(notification)
          }
        )

        set((draft) => {
          draft.subscriptions[subscriptionId] = {
            id: subscriptionId,
            channels,
            userId,
            isActive: true,
            createdAt: new Date()
          }
        })

        return subscriptionId
      },

      unsubscribe: (subscriptionId) => {
        const { notificationHub } = get()
        if (!notificationHub) return

        notificationHub.unsubscribe(subscriptionId)

        set((draft) => {
          delete draft.subscriptions[subscriptionId]
        })
      },

      updateSubscription: (subscriptionId, channels) => {
        const { unsubscribe, subscribe } = get()
        const subscription = get().subscriptions[subscriptionId]
        
        if (subscription) {
          unsubscribe(subscriptionId)
          subscribe(channels, subscription.userId)
        }
      },

      // Notification management
      addNotification: (notification) => {
        const { settings } = get()

        const liveNotification: LiveNotification = {
          ...notification,
          isRead: false,
          isArchived: false
        }

        set((draft) => {
          draft.notifications[notification.id] = liveNotification
          draft.unreadCount += 1
        })

        // Show UI notification
        if (settings.enableNotifications) {
          useUIStore.getState().addNotification({
            type: notification.priority === 'urgent' ? 'error' : 
                  notification.priority === 'high' ? 'warning' : 'info',
            title: notification.title,
            message: notification.message,
            duration: notification.priority === 'urgent' ? 0 : 5000
          })
        }

        // Play sound if enabled
        if (settings.enableSounds && notification.priority === 'urgent') {
          // TODO: Play notification sound
        }

        // Handle live updates
        if (notification.data) {
          get().handleLiveUpdate(notification.type, notification.data.entityId, notification.data)
        }

        // Auto mark as read if enabled
        if (settings.autoMarkAsRead) {
          setTimeout(() => {
            get().markAsRead(notification.id)
          }, 3000)
        }
      },

      markAsRead: (notificationId) => {
        set((draft) => {
          const notification = draft.notifications[notificationId]
          if (notification && !notification.isRead) {
            notification.isRead = true
            notification.readAt = new Date()
            draft.unreadCount = Math.max(0, draft.unreadCount - 1)
          }
        })
      },

      markAllAsRead: () => {
        set((draft) => {
          Object.values(draft.notifications).forEach(notification => {
            if (!notification.isRead) {
              notification.isRead = true
              notification.readAt = new Date()
            }
          })
          draft.unreadCount = 0
        })
      },

      archiveNotification: (notificationId) => {
        set((draft) => {
          const notification = draft.notifications[notificationId]
          if (notification) {
            notification.isArchived = true
            notification.archivedAt = new Date()
            
            if (!notification.isRead) {
              notification.isRead = true
              notification.readAt = new Date()
              draft.unreadCount = Math.max(0, draft.unreadCount - 1)
            }
          }
        })
      },

      deleteNotification: (notificationId) => {
        set((draft) => {
          const notification = draft.notifications[notificationId]
          if (notification && !notification.isRead) {
            draft.unreadCount = Math.max(0, draft.unreadCount - 1)
          }
          delete draft.notifications[notificationId]
        })
      },

      clearNotifications: () => {
        set((draft) => {
          draft.notifications = {}
          draft.unreadCount = 0
        })
      },

      // Live updates
      handleLiveUpdate: (updateType, entityId, data) => {
        set((draft) => {
          draft.liveUpdates.lastUpdateTime = new Date()
        })

        // Route updates to appropriate stores
        switch (updateType) {
          case 'PropertyCreated':
          case 'PropertyUpdated':
          case 'PropertyStatusChanged':
            set((draft) => {
              if (!draft.liveUpdates.properties.includes(entityId)) {
                draft.liveUpdates.properties.push(entityId)
              }
            })
            
            // Update property store
            if (data.propertyData) {
              usePropertyStore.getState().upsertProperty(data.propertyData)
            }
            break

          case 'TenantCreated':
          case 'TenantUpdated':
          case 'TenantMoved':
            set((draft) => {
              if (!draft.liveUpdates.tenants.includes(entityId)) {
                draft.liveUpdates.tenants.push(entityId)
              }
            })
            
            // Update tenant store
            if (data.tenantData) {
              useTenantStore.getState().upsertTenant(data.tenantData)
            }
            break

          case 'PaymentReceived':
          case 'PaymentOverdue':
            // Update relevant property and tenant stores
            if (data.propertyId) {
              usePropertyStore.getState().refreshProperty(data.propertyId)
            }
            if (data.tenantId) {
              useTenantStore.getState().refreshTenant(data.tenantId)
            }
            break
        }
      },

      clearLiveUpdates: () => {
        set((draft) => {
          draft.liveUpdates.properties = []
          draft.liveUpdates.tenants = []
          draft.liveUpdates.lastUpdateTime = null
        })
      },

      // Settings
      updateSettings: (newSettings) => {
        set((draft) => {
          Object.assign(draft.settings, newSettings)
        })

        // Reconnect if realtime setting changed
        if ('enableRealtime' in newSettings) {
          const { connection, connect, disconnect } = get()
          if (newSettings.enableRealtime && connection.status === 'disconnected') {
            connect()
          } else if (!newSettings.enableRealtime && connection.status === 'connected') {
            disconnect()
          }
        }
      },

      // Utility methods
      getUnreadNotifications: () => {
        const { notifications } = get()
        return Object.values(notifications)
          .filter(n => !n.isRead && !n.isArchived)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      },

      getNotificationsByChannel: (channel) => {
        const { notifications } = get()
        return Object.values(notifications)
          .filter(n => n.channels.includes(channel))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      },

      getConnectionStats: () => {
        const { connection, subscriptions, notifications } = get()
        return {
          connectionStatus: connection.status,
          lastConnected: connection.lastConnected,
          reconnectAttempts: connection.reconnectAttempts,
          activeSubscriptions: Object.keys(subscriptions).length,
          totalNotifications: Object.keys(notifications).length,
          unreadCount: get().unreadCount
        }
      }
    })),
    { name: 'RealtimeStore' }
  )
)

// Auto-connect hook
export const useAutoConnect = () => {
  const { connect, settings } = useRealtimeStore()

  React.useEffect(() => {
    if (settings.enableRealtime) {
      connect()
    }
  }, [connect, settings.enableRealtime])
}

// React import
import React from 'react'
