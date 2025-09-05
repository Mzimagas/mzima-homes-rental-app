/**
 * Dashboard WebSocket API Route
 * Real-time updates for dashboard metrics, alerts, and data
 * Handles WebSocket connections, subscriptions, and broadcasting
 */

import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// WebSocket connection management
interface WebSocketConnection {
  id: string
  socket: WebSocket
  userId: string
  subscriptions: Set<string>
  lastPing: number
  authenticated: boolean
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'update' | 'error'
  channel?: string
  data?: any
  timestamp?: string
}

interface DashboardUpdate {
  id: string
  type: 'metric' | 'alert' | 'widget' | 'stats'
  entityId: string
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: string
  source: string
}

// Global connection store (in production, use Redis or similar)
const connections = new Map<string, WebSocketConnection>()
const channelSubscriptions = new Map<string, Set<string>>() // channel -> connectionIds

// Cleanup interval for stale connections
const CLEANUP_INTERVAL = 30000 // 30 seconds
const CONNECTION_TIMEOUT = 60000 // 1 minute

// WebSocket upgrade handler
export async function GET(request: NextRequest) {
  try {
    // Check if this is a WebSocket upgrade request
    const upgrade = request.headers.get('upgrade')
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    // Create Supabase client for authentication
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get user from session
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return new Response('Authentication required', { status: 401 })
    }

    // In a real implementation, you would handle WebSocket upgrade here
    // For now, we'll return a placeholder response
    return new Response('WebSocket endpoint - upgrade handling would be implemented here', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    })
  } catch (error) {
    console.error('WebSocket route error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

/**
 * WebSocket connection handler (would be called after upgrade)
 */
export function handleWebSocketConnection(socket: WebSocket, userId: string) {
  const connectionId = generateConnectionId()
  
  const connection: WebSocketConnection = {
    id: connectionId,
    socket,
    userId,
    subscriptions: new Set(),
    lastPing: Date.now(),
    authenticated: true
  }
  
  connections.set(connectionId, connection)
  
  // Set up message handlers
  socket.onmessage = (event) => {
    handleWebSocketMessage(connectionId, event.data)
  }
  
  socket.onclose = () => {
    handleWebSocketClose(connectionId)
  }
  
  socket.onerror = (error) => {
    console.error(`WebSocket error for connection ${connectionId}:`, error)
    handleWebSocketClose(connectionId)
  }
  
  // Send welcome message
  sendMessage(connectionId, {
    type: 'update',
    data: {
      message: 'Connected to dashboard real-time updates',
      connectionId,
      timestamp: new Date().toISOString()
    }
  })
  
  console.log(`Dashboard WebSocket connection established: ${connectionId} for user ${userId}`)
}

/**
 * Handle incoming WebSocket messages
 */
function handleWebSocketMessage(connectionId: string, data: string) {
  const connection = connections.get(connectionId)
  if (!connection) return
  
  try {
    const message: WebSocketMessage = JSON.parse(data)
    
    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          handleSubscription(connectionId, message.channel)
        }
        break
        
      case 'unsubscribe':
        if (message.channel) {
          handleUnsubscription(connectionId, message.channel)
        }
        break
        
      case 'ping':
        connection.lastPing = Date.now()
        sendMessage(connectionId, { type: 'pong' })
        break
        
      default:
        console.warn(`Unknown message type: ${message.type}`)
    }
  } catch (error) {
    console.error(`Failed to parse WebSocket message from ${connectionId}:`, error)
    sendMessage(connectionId, {
      type: 'error',
      data: { message: 'Invalid message format' }
    })
  }
}

/**
 * Handle channel subscription
 */
