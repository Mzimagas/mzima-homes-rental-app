/**
 * Emergency Cache Clearing Script
 * Run this in browser console to clear all caches and fix endless loops
 */

async function emergencyClearAll() {
  console.log('🚨 EMERGENCY CACHE CLEAR STARTING...')
  
  try {
    // 1. Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      console.log('Found caches:', cacheNames)
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName)
        console.log('✅ Deleted cache:', cacheName)
      }
    }

    // 2. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      console.log('Found service workers:', registrations.length)
      
      for (const registration of registrations) {
        await registration.unregister()
        console.log('✅ Unregistered SW:', registration.scope)
      }
    }

    // 3. Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    console.log('✅ Cleared localStorage and sessionStorage')

    // 4. Clear IndexedDB
    if ('indexedDB' in window) {
      try {
        const deleteDB = indexedDB.deleteDatabase('MzimaOfflineDB')
        deleteDB.onsuccess = () => console.log('✅ Cleared IndexedDB')
      } catch (e) {
        console.log('⚠️ IndexedDB clear failed:', e)
      }
    }

    console.log('🎉 EMERGENCY CACHE CLEAR COMPLETE!')
    console.log('🔄 Reloading page in 2 seconds...')
    
    setTimeout(() => {
      window.location.reload(true)
    }, 2000)
    
  } catch (error) {
    console.error('❌ Emergency clear failed:', error)
  }
}

// Auto-run if this script is loaded
if (typeof window !== 'undefined') {
  window.emergencyClearAll = emergencyClearAll
  console.log('🛠️ Emergency cache clear function available: emergencyClearAll()')
}
