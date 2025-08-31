/**
 * Service Worker for Mzima Homes PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_VERSION = 'v11' // Fixed caching issues
const CACHE_NAME = `mzima-homes-${CACHE_VERSION}`
const STATIC_CACHE = `mzima-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `mzima-dynamic-${CACHE_VERSION}`
const API_CACHE = `mzima-api-${CACHE_VERSION}`

// Files to cache immediately - NO HTML PAGES
const STATIC_FILES = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/properties',
  '/api/tenants',
  '/api/dashboard/stats',
  '/api/purchase-pipeline',
  '/api/property-subdivisions',
  '/api/property-handovers',
  '/api/property-documents',
]

// Offline operations queue name
const OFFLINE_QUEUE_NAME = 'offline-operations'

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('Service Worker: Static files cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')

  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(k))
          .map((k) => {
            console.log('Service Worker: Deleting old cache', k)
            return caches.delete(k)
          })
      )
      console.log('Service Worker: Activated')
      await self.clients.claim()
    })()
  )
})

// Don't cache any API responses to prevent stale data
const shouldBypass = (url) =>
  url.includes('supabase.co') ||
  url.includes('/rest/v1/') ||
  url.includes('/auth/v1/') ||
  url.includes('/api/')

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Bypass API endpoints completely - no caching for dynamic data
  if (shouldBypass(url.href)) {
    return
  }

  // Handle SPA navigations with network-first (prevents stale HTML)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // Handle different types of requests
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    // Static assets - Cache First
    event.respondWith(handleStaticAssets(request))
  } else {
    // HTML pages - Network First to prevent stale content
    event.respondWith(handlePageRequest(request))
  }
})

// Static assets handler - Cache First
async function handleStaticAssets(request) {
  const cacheName = STATIC_CACHE

  // Try cache first
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    // Fallback to network
    const netResp = await fetch(request)

    if (netResp.ok) {
      const cache = await caches.open(cacheName)
      // Clone BEFORE any body usage to prevent "already used" error
      const clone = netResp.clone()
      cache.put(request, clone).catch((err) => console.log('Cache put failed:', err))
    }

    return netResp
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset', request.url)

    // Return placeholder for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Image unavailable</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      )
    }

    throw error
  }
}

// Navigation request handler - Network First (prevents stale HTML)
async function handleNavigationRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE)

  try {
    // Always fetch fresh HTML with no-cache to prevent stale content
    const netResp = await fetch(request, { cache: 'no-store' })
    // Clone BEFORE any body usage to prevent "already used" error
    const clone = netResp.clone()
    // Cache for offline fallback only
    cache.put(request, clone).catch((err) => console.log('Cache put failed:', err))
    return netResp
  } catch (err) {
    // REMOVED ignoreSearch: true to prevent URL collapsing
    const cached = await cache.match(request)
    if (cached) return cached
    throw err
  }
}

// Page request handler - Network First (prevents stale content)
async function handlePageRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE)

  try {
    // Always fetch fresh content with no-cache to prevent stale content
    const netResp = await fetch(request, { cache: 'no-store' })
    // Clone BEFORE any body usage to prevent "already used" error
    const clone = netResp.clone()
    // Cache for offline fallback only
    cache.put(request, clone).catch((err) => console.log('Cache put failed:', err))
    return netResp
  } catch (error) {
    console.log('Service Worker: Page request failed, trying cache')
    const cached = await cache.match(request)
    if (cached) return cached

    // Show offline page
    const offlineResponse = await caches.match('/offline')
    if (offlineResponse) {
      return offlineResponse
    }

    // Fallback offline response
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Mzima Homes</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            .offline-title { color: #374151; margin-bottom: 0.5rem; }
            .offline-message { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1 class="offline-title">You're Offline</h1>
          <p class="offline-message">Please check your internet connection and try again.</p>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)

  if (event.tag === 'background-sync-commands') {
    event.waitUntil(syncOfflineCommands())
  }
})

// Sync offline commands when back online
async function syncOfflineCommands() {
  try {
    // Get offline commands from IndexedDB
    const offlineCommands = await getOfflineCommands()

    for (const command of offlineCommands) {
      try {
        // Execute command
        const response = await fetch('/api/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        })

        if (response.ok) {
          // Remove from offline storage
          await removeOfflineCommand(command.id)
          console.log('Service Worker: Synced offline command', command.id)
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync command', command.id, error)
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error)
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')

  const options = {
    body: 'You have new updates in Mzima Homes',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/action-view.png',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png',
      },
    ],
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      options.body = payload.message || options.body
      options.data = { ...options.data, ...payload.data }
    } catch (error) {
      console.error('Service Worker: Error parsing push payload', error)
    }
  }

  event.waitUntil(self.registration.showNotification('Mzima Homes', options))
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action)

  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Helper functions for IndexedDB operations
async function getOfflineCommands() {
  // Simplified - in real implementation, use IndexedDB
  return []
}

async function removeOfflineCommand(commandId) {
  // Simplified - in real implementation, use IndexedDB
  console.log('Removing offline command:', commandId)
}

// Enhanced offline operations queue using IndexedDB
async function queueOfflineOperation(request) {
  try {
    const operation = {
      id: Date.now() + Math.random(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now(),
      retryCount: 0,
    }

    const db = await openOfflineDB()
    const transaction = db.transaction(['operations'], 'readwrite')
    const store = transaction.objectStore('operations')
    await store.add(operation)

    console.log('SW: Queued offline operation:', operation.id)

    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await self.registration.sync.register('offline-operations')
    }
  } catch (error) {
    console.error('SW: Failed to queue offline operation:', error)
  }
}

// Open IndexedDB for offline operations
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MzimaOfflineDB', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains('operations')) {
        const store = db.createObjectStore('operations', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('url', 'url', { unique: false })
      }
    }
  })
}

// Background sync event handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-operations') {
    console.log('SW: Processing offline operations...')
    event.waitUntil(processOfflineOperations())
  }
})

// Process queued offline operations
async function processOfflineOperations() {
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction(['operations'], 'readwrite')
    const store = transaction.objectStore('operations')
    const operations = await store.getAll()

    for (const operation of operations) {
      try {
        const request = new Request(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body,
        })

        const response = await fetch(request)

        if (response.ok) {
          await store.delete(operation.id)
          console.log('SW: Successfully synced offline operation:', operation.id)

          // Notify clients
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'OFFLINE_OPERATION_SYNCED',
                operation: operation,
              })
            })
          })
        } else {
          // Increment retry count
          operation.retryCount = (operation.retryCount || 0) + 1
          if (operation.retryCount < 3) {
            await store.put(operation)
          } else {
            await store.delete(operation.id)
            console.error('SW: Max retries reached for operation:', operation.id)
          }
        }
      } catch (error) {
        console.error('SW: Error processing offline operation:', operation.id, error)
      }
    }
  } catch (error) {
    console.error('SW: Failed to process offline operations:', error)
  }
}

// Enhanced message handler
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data)

  const { type, data } = event.data || {}

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME })
      break

    case 'CLEAR_CACHE':
      Promise.all([
        caches.delete(STATIC_CACHE),
        caches.delete(DYNAMIC_CACHE),
        caches.delete(API_CACHE),
      ])
        .then(() => {
          event.ports[0].postMessage({ success: true })
        })
        .catch((error) => {
          event.ports[0].postMessage({ success: false, error: error.message })
        })
      break

    case 'GET_OFFLINE_QUEUE_SIZE':
      getOfflineQueueSize()
        .then((size) => {
          event.ports[0].postMessage({ size })
        })
        .catch((error) => {
          event.ports[0].postMessage({ size: 0, error: error.message })
        })
      break
  }
})

// Get offline queue size
async function getOfflineQueueSize() {
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction(['operations'], 'readonly')
    const store = transaction.objectStore('operations')
    return await store.count()
  } catch (error) {
    console.error('SW: Failed to get offline queue size:', error)
    return 0
  }
}
