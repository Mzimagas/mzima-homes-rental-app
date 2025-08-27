/**
 * Service Worker for Mzima Homes PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'mzima-homes-v1.0.0'
const STATIC_CACHE = 'mzima-static-v1'
const DYNAMIC_CACHE = 'mzima-dynamic-v1'
const API_CACHE = 'mzima-api-v1'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/properties',
  '/api/tenants',
  '/api/dashboard/stats'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
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
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with cache fallback
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    // Static assets - Cache First
    event.respondWith(handleStaticAssets(request))
  } else {
    // HTML pages - Stale While Revalidate
    event.respondWith(handlePageRequest(request))
  }
})

// API request handler - Network First
async function handleApiRequest(request) {
  const cacheName = API_CACHE
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API request')
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This data is not available offline'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

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
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
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

// Page request handler - Stale While Revalidate
async function handlePageRequest(request) {
  const cacheName = DYNAMIC_CACHE
  
  try {
    // Try cache first
    const cachedResponse = await caches.match(request)
    
    // Fetch from network in background
    const networkPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(cacheName)
        cache.then(c => c.put(request, networkResponse.clone()))
      }
      return networkResponse
    })
    
    // Return cached version immediately if available
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Otherwise wait for network
    return await networkPromise
  } catch (error) {
    console.log('Service Worker: Page request failed, showing offline page')
    
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
        headers: { 'Content-Type': 'text/html' }
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
          body: JSON.stringify(command)
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
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
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
  
  event.waitUntil(
    self.registration.showNotification('Mzima Homes', options)
  )
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

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})
