'use client'

import React from 'react'
import { useOfflineNotifications, useOffline } from '../../hooks/useOffline'

interface OfflineNotificationProps {
  className?: string
}

export default function OfflineNotification({ className = '' }: OfflineNotificationProps) {
  const {
    showOfflineNotification,
    showSyncNotification,
    dismissOfflineNotification,
    dismissSyncNotification,
    pendingUpdates,
  } = useOfflineNotifications()
  
  const { retry, forcSync, connectionType } = useOffline()

  if (!showOfflineNotification && !showSyncNotification) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 ${className}`}>
      {/* Offline Notification */}
      {showOfflineNotification && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-orange-800">
                You're offline
              </h3>
              <div className="mt-1 text-sm text-orange-700">
                <p>
                  Some features may not be available. Your changes will be saved and synced when you're back online.
                </p>
                {connectionType && (
                  <p className="mt-1 text-xs">
                    Connection: {connectionType}
                  </p>
                )}
                {pendingUpdates > 0 && (
                  <p className="mt-1 text-xs font-medium">
                    {pendingUpdates} change{pendingUpdates !== 1 ? 's' : ''} pending sync
                  </p>
                )}
              </div>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={retry}
                  className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-xs font-medium hover:bg-orange-200 transition-colors"
                >
                  Retry Connection
                </button>
                <button
                  onClick={dismissOfflineNotification}
                  className="text-orange-600 px-3 py-1 rounded text-xs font-medium hover:text-orange-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Notification */}
      {showSyncNotification && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Back online
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>
                  Syncing {pendingUpdates} pending change{pendingUpdates !== 1 ? 's' : ''}...
                </p>
              </div>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={forcSync}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                >
                  Force Sync
                </button>
                <button
                  onClick={dismissSyncNotification}
                  className="text-blue-600 px-3 py-1 rounded text-xs font-medium hover:text-blue-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Connection Status Indicator Component
 */
interface ConnectionStatusProps {
  className?: string
  showDetails?: boolean
}

export function ConnectionStatus({ className = '', showDetails = false }: ConnectionStatusProps) {
  const { isOnline, connectionType, pendingUpdates } = useOffline()

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Indicator */}
      <div className="flex items-center space-x-1">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-400' : 'bg-red-400'
          }`}
        />
        <span className={`text-xs font-medium ${
          isOnline ? 'text-green-700' : 'text-red-700'
        }`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Connection Details */}
      {showDetails && (
        <>
          {connectionType && (
            <span className="text-xs text-gray-500">
              {connectionType.toUpperCase()}
            </span>
          )}
          {pendingUpdates > 0 && (
            <span className="text-xs text-orange-600 font-medium">
              {pendingUpdates} pending
            </span>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Offline Banner Component (for full-width notifications)
 */
interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const { isOnline, pendingUpdates } = useOffline()

  if (isOnline) {
    return null
  }

  return (
    <div className={`bg-orange-100 border-b border-orange-200 px-4 py-2 ${className}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <svg className="h-4 w-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-orange-800">
            You're currently offline
          </span>
          {pendingUpdates > 0 && (
            <span className="text-xs text-orange-700">
              • {pendingUpdates} change{pendingUpdates !== 1 ? 's' : ''} will sync when reconnected
            </span>
          )}
        </div>
        <ConnectionStatus showDetails />
      </div>
    </div>
  )
}

/**
 * Service Worker Update Notification
 */
interface UpdateNotificationProps {
  onUpdate?: () => void
  className?: string
}

export function UpdateNotification({ onUpdate, className = '' }: UpdateNotificationProps) {
  const [showUpdate, setShowUpdate] = React.useState(false)

  React.useEffect(() => {
    // Listen for service worker updates
    const handleUpdate = () => {
      setShowUpdate(true)
    }

    // This would be triggered by the service worker manager
    window.addEventListener('sw-update-available', handleUpdate)
    
    return () => {
      window.removeEventListener('sw-update-available', handleUpdate)
    }
  }, [])

  const handleUpdateClick = () => {
    onUpdate?.()
    setShowUpdate(false)
    window.location.reload()
  }

  const handleDismiss = () => {
    setShowUpdate(false)
  }

  if (!showUpdate) {
    return null
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              App Update Available
            </h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>A new version of the app is available with improvements and bug fixes.</p>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleUpdateClick}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-600 px-3 py-1 rounded text-xs font-medium hover:text-blue-800 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
