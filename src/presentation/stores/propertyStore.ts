/**
 * Property Store
 * Centralized state management for properties using Zustand
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
  isCacheValid,
  applyFilters,
  applySorting,
  applyPaginationToArray,
  createSearchFunction,
  debounce
} from './utils'

// Property types (simplified for now, will integrate with domain entities later)
export interface Property {
  id: string
  name: string
  address: string
  propertyType: 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND' | 'TOWNHOUSE'
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
  lifecycleStatus: 'ACQUISITION' | 'SUBDIVISION' | 'HANDOVER' | 'RENTAL_READY' | 'DISPOSED'
  ownerId: string
  totalAreaAcres?: number
  description?: string
  amenities: string[]
  createdAt: string
  updatedAt: string
}

// Property-specific filter state
export interface PropertyFilterState extends Omit<FilterState, 'paymentMethods'> {
  propertyTypes: Property['propertyType'][]
  statuses: Property['status'][]
  lifecycleStatuses: Property['lifecycleStatus'][]
  ownerIds: string[]
  minArea?: number
  maxArea?: number
}

// Property store state
export interface PropertyStoreState extends BaseStoreState {
  // Normalized entities
  entities: NormalizedState<Property>
  
  // UI state
  filters: PropertyFilterState
  pagination: PaginationState
  selection: SelectionState<Property>
  
  // Cache and sync
  cache: CacheState
  syncState: AsyncState
  
  // Computed state
  filteredIds: string[]
  sortedIds: string[]
  paginatedIds: string[]
}

// Property store actions
export interface PropertyStoreActions {
  // Entity operations
  addProperty: (property: Property) => void
  updateProperty: (id: string, updates: Partial<Property>) => void
  removeProperty: (id: string) => void
  setProperties: (properties: Property[]) => void
  upsertProperty: (property: Property) => void
  upsertProperties: (properties: Property[]) => void
  clearProperties: () => void
  
  // Selection operations
  selectProperty: (id: string | null) => void
  toggleMultiSelect: (id: string) => void
  clearSelection: () => void
  
  // Filter operations
  setFilter: <K extends keyof PropertyFilterState>(key: K, value: PropertyFilterState[K]) => void
  updateFilters: (filters: Partial<PropertyFilterState>) => void
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
  getProperty: (id: string) => Property | undefined
  getAllProperties: () => Property[]
  getFilteredProperties: () => Property[]
  getSelectedProperty: () => Property | null
  getSelectedProperties: () => Property[]
  
  // Business logic helpers
  getPropertiesByOwner: (ownerId: string) => Property[]
  getPropertiesByStatus: (status: Property['status']) => Property[]
  getAvailableProperties: () => Property[]
  searchProperties: (term: string) => Property[]
}

// Initial state
const initialState: PropertyStoreState = {
  // Base state
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Normalized entities
  entities: { byId: {}, allIds: [] },
  
  // UI state
  filters: {
    searchTerm: '',
    dateRange: { start: null, end: null },
    status: [],
    propertyTypes: [],
    statuses: [],
    lifecycleStatuses: [],
    ownerIds: [],
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  pagination: createPagination(1, 20, 0),
  selection: {
    selectedId: null,
    selectedItem: null,
    multiSelection: []
  },
  
  // Cache and sync
  cache: createCache(5), // 5 minutes TTL
  syncState: 'idle',
  
  // Computed state
  filteredIds: [],
  sortedIds: [],
  paginatedIds: []
}

// Filter functions
const filterFunctions = {
  searchTerm: createSearchFunction<Property>(['name', 'address', 'description']),
  propertyTypes: (property: Property, types: string[]) => types.includes(property.propertyType),
  statuses: (property: Property, statuses: string[]) => statuses.includes(property.status),
  lifecycleStatuses: (property: Property, statuses: string[]) => statuses.includes(property.lifecycleStatus),
  ownerIds: (property: Property, ownerIds: string[]) => ownerIds.includes(property.ownerId),
  minArea: (property: Property, minArea: number) => (property.totalAreaAcres || 0) >= minArea,
  maxArea: (property: Property, maxArea: number) => (property.totalAreaAcres || 0) <= maxArea,
  dateRange: (property: Property, range: { start: Date | null; end: Date | null }) => {
    if (!range.start && !range.end) return true
    const createdAt = new Date(property.createdAt)
    if (range.start && createdAt < range.start) return false
    if (range.end && createdAt > range.end) return false
    return true
  }
}

// Sort functions
const sortFunctions = {
  name: (a: Property, b: Property) => a.name.localeCompare(b.name),
  createdAt: (a: Property, b: Property) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  updatedAt: (a: Property, b: Property) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  totalAreaAcres: (a: Property, b: Property) => (a.totalAreaAcres || 0) - (b.totalAreaAcres || 0)
}

// Debounced filter update
const debouncedFilterUpdate = debounce((get: any, set: any) => {
  const state = get()
  const allProperties = denormalizeEntities(state.entities)
  
  // Apply filters
  const filtered = applyFilters(allProperties, state.filters, filterFunctions)
  const filteredIds = filtered.map(p => p.id)
  
  // Apply sorting
  const sorted = applySorting(filtered, state.filters.sortBy, state.filters.sortOrder, sortFunctions)
  const sortedIds = sorted.map(p => p.id)
  
  // Update pagination total
  const updatedPagination = updatePagination(state.pagination, { total: filtered.length })
  
  // Apply pagination
  const paginated = applyPaginationToArray(sorted, updatedPagination)
  const paginatedIds = paginated.map(p => p.id)
  
  set((draft: PropertyStoreState) => {
    draft.filteredIds = filteredIds
    draft.sortedIds = sortedIds
    draft.paginatedIds = paginatedIds
    draft.pagination = updatedPagination
  })
}, 300)

// Create the store
export const usePropertyStore = create<PropertyStoreState & PropertyStoreActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Entity operations
        addProperty: (property) => set((draft) => {
          draft.entities = addEntityToNormalized(draft.entities, property)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),
        
        updateProperty: (id, updates) => set((draft) => {
          draft.entities = updateEntityInNormalized(draft.entities, id, updates)
          draft.lastUpdated = new Date()
          
          // Update selection if needed
          if (draft.selection.selectedId === id && draft.selection.selectedItem) {
            draft.selection.selectedItem = { ...draft.selection.selectedItem, ...updates }
          }
          
          debouncedFilterUpdate(get, set)
        }),
        
        removeProperty: (id) => set((draft) => {
          draft.entities = removeEntityFromNormalized(draft.entities, id)
          draft.lastUpdated = new Date()
          
          // Clear selection if removed
          if (draft.selection.selectedId === id) {
            draft.selection.selectedId = null
            draft.selection.selectedItem = null
          }
          
          // Remove from multi-selection
          draft.selection.multiSelection = draft.selection.multiSelection.filter(selectedId => selectedId !== id)
          
          debouncedFilterUpdate(get, set)
        }),
        
        setProperties: (properties) => set((draft) => {
          draft.entities = normalizeEntities(properties)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),
        
        upsertProperty: (property) => set((draft) => {
          draft.entities = upsertEntityInNormalized(draft.entities, property)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),
        
        upsertProperties: (properties) => set((draft) => {
          draft.entities = upsertManyEntitiesInNormalized(draft.entities, properties)
          draft.lastUpdated = new Date()
          debouncedFilterUpdate(get, set)
        }),
        
        clearProperties: () => set((draft) => {
          draft.entities = { byId: {}, allIds: [] }
          draft.selection = { selectedId: null, selectedItem: null, multiSelection: [] }
          draft.filteredIds = []
          draft.sortedIds = []
          draft.paginatedIds = []
          draft.lastUpdated = new Date()
        }),
        
        // Selection operations
        selectProperty: (id) => set((draft) => {
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
        getProperty: (id) => {
          const state = get()
          return state.entities.byId[id]
        },
        
        getAllProperties: () => {
          const state = get()
          return denormalizeEntities(state.entities)
        },
        
        getFilteredProperties: () => {
          const state = get()
          return state.filteredIds.map(id => state.entities.byId[id]).filter(Boolean)
        },
        
        getSelectedProperty: () => {
          const state = get()
          return state.selection.selectedItem
        },
        
        getSelectedProperties: () => {
          const state = get()
          return state.selection.multiSelection.map(id => state.entities.byId[id]).filter(Boolean)
        },
        
        // Business logic helpers
        getPropertiesByOwner: (ownerId) => {
          const state = get()
          return denormalizeEntities(state.entities).filter(p => p.ownerId === ownerId)
        },
        
        getPropertiesByStatus: (status) => {
          const state = get()
          return denormalizeEntities(state.entities).filter(p => p.status === status)
        },
        
        getAvailableProperties: () => {
          const state = get()
          return denormalizeEntities(state.entities).filter(p => p.status === 'AVAILABLE')
        },
        
        searchProperties: (term) => {
          const state = get()
          const searchFn = createSearchFunction<Property>(['name', 'address', 'description'])
          return denormalizeEntities(state.entities).filter(p => searchFn(p, term))
        }
      })),
      {
        name: 'property-store',
        partialize: (state) => ({
          entities: state.entities,
          filters: state.filters,
          pagination: state.pagination,
          selection: { selectedId: state.selection.selectedId, multiSelection: state.selection.multiSelection }
        })
      }
    ),
    { name: 'PropertyStore' }
  )
)
