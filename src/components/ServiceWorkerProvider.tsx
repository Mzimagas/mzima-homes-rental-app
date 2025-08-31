'use client'

import React, { useEffect, useState } from 'react'
import { registerServiceWorker } from '../lib/serviceWorker'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export default function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)

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

  // Preload critical components when service worker is registered
  useEffect(() => {
    if (isRegistered) {
      // Preload critical property management components
      import('../components/properties/components/LazyPropertyComponents')
        .then((module) => {
          module.preloadCriticalComponents()
        })
        .catch(() => {
          // Ignore preload errors
        })
    }
  }, [isRegistered])

  const handleUpdate = () => {
    setShowUpdateNotification(false)

    // Skip waiting and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
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

      {/* Update Notification */}
      {showUpdateNotification && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Update Available</h4>
              <p className="text-sm">A new version of the app is available.</p>
            </div>
            <div className="ml-4 flex space-x-2">
              <button
                onClick={handleUpdate}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
              >
                Update
              </button>
              <button
                onClick={() => setShowUpdateNotification(false)}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
