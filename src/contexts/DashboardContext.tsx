'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { Property, Unit, Tenant, Payment } from '../lib/types/database'

// Types for dashboard context
export interface FilterState {
  searchTerm: string
  dateRange: { start: Date | null; end: Date | null }
  status: string[]
  propertyTypes: string[]
  paymentMethods: string[]
}

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

export interface DashboardState {
  // Current selections
  selectedProperty: Property | null
  selectedTenant: Tenant | null
  selectedUnit: Unit | null
  selectedPayment: Payment | null
  
  // Navigation state
  searchTerm: string
  activeFilters: FilterState
  navigationHistory: NavigationItem[]
  currentTab: string
  
  // Quick actions and context
  recentActions: Action[]
  contextualActions: Action[]
  
  // Data cache for cross-tab sharing
  propertiesCache: Property[]
  tenantsCache: Tenant[]
  unitsCache: Unit[]
  paymentsCache: Payment[]
  
  // UI state
  sidebarCollapsed: boolean
  quickActionsVisible: boolean
  
  // Performance tracking
  lastUpdated: Date
  cacheExpiry: Date
}

// Action types for reducer
export type DashboardAction =
  | { type: 'SET_SELECTED_PROPERTY'; payload: Property | null }
  | { type: 'SET_SELECTED_TENANT'; payload: Tenant | null }
  | { type: 'SET_SELECTED_UNIT'; payload: Unit | null }
  | { type: 'SET_SELECTED_PAYMENT'; payload: Payment | null }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_ACTIVE_FILTERS'; payload: Partial<FilterState> }
  | { type: 'SET_CURRENT_TAB'; payload: string }
  | { type: 'ADD_NAVIGATION_ITEM'; payload: NavigationItem }
  | { type: 'ADD_RECENT_ACTION'; payload: Action }
  | { type: 'UPDATE_CACHE'; payload: { type: 'properties' | 'tenants' | 'units' | 'payments'; data: any[] } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_QUICK_ACTIONS' }
  | { type: 'CLEAR_CONTEXT' }
  | { type: 'RESTORE_CONTEXT'; payload: Partial<DashboardState> }

// Initial state
const initialState: DashboardState = {
  selectedProperty: null,
  selectedTenant: null,
  selectedUnit: null,
  selectedPayment: null,
  searchTerm: '',
  activeFilters: {
    searchTerm: '',
    dateRange: { start: null, end: null },
    status: [],
    propertyTypes: [],
    paymentMethods: []
  },
  navigationHistory: [],
  currentTab: 'dashboard',
  recentActions: [],
  contextualActions: [],
  propertiesCache: [],
  tenantsCache: [],
  unitsCache: [],
  paymentsCache: [],
  sidebarCollapsed: false,
  quickActionsVisible: true,
  lastUpdated: new Date(),
  cacheExpiry: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
}

// Reducer function
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  const now = new Date()
  
  switch (action.type) {
    case 'SET_SELECTED_PROPERTY':
      return {
        ...state,
        selectedProperty: action.payload,
        selectedTenant: null, // Clear dependent selections
        selectedUnit: null,
        lastUpdated: now
      }
      
    case 'SET_SELECTED_TENANT':
      return {
        ...state,
        selectedTenant: action.payload,
        lastUpdated: now
      }
      
    case 'SET_SELECTED_UNIT':
      return {
        ...state,
        selectedUnit: action.payload,
        lastUpdated: now
      }
      
    case 'SET_SELECTED_PAYMENT':
      return {
        ...state,
        selectedPayment: action.payload,
        lastUpdated: now
      }
      
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        searchTerm: action.payload,
        activeFilters: {
          ...state.activeFilters,
          searchTerm: action.payload
        },
        lastUpdated: now
      }
      
    case 'SET_ACTIVE_FILTERS':
      return {
        ...state,
        activeFilters: {
          ...state.activeFilters,
          ...action.payload
        },
        lastUpdated: now
      }
      
    case 'SET_CURRENT_TAB':
      return {
        ...state,
        currentTab: action.payload,
        lastUpdated: now
      }
      
    case 'ADD_NAVIGATION_ITEM':
      return {
        ...state,
        navigationHistory: [action.payload, ...state.navigationHistory].slice(0, 10), // Keep last 10
        lastUpdated: now
      }
      
    case 'ADD_RECENT_ACTION':
      return {
        ...state,
        recentActions: [action.payload, ...state.recentActions].slice(0, 5), // Keep last 5
        lastUpdated: now
      }
      
    case 'UPDATE_CACHE':
      return {
        ...state,
        [`${action.payload.type}Cache`]: action.payload.data,
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000), // Reset cache expiry
        lastUpdated: now
      }
      
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
        lastUpdated: now
      }
      
    case 'TOGGLE_QUICK_ACTIONS':
      return {
        ...state,
        quickActionsVisible: !state.quickActionsVisible,
        lastUpdated: now
      }
      
    case 'CLEAR_CONTEXT':
      return {
        ...initialState,
        propertiesCache: state.propertiesCache, // Preserve cache
        tenantsCache: state.tenantsCache,
        unitsCache: state.unitsCache,
        paymentsCache: state.paymentsCache,
        cacheExpiry: state.cacheExpiry
      }
      
    case 'RESTORE_CONTEXT':
      return {
        ...state,
        ...action.payload,
        lastUpdated: now
      }
      
    default:
      return state
  }
}

// Context
const DashboardContext = createContext<{
  state: DashboardState
  dispatch: React.Dispatch<DashboardAction>
} | null>(null)

// Provider component
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)
  
  // Persist context to localStorage (debounced)
  useEffect(() => {
    const persistableState = {
      selectedProperty: state.selectedProperty,
      selectedTenant: state.selectedTenant,
      selectedUnit: state.selectedUnit,
      searchTerm: state.searchTerm,
      activeFilters: state.activeFilters,
      currentTab: state.currentTab,
      sidebarCollapsed: state.sidebarCollapsed,
      quickActionsVisible: state.quickActionsVisible
    }

    // Debounce localStorage writes to prevent excessive updates
    const timeoutId = setTimeout(() => {
      localStorage.setItem('dashboardContext', JSON.stringify(persistableState))
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [
    state.selectedProperty,
    state.selectedTenant,
    state.selectedUnit,
    state.searchTerm,
    state.currentTab,
    state.sidebarCollapsed,
    state.quickActionsVisible
  ])
  
  // Restore context from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboardContext')
    if (saved) {
      try {
        const parsedState = JSON.parse(saved)
        dispatch({ type: 'RESTORE_CONTEXT', payload: parsedState })
      } catch (error) {
        console.warn('Failed to restore dashboard context:', error)
      }
    }
  }, [])
  
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  )
}

// Hook to use dashboard context
export function useDashboardContext() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider')
  }
  return context
}
