import { useState, useEffect, useCallback } from 'react'
import { getServiceWorkerManager } from '../lib/serviceWorker'

interface OfflineState {
  isOnline: boolean
  isOffline: boolean
  pendingUpdates: number
  lastOnline: Date | null
  connectionType: string | null
}

interface OfflineActions {
  retry: () => void
  clearPendingUpdates: () => void
  forcSync: () => void
}

/**
 * Hook for managing offline state and actions
 */
export function useOffline(): OfflineState & OfflineActions {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingUpdates, setPendingUpdates] = useState(0)
  const [lastOnline, setLastOnline] = useState<Date | null>(null)
  const [connectionType, setConnectionType] = useState<string | null>(null)

  // Update connection info
  const updateConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    if (connection) {
      setConnectionType(connection.effectiveType || connection.type || 'unknown')
    }
  }, [])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastOnline(new Date())
      updateConnectionInfo()
    }

    const handleOffline = () => {
      setIsOnline(false)
      updateConnectionInfo()
    }

    // Initial connection info
    updateConnectionInfo()
    if (isOnline) {
      setLastOnline(new Date())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }
  }, [updateConnectionInfo, isOnline])

  // Update pending updates count
  useEffect(() => {
    const updatePendingCount = () => {
      const manager = getServiceWorkerManager()
      if (manager) {
        const status = manager.getStatus()
        setPendingUpdates(status.pendingUpdates)
      }
    }

    // Update immediately
    updatePendingCount()

    // Update every 5 seconds
    const interval = setInterval(updatePendingCount, 5000)

    return () => clearInterval(interval)
  }, [])

  // Actions
  const retry = useCallback(() => {
    // Force a network check
    fetch('/api/health', { method: 'HEAD' })
      .then(() => {
        if (!navigator.onLine) {
          // Manually trigger online event if fetch succeeds but navigator.onLine is false
          window.dispatchEvent(new Event('online'))
        }
      })
      .catch(() => {
        if (navigator.onLine) {
          // Manually trigger offline event if fetch fails but navigator.onLine is true
          window.dispatchEvent(new Event('offline'))
        }
      })
  }, [])

  const clearPendingUpdates = useCallback(() => {
    try {
      localStorage.removeItem('sw-pending-updates')
      setPendingUpdates(0)
    } catch (error) {
      console.error('Failed to clear pending updates:', error)
    }
  }, [])

  const forcSync = useCallback(() => {
    const manager = getServiceWorkerManager()
    if (manager && isOnline) {
      // Trigger manual sync by sending message to service worker
      const registration = manager.getStatus().registration
      if (registration?.active) {
        registration.active.postMessage({ type: 'FORCE_SYNC' })
      }
    }
  }, [isOnline])

  return {
    isOnline,
    isOffline: !isOnline,
    pendingUpdates,
    lastOnline,
    connectionType,
    retry,
    clearPendingUpdates,
    forcSync,
  }
}

/**
 * Hook for offline-aware API calls
 */
export function useOfflineAPI() {
  const { isOnline } = useOffline()

  const makeRequest = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const manager = getServiceWorkerManager()

    try {
      const response = await fetch(url, options)
      return response
    } catch (error) {
      // If offline and it's a mutation, queue it
      if (!isOnline && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH' || options.method === 'DELETE')) {
        if (manager) {
          manager.addPendingUpdate({
            url,
            method: options.method || 'GET',
            headers: (options.headers as Record<string, string>) || {},
            body: options.body as string,
          })
        }

        // Return a fake success response for optimistic updates
        return new Response(JSON.stringify({ success: true, queued: true }), {
          status: 200,
          statusText: 'Queued for sync',
          headers: { 'Content-Type': 'application/json' },
        })
      }

      throw error
    }
  }, [isOnline])

  return {
    makeRequest,
    isOnline,
  }
}

/**
 * Hook for offline storage
 */
export function useOfflineStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue
      setValue(valueToStore)
      localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('Failed to store value:', error)
    }
  }, [key, value])

  const removeStoredValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
      setValue(defaultValue)
    } catch (error) {
      console.error('Failed to remove stored value:', error)
    }
  }, [key, defaultValue])

  return [value, setStoredValue, removeStoredValue] as const
}

/**
 * Hook for connection quality monitoring
 */
export function useConnectionQuality() {
  const [quality, setQuality] = useState<'slow' | 'good' | 'fast' | 'unknown'>('unknown')
  const [rtt, setRtt] = useState<number | null>(null)
  const [downlink, setDownlink] = useState<number | null>(null)

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    const updateQuality = () => {
      if (!connection) {
        setQuality('unknown')
        return
      }

      setRtt(connection.rtt || null)
      setDownlink(connection.downlink || null)

      // Determine quality based on connection info
      if (connection.effectiveType) {
        switch (connection.effectiveType) {
          case 'slow-2g':
          case '2g':
            setQuality('slow')
            break
          case '3g':
            setQuality('good')
            break
          case '4g':
            setQuality('fast')
            break
          default:
            setQuality('unknown')
        }
      } else if (connection.rtt && connection.downlink) {
        // Fallback quality detection
        if (connection.rtt > 1000 || connection.downlink < 0.5) {
          setQuality('slow')
        } else if (connection.rtt < 300 && connection.downlink > 2) {
          setQuality('fast')
        } else {
          setQuality('good')
        }
      }
    }

    updateQuality()

    if (connection) {
      connection.addEventListener('change', updateQuality)
      return () => connection.removeEventListener('change', updateQuality)
    }
  }, [])

  return {
    quality,
    rtt,
    downlink,
    isSlowConnection: quality === 'slow',
    isFastConnection: quality === 'fast',
  }
}

/**
 * Hook for adaptive loading based on connection
 */
export function useAdaptiveLoading() {
  const { quality, isSlowConnection } = useConnectionQuality()
  const { isOnline } = useOffline()

  const shouldLoadImages = !isSlowConnection && isOnline
  const shouldPreloadComponents = quality === 'fast' && isOnline
  const shouldUseVirtualization = isSlowConnection || !isOnline
  const maxConcurrentRequests = isSlowConnection ? 2 : quality === 'fast' ? 6 : 4

  return {
    shouldLoadImages,
    shouldPreloadComponents,
    shouldUseVirtualization,
    maxConcurrentRequests,
    quality,
    isOnline,
  }
}

/**
 * Hook for offline notifications
 */
export function useOfflineNotifications() {
  const { isOnline, pendingUpdates } = useOffline()
  const [showOfflineNotification, setShowOfflineNotification] = useState(false)
  const [showSyncNotification, setShowSyncNotification] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineNotification(true)
    } else {
      setShowOfflineNotification(false)
      
      // Show sync notification if there are pending updates
      if (pendingUpdates > 0) {
        setShowSyncNotification(true)
        
        // Hide after 3 seconds
        const timer = setTimeout(() => {
          setShowSyncNotification(false)
        }, 3000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isOnline, pendingUpdates])

  const dismissOfflineNotification = useCallback(() => {
    setShowOfflineNotification(false)
  }, [])

  const dismissSyncNotification = useCallback(() => {
    setShowSyncNotification(false)
  }, [])

  return {
    showOfflineNotification,
    showSyncNotification,
    dismissOfflineNotification,
    dismissSyncNotification,
    pendingUpdates,
  }
}
