/**
 * Service Worker Registration and Management
 * Handles offline caching, background sync, and push notifications
 */

interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onOffline?: () => void
  onOnline?: () => void
}

interface PendingUpdate {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body?: string
  timestamp: number
  retryCount: number
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private isOnline = navigator.onLine
  private pendingUpdates: PendingUpdate[] = []
  private config: ServiceWorkerConfig = {}

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = config
    this.setupEventListeners()
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported')
      return null
    }

    // Skip service worker in development to prevent caching issues
    if (process.env.NODE_ENV === 'development') {
      console.log('Service Worker disabled in development mode to prevent caching conflicts')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      })

      this.registration = registration

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              this.config.onUpdate?.(registration)
            }
          })
        }
      })

      // Check for updates every 30 minutes
      setInterval(() => {
        registration.update()
      }, 30 * 60 * 1000)

      this.config.onSuccess?.(registration)
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Service Worker registered successfully')
      }

      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const result = await this.registration.unregister()
      this.registration = null
      return result
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
      return false
    }
  }

  /**
   * Update the service worker
   */
  async update(): Promise<void> {
    if (!this.registration) {
      return
    }

    try {
      await this.registration.update()
    } catch (error) {
      console.error('Service Worker update failed:', error)
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  skipWaiting(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  /**
   * Cache specific URLs
   */
  cacheUrls(urls: string[]): void {
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: 'CACHE_URLS',
        urls,
      })
    }
  }

  /**
   * Add pending update for background sync
   */
  addPendingUpdate(update: Omit<PendingUpdate, 'id' | 'timestamp' | 'retryCount'>): void {
    const pendingUpdate: PendingUpdate = {
      ...update,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    }

    this.pendingUpdates.push(pendingUpdate)
    this.savePendingUpdates()

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingUpdates()
    } else {
      // Register for background sync
      this.registerBackgroundSync('property-updates')
    }
  }

  /**
   * Register for background sync
   */
  private async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.registration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      return
    }

    try {
      await this.registration.sync.register(tag)
      if (process.env.NODE_ENV !== 'production') {
        console.log('Background sync registered:', tag)
      }
    } catch (error) {
      console.error('Background sync registration failed:', error)
    }
  }

  /**
   * Sync pending updates
   */
  private async syncPendingUpdates(): Promise<void> {
    const updates = [...this.pendingUpdates]
    
    for (const update of updates) {
      try {
        const response = await fetch(update.url, {
          method: update.method,
          headers: update.headers,
          body: update.body,
        })

        if (response.ok) {
          // Remove successful update
          this.pendingUpdates = this.pendingUpdates.filter(u => u.id !== update.id)
          this.savePendingUpdates()
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('Synced pending update:', update.id)
          }
        } else {
          // Increment retry count
          update.retryCount++
          if (update.retryCount >= 3) {
            // Remove after 3 failed attempts
            this.pendingUpdates = this.pendingUpdates.filter(u => u.id !== update.id)
            this.savePendingUpdates()
          }
        }
      } catch (error) {
        console.error('Failed to sync update:', update.id, error)
        update.retryCount++
        if (update.retryCount >= 3) {
          this.pendingUpdates = this.pendingUpdates.filter(u => u.id !== update.id)
          this.savePendingUpdates()
        }
      }
    }
  }

  /**
   * Save pending updates to localStorage
   */
  private savePendingUpdates(): void {
    try {
      localStorage.setItem('sw-pending-updates', JSON.stringify(this.pendingUpdates))
    } catch (error) {
      console.error('Failed to save pending updates:', error)
    }
  }

  /**
   * Load pending updates from localStorage
   */
  private loadPendingUpdates(): void {
    try {
      const saved = localStorage.getItem('sw-pending-updates')
      if (saved) {
        this.pendingUpdates = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load pending updates:', error)
      this.pendingUpdates = []
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Load pending updates on initialization
    this.loadPendingUpdates()

    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true
      this.config.onOnline?.()
      
      // Sync pending updates when back online
      this.syncPendingUpdates()
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Back online, syncing pending updates')
      }
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.config.onOffline?.()
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Gone offline')
      }
    })

    // Handle service worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        // Reload pending updates after sync
        this.loadPendingUpdates()
      }
    })
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRegistered: !!this.registration,
      isOnline: this.isOnline,
      pendingUpdates: this.pendingUpdates.length,
      registration: this.registration,
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    if (!('caches' in window)) {
      return
    }

    try {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('All caches cleared')
      }
    } catch (error) {
      console.error('Failed to clear caches:', error)
    }
  }

  /**
   * Get cache usage
   */
  async getCacheUsage(): Promise<{ name: string; size: number }[]> {
    if (!('caches' in window)) {
      return []
    }

    try {
      const cacheNames = await caches.keys()
      const usage = []

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const keys = await cache.keys()
        usage.push({
          name: cacheName,
          size: keys.length,
        })
      }

      return usage
    } catch (error) {
      console.error('Failed to get cache usage:', error)
      return []
    }
  }
}

// Singleton instance
let serviceWorkerManager: ServiceWorkerManager | null = null

/**
 * Initialize service worker
 */
export function initServiceWorker(config: ServiceWorkerConfig = {}): ServiceWorkerManager {
  if (!serviceWorkerManager) {
    serviceWorkerManager = new ServiceWorkerManager(config)
  }
  return serviceWorkerManager
}

/**
 * Get service worker manager instance
 */
export function getServiceWorkerManager(): ServiceWorkerManager | null {
  return serviceWorkerManager
}

/**
 * Register service worker with default configuration
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const manager = initServiceWorker({
    onUpdate: (registration) => {
      // Show update notification
      if (process.env.NODE_ENV !== 'production') {
        console.log('New app version available')
      }
    },
    onSuccess: (registration) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('App is ready for offline use')
      }
    },
    onOffline: () => {
      // Show offline notification
      if (process.env.NODE_ENV !== 'production') {
        console.log('App is running in offline mode')
      }
    },
    onOnline: () => {
      // Show online notification
      if (process.env.NODE_ENV !== 'production') {
        console.log('App is back online')
      }
    },
  })

  return manager.register()
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  const manager = getServiceWorkerManager()
  return manager ? manager.unregister() : false
}

export { ServiceWorkerManager }
export type { ServiceWorkerConfig, PendingUpdate }
