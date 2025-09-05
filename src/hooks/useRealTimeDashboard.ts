/**
 * Real-time Dashboard Hook
 * Manages WebSocket connections and real-time updates for dashboard data
 * Integrates with dashboard store for seamless state management
 */

'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useDashboardStore } from '../presentation/stores/dashboardStore'

// Real-time update types
export interface RealTimeUpdate {
  id: string
  type: 'metric' | 'alert' | 'widget' | 'stats'
  entityId: string
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: string
  source: string
}

export interface RealTimeOptions {
  autoConnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
  subscriptions?: string[]
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
  onUpdate?: (update: RealTimeUpdate) => void
}

export interface RealTimeReturn {
  connected: boolean
  connecting: boolean
  error: string | null
  lastUpdate: Date | null
  connect: () => void
  disconnect: () => void
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
  sendMessage: (message: any) => void
}

/**
 * Real-time dashboard hook with WebSocket management
 */
export function useRealTimeDashboard(options: RealTimeOptions = {}): RealTimeReturn {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    subscriptions = ['dashboard', 'metrics', 'alerts'],
    onConnect,
    onDisconnect,
    onError,
    onUpdate
  } = options

  // Dashboard store integration
  const {
    connectRealTime,
    disconnectRealTime,
    handleRealTimeUpdate,
    addSubscription,
    removeSubscription
  } = useDashboardStore()

  // Local state
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const subscriptionsRef = useRef<Set<string>>(new Set(subscriptions))

  // WebSocket URL (would be configurable in production)
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/dashboard/ws`
  }, [])

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const update: RealTimeUpdate = JSON.parse(event.data)
      
      // Update dashboard store
      handleRealTimeUpdate({
        id: update.id,
        type: update.type,
        entityId: update.entityId,
        data: update.data,
        timestamp: new Date(update.timestamp)
      })
      
      setLastUpdate(new Date())
      
      // Call custom update handler
      if (onUpdate) {
        onUpdate(update)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      setError('Failed to parse real-time update')
    }
  }, [handleRealTimeUpdate, onUpdate])

  // Handle WebSocket connection open
  const handleOpen = useCallback(() => {
    console.log('Dashboard WebSocket connected')
    setConnected(true)
    setConnecting(false)
    setError(null)
    reconnectCountRef.current = 0
    
    // Update dashboard store
    connectRealTime()
    
    // Subscribe to channels
    subscriptionsRef.current.forEach(channel => {
      addSubscription(channel)
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          channel
        }))
      }
    })
    
    if (onConnect) {
      onConnect()
    }
  }, [connectRealTime, addSubscription, onConnect])

  // Handle WebSocket connection close
  const handleClose = useCallback((event: CloseEvent) => {
    console.log('Dashboard WebSocket disconnected:', event.code, event.reason)
    setConnected(false)
    setConnecting(false)
    
    // Update dashboard store
    disconnectRealTime()
    
    if (onDisconnect) {
      onDisconnect()
    }
    
    // Attempt reconnection if not intentional close
    if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
      reconnectCountRef.current++
      setError(`Connection lost. Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`)
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, reconnectDelay * reconnectCountRef.current) // Exponential backoff
    } else if (reconnectCountRef.current >= reconnectAttempts) {
      setError('Failed to reconnect after maximum attempts')
    }
  }, [disconnectRealTime, onDisconnect, reconnectAttempts, reconnectDelay])

  // Handle WebSocket errors
  const handleError = useCallback((event: Event) => {
    console.error('Dashboard WebSocket error:', event)
    const errorMessage = 'WebSocket connection error'
    setError(errorMessage)
    setConnecting(false)
    
    if (onError) {
      onError(new Error(errorMessage))
    }
  }, [onError])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }
    
    if (connecting) {
      return // Already connecting
    }
    
    setConnecting(true)
    setError(null)
    
    try {
      const ws = new WebSocket(getWebSocketUrl())
      
      ws.onopen = handleOpen
      ws.onmessage = handleMessage
      ws.onclose = handleClose
      ws.onerror = handleError
      
      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setError('Failed to create WebSocket connection')
      setConnecting(false)
    }
  }, [connecting, getWebSocketUrl, handleOpen, handleMessage, handleClose, handleError])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Intentional disconnect')
      wsRef.current = null
    }
    
    setConnected(false)
    setConnecting(false)
    reconnectCountRef.current = 0
  }, [])

  // Subscribe to a channel
  const subscribe = useCallback((channel: string) => {
    subscriptionsRef.current.add(channel)
    addSubscription(channel)
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel
      }))
    }
  }, [addSubscription])

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channel: string) => {
    subscriptionsRef.current.delete(channel)
    removeSubscription(channel)
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel
      }))
    }
  }, [removeSubscription])

  // Send message to WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      disconnect()
    }
  }, [disconnect])

  return {
    connected,
    connecting,
    error,
    lastUpdate,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage
  }
}

/**
 * Hook for real-time metric updates
 */
export function useRealTimeMetrics(metricIds?: string[]) {
  const { subscribe, unsubscribe, connected } = useRealTimeDashboard({
    autoConnect: true,
    subscriptions: ['metrics']
  })
  
  const metrics = useDashboardStore(state => 
    metricIds 
      ? metricIds.map(id => state.getMetric(id)).filter(Boolean)
      : state.getActiveMetrics()
  )

  useEffect(() => {
    if (connected && metricIds) {
      // Subscribe to specific metrics
      metricIds.forEach(id => {
        subscribe(`metric:${id}`)
      })
      
      return () => {
        metricIds.forEach(id => {
          unsubscribe(`metric:${id}`)
        })
      }
    }
  }, [connected, metricIds, subscribe, unsubscribe])

  return {
    metrics,
    connected
  }
}

/**
 * Hook for real-time alert updates
 */
export function useRealTimeAlerts() {
  const { subscribe, connected } = useRealTimeDashboard({
    autoConnect: true,
    subscriptions: ['alerts']
  })
  
  const alerts = useDashboardStore(state => state.getCriticalAlerts())

  useEffect(() => {
    if (connected) {
      subscribe('alerts:critical')
    }
  }, [connected, subscribe])

  return {
    alerts,
    connected
  }
}

export default useRealTimeDashboard
