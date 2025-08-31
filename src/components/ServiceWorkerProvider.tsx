'use client'

import React, { useEffect, useState } from 'react'
import { registerServiceWorker } from '../lib/serviceWorker'
import OfflineNotification, { UpdateNotification, OfflineBanner } from './ui/OfflineNotification'
import { useAdaptiveLoading } from '../hooks/useOffline'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export default function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)
  const { shouldPreloadComponents } = useAdaptiveLoading()

  useEffect(() => {
    // Register service worker on mount
    const initServiceWorker = async () => {
      try {
        const registration = await registerServiceWorker()
        
        if (registration) {
          setIsRegistered(true)
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('Service Worker registered successfully')
          }

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setShowUpdateNotification(true)
                  
                  // Dispatch custom event for other components
                  window.dispatchEvent(new CustomEvent('sw-update-available'))
                }
              })
            }
          })
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    // Only register in browser environment
    if (typeof window !== 'undefined') {
      initServiceWorker()
    }
  }, [])

  // Preload critical components when connection is good
  useEffect(() => {
    if (shouldPreloadComponents && isRegistered) {
      // Preload critical property management components
      import('../components/properties/components/LazyPropertyComponents').then(module => {
        module.preloadCriticalComponents()
      })
    }
  }, [shouldPreloadComponents, isRegistered])

  const handleUpdate = () => {
    setShowUpdateNotification(false)
    
    // Skip waiting and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          window.location.reload()
        }
      })
    }
  }

  return (
    <>
      {children}
      
      {/* Offline/Online Notifications */}
      <OfflineNotification />
      
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Update Notification */}
      <UpdateNotification 
        onUpdate={handleUpdate}
      />
    </>
  )
}
