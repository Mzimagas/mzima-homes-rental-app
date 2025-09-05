/**
 * Enhanced Dashboard Context Provider
 * Integrates with the new dashboard store while maintaining backward compatibility
 * Provides cross-component state sharing following properties module patterns
 */

'use client'

import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react'
import { useDashboardStore, useDashboardActions } from '../presentation/stores/dashboardStore'
import { DashboardService } from '../services/dashboard.service'
import { Property, Unit, Tenant, Payment } from '../lib/types/database'

// Enhanced context state interface
export interface DashboardContextState {
  // Current selections (backward compatibility)
  selectedProperty: Property | null
  selectedTenant: Tenant | null
  selectedUnit: Unit | null
  selectedPayment: Payment | null

  // Navigation state
  searchTerm: string
  currentTab: string
  navigationHistory: NavigationItem[]

  // Quick actions and context
  recentActions: Action[]
  contextualActions: Action[]

  // UI state
  sidebarCollapsed: boolean
  quickActionsVisible: boolean
  isCustomizing: boolean

  // Data state
  loading: boolean
  error: string | null
  lastUpdated: Date | null

  // Cache state
  cacheExpiry: Date
  isCacheValid: boolean
}

// Action and navigation types
export interface NavigationItem {
  path: string
  timestamp: Date
  context: any
}

export interface Action {
  id: string
  type: string
  label: string
  icon: string
  timestamp: Date
  data: any
}

// Context actions interface
export interface DashboardContextActions {
  // Selection actions
  selectProperty: (property: Property | null) => void
  selectTenant: (tenant: Tenant | null) => void
  selectUnit: (unit: Unit | null) => void
  selectPayment: (payment: Payment | null) => void

  // Search and navigation
  setSearchTerm: (term: string) => void
  setCurrentTab: (tab: string) => void
  addNavigationItem: (item: NavigationItem) => void

  // Actions management
  addRecentAction: (action: Action) => void
  getContextualActions: () => Action[]

  // UI actions
  toggleSidebar: () => void
  toggleQuickActions: () => void
  startCustomizing: () => void
  stopCustomizing: () => void

  // Data operations
  refreshData: () => Promise<void>
  clearContext: () => void

  // Cache utilities
  isCacheExpired: () => boolean
  invalidateCache: () => void
}

// Combined context type
export interface DashboardContextValue {
  state: DashboardContextState
  actions: DashboardContextActions
}

// Create context
const DashboardContext = createContext<DashboardContextValue | null>(null)

