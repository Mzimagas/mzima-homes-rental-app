/**
 * Store Integration Layer
 * Central exports and store coordination
 */

// Store exports
export { usePropertyStore } from './propertyStore'
export { useTenantStore } from './tenantStore'
export { useUIStore } from './uiStore'

// Type exports
export type { Property, PropertyFilterState } from './propertyStore'
export type { Tenant, TenantFilterState } from './tenantStore'
export type { 
  UIStoreState, 
  NavigationState, 
  ModalState, 
  LayoutState, 
  ThemeState,
  NotificationState,
  QuickActionsState,
  CommandPaletteState,
  PerformanceState
} from './uiStore'

// Utility exports
export * from './types'
export * from './utils'

// Store coordination hooks
import { usePropertyStore } from './propertyStore'
import { useTenantStore } from './tenantStore'
import { useUIStore } from './uiStore'

/**
 * Combined store hook for cross-store operations
 */
export function useStores() {
  const propertyStore = usePropertyStore()
  const tenantStore = useTenantStore()
  const uiStore = useUIStore()

  return {
    property: propertyStore,
    tenant: tenantStore,
    ui: uiStore
  }
}

/**
 * Store synchronization utilities
 */
export class StoreSync {
  /**
   * Sync property selection across stores
   */
  static syncPropertySelection(propertyId: string | null) {
    const { selectProperty } = usePropertyStore.getState()
    const { setCurrentTab, addBreadcrumb } = useUIStore.getState()
    
    selectProperty(propertyId)
    
    if (propertyId) {
      const property = usePropertyStore.getState().getProperty(propertyId)
      if (property) {
        addBreadcrumb(property.name, `/properties/${propertyId}`)
      }
    }
  }

  /**
   * Sync tenant selection across stores
   */
  static syncTenantSelection(tenantId: string | null) {
    const { selectTenant } = useTenantStore.getState()
    const { addBreadcrumb } = useUIStore.getState()
    
    selectTenant(tenantId)
    
    if (tenantId) {
      const tenant = useTenantStore.getState().getTenant(tenantId)
      if (tenant) {
        addBreadcrumb(tenant.fullName, `/tenants/${tenantId}`)
      }
    }
  }

  /**
   * Clear all selections
   */
  static clearAllSelections() {
    usePropertyStore.getState().clearSelection()
    useTenantStore.getState().clearSelection()
    useUIStore.getState().clearBreadcrumbs()
  }

  /**
   * Sync loading states
   */
  static setGlobalLoading(loading: boolean, context?: string) {
    const { setGlobalLoading, setLoadingState } = useUIStore.getState()
    
    setGlobalLoading(loading)
    
    if (context) {
      setLoadingState(context, loading)
    }
  }

  /**
   * Show notification across the app
   */
  static showNotification(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    options?: {
      duration?: number
      persistent?: boolean
      actions?: Array<{ label: string; action: () => void }>
    }
  ) {
    const { addNotification } = useUIStore.getState()
    
    return addNotification({
      type,
      title,
      message,
      duration: options?.duration,
      persistent: options?.persistent,
      actions: options?.actions
    })
  }
}

/**
 * Store event system for cross-store communication
 */
export class StoreEvents {
  private static listeners: Map<string, Array<(data: any) => void>> = new Map()

  static emit(event: string, data?: any) {
    const listeners = this.listeners.get(event) || []
    listeners.forEach(listener => listener(data))
  }

  static on(event: string, listener: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event) || []
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  static off(event: string, listener?: (data: any) => void) {
    if (!listener) {
      this.listeners.delete(event)
    } else {
      const listeners = this.listeners.get(event) || []
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  static clear() {
    this.listeners.clear()
  }
}

/**
 * Store persistence utilities
 */
export class StorePersistence {
  /**
   * Export all store data
   */
  static exportStores() {
    return {
      property: usePropertyStore.getState(),
      tenant: useTenantStore.getState(),
      ui: useUIStore.getState(),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Import store data (for backup/restore)
   */
  static importStores(data: any) {
    try {
      if (data.property) {
        usePropertyStore.setState(data.property)
      }
      if (data.tenant) {
        useTenantStore.setState(data.tenant)
      }
      if (data.ui) {
        useUIStore.setState(data.ui)
      }
      
      StoreSync.showNotification('success', 'Data Imported', 'Store data has been successfully imported')
    } catch (error) {
      StoreSync.showNotification('error', 'Import Failed', 'Failed to import store data')
      console.error('Store import error:', error)
    }
  }

  /**
   * Reset all stores to initial state
   */
  static resetAllStores() {
    usePropertyStore.getState().clearProperties()
    useTenantStore.getState().clearTenants()
    useUIStore.getState().closeAllModals()
    useUIStore.getState().clearNotifications()
    
    StoreSync.showNotification('info', 'Stores Reset', 'All store data has been reset')
  }
}

/**
 * Store validation utilities
 */
export class StoreValidation {
  /**
   * Validate store integrity
   */
  static validateStores() {
    const errors: string[] = []

    try {
      // Validate property store
      const propertyState = usePropertyStore.getState()
      if (!propertyState.entities || typeof propertyState.entities !== 'object') {
        errors.push('Property store entities are invalid')
      }

      // Validate tenant store
      const tenantState = useTenantStore.getState()
      if (!tenantState.entities || typeof tenantState.entities !== 'object') {
        errors.push('Tenant store entities are invalid')
      }

      // Validate UI store
      const uiState = useUIStore.getState()
      if (!uiState.navigation || typeof uiState.navigation !== 'object') {
        errors.push('UI store navigation state is invalid')
      }

    } catch (error) {
      errors.push(`Store validation error: ${error}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Health check for all stores
   */
  static healthCheck() {
    const validation = this.validateStores()
    const propertyCount = usePropertyStore.getState().entities.allIds.length
    const tenantCount = useTenantStore.getState().entities.allIds.length
    const notificationCount = useUIStore.getState().notifications.notifications.length

    return {
      ...validation,
      stats: {
        properties: propertyCount,
        tenants: tenantCount,
        notifications: notificationCount
      },
      timestamp: new Date().toISOString()
    }
  }
}
