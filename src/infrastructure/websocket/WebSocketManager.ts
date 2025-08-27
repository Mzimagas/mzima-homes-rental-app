/**
 * WebSocket Manager
 * Manages WebSocket connections, reconnection, and message routing
 */

export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: Date
  correlationId?: string
}

export interface WebSocketSubscription {
  id: string
  pattern: string
  callback: (message: WebSocketMessage) => void
  isActive: boolean
}

export interface WebSocketConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  enableLogging: boolean
}

export class WebSocketManager {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, WebSocketSubscription>()
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private messageQueue: WebSocketMessage[] = []
  private isConnected = false
  private eventListeners = new Map<string, Array<(event: any) => void>>()

  constructor(private config: WebSocketConfig) {}

  async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(this.config.url)
      
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'))
        }, 10000)

        this.ws!.onopen = (event) => {
          clearTimeout(timeout)
          this.handleOpen(event)
          resolve()
        }

        this.ws!.onerror = (event) => {
          clearTimeout(timeout)
          reject(new Error('WebSocket connection failed'))
        }
      })
    } catch (error) {
      this.log('Connection failed:', error)
      throw error
    }
  }

  disconnect(): void {
    this.isConnected = false
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.log('Disconnected from WebSocket')
  }

  subscribe(pattern: string, callback: (message: WebSocketMessage) => void): string {
    const id = this.generateSubscriptionId()
    
    const subscription: WebSocketSubscription = {
      id,
      pattern,
      callback,
      isActive: true
    }

    this.subscriptions.set(id, subscription)
    this.log(`Subscribed to pattern: ${pattern}`)

    return id
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.isActive = false
      this.subscriptions.delete(subscriptionId)
      this.log(`Unsubscribed: ${subscriptionId}`)
    }
  }

  send(message: WebSocketMessage): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      this.log('Message sent:', message.type)
    } else {
      // Queue message for later sending
      this.messageQueue.push(message)
      this.log('Message queued:', message.type)
    }
  }

  on(event: string, listener: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    
    this.eventListeners.get(event)!.push(listener)

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }

  getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    if (!this.ws) return 'disconnected'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting'
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected'
      default:
        return 'disconnected'
    }
  }

  getSubscriptions(): WebSocketSubscription[] {
    return Array.from(this.subscriptions.values())
  }

  private handleOpen(event: Event): void {
    this.isConnected = true
    this.reconnectAttempts = 0
    this.log('WebSocket connected')

    // Start heartbeat
    this.startHeartbeat()

    // Send queued messages
    this.sendQueuedMessages()

    // Emit connection event
    this.emit('connected', { timestamp: new Date() })
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      this.log('Message received:', message.type)

      // Route message to subscribers
      this.routeMessage(message)

      // Emit message event
      this.emit('message', message)
    } catch (error) {
      this.log('Failed to parse message:', error)
    }
  }

  private handleClose(event: CloseEvent): void {
    this.isConnected = false
    this.log('WebSocket closed:', event.code, event.reason)

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    // Attempt reconnection if not intentionally closed
    if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    }

    // Emit disconnection event
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      timestamp: new Date()
    })
  }

  private handleError(event: Event): void {
    this.log('WebSocket error:', event)
    this.emit('error', { error: event, timestamp: new Date() })
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)

    this.reconnectTimer = setTimeout(() => {
      this.log(`Reconnect attempt ${this.reconnectAttempts}`)
      this.connect().catch(error => {
        this.log('Reconnect failed:', error)
        
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect()
        } else {
          this.log('Max reconnect attempts reached')
          this.emit('reconnect_failed', { 
            attempts: this.reconnectAttempts,
            timestamp: new Date()
          })
        }
      })
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          payload: { timestamp: new Date() },
          timestamp: new Date()
        })
      }
    }, this.config.heartbeatInterval)
  }

  private sendQueuedMessages(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  private routeMessage(message: WebSocketMessage): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.isActive && this.matchesPattern(message.type, subscription.pattern)) {
        try {
          subscription.callback(message)
        } catch (error) {
          this.log('Subscription callback error:', error)
        }
      }
    }
  }

  private matchesPattern(messageType: string, pattern: string): boolean {
    // Simple pattern matching (supports wildcards)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return regex.test(messageType)
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          this.log('Event listener error:', error)
        }
      })
    }
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[WebSocketManager] ${message}`, ...args)
    }
  }
}

// WebSocket Manager Instance
export const createWebSocketManager = (config: Partial<WebSocketConfig> = {}) => {
  const defaultConfig: WebSocketConfig = {
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    enableLogging: process.env.NODE_ENV === 'development'
  }

  return new WebSocketManager({ ...defaultConfig, ...config })
}
