/**
 * Store Provider Component
 * Provides store initialization and global store management
 */

'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { usePropertyStore, useTenantStore, useUIStore } from '../stores'
import { StoreSync, StoreEvents, StorePersistence, StoreValidation } from '../stores'

// Store provider context
interface StoreProviderContext {
  isInitialized: boolean
  healthCheck: () => any
  exportData: () => any
  importData: (data: any) => void
  resetStores: () => void
}

const StoreContext = createContext<StoreProviderContext | null>(null)

// Store provider props
interface StoreProviderProps {
  children: ReactNode
  enableDevtools?: boolean
  enablePersistence?: boolean
  onError?: (error: Error) => void
}

/**
 * Store Provider Component
 * Initializes and manages all Zustand stores
 */
export function StoreProvider({ 
  children, 
  enableDevtools = true, 
  enablePersistence = true,
  onError 
}: StoreProviderProps) {
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Initialize stores and set up event listeners
  useEffect(() => {
    try {
      // Initialize store event listeners
      setupStoreEventListeners()

      // Validate stores on initialization
      const validation = StoreValidation.validateStores()
      if (!validation.isValid) {
        console.warn('Store validation failed:', validation.errors)
        if (onError) {
          onError(new Error(`Store validation failed: ${validation.errors.join(', ')}`))
        }
      }

      // Set up periodic health checks in development
      if (process.env.NODE_ENV === 'development') {
        const healthCheckInterval = setInterval(() => {
          const health = StoreValidation.healthCheck()
          if (!health.isValid) {
            console.warn('Store health check failed:', health.errors)
          }
        }, 30000) // Every 30 seconds

        return () => clearInterval(healthCheckInterval)
      }

      setIsInitialized(true)
    } catch (error) {
      console.error('Store initialization error:', error)
      if (onError) {
        onError(error as Error)
      }
    }
  }, [onError])

  // Set up store event listeners
  const setupStoreEventListeners = () => {
    // Property selection events
    StoreEvents.on('property:selected', (propertyId: string) => {
      StoreSync.syncPropertySelection(propertyId)
    })

    // Tenant selection events
    StoreEvents.on('tenant:selected', (tenantId: string) => {
      StoreSync.syncTenantSelection(tenantId)
    })

    // Global loading events
    StoreEvents.on('loading:start', (context: string) => {
      StoreSync.setGlobalLoading(true, context)
    })

    StoreEvents.on('loading:end', (context: string) => {
      StoreSync.setGlobalLoading(false, context)
    })

    // Error events
    StoreEvents.on('error', ({ title, message, context }: any) => {
      StoreSync.showNotification('error', title, message)
      console.error(`Store error [${context}]:`, message)
    })

    // Success events
    StoreEvents.on('success', ({ title, message }: any) => {
      StoreSync.showNotification('success', title, message)
    })

    // Data sync events
    StoreEvents.on('data:sync', ({ type, data }: any) => {
      switch (type) {
        case 'properties':
          usePropertyStore.getState().upsertProperties(data)
          break
        case 'tenants':
          useTenantStore.getState().upsertTenants(data)
          break
      }
    })
  }

  // Context value
  const contextValue: StoreProviderContext = {
    isInitialized,
    healthCheck: StoreValidation.healthCheck,
    exportData: StorePersistence.exportStores,
    importData: StorePersistence.importStores,
    resetStores: StorePersistence.resetAllStores
  }

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    )
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  )
}

/**
 * Hook to access store provider context
 */
export function useStoreProvider() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStoreProvider must be used within a StoreProvider')
  }
  return context
}

/**
 * Store Debug Component (Development only)
 */
export function StoreDebugPanel() {
  const storeProvider = useStoreProvider()
  const [debugInfo, setDebugInfo] = React.useState<any>(null)
  const [isOpen, setIsOpen] = React.useState(false)

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const refreshDebugInfo = React.useCallback(() => {
    const health = storeProvider.healthCheck()
    const propertyState = usePropertyStore.getState()
    const tenantState = useTenantStore.getState()
    const uiState = useUIStore.getState()

    setDebugInfo({
      health,
      stores: {
        property: {
          entityCount: propertyState.entities.allIds.length,
          selectedId: propertyState.selection.selectedId,
          loading: propertyState.loading,
          error: propertyState.error
        },
        tenant: {
          entityCount: tenantState.entities.allIds.length,
          selectedId: tenantState.selection.selectedId,
          loading: tenantState.loading,
          error: tenantState.error
        },
        ui: {
          currentTab: uiState.navigation.currentTab,
          activeModals: uiState.modals.activeModals.length,
          notifications: uiState.notifications.notifications.length,
          theme: uiState.theme.theme
        }
      }
    })
  }, [storeProvider])

  React.useEffect(() => {
    if (isOpen) {
      refreshDebugInfo()
    }
  }, [isOpen, refreshDebugInfo])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-mono hover:bg-gray-700"
      >
        🐛 Store Debug
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Store Debug Info</h3>
            <div className="flex gap-2">
              <button
                onClick={refreshDebugInfo}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
              >
                Refresh
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                Close
              </button>
            </div>
          </div>

          {debugInfo && (
            <div className="space-y-3 text-xs font-mono">
              {/* Health Status */}
              <div>
                <div className="font-semibold mb-1">Health Status</div>
                <div className={`px-2 py-1 rounded ${debugInfo.health.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {debugInfo.health.isValid ? '✅ Healthy' : '❌ Issues Found'}
                </div>
                {debugInfo.health.errors.length > 0 && (
                  <div className="mt-1 text-red-600">
                    {debugInfo.health.errors.map((error: string, i: number) => (
                      <div key={i}>• {error}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Store Stats */}
              <div>
                <div className="font-semibold mb-1">Store Statistics</div>
                <div className="bg-gray-50 p-2 rounded">
                  <div>Properties: {debugInfo.stores.property.entityCount}</div>
                  <div>Tenants: {debugInfo.stores.tenant.entityCount}</div>
                  <div>Notifications: {debugInfo.stores.ui.notifications}</div>
                  <div>Active Modals: {debugInfo.stores.ui.activeModals}</div>
                </div>
              </div>

              {/* Current State */}
              <div>
                <div className="font-semibold mb-1">Current State</div>
                <div className="bg-gray-50 p-2 rounded">
                  <div>Tab: {debugInfo.stores.ui.currentTab}</div>
                  <div>Theme: {debugInfo.stores.ui.theme}</div>
                  <div>Selected Property: {debugInfo.stores.property.selectedId || 'None'}</div>
                  <div>Selected Tenant: {debugInfo.stores.tenant.selectedId || 'None'}</div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="font-semibold mb-1">Actions</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const data = storeProvider.exportData()
                      console.log('Store Export:', data)
                      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
                      alert('Store data copied to clipboard')
                    }}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Reset all stores? This cannot be undone.')) {
                        storeProvider.resetStores()
                        refreshDebugInfo()
                      }
                    }}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
