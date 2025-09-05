/**
 * Real-time Data Synchronization Service
 * Manages real-time updates for dashboard data using WebSocket and polling fallback
 * Integrates with DataPrefetchingService patterns for optimal performance
 */

import { dataPrefetchingService } from './DataPrefetchingService'
import { dataCache } from './CachingService'
import { broadcastMetricUpdate, broadcastAlert, broadcastStatsUpdate } from '../app/api/dashboard/ws/route'

// Update types and interfaces
export interface RealTimeUpdate {
  id: string
  type: 'metric' | 'alert' | 'stats' | 'property' | 'tenant' | 'payment'
  entityId: string
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: Date
  source: string
}

export interface SyncOptions {
  enableWebSocket?: boolean
  enablePolling?: boolean
  pollingInterval?: number
  maxRetries?: number
  retryDelay?: number
}

export interface SyncStats {
  lastSync: Date | null
  totalUpdates: number
  failedUpdates: number
  activeConnections: number
  syncMethod: 'websocket' | 'polling' | 'hybrid'
}

/**
 * Real-time Data Synchronization Service
 */
class RealTimeDataService {
  private updateQueue: RealTimeUpdate[] = []
  private syncStats: SyncStats = {
    lastSync: null,
    totalUpdates: 0,
    failedUpdates: 0,
    activeConnections: 0,
    syncMethod: 'hybrid'
  }
  
  private pollingInterval: NodeJS.Timeout | null = null
  private isPolling = false
  private subscribers = new Map<string, Set<(update: RealTimeUpdate) => void>>()
  
  // Configuration
  private readonly DEFAULT_POLLING_INTERVAL = 30000 // 30 seconds
  private readonly MAX_QUEUE_SIZE = 1000
  private readonly BATCH_SIZE = 50

  /**
   * Initialize real-time synchronization
   */
  async initialize(options: SyncOptions = {}) {
    const {
      enableWebSocket = true,
      enablePolling = true,
      pollingInterval = this.DEFAULT_POLLING_INTERVAL,
      maxRetries = 3,
      retryDelay = 1000
    } = options

    console.log('Initializing Real-time Data Service...')

    // Start polling if enabled
    if (enablePolling) {
      this.startPolling(pollingInterval)
    }

    // WebSocket would be initialized here in a full implementation
    if (enableWebSocket) {
      console.log('WebSocket real-time updates enabled')
    }

    console.log('Real-time Data Service initialized')
  }

  /**
   * Start polling for data updates
   */
  private startPolling(interval: number) {
    if (this.isPolling) {
      this.stopPolling()
    }

    this.isPolling = true
    this.pollingInterval = setInterval(async () => {
      await this.pollForUpdates()
    }, interval)

    console.log(`Started polling for updates every ${interval}ms`)
  }

  /**
   * Stop polling for data updates
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.isPolling = false
    console.log('Stopped polling for updates')
  }

  /**
   * Poll for data updates
   */
  private async pollForUpdates() {
    try {
      // Check for metric updates
      await this.checkMetricUpdates()
      
      // Check for alert updates
      await this.checkAlertUpdates()
      
      // Check for stats updates
      await this.checkStatsUpdates()
      
      // Process update queue
      await this.processUpdateQueue()
      
      this.syncStats.lastSync = new Date()
    } catch (error) {
      console.error('Error during polling update:', error)
      this.syncStats.failedUpdates++
    }
  }

  /**
   * Check for metric updates
   */
  private async checkMetricUpdates() {
    try {
      // Fetch latest metrics
      const response = await fetch('/api/dashboard/metrics?refresh=true')
      if (!response.ok) return

      const result = await response.json()
      const latestMetrics = result.data

      // Compare with cached metrics
      const cachedMetrics = dataCache.get('dashboard_metrics') || []
      
      // Find updated metrics
      const updatedMetrics = latestMetrics.filter((metric: any) => {
        const cached = cachedMetrics.find((c: any) => c.id === metric.id)
        return !cached || cached.lastUpdated !== metric.lastUpdated
      })

      // Queue updates for changed metrics
      updatedMetrics.forEach((metric: any) => {
        this.queueUpdate({
          id: `metric_update_${metric.id}_${Date.now()}`,
          type: 'metric',
          entityId: metric.id,
          action: 'update',
          data: metric,
          timestamp: new Date(),
          source: 'polling_service'
        })
      })

      // Update cache
      if (updatedMetrics.length > 0) {
        dataCache.set('dashboard_metrics', latestMetrics, {
          ttl: 180000, // 3 minutes
          tags: ['dashboard', 'metrics']
        })
      }
    } catch (error) {
      console.error('Error checking metric updates:', error)
    }
  }

  /**
   * Check for alert updates
   */
  private async checkAlertUpdates() {
    try {
      // Fetch latest alerts
      const response = await fetch('/api/dashboard/alerts')
      if (!response.ok) return

      const result = await response.json()
      const latestAlerts = result.data

      // Compare with cached alerts
      const cachedAlerts = dataCache.get('dashboard_alerts') || []
      
      // Find new alerts
      const newAlerts = latestAlerts.filter((alert: any) => {
        return !cachedAlerts.find((c: any) => c.id === alert.id)
      })

      // Queue updates for new alerts
      newAlerts.forEach((alert: any) => {
        this.queueUpdate({
          id: `alert_create_${alert.id}_${Date.now()}`,
          type: 'alert',
          entityId: alert.id,
          action: 'create',
          data: alert,
          timestamp: new Date(),
          source: 'polling_service'
        })
      })

      // Update cache
      if (newAlerts.length > 0) {
        dataCache.set('dashboard_alerts', latestAlerts, {
          ttl: 60000, // 1 minute for alerts
          tags: ['dashboard', 'alerts']
        })
      }
    } catch (error) {
      console.error('Error checking alert updates:', error)
    }
  }

