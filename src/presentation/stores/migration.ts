/**
 * Store Migration Utilities
 * Handles migration from old context-based state to new Zustand stores
 */

import { usePropertyStore, useTenantStore, useUIStore } from './index'
import { Property, Tenant } from './index'

// Legacy context types (from the old DashboardContext)
interface LegacyProperty {
  id: string
  name: string
  physical_address?: string
  property_type: string
  status?: string
  lifecycle_status?: string
  landlord_id: string
  total_area_acres?: number
  description?: string
  amenities?: string[]
  lat?: number
  lng?: number
  created_at: string
  updated_at: string
}

interface LegacyTenant {
  id: string
  full_name: string
  national_id: string
  phone: string
  email?: string
  status: string
  current_unit_id?: string
  lease_start_date?: string
  lease_end_date?: string
  monthly_rent?: number
  security_deposit?: number
  created_at: string
  updated_at: string
}

interface LegacyDashboardState {
  selectedProperty: LegacyProperty | null
  selectedTenant: LegacyTenant | null
  selectedUnit: any | null
  selectedPayment: any | null
  searchTerm: string
  activeFilters: {
    searchTerm: string
    dateRange: { start: Date | null; end: Date | null }
    status: string[]
    propertyTypes: string[]
    paymentMethods: string[]
  }
  navigationHistory: any[]
  currentTab: string
  recentActions: any[]
  contextualActions: any[]
  propertiesCache: LegacyProperty[]
  tenantsCache: LegacyTenant[]
  unitsCache: any[]
  paymentsCache: any[]
  sidebarCollapsed: boolean
  quickActionsVisible: boolean
  lastUpdated: Date
  cacheExpiry: Date
}

/**
 * Migration utilities for converting legacy state to new store format
 */
export class StoreMigration {
  /**
   * Convert legacy property to new property format
   */
  static convertLegacyProperty(legacy: LegacyProperty): Property {
    return {
      id: legacy.id,
      name: legacy.name,
      address: legacy.physical_address || '',
      propertyType: this.mapPropertyType(legacy.property_type),
      status: this.mapPropertyStatus(legacy.status),
      lifecycleStatus: this.mapLifecycleStatus(legacy.lifecycle_status),
      ownerId: legacy.landlord_id,
      totalAreaAcres: legacy.total_area_acres,
      description: legacy.description,
      amenities: legacy.amenities || [],
      createdAt: legacy.created_at,
      updatedAt: legacy.updated_at
    }
  }

  /**
   * Convert legacy tenant to new tenant format
   */
  static convertLegacyTenant(legacy: LegacyTenant): Tenant {
    return {
      id: legacy.id,
      fullName: legacy.full_name,
      nationalId: legacy.national_id,
      contactInfo: {
        phone: legacy.phone,
        email: legacy.email
      },
      status: this.mapTenantStatus(legacy.status),
      currentUnitId: legacy.current_unit_id,
      leaseStartDate: legacy.lease_start_date,
      leaseEndDate: legacy.lease_end_date,
      monthlyRent: legacy.monthly_rent ? {
        amount: legacy.monthly_rent,
        currency: 'KES'
      } : undefined,
      securityDeposit: legacy.security_deposit ? {
        amount: legacy.security_deposit,
        currency: 'KES'
      } : undefined,
      createdAt: legacy.created_at,
      updatedAt: legacy.updated_at
    }
  }

  /**
   * Migrate legacy dashboard state to new stores
   */
  static migrateLegacyState(legacyState: LegacyDashboardState) {
    try {
      // Migrate properties
      if (legacyState.propertiesCache && legacyState.propertiesCache.length > 0) {
        const properties = legacyState.propertiesCache.map(this.convertLegacyProperty)
        usePropertyStore.getState().setProperties(properties)
        
        // Migrate selected property
        if (legacyState.selectedProperty) {
          const selectedProperty = this.convertLegacyProperty(legacyState.selectedProperty)
          usePropertyStore.getState().selectProperty(selectedProperty.id)
        }
      }

      // Migrate tenants
      if (legacyState.tenantsCache && legacyState.tenantsCache.length > 0) {
        const tenants = legacyState.tenantsCache.map(this.convertLegacyTenant)
        useTenantStore.getState().setTenants(tenants)
        
        // Migrate selected tenant
        if (legacyState.selectedTenant) {
          const selectedTenant = this.convertLegacyTenant(legacyState.selectedTenant)
          useTenantStore.getState().selectTenant(selectedTenant.id)
        }
      }

      // Migrate UI state
      const uiStore = useUIStore.getState()
      
      // Navigation state
      uiStore.setCurrentTab(legacyState.currentTab || 'dashboard')
      
      // Layout state
      uiStore.setSidebarCollapsed(legacyState.sidebarCollapsed || false)
      
      // Quick actions
      if (legacyState.quickActionsVisible !== undefined) {
        if (!legacyState.quickActionsVisible) {
          uiStore.toggleQuickActions()
        }
      }

      // Filters (migrate to property store)
      if (legacyState.activeFilters) {
        const propertyStore = usePropertyStore.getState()
        
        propertyStore.updateFilters({
          searchTerm: legacyState.activeFilters.searchTerm || legacyState.searchTerm || '',
          dateRange: legacyState.activeFilters.dateRange || { start: null, end: null },
          statuses: legacyState.activeFilters.status || [],
          propertyTypes: this.mapPropertyTypes(legacyState.activeFilters.propertyTypes || [])
        })
      }

      console.log('Legacy state migration completed successfully')
      return true

    } catch (error) {
      console.error('Legacy state migration failed:', error)
      return false
    }
  }

