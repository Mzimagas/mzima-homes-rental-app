import { useState, useEffect, useCallback } from 'react'

interface OfflineOperation {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
  timestamp: number
  retryCount: number
}

interface OfflineStatus {
  isOnline: boolean
  isServiceWorkerReady: boolean
  queuedOperations: number
  lastSyncTime: Date | null
}

interface UseOfflineSupportOptions {
  enableNotifications?: boolean
  autoRetry?: boolean
  maxRetries?: number
}

export const useOfflineSupport = (options: UseOfflineSupportOptions = {}) => {
  const { enableNotifications = true, autoRetry = true, maxRetries = 3 } = options

  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    isServiceWorkerReady: false,
    queuedOperations: 0,
    lastSyncTime: null
  })

  const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([])

  // Initialize service worker and offline support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setOfflineStatus(prev => ({ ...prev, isServiceWorkerReady: true }))
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
        
        // Get initial queue size
        updateQueueSize()
      })
    }

    // Listen for online/offline events
    const handleOnline = () => {
      setOfflineStatus(prev => ({ ...prev, isOnline: true }))
      if (enableNotifications) {
        showNotification('Connection restored', 'Syncing pending changes...', 'success')
      }
    }

    const handleOffline = () => {
      setOfflineStatus(prev => ({ ...prev, isOnline: false }))
      if (enableNotifications) {
        showNotification('Connection lost', 'Changes will be saved when connection is restored', 'warning')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [enableNotifications])

  // Handle messages from service worker
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, operation } = event.data

    switch (type) {
      case 'OFFLINE_OPERATION_SYNCED':
        setOfflineStatus(prev => ({ ...prev, lastSyncTime: new Date() }))
        updateQueueSize()
        
        if (enableNotifications) {
          showNotification('Data synced', 'Your changes have been saved', 'success')
        }
        break

      case 'OFFLINE_OPERATION_FAILED':
        if (enableNotifications) {
          showNotification('Sync failed', 'Some changes could not be saved', 'error')
        }
        break
    }
  }, [enableNotifications])

  // Update queue size from service worker
  const updateQueueSize = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const messageChannel = new MessageChannel()
        
        const response = await new Promise<{ size: number }>((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data)
          }
          
          navigator.serviceWorker.controller?.postMessage(
            { type: 'GET_OFFLINE_QUEUE_SIZE' },
            [messageChannel.port2]
          )
        })

        setOfflineStatus(prev => ({ ...prev, queuedOperations: response.size }))
      } catch (error) {
        console.error('Failed to get offline queue size:', error)
      }
    }
  }, [])

  // Queue an operation for offline processing
  const queueOfflineOperation = useCallback(async (
    url: string,
    method: string,
    body?: any,
    headers?: Record<string, string>
  ) => {
    const operation: OfflineOperation = {
      id: Date.now() + Math.random().toString(),
      url,
      method,
      headers: headers || { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null,
      timestamp: Date.now(),
      retryCount: 0
    }

    setPendingOperations(prev => [...prev, operation])
    
    if (enableNotifications) {
      showNotification('Operation queued', 'Your changes will be saved when connection is restored', 'info')
    }

    return operation.id
  }, [enableNotifications])

  // Retry failed operations
  const retryFailedOperations = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'RETRY_FAILED_OPERATIONS'
      })
      
      updateQueueSize()
    }
  }, [updateQueueSize])

  // Clear all queued operations
  const clearOfflineQueue = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel()
      
      const response = await new Promise<{ success: boolean }>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data)
        }
        
        navigator.serviceWorker.controller?.postMessage(
          { type: 'CLEAR_OFFLINE_QUEUE' },
          [messageChannel.port2]
        )
      })

      if (response.success) {
        setPendingOperations([])
        updateQueueSize()
      }
    }
  }, [updateQueueSize])

  // Show notification (can be customized with toast library)
  const showNotification = useCallback((title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // This can be replaced with your preferred notification system
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`)
    
    // Example with browser notifications (requires permission)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png'
      })
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }, [])

  // Enhanced fetch with offline support
  const offlineAwareFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      // If offline and it's a write operation, queue it
      if (!offlineStatus.isOnline && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
        await queueOfflineOperation(url, options.method || 'GET', options.body, options.headers as Record<string, string>)
        
        // Return a mock success response
        return new Response(
          JSON.stringify({
            success: true,
            queued: true,
            message: 'Operation queued for when connection is restored'
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      throw error
    }
  }, [offlineStatus.isOnline, queueOfflineOperation])

  return {
    // Status
    offlineStatus,
    isOnline: offlineStatus.isOnline,
    isServiceWorkerReady: offlineStatus.isServiceWorkerReady,
    queuedOperations: offlineStatus.queuedOperations,
    lastSyncTime: offlineStatus.lastSyncTime,
    
    // Operations
    queueOfflineOperation,
    retryFailedOperations,
    clearOfflineQueue,
    updateQueueSize,
    
    // Enhanced fetch
    offlineAwareFetch,
    
    // Notifications
    requestNotificationPermission,
    
    // Pending operations
    pendingOperations
  }
}
