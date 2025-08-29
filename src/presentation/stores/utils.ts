/**
 * Store Utilities
 * Helper functions for store operations and normalization
 */

import { NormalizedState, PaginationState, CacheState } from './types'

// Entity normalization utilities
export function normalizeEntities<T extends { id: string }>(entities: T[]): NormalizedState<T> {
  const byId: Record<string, T> = {}
  const allIds: string[] = []

  entities.forEach(entity => {
    byId[entity.id] = entity
    allIds.push(entity.id)
  })

  return { byId, allIds }
}

export function denormalizeEntities<T>(normalized: NormalizedState<T>): T[] {
  return normalized.allIds.map(id => normalized.byId[id]).filter(Boolean)
}

export function addEntityToNormalized<T extends { id: string }>(
  normalized: NormalizedState<T>,
  entity: T
): NormalizedState<T> {
  return {
    byId: { ...normalized.byId, [entity.id]: entity },
    allIds: normalized.allIds.includes(entity.id) 
      ? normalized.allIds 
      : [...normalized.allIds, entity.id]
  }
}

export function updateEntityInNormalized<T extends { id: string }>(
  normalized: NormalizedState<T>,
  id: string,
  updates: Partial<T>
): NormalizedState<T> {
  const existingEntity = normalized.byId[id]
  if (!existingEntity) return normalized

  return {
    ...normalized,
    byId: {
      ...normalized.byId,
      [id]: { ...existingEntity, ...updates }
    }
  }
}

export function removeEntityFromNormalized<T>(
  normalized: NormalizedState<T>,
  id: string
): NormalizedState<T> {
  const { [id]: removed, ...restById } = normalized.byId
  return {
    byId: restById,
    allIds: normalized.allIds.filter(entityId => entityId !== id)
  }
}

export function upsertEntityInNormalized<T extends { id: string }>(
  normalized: NormalizedState<T>,
  entity: T
): NormalizedState<T> {
  const exists = normalized.byId[entity.id]
  
  if (exists) {
    return updateEntityInNormalized(normalized, entity.id, entity)
  } else {
    return addEntityToNormalized(normalized, entity)
  }
}

export function upsertManyEntitiesInNormalized<T extends { id: string }>(
  normalized: NormalizedState<T>,
  entities: T[]
): NormalizedState<T> {
  return entities.reduce((acc, entity) => upsertEntityInNormalized(acc, entity), normalized)
}

// Pagination utilities
export function createPagination(
  page: number = 1,
  limit: number = 20,
  total: number = 0
): PaginationState {
  const totalPages = Math.ceil(total / limit)
  
  return {
    page: Math.max(1, page),
    limit: Math.max(1, limit),
    total: Math.max(0, total),
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1
  }
}

export function updatePagination(
  current: PaginationState,
  updates: Partial<PaginationState>
): PaginationState {
  const updated = { ...current, ...updates }
  return createPagination(updated.page, updated.limit, updated.total)
}

// Cache utilities
export function createCache(ttlMinutes: number = 5): CacheState {
  const expiry = new Date()
  expiry.setMinutes(expiry.getMinutes() + ttlMinutes)
  
  return {
    expiry,
    isValid: true
  }
}

export function isCacheValid(cache: CacheState): boolean {
  return cache.isValid && new Date() < cache.expiry
}

export function invalidateCache(cache: CacheState): CacheState {
  return {
    ...cache,
    isValid: false
  }
}

// Filter utilities
export function applyFilters<T>(
  items: T[],
  filters: Record<string, any>,
  filterFunctions: Record<string, (item: T, value: any) => boolean>
): T[] {
  return items.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === null || value === undefined || value === '') return true
      if (Array.isArray(value) && value.length === 0) return true
      
      const filterFn = filterFunctions[key]
      return filterFn ? filterFn(item, value) : true
    })
  })
}

export function applySorting<T>(
  items: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  sortFunctions: Record<string, (a: T, b: T) => number>
): T[] {
  if (!sortBy || !sortFunctions[sortBy]) return items

  const sortFn = sortFunctions[sortBy]
  const sorted = [...items].sort(sortFn)
  
  return sortOrder === 'desc' ? sorted.reverse() : sorted
}

export function applyPaginationToArray<T>(
  items: T[],
  pagination: PaginationState
): T[] {
  const startIndex = (pagination.page - 1) * pagination.limit
  const endIndex = startIndex + pagination.limit
  return items.slice(startIndex, endIndex)
}

// Search utilities
export function createSearchFunction<T>(
  searchFields: (keyof T)[]
): (item: T, searchTerm: string) => boolean {
  return (item: T, searchTerm: string) => {
    if (!searchTerm.trim()) return true
    
    const term = searchTerm.toLowerCase()
    return searchFields.some(field => {
      const value = item[field]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term)
      }
      if (typeof value === 'number') {
        return value.toString().includes(term)
      }
      return false
    })
  }
}

// Debounce utility for store actions
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Local storage utilities
export function saveToStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn(`Failed to save to localStorage: ${error}`)
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.warn(`Failed to load from localStorage: ${error}`)
    return defaultValue
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Failed to remove from localStorage: ${error}`)
  }
}

// Deep merge utility for state updates
export function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target }
  
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = result[key]
    
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue)
      } else {
        (result as any)[key] = sourceValue
      }
    } else {
      result[key] = sourceValue as T[Extract<keyof T, string>]
    }
  }
  
  return result
}

// State validation utilities
export function validateState<T>(
  state: T,
  validators: Record<keyof T, (value: any) => boolean>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  for (const [key, validator] of Object.entries(validators)) {
    const value = state[key as keyof T]
    if (!(validator as any)(value)) {
      errors.push(`Invalid value for ${key}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
