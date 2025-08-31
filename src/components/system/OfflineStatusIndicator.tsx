import React, { useState } from 'react'
import { useOfflineSupport } from '../../hooks/useOfflineSupport'
import { Button } from '../ui'

interface OfflineStatusIndicatorProps {
  className?: string
  showDetails?: boolean
}

export default function OfflineStatusIndicator({ 
  className = '', 
  showDetails = false 
}: OfflineStatusIndicatorProps) {
  const {
    isOnline,
    isServiceWorkerReady,
    queuedOperations,
    lastSyncTime,
    retryFailedOperations,
    clearOfflineQueue,
    updateQueueSize
  } = useOfflineSupport()

  const [showDropdown, setShowDropdown] = useState(false)

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500'
    if (queuedOperations > 0) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (queuedOperations > 0) return `${queuedOperations} pending`
    return 'Online'
  }

  const getStatusIcon = () => {
    if (!isOnline) return '📡'
    if (queuedOperations > 0) return '⏳'
    return '✅'
  }

  const handleRetryOperations = async () => {
    await retryFailedOperations()
    await updateQueueSize()
  }

  const handleClearQueue = async () => {
    if (confirm('Are you sure you want to clear all pending operations? This cannot be undone.')) {
      await clearOfflineQueue()
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Status Indicator */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-white text-sm font-medium transition-colors ${
          isOnline ? 'hover:opacity-80' : ''
        }`}
        style={{ backgroundColor: getStatusColor().replace('bg-', '') }}
      >
        <span>{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
        {showDetails && (
          <svg
            className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown Details */}
      {showDropdown && showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Connection Status</h3>
            
            {/* Connection Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Network:</span>
                <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Service Worker:</span>
                <span className={`font-medium ${isServiceWorkerReady ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isServiceWorkerReady ? 'Ready' : 'Loading...'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pending Operations:</span>
                <span className={`font-medium ${queuedOperations > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {queuedOperations}
                </span>
              </div>
              
              {lastSyncTime && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="text-gray-900 font-medium">
                    {lastSyncTime.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* Status Messages */}
            <div className="mb-4">
              {!isOnline && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-red-800">You're offline</p>
                      <p className="text-xs text-red-600">
                        Changes will be saved when connection is restored
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {isOnline && queuedOperations > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <div className="flex items-center">
                    <span className="text-yellow-600 mr-2">⏳</span>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Syncing changes</p>
                      <p className="text-xs text-yellow-600">
                        {queuedOperations} operation{queuedOperations !== 1 ? 's' : ''} pending
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {isOnline && queuedOperations === 0 && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✅</span>
                    <div>
                      <p className="text-sm font-medium text-green-800">All synced</p>
                      <p className="text-xs text-green-600">
                        All changes have been saved
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {isOnline && queuedOperations > 0 && (
              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRetryOperations}
                  className="w-full"
                >
                  Retry Failed Operations
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearQueue}
                  className="w-full text-red-600 hover:text-red-700"
                >
                  Clear Pending Operations
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simple Status Dot (when showDetails is false) */}
      {!showDetails && (
        <div className="absolute -top-1 -right-1">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}>
            {queuedOperations > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
