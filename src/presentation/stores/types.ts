/**
 * Store Types and Utilities
 * Common types and utilities for Zustand stores
 */

// Base store state interface
export interface BaseStoreState {
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Normalized entity state
export interface NormalizedState<T> {
  byId: Record<string, T>
  allIds: string[]
}

// Async operation states
export type AsyncState = 'idle' | 'loading' | 'success' | 'error'

// Pagination state
export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// Filter state
export interface FilterState {
  searchTerm: string
  dateRange: {
    start: Date | null
    end: Date | null
  }
  status: string[]
  propertyTypes: string[]
  paymentMethods: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

// Selection state
export interface SelectionState<T> {
  selectedId: string | null
  selectedItem: T | null
  multiSelection: string[]
}

// Cache state
export interface CacheState {
  expiry: Date
  isValid: boolean
}

// Store slice interface
export interface StoreSlice<T> {
  state: T
  actions: Record<string, (...args: any[]) => void>
}

// Store persistence options
export interface PersistOptions {
  name: string
  storage?: Storage
  partialize?: (state: any) => any
  onRehydrateStorage?: (state: any) => void
}

// Store middleware options
export interface StoreOptions {
  persist?: PersistOptions
  devtools?: boolean
  immer?: boolean
}

// Entity operations
export interface EntityOperations<T> {
  add: (entity: T) => void
  update: (id: string, updates: Partial<T>) => void
  remove: (id: string) => void
  clear: () => void
  upsert: (entity: T) => void
  upsertMany: (entities: T[]) => void
}

// Async operations
export interface AsyncOperations {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSuccess: () => void
  reset: () => void
}

// UI state operations
export interface UIOperations {
  setFilter: (key: string, value: any) => void
  clearFilters: () => void
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  setPagination: (pagination: Partial<PaginationState>) => void
  setSelection: (id: string | null) => void
  toggleMultiSelection: (id: string) => void
  clearSelection: () => void
}

// Store factory types
export type StoreFactory<T> = (options?: StoreOptions) => T

// Event types for store communication
export interface StoreEvent {
  type: string
  payload?: any
  timestamp: Date
}

// Store subscription types
export type StoreSubscriber = (event: StoreEvent) => void
export type StoreUnsubscribe = () => void