  /**
   * Check if legacy state exists in localStorage
   */
  static hasLegacyState(): boolean {
    try {
      const legacyData = localStorage.getItem('dashboardContext')
      return legacyData !== null
    } catch {
      return false
    }
  }

  /**
   * Load and migrate legacy state from localStorage
   */
  static migrateLegacyStateFromStorage(): boolean {
    try {
      const legacyData = localStorage.getItem('dashboardContext')
      if (!legacyData) return false

      const legacyState = JSON.parse(legacyData) as LegacyDashboardState
      const success = this.migrateLegacyState(legacyState)

      if (success) {
        // Remove legacy data after successful migration
        localStorage.removeItem('dashboardContext')
        console.log('Legacy localStorage data migrated and removed')
      }

      return success
    } catch (error) {
      console.error('Failed to migrate legacy state from storage:', error)
      return false
    }
  }

  /**
   * Map legacy property type to new format
   */
  private static mapPropertyType(legacyType: string): Property['propertyType'] {
    const typeMap: Record<string, Property['propertyType']> = {
      'apartment': 'APARTMENT',
      'house': 'HOUSE',
      'commercial': 'COMMERCIAL',
      'land': 'LAND',
      'townhouse': 'TOWNHOUSE'
    }
    
    return typeMap[legacyType?.toLowerCase()] || 'HOUSE'
  }

  /**
   * Map legacy property status to new format
   */
  private static mapPropertyStatus(legacyStatus?: string): Property['status'] {
    const statusMap: Record<string, Property['status']> = {
      'available': 'AVAILABLE',
      'occupied': 'OCCUPIED',
      'maintenance': 'MAINTENANCE',
      'inactive': 'INACTIVE'
    }
    
    return statusMap[legacyStatus?.toLowerCase()] || 'INACTIVE'
  }

  /**
   * Map legacy lifecycle status to new format
   */
  private static mapLifecycleStatus(legacyStatus?: string): Property['lifecycleStatus'] {
    const statusMap: Record<string, Property['lifecycleStatus']> = {
      'acquisition': 'ACQUISITION',
      'subdivision': 'SUBDIVISION',
      'handover': 'HANDOVER',
      'rental_ready': 'RENTAL_READY',
      'disposed': 'DISPOSED'
    }
    
    return statusMap[legacyStatus?.toLowerCase()] || 'ACQUISITION'
  }

  /**
   * Map legacy tenant status to new format
   */
  private static mapTenantStatus(legacyStatus: string): Tenant['status'] {
    const statusMap: Record<string, Tenant['status']> = {
      'active': 'ACTIVE',
      'inactive': 'INACTIVE',
      'suspended': 'SUSPENDED',
      'evicted': 'EVICTED'
    }
    
    return statusMap[legacyStatus?.toLowerCase()] || 'INACTIVE'
  }

  /**
   * Map legacy property types array to new format
   */
  private static mapPropertyTypes(legacyTypes: string[]): Property['propertyType'][] {
    return legacyTypes.map(type => this.mapPropertyType(type))
  }
}

/**
 * Auto-migration hook
 * Automatically migrates legacy state when the app loads
 */
export function useAutoMigration() {
  React.useEffect(() => {
    // Check for legacy state and migrate if found
    if (StoreMigration.hasLegacyState()) {
      console.log('Legacy state detected, starting migration...')
      
      const success = StoreMigration.migrateLegacyStateFromStorage()
      
      if (success) {
        // Show success notification
        useUIStore.getState().addNotification({
          type: 'success',
          title: 'Data Migrated',
          message: 'Your previous session data has been successfully migrated to the new system.',
          duration: 5000
        })
      } else {
        // Show error notification
        useUIStore.getState().addNotification({
          type: 'warning',
          title: 'Migration Warning',
          message: 'Some data from your previous session could not be migrated. Please check your settings.',
          duration: 8000
        })
      }
    }
  }, [])
}

// React import for the hook
import React from 'react'