  /**
   * Check for stats updates
   */
  private async checkStatsUpdates() {
    try {
      // Use the dashboard batch API for stats
      const response = await fetch('/api/dashboard/batch?include=stats')
      if (!response.ok) return

      const result = await response.json()
      const latestStats = result.stats

      // Compare with cached stats
      const cachedStats = dataCache.get('dashboard_stats')
      
      // Check if stats have changed (simple comparison)
      const hasChanged = !cachedStats || 
        JSON.stringify(cachedStats) !== JSON.stringify(latestStats)

      if (hasChanged) {
        this.queueUpdate({
          id: `stats_update_${Date.now()}`,
          type: 'stats',
          entityId: 'dashboard_stats',
          action: 'update',
          data: latestStats,
          timestamp: new Date(),
          source: 'polling_service'
        })

        // Update cache
        dataCache.set('dashboard_stats', latestStats, {
          ttl: 180000, // 3 minutes
          tags: ['dashboard', 'stats']
        })
      }
    } catch (error) {
      console.error('Error checking stats updates:', error)
    }
  }

  /**
   * Queue an update for processing
   */
  private queueUpdate(update: RealTimeUpdate) {
    // Prevent queue overflow
    if (this.updateQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('Update queue is full, removing oldest updates')
      this.updateQueue = this.updateQueue.slice(-this.MAX_QUEUE_SIZE + this.BATCH_SIZE)
    }

    this.updateQueue.push(update)
  }

  /**
   * Process queued updates
   */
  private async processUpdateQueue() {
    if (this.updateQueue.length === 0) return

    // Process updates in batches
    const batch = this.updateQueue.splice(0, this.BATCH_SIZE)
    
    for (const update of batch) {
      try {
        await this.processUpdate(update)
        this.syncStats.totalUpdates++
      } catch (error) {
        console.error('Error processing update:', error)
        this.syncStats.failedUpdates++
      }
    }
  }

  /**
   * Process a single update
   */
  private async processUpdate(update: RealTimeUpdate) {
    // Broadcast via WebSocket if available
    switch (update.type) {
      case 'metric':
        broadcastMetricUpdate(update.entityId, update.data)
        break
      case 'alert':
        broadcastAlert(update.data)
        break
      case 'stats':
        broadcastStatsUpdate(update.data)
        break
    }

    // Notify subscribers
    this.notifySubscribers(update.type, update)
    this.notifySubscribers(`${update.type}:${update.entityId}`, update)
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(channel: string, callback: (update: RealTimeUpdate) => void) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
    }
    
    this.subscribers.get(channel)!.add(callback)
    
    return () => {
      const channelSubscribers = this.subscribers.get(channel)
      if (channelSubscribers) {
        channelSubscribers.delete(callback)
        if (channelSubscribers.size === 0) {
          this.subscribers.delete(channel)
        }
      }
    }
  }

  /**
   * Notify subscribers of an update
   */
  private notifySubscribers(channel: string, update: RealTimeUpdate) {
    const channelSubscribers = this.subscribers.get(channel)
    if (!channelSubscribers) return

    channelSubscribers.forEach(callback => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in subscriber callback:', error)
      }
    })
  }

  /**
   * Manually trigger data refresh
   */
  async refreshData(types: ('metrics' | 'alerts' | 'stats')[] = ['metrics', 'alerts', 'stats']) {
    console.log('Manually refreshing data:', types)
    
    const promises: Promise<void>[] = []
    
    if (types.includes('metrics')) {
      promises.push(this.checkMetricUpdates())
    }
    
    if (types.includes('alerts')) {
      promises.push(this.checkAlertUpdates())
    }
    
    if (types.includes('stats')) {
      promises.push(this.checkStatsUpdates())
    }
    
    await Promise.all(promises)
    await this.processUpdateQueue()
    
    this.syncStats.lastSync = new Date()
  }

  /**
   * Get synchronization statistics
   */
  getSyncStats(): SyncStats {
    return {
      ...this.syncStats,
      activeConnections: this.subscribers.size
    }
  }

  /**
   * Clear update queue
   */
  clearQueue() {
    this.updateQueue = []
  }

  /**
   * Shutdown the service
   */
  shutdown() {
    this.stopPolling()
    this.clearQueue()
    this.subscribers.clear()
    console.log('Real-time Data Service shutdown')
  }
}

// Export singleton instance
export const realTimeDataService = new RealTimeDataService()

// Auto-initialize with default options
if (typeof window !== 'undefined') {
  // Client-side initialization
  realTimeDataService.initialize({
    enableWebSocket: true,
    enablePolling: true,
    pollingInterval: 30000 // 30 seconds
  })
}

export default realTimeDataService
