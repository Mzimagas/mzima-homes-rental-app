import { useCallback } from 'react'
import { useDashboardContext } from '../contexts/DashboardContext'
import { Property, Unit, Tenant, Payment } from '../lib/types/database'
import type { FilterState, Action, NavigationItem } from '../contexts/DashboardContext'

/**
 * Custom hook providing convenient actions for dashboard context management
 */
export function useDashboardActions() {
  const { state, dispatch } = useDashboardContext()

  // Selection actions
  const selectProperty = useCallback(
    (property: Property | null) => {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property })

      // Add to recent actions
      if (property) {
        const action: Action = {
          id: `select-property-${Date.now()}`,
          type: 'property_selected',
          label: `Selected ${property.name}`,
          icon: 'building',
          timestamp: new Date(),
          data: { propertyId: property.id, propertyName: property.name },
        }
        dispatch({ type: 'ADD_RECENT_ACTION', payload: action })
      }
    },
    [dispatch]
  )

  const selectTenant = useCallback(
    (tenant: Tenant | null) => {
      dispatch({ type: 'SET_SELECTED_TENANT', payload: tenant })

      if (tenant) {
        const action: Action = {
          id: `select-tenant-${Date.now()}`,
          type: 'tenant_selected',
          label: `Selected ${tenant.full_name}`,
          icon: 'user',
          timestamp: new Date(),
          data: { tenantId: tenant.id, tenantName: tenant.full_name },
        }
        dispatch({ type: 'ADD_RECENT_ACTION', payload: action })
      }
    },
    [dispatch]
  )

  const selectUnit = useCallback(
    (unit: Unit | null) => {
      dispatch({ type: 'SET_SELECTED_UNIT', payload: unit })

      if (unit) {
        const action: Action = {
          id: `select-unit-${Date.now()}`,
          type: 'unit_selected',
          label: `Selected Unit ${unit.unit_label}`,
          icon: 'home',
          timestamp: new Date(),
          data: { unitId: unit.id, unitNumber: unit.unit_label },
        }
        dispatch({ type: 'ADD_RECENT_ACTION', payload: action })
      }
    },
    [dispatch]
  )

  const selectPayment = useCallback(
    (payment: Payment | null) => {
      dispatch({ type: 'SET_SELECTED_PAYMENT', payload: payment })
    },
    [dispatch]
  )

  // Search and filter actions
  const setSearchTerm = useCallback(
    (term: string) => {
      dispatch({ type: 'SET_SEARCH_TERM', payload: term })
    },
    [dispatch]
  )

  const updateFilters = useCallback(
    (filters: Partial<FilterState>) => {
      dispatch({ type: 'SET_ACTIVE_FILTERS', payload: filters })
    },
    [dispatch]
  )

  const clearFilters = useCallback(() => {
    dispatch({
      type: 'SET_ACTIVE_FILTERS',
      payload: {
        searchTerm: '',
        dateRange: { start: null, end: null },
        status: [],
        propertyTypes: [],
        paymentMethods: [],
      },
    })
  }, [dispatch])

  // Navigation actions
  const setCurrentTab = useCallback(
    (tab: string) => {
      // Only update if the tab is actually different
      if (state.currentTab !== tab) {
        dispatch({ type: 'SET_CURRENT_TAB', payload: tab })
      }
    },
    [dispatch, state.currentTab]
  )

  // Cache management actions
  const updatePropertiesCache = useCallback(
    (properties: Property[]) => {
      dispatch({ type: 'UPDATE_CACHE', payload: { type: 'properties', data: properties } })
    },
    [dispatch]
  )

  const updateTenantsCache = useCallback(
    (tenants: Tenant[]) => {
      dispatch({ type: 'UPDATE_CACHE', payload: { type: 'tenants', data: tenants } })
    },
    [dispatch]
  )

  const updateUnitsCache = useCallback(
    (units: Unit[]) => {
      dispatch({ type: 'UPDATE_CACHE', payload: { type: 'units', data: units } })
    },
    [dispatch]
  )

  const updatePaymentsCache = useCallback(
    (payments: Payment[]) => {
      dispatch({ type: 'UPDATE_CACHE', payload: { type: 'payments', data: payments } })
    },
    [dispatch]
  )

  // Action tracking
  const addRecentAction = useCallback(
    (action: Omit<Action, 'id' | 'timestamp'>) => {
      const fullAction: Action = {
        ...action,
        id: `action-${Date.now()}`,
        timestamp: new Date(),
      }
      dispatch({ type: 'ADD_RECENT_ACTION', payload: fullAction })
    },
    [dispatch]
  )

  // UI actions
  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }, [dispatch])

  const toggleQuickActions = useCallback(() => {
    dispatch({ type: 'TOGGLE_QUICK_ACTIONS' })
  }, [dispatch])

  // Context management
  const clearContext = useCallback(() => {
    dispatch({ type: 'CLEAR_CONTEXT' })
  }, [dispatch])

  // Utility functions
  const isPropertySelected = useCallback(
    (propertyId: string) => {
      return state.selectedProperty?.id === propertyId
    },
    [state.selectedProperty]
  )

  const isTenantSelected = useCallback(
    (tenantId: string) => {
      return state.selectedTenant?.id === tenantId
    },
    [state.selectedTenant]
  )

  const isUnitSelected = useCallback(
    (unitId: string) => {
      return state.selectedUnit?.id === unitId
    },
    [state.selectedUnit]
  )

  const getContextualActions = useCallback(() => {
    const actions: Action[] = []

    // Add contextual actions based on current selections
    if (state.selectedProperty) {
      actions.push({
        id: 'view-property-details',
        type: 'navigation',
        label: 'View Property Details',
        icon: 'eye',
        timestamp: new Date(),
        data: { propertyId: state.selectedProperty.id },
      })
    }

    if (state.selectedTenant) {
      actions.push({
        id: 'view-tenant-payments',
        type: 'navigation',
        label: 'View Tenant Payments',
        icon: 'credit-card',
        timestamp: new Date(),
        data: { tenantId: state.selectedTenant.id },
      })
    }

    if (state.selectedProperty && state.selectedTenant) {
      actions.push({
        id: 'record-payment',
        type: 'action',
        label: 'Record Payment',
        icon: 'plus',
        timestamp: new Date(),
        data: {
          propertyId: state.selectedProperty.id,
          tenantId: state.selectedTenant.id,
        },
      })
    }

    return actions
  }, [state.selectedProperty, state.selectedTenant])

  // Cache utilities
  const isCacheExpired = useCallback(() => {
    return new Date() > state.cacheExpiry
  }, [state.cacheExpiry])

  const getCachedData = useCallback(
    (type: 'properties' | 'tenants' | 'units' | 'payments') => {
      if (isCacheExpired()) return []
      return state[`${type}Cache`]
    },
    [state, isCacheExpired]
  )

  return {
    // State
    state,

    // Selection actions
    selectProperty,
    selectTenant,
    selectUnit,
    selectPayment,

    // Search and filter actions
    setSearchTerm,
    updateFilters,
    clearFilters,

    // Navigation actions
    setCurrentTab,

    // Cache actions
    updatePropertiesCache,
    updateTenantsCache,
    updateUnitsCache,
    updatePaymentsCache,

    // Action tracking
    addRecentAction,

    // UI actions
    toggleSidebar,
    toggleQuickActions,

    // Context management
    clearContext,

    // Utility functions
    isPropertySelected,
    isTenantSelected,
    isUnitSelected,
    getContextualActions,
    isCacheExpired,
    getCachedData,
  }
}
