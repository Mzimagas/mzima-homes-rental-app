/**
 * Tenant Store
 * Centralized state management for tenants using Zustand
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { 
  NormalizedState, 
  BaseStoreState, 
  FilterState, 
  PaginationState, 
  SelectionState,
  CacheState,
  AsyncState
} from './types'
import {
  normalizeEntities,
  denormalizeEntities,
  addEntityToNormalized,
  updateEntityInNormalized,
  removeEntityFromNormalized,
  upsertEntityInNormalized,
  upsertManyEntitiesInNormalized,
  createPagination,
  updatePagination,
  createCache,
  applyFilters,
  applySorting,
  applyPaginationToArray,
  createSearchFunction,
  debounce
} from './utils'

// Tenant types
export interface Tenant {
  id: string
  fullName: string
  nationalId: string
  contactInfo: {
    phone: string
    email?: string
    emergencyContact?: {
      name: string
      phone: string
      relationship: string
    }
  }
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EVICTED'
  currentUnitId?: string
  leaseStartDate?: string
  leaseEndDate?: string
  monthlyRent?: {
    amount: number
    currency: string
  }
  securityDeposit?: {
    amount: number
    currency: string
  }
  createdAt: string
  updatedAt: string
}

// Tenant-specific filter state
export interface TenantFilterState extends Omit<FilterState, 'propertyTypes' | 'paymentMethods'> {
  statuses: Tenant['status'][]
  unitIds: string[]
  propertyIds: string[]
  hasActiveLease: boolean | null
  leaseExpiring: boolean | null
  minRent?: number
  maxRent?: number
}

// Tenant store state
export interface TenantStoreState extends BaseStoreState {
  entities: NormalizedState<Tenant>
  filters: TenantFilterState
  pagination: PaginationState
  selection: SelectionState<Tenant>
  cache: CacheState
  syncState: AsyncState
  filteredIds: string[]
  sortedIds: string[]
  paginatedIds: string[]
}

// Tenant store actions
export interface TenantStoreActions {
  // Entity operations
  addTenant: (tenant: Tenant) => void
  updateTenant: (id: string, updates: Partial<Tenant>) => void
  removeTenant: (id: string) => void
  setTenants: (tenants: Tenant[]) => void
  upsertTenant: (tenant: Tenant) => void
  upsertTenants: (tenants: Tenant[]) => void
  clearTenants: () => void
  
  // Selection operations
  selectTenant: (id: string | null) => void
  toggleMultiSelect: (id: string) => void
  clearSelection: () => void
  
  // Filter operations
  setFilter: <K extends keyof TenantFilterState>(key: K, value: TenantFilterState[K]) => void
  updateFilters: (filters: Partial<TenantFilterState>) => void
  clearFilters: () => void
  setSearchTerm: (term: string) => void
  
  // Pagination operations
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  updatePagination: (updates: Partial<PaginationState>) => void
  
  // Sorting operations
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  
  // Async operations
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSyncState: (state: AsyncState) => void
  
  // Cache operations
  invalidateCache: () => void
  refreshCache: () => void
  
  // Computed getters
  getTenant: (id: string) => Tenant | undefined
  getAllTenants: () => Tenant[]
  getFilteredTenants: () => Tenant[]
  getSelectedTenant: () => Tenant | null
  getSelectedTenants: () => Tenant[]
  
  // Business logic helpers
  getTenantsByStatus: (status: Tenant['status']) => Tenant[]
  getTenantsByUnit: (unitId: string) => Tenant[]
  getTenantsByProperty: (propertyId: string) => Tenant[]
  getActiveTenants: () => Tenant[]
  getTenantsWithExpiredLeases: () => Tenant[]
  getTenantsWithExpiringSoonLeases: (daysThreshold?: number) => Tenant[]
  searchTenants: (term: string) => Tenant[]
}

// Initial state
const initialState: TenantStoreState = {
  loading: false,
  error: null,
  lastUpdated: null,
  entities: { byId: {}, allIds: [] },
  filters: {
    searchTerm: '',
    dateRange: { start: null, end: null },
    status: [],
    statuses: [],
    unitIds: [],
    propertyIds: [],
    hasActiveLease: null,
    leaseExpiring: null,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  pagination: createPagination(1, 20, 0),
  selection: {
    selectedId: null,
    selectedItem: null,
    multiSelection: []
  },
  cache: createCache(5),
  syncState: 'idle',
  filteredIds: [],
  sortedIds: [],
  paginatedIds: []
}

// Filter functions
const filterFunctions = {
  searchTerm: createSearchFunction<Tenant>(['fullName', 'nationalId', 'contactInfo.phone', 'contactInfo.email']),
  statuses: (tenant: Tenant, statuses: string[]) => statuses.includes(tenant.status),
  unitIds: (tenant: Tenant, unitIds: string[]) => tenant.currentUnitId ? unitIds.includes(tenant.currentUnitId) : false,
  hasActiveLease: (tenant: Tenant, hasLease: boolean) => {
    const hasLease_ = tenant.currentUnitId && tenant.leaseStartDate && tenant.leaseEndDate
    return hasLease ? !!hasLease_ : !hasLease_
  },
  leaseExpiring: (tenant: Tenant, expiring: boolean) => {
    if (!tenant.leaseEndDate) return !expiring
    const endDate = new Date(tenant.leaseEndDate)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const isExpiring = endDate <= thirtyDaysFromNow && endDate > now
    return expiring ? isExpiring : !isExpiring
  },
  minRent: (tenant: Tenant, minRent: number) => (tenant.monthlyRent?.amount || 0) >= minRent,
  maxRent: (tenant: Tenant, maxRent: number) => (tenant.monthlyRent?.amount || 0) <= maxRent,
  dateRange: (tenant: Tenant, range: { start: Date | null; end: Date | null }) => {
    if (!range.start && !range.end) return true
    const createdAt = new Date(tenant.createdAt)
    if (range.start && createdAt < range.start) return false
    if (range.end && createdAt > range.end) return false
    return true
  }
}

// Sort functions
const sortFunctions = {
  fullName: (a: Tenant, b: Tenant) => a.fullName.localeCompare(b.fullName),
  createdAt: (a: Tenant, b: Tenant) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  updatedAt: (a: Tenant, b: Tenant) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  monthlyRent: (a: Tenant, b: Tenant) => (a.monthlyRent?.amount || 0) - (b.monthlyRent?.amount || 0),
  leaseEndDate: (a: Tenant, b: Tenant) => {
    const aDate = a.leaseEndDate ? new Date(a.leaseEndDate).getTime() : 0
    const bDate = b.leaseEndDate ? new Date(b.leaseEndDate).getTime() : 0
    return aDate - bDate
  }
}

// Debounced filter update
const debouncedFilterUpdate = debounce((get: any, set: any) => {
  const state = get()
  const allTenants = denormalizeEntities(state.entities)
  
  const filtered = applyFilters(allTenants, state.filters, filterFunctions)
  const filteredIds = filtered.map(t => t.id)
  
  const sorted = applySorting(filtered, state.filters.sortBy, state.filters.sortOrder, sortFunctions)
  const sortedIds = sorted.map(t => t.id)
  
  const updatedPagination = updatePagination(state.pagination, { total: filtered.length })
  
  const paginated = applyPaginationToArray(sorted, updatedPagination)
  const paginatedIds = paginated.map(t => t.id)
  
  set((draft: TenantStoreState) => {
    draft.filteredIds = filteredIds
    draft.sortedIds = sortedIds
    draft.paginatedIds = paginatedIds
    draft.pagination = updatedPagination
  })
}, 300)

// Create the store
export const useTenantStore = create<TenantStoreState & TenantStoreActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Entity operations
        addTenant: (tenant) => set((draft) => {
          draft.entities = addEntityToNormalized(draft.entities, tenant)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),
        
        updateTenant: (id, updates) => set((draft) => {
          draft.entities = updateEntityInNormalized(draft.entities, id, updates)
          draft.lastUpdated = new Date()
          
          if (draft.selection.selectedId === id && draft.selection.selectedItem) {
            draft.selection.selectedItem = { ...draft.selection.selectedItem, ...updates }
          }
          
          debouncedFilterUpdate(get, set)
        }),
        
        removeTenant: (id) => set((draft) => {
          draft.entities = removeEntityFromNormalized(draft.entities, id)
          draft.lastUpdated = new Date()
          
          if (draft.selection.selectedId === id) {
            draft.selection.selectedId = null
            draft.selection.selectedItem = null
          }
          
          draft.selection.multiSelection = draft.selection.multiSelection.filter(selectedId => selectedId !== id)
          debouncedFilterUpdate(get, set)
        }),
        
        setTenants: (tenants) => set((draft) => {
          draft.entities = normalizeEntities(tenants)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),
        
        upsertTenant: (tenant) => set((draft) => {
          draft.entities = upsertEntityInNormalized(draft.entities, tenant)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),
        
        upsertTenants: (tenants) => set((draft) => {
          draft.entities = upsertManyEntitiesInNormalized(draft.entities, tenants)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),
        
        clearTenants: () => set((draft) => {
          draft.entities = { byId: {}, allIds: [] }
          draft.selection = { selectedId: null, selectedItem: null, multiSelection: [] }
          draft.filteredIds = []
          draft.sortedIds = []
          draft.paginatedIds = []
          draft.lastUpdated = new Date()
        }),
        
        // Selection operations
        selectTenant: (id) => set((draft) => {
          draft.selection.selectedId = id
          draft.selection.selectedItem = id ? draft.entities.byId[id] || null : null
        }),
        
        toggleMultiSelect: (id) => set((draft) => {
          const index = draft.selection.multiSelection.indexOf(id)
          if (index > -1) {
            draft.selection.multiSelection.splice(index, 1)
          } else {
            draft.selection.multiSelection.push(id)
          }
        }),
        
        clearSelection: () => set((draft) => {
          draft.selection = { selectedId: null, selectedItem: null, multiSelection: [] }
        }),
        
        // Filter operations
        setFilter: (key, value) => set((draft) => {
          draft.filters[key] = value as any
          debouncedFilterUpdate(get, set)
        }),
        
        updateFilters: (filters) => set((draft) => {
          Object.assign(draft.filters, filters)
          debouncedFilterUpdate(get, set)
        }),
        
        clearFilters: () => set((draft) => {
          draft.filters = {
            ...initialState.filters,
            sortBy: draft.filters.sortBy,
            sortOrder: draft.filters.sortOrder
          }
          debouncedFilterUpdate(get, set)
        }),
        
        setSearchTerm: (term) => set((draft) => {
          draft.filters.searchTerm = term
          debouncedFilterUpdate(get, set)
        }),
        
        // Pagination operations
        setPage: (page) => set((draft) => {
          draft.pagination = updatePagination(draft.pagination, { page })
          debouncedFilterUpdate(get, set)
        }),
        
        setLimit: (limit) => set((draft) => {
          draft.pagination = updatePagination(draft.pagination, { limit, page: 1 })
          debouncedFilterUpdate(get, set)
        }),
        
        updatePagination: (updates) => set((draft) => {
          draft.pagination = updatePagination(draft.pagination, updates)
          debouncedFilterUpdate(get, set)
        }),
        
        // Sorting operations
        setSorting: (sortBy, sortOrder) => set((draft) => {
          draft.filters.sortBy = sortBy
          draft.filters.sortOrder = sortOrder
          debouncedFilterUpdate(get, set)
        }),
        
        // Async operations
        setLoading: (loading) => set((draft) => {
          draft.loading = loading
        }),
        
        setError: (error) => set((draft) => {
          draft.error = error
        }),
        
        setSyncState: (state) => set((draft) => {
          draft.syncState = state
        }),
        
        // Cache operations
        invalidateCache: () => set((draft) => {
          draft.cache.isValid = false
        }),
        
        refreshCache: () => set((draft) => {
          draft.cache = createCache(5)
        }),
        
        // Computed getters
        getTenant: (id) => {
          const state = get()
          return state.entities.byId[id]
        },
        
        getAllTenants: () => {
          const state = get()
          return denormalizeEntities(state.entities)
        },
        
        getFilteredTenants: () => {
          const state = get()
          return state.filteredIds.map(id => state.entities.byId[id]).filter(Boolean)
        },
        
        getSelectedTenant: () => {
          const state = get()
          return state.selection.selectedItem
        },
        
        getSelectedTenants: () => {
          const state = get()
          return state.selection.multiSelection.map(id => state.entities.byId[id]).filter(Boolean)
        },
        
        // Business logic helpers
        getTenantsByStatus: (status) => {
          const state = get()
          return denormalizeEntities(state.entities).filter(t => t.status === status)
        },
        
        getTenantsByUnit: (unitId) => {
          const state = get()
          return denormalizeEntities(state.entities).filter(t => t.currentUnitId === unitId)
        },
        
        getTenantsByProperty: (propertyId) => {
          // This would need property-unit relationship data
          const state = get()
          return denormalizeEntities(state.entities).filter(t => {
            // Placeholder - would need to resolve unit to property relationship
            return false
          })
        },
        
        getActiveTenants: () => {
          const state = get()
          return denormalizeEntities(state.entities).filter(t => t.status === 'ACTIVE')
        },
        
        getTenantsWithExpiredLeases: () => {
          const state = get()
          const now = new Date()
          return denormalizeEntities(state.entities).filter(t => {
            return t.leaseEndDate && new Date(t.leaseEndDate) < now
          })
        },
        
        getTenantsWithExpiringSoonLeases: (daysThreshold = 30) => {
          const state = get()
          const now = new Date()
          const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000)
          return denormalizeEntities(state.entities).filter(t => {
            if (!t.leaseEndDate) return false
            const endDate = new Date(t.leaseEndDate)
            return endDate <= threshold && endDate > now
          })
        },
        
        searchTenants: (term) => {
          const state = get()
          const searchFn = createSearchFunction<Tenant>(['fullName', 'nationalId', 'contactInfo.phone'])
          return denormalizeEntities(state.entities).filter(t => searchFn(t, term))
        }
      })),
      {
        name: 'tenant-store',
        partialize: (state) => ({
          entities: state.entities,
          filters: state.filters,
          pagination: state.pagination,
          selection: { selectedId: state.selection.selectedId, multiSelection: state.selection.multiSelection }
        })
      }
    ),
    { name: 'TenantStore' }
  )
)
