/**
 * Cache Management Utilities
 * Provides functions to clear caches and resolve caching conflicts
 */

/**
 * Clear all browser caches and service worker registrations
 */
export async function clearAllCaches(): Promise<void> {
  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
      console.log('✅ All caches cleared')
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        registrations.map(registration => registration.unregister())
      )
      console.log('✅ All service workers unregistered')
    }

    // Clear localStorage and sessionStorage
    localStorage.clear()
    sessionStorage.clear()
    console.log('✅ Local storage cleared')

    // Clear IndexedDB (for offline operations)
    if ('indexedDB' in window) {
      try {
        const deleteDB = indexedDB.deleteDatabase('MzimaOfflineDB')
        deleteDB.onsuccess = () => console.log('✅ IndexedDB cleared')
        deleteDB.onerror = () => console.warn('⚠️ Failed to clear IndexedDB')
      } catch (error) {
        console.warn('⚠️ IndexedDB clear failed:', error)
      }
    }

  } catch (error) {
    console.error('❌ Cache clearing failed:', error)
    throw error
  }
}

/**
 * Force reload without cache
 */
export function forceReload(): void {
  // Clear current page cache
  if ('caches' in window) {
    caches.delete('mzima-dynamic-v11').catch(() => {})
  }
  
  // Force reload without cache
  window.location.reload()
}

/**
 * Check for service worker conflicts
 */
export async function checkServiceWorkerConflicts(): Promise<{
  hasConflicts: boolean
  registrations: Array<{
    scope: string
    scriptURL: string
    state: string
  }>
}> {
  if (!('serviceWorker' in navigator)) {
    return { hasConflicts: false, registrations: [] }
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    const regInfo = registrations.map(reg => ({
      scope: reg.scope,
      scriptURL: reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || 'unknown',
      state: reg.active?.state || reg.installing?.state || reg.waiting?.state || 'unknown'
    }))

    // Check for multiple registrations (conflict indicator)
    const hasConflicts = registrations.length > 1

    return {
      hasConflicts,
      registrations: regInfo
    }
  } catch (error) {
    return { hasConflicts: false, registrations: [] }
  }
}

/**
 * Development mode cache diagnostics
 */
export async function developmentCacheDiagnostics(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  try {
    // Check service worker status
    const swStatus = await checkServiceWorkerConflicts()

    // Check cache contents
    if ('caches' in window) {
      const cacheNames = await caches.keys()

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const keys = await cache.keys()
      }
    }
    
  } catch (error) {
    console.error('Diagnostics failed:', error)
  }
  
  console.groupEnd()
}

/**
 * Add cache clearing to window for development debugging
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Use setTimeout to ensure window is fully loaded
  setTimeout(() => {
    try {
      (window as any).clearAllCaches = clearAllCaches
      (window as any).forceReload = forceReload
      (window as any).checkSWConflicts = checkServiceWorkerConflicts
      (window as any).cacheDiagnostics = developmentCacheDiagnostics

      console.log('🛠️ Development cache utilities available:')
      console.log('  - clearAllCaches()')
      console.log('  - forceReload()')
      console.log('  - checkSWConflicts()')
      console.log('  - cacheDiagnostics()')
    } catch (error) {
      console.warn('Failed to attach cache utilities to window:', error)
    }
  }, 100)
}