// Provider component
export function DashboardContextProvider({ children }: { children: ReactNode }) {
  // Get dashboard store state and actions
  const dashboardStore = useDashboardStore()
  const dashboardActions = useDashboardActions()

  // Local state for backward compatibility
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  const [selectedTenant, setSelectedTenant] = React.useState<Tenant | null>(null)
  const [selectedUnit, setSelectedUnit] = React.useState<Unit | null>(null)
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null)
  const [searchTerm, setSearchTermState] = React.useState('')
  const [currentTab, setCurrentTabState] = React.useState('overview')
  const [navigationHistory, setNavigationHistory] = React.useState<NavigationItem[]>([])
  const [recentActions, setRecentActions] = React.useState<Action[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [quickActionsVisible, setQuickActionsVisible] = React.useState(true)

  // Initialize dashboard data on mount
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await dashboardActions.refreshAllData()
      } catch (error) {
        console.error('Failed to initialize dashboard:', error)
      }
    }

    initializeDashboard()
  }, [dashboardActions])

  // Restore context from localStorage on mount
  useEffect(() => {
    const restoreContext = () => {
      try {
        const saved = localStorage.getItem('dashboardContext')
        if (saved) {
          const parsedState = JSON.parse(saved)
          
          // Restore selections
          if (parsedState.selectedProperty) setSelectedProperty(parsedState.selectedProperty)
          if (parsedState.selectedTenant) setSelectedTenant(parsedState.selectedTenant)
          if (parsedState.selectedUnit) setSelectedUnit(parsedState.selectedUnit)
          if (parsedState.searchTerm) setSearchTermState(parsedState.searchTerm)
          if (parsedState.currentTab) setCurrentTabState(parsedState.currentTab)
          if (parsedState.sidebarCollapsed !== undefined) setSidebarCollapsed(parsedState.sidebarCollapsed)
          if (parsedState.quickActionsVisible !== undefined) setQuickActionsVisible(parsedState.quickActionsVisible)
          
          // Sync with dashboard store
          if (parsedState.searchTerm) {
            dashboardActions.setFilter('searchTerm', parsedState.searchTerm)
          }
        }
      } catch (error) {
        console.warn('Failed to restore dashboard context:', error)
      }
    }

    restoreContext()
  }, [dashboardActions])

  // Persist context to localStorage (debounced)
  useEffect(() => {
    const persistableState = {
      selectedProperty,
      selectedTenant,
      selectedUnit,
      selectedPayment,
      searchTerm,
      currentTab,
      sidebarCollapsed,
      quickActionsVisible,
    }

    const timeoutId = setTimeout(() => {
      localStorage.setItem('dashboardContext', JSON.stringify(persistableState))
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [
    selectedProperty,
    selectedTenant,
    selectedUnit,
    selectedPayment,
    searchTerm,
    currentTab,
    sidebarCollapsed,
    quickActionsVisible,
  ])

  // Context actions implementation
  const contextActions: DashboardContextActions = {
    // Selection actions
    selectProperty: useCallback((property: Property | null) => {
      setSelectedProperty(property)
      setSelectedTenant(null) // Clear dependent selections
      setSelectedUnit(null)
      
      if (property) {
        const action: Action = {
          id: `select-property-${Date.now()}`,
          type: 'property_selected',
          label: `Selected ${property.name}`,
          icon: 'building',
          timestamp: new Date(),
          data: { propertyId: property.id, propertyName: property.name },
        }
        setRecentActions(prev => [action, ...prev.slice(0, 9)]) // Keep last 10
      }
    }, []),

    selectTenant: useCallback((tenant: Tenant | null) => {
      setSelectedTenant(tenant)
      
      if (tenant) {
        const action: Action = {
          id: `select-tenant-${Date.now()}`,
          type: 'tenant_selected',
          label: `Selected ${tenant.full_name}`,
          icon: 'user',
          timestamp: new Date(),
          data: { tenantId: tenant.id, tenantName: tenant.full_name },
        }
        setRecentActions(prev => [action, ...prev.slice(0, 9)])
      }
    }, []),

    selectUnit: useCallback((unit: Unit | null) => {
      setSelectedUnit(unit)
      
      if (unit) {
        const action: Action = {
          id: `select-unit-${Date.now()}`,
          type: 'unit_selected',
          label: `Selected Unit ${unit.unit_number}`,
          icon: 'home',
          timestamp: new Date(),
          data: { unitId: unit.id, unitNumber: unit.unit_number },
        }
        setRecentActions(prev => [action, ...prev.slice(0, 9)])
      }
    }, []),

    selectPayment: useCallback((payment: Payment | null) => {
      setSelectedPayment(payment)
    }, []),

    // Search and navigation
    setSearchTerm: useCallback((term: string) => {
      setSearchTermState(term)
      dashboardActions.setFilter('searchTerm', term)
    }, [dashboardActions]),

    setCurrentTab: useCallback((tab: string) => {
      setCurrentTabState(tab)
      
      const navItem: NavigationItem = {
        path: tab,
        timestamp: new Date(),
        context: { selectedProperty, selectedTenant, selectedUnit }
      }
      setNavigationHistory(prev => [navItem, ...prev.slice(0, 19)]) // Keep last 20
    }, [selectedProperty, selectedTenant, selectedUnit]),

    addNavigationItem: useCallback((item: NavigationItem) => {
      setNavigationHistory(prev => [item, ...prev.slice(0, 19)])
    }, []),

    // Actions management
    addRecentAction: useCallback((action: Action) => {
      setRecentActions(prev => [action, ...prev.slice(0, 9)])
    }, []),

    getContextualActions: useCallback(() => {
      const actions: Action[] = []

      if (selectedProperty) {
        actions.push({
          id: 'view-property-details',
          type: 'navigation',
          label: 'View Property Details',
          icon: 'eye',
          timestamp: new Date(),
          data: { propertyId: selectedProperty.id },
        })
      }

      if (selectedTenant) {
        actions.push({
          id: 'view-tenant-payments',
          type: 'navigation',
          label: 'View Tenant Payments',
          icon: 'credit-card',
          timestamp: new Date(),
          data: { tenantId: selectedTenant.id },
        })
      }

      if (selectedProperty && selectedTenant) {
        actions.push({
          id: 'record-payment',
          type: 'action',
          label: 'Record Payment',
          icon: 'plus',
          timestamp: new Date(),
          data: {
            propertyId: selectedProperty.id,
            tenantId: selectedTenant.id,
          },
        })
      }

      return actions
    }, [selectedProperty, selectedTenant]),

    // UI actions
    toggleSidebar: useCallback(() => {
      setSidebarCollapsed(prev => !prev)
    }, []),

    toggleQuickActions: useCallback(() => {
      setQuickActionsVisible(prev => !prev)
    }, []),

    startCustomizing: useCallback(() => {
      dashboardActions.startCustomizing()
    }, [dashboardActions]),

    stopCustomizing: useCallback(() => {
      dashboardActions.stopCustomizing()
    }, [dashboardActions]),

    // Data operations
    refreshData: useCallback(async () => {
      await dashboardActions.refreshAllData()
    }, [dashboardActions]),

    clearContext: useCallback(() => {
      setSelectedProperty(null)
      setSelectedTenant(null)
      setSelectedUnit(null)
      setSelectedPayment(null)
      setSearchTermState('')
      setRecentActions([])
      dashboardActions.clearFilters()
    }, [dashboardActions]),

    // Cache utilities
    isCacheExpired: useCallback(() => {
      return !dashboardStore.cache.isValid
    }, [dashboardStore.cache.isValid]),

    invalidateCache: useCallback(() => {
      dashboardActions.invalidateCache()
    }, [dashboardActions]),
  }

  // Build context state
  const contextState: DashboardContextState = {
    // Selections
    selectedProperty,
    selectedTenant,
    selectedUnit,
    selectedPayment,

    // Navigation
    searchTerm,
    currentTab,
    navigationHistory,

    // Actions
    recentActions,
    contextualActions: contextActions.getContextualActions(),

    // UI state
    sidebarCollapsed,
    quickActionsVisible,
    isCustomizing: dashboardStore.customization.isCustomizing,

    // Data state
    loading: dashboardStore.loading,
    error: dashboardStore.error,
    lastUpdated: dashboardStore.lastUpdated,

    // Cache state
    cacheExpiry: new Date(dashboardStore.cache.timestamp + dashboardStore.cache.ttl),
    isCacheValid: dashboardStore.cache.isValid,
  }

  const contextValue: DashboardContextValue = {
    state: contextState,
    actions: contextActions,
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  )
}

// Hook to use dashboard context
export function useDashboardContext(): DashboardContextValue {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardContextProvider')
  }
  return context
}

// Backward compatibility hook
export function useDashboardActions() {
  const { actions } = useDashboardContext()
  return actions
}

export default DashboardContextProvider