function handleSubscription(connectionId: string, channel: string) {
  const connection = connections.get(connectionId)
  if (!connection) return
  
  // Add to connection subscriptions
  connection.subscriptions.add(channel)
  
  // Add to channel subscriptions
  if (!channelSubscriptions.has(channel)) {
    channelSubscriptions.set(channel, new Set())
  }
  channelSubscriptions.get(channel)!.add(connectionId)
  
  console.log(`Connection ${connectionId} subscribed to channel: ${channel}`)
  
  // Send confirmation
  sendMessage(connectionId, {
    type: 'update',
    data: {
      message: `Subscribed to ${channel}`,
      channel,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Handle channel unsubscription
 */
function handleUnsubscription(connectionId: string, channel: string) {
  const connection = connections.get(connectionId)
  if (!connection) return
  
  // Remove from connection subscriptions
  connection.subscriptions.delete(channel)
  
  // Remove from channel subscriptions
  const channelSubs = channelSubscriptions.get(channel)
  if (channelSubs) {
    channelSubs.delete(connectionId)
    if (channelSubs.size === 0) {
      channelSubscriptions.delete(channel)
    }
  }
  
  console.log(`Connection ${connectionId} unsubscribed from channel: ${channel}`)
}

/**
 * Handle WebSocket connection close
 */
function handleWebSocketClose(connectionId: string) {
  const connection = connections.get(connectionId)
  if (!connection) return
  
  // Remove from all channel subscriptions
  connection.subscriptions.forEach(channel => {
    const channelSubs = channelSubscriptions.get(channel)
    if (channelSubs) {
      channelSubs.delete(connectionId)
      if (channelSubs.size === 0) {
        channelSubscriptions.delete(channel)
      }
    }
  })
  
  // Remove connection
  connections.delete(connectionId)
  
  console.log(`Dashboard WebSocket connection closed: ${connectionId}`)
}

/**
 * Send message to specific connection
 */
function sendMessage(connectionId: string, message: WebSocketMessage) {
  const connection = connections.get(connectionId)
  if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
    return false
  }
  
  try {
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    }
    
    connection.socket.send(JSON.stringify(messageWithTimestamp))
    return true
  } catch (error) {
    console.error(`Failed to send message to ${connectionId}:`, error)
    handleWebSocketClose(connectionId)
    return false
  }
}

/**
 * Broadcast update to all subscribers of a channel
 */
export function broadcastToChannel(channel: string, update: DashboardUpdate) {
  const subscribers = channelSubscriptions.get(channel)
  if (!subscribers || subscribers.size === 0) {
    return 0
  }
  
  const message: WebSocketMessage = {
    type: 'update',
    channel,
    data: update,
    timestamp: update.timestamp
  }
  
  let sentCount = 0
  subscribers.forEach(connectionId => {
    if (sendMessage(connectionId, message)) {
      sentCount++
    }
  })
  
  return sentCount
}

/**
 * Broadcast dashboard metric update
 */
export function broadcastMetricUpdate(metricId: string, metricData: any) {
  const update: DashboardUpdate = {
    id: generateUpdateId(),
    type: 'metric',
    entityId: metricId,
    action: 'update',
    data: metricData,
    timestamp: new Date().toISOString(),
    source: 'dashboard_service'
  }
  
  // Broadcast to general metrics channel
  broadcastToChannel('metrics', update)
  
  // Broadcast to specific metric channel
  broadcastToChannel(`metric:${metricId}`, update)
  
  return update
}

/**
 * Broadcast dashboard alert
 */
export function broadcastAlert(alert: any) {
  const update: DashboardUpdate = {
    id: generateUpdateId(),
    type: 'alert',
    entityId: alert.id,
    action: 'create',
    data: alert,
    timestamp: new Date().toISOString(),
    source: 'alert_system'
  }
  
  // Broadcast to alerts channel
  broadcastToChannel('alerts', update)
  
  // Broadcast to severity-specific channel
  broadcastToChannel(`alerts:${alert.severity}`, update)
  
  return update
}

/**
 * Broadcast dashboard stats update
 */
export function broadcastStatsUpdate(stats: any) {
  const update: DashboardUpdate = {
    id: generateUpdateId(),
    type: 'stats',
    entityId: 'dashboard_stats',
    action: 'update',
    data: stats,
    timestamp: new Date().toISOString(),
    source: 'stats_service'
  }
  
  broadcastToChannel('dashboard', update)
  broadcastToChannel('stats', update)
  
  return update
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  return {
    totalConnections: connections.size,
    totalChannels: channelSubscriptions.size,
    connectionsByChannel: Array.from(channelSubscriptions.entries()).map(([channel, subs]) => ({
      channel,
      subscribers: subs.size
    }))
  }
}

/**
 * Cleanup stale connections
 */
function cleanupStaleConnections() {
  const now = Date.now()
  const staleConnections: string[] = []
  
  connections.forEach((connection, connectionId) => {
    if (now - connection.lastPing > CONNECTION_TIMEOUT) {
      staleConnections.push(connectionId)
    }
  })
  
  staleConnections.forEach(connectionId => {
    console.log(`Cleaning up stale connection: ${connectionId}`)
    handleWebSocketClose(connectionId)
  })
  
  return staleConnections.length
}

/**
 * Generate unique connection ID
 */
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate unique update ID
 */
function generateUpdateId(): string {
  return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Start cleanup interval
if (typeof window === 'undefined') { // Server-side only
  setInterval(cleanupStaleConnections, CLEANUP_INTERVAL)
}
