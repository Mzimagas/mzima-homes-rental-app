'use client'

import { useState, useEffect, useCallback } from 'react'
import { PropertyFilters } from '../components/properties/utils/stage-filtering.utils'

export interface SavedFilter {
  id: string
  name: string
  filters: PropertyFilters
  isDefault?: boolean
  createdAt: Date
  lastUsed?: Date
}

export interface UseSavedFiltersOptions {
  persistKey?: string
  maxSavedFilters?: number
}

export interface UseSavedFiltersReturn {
  savedFilters: SavedFilter[]
  saveFilter: (name: string, filters: PropertyFilters) => void
  loadFilter: (id: string) => PropertyFilters | null
  deleteFilter: (id: string) => void
  updateFilter: (id: string, updates: Partial<SavedFilter>) => void
  getDefaultFilters: () => SavedFilter[]
}

const DEFAULT_FILTERS: Omit<SavedFilter, 'id' | 'createdAt'>[] = [
  {
    name: 'All Properties',
    filters: {
      pipeline: 'all',
      status: 'all',
      propertyTypes: [],
      searchTerm: ''
    },
    isDefault: true
  },
  {
    name: 'Active Properties',
    filters: {
      pipeline: 'all',
      status: 'active',
      propertyTypes: [],
      searchTerm: ''
    },
    isDefault: true
  },
  {
    name: 'Purchase Pipeline',
    filters: {
      pipeline: 'purchase_pipeline',
      status: 'all',
      propertyTypes: [],
      searchTerm: ''
    },
    isDefault: true
  },
  {
    name: 'Subdivision Properties',
    filters: {
      pipeline: 'subdivision',
      status: 'all',
      propertyTypes: [],
      searchTerm: ''
    },
    isDefault: true
  },
  {
    name: 'Handover Properties',
    filters: {
      pipeline: 'handover',
      status: 'all',
      propertyTypes: [],
      searchTerm: ''
    },
    isDefault: true
  },
  {
    name: 'Completed Properties',
    filters: {
      pipeline: 'all',
      status: 'completed',
      propertyTypes: [],
      searchTerm: ''
    },
    isDefault: true
  }
]

export function useSavedFilters(options: UseSavedFiltersOptions = {}): UseSavedFiltersReturn {
  const {
    persistKey = 'saved-property-filters',
    maxSavedFilters = 20
  } = options

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  // Load saved filters from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(persistKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          const filters = parsed.map((filter: any) => ({
            ...filter,
            createdAt: new Date(filter.createdAt),
            lastUsed: filter.lastUsed ? new Date(filter.lastUsed) : undefined
          }))
          setSavedFilters(filters)
        } else {
          // Initialize with default filters
          const defaultFilters = getDefaultFilters()
          setSavedFilters(defaultFilters)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load saved filters:', error)
        const defaultFilters = getDefaultFilters()
        setSavedFilters(defaultFilters)
      }
    }
  }, [persistKey, getDefaultFilters])

  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && savedFilters.length > 0) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(savedFilters))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to save filters:', error)
      }
    }
  }, [savedFilters, persistKey])

  const getDefaultFilters = useCallback((): SavedFilter[] => {
    return DEFAULT_FILTERS.map((filter, index) => ({
      ...filter,
      id: `default-${index}`,
      createdAt: new Date()
    }))
  }, [])

  const saveFilter = useCallback((name: string, filters: PropertyFilters) => {
    const newFilter: SavedFilter = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      filters,
      createdAt: new Date()
    }

    setSavedFilters(prev => {
      // Remove oldest custom filter if we exceed the limit
      const customFilters = prev.filter(f => !f.isDefault)
      if (customFilters.length >= maxSavedFilters) {
        const sortedCustom = customFilters.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        const toRemove = sortedCustom.slice(0, customFilters.length - maxSavedFilters + 1)
        const filtered = prev.filter(f => f.isDefault || !toRemove.some(r => r.id === f.id))
        return [...filtered, newFilter]
      }
      
      return [...prev, newFilter]
    })
  }, [maxSavedFilters])

  const loadFilter = useCallback((id: string): PropertyFilters | null => {
    const filter = savedFilters.find(f => f.id === id)
    if (filter) {
      // Update last used timestamp
      setSavedFilters(prev => 
        prev.map(f => 
          f.id === id 
            ? { ...f, lastUsed: new Date() }
            : f
        )
      )
      return filter.filters
    }
    return null
  }, [savedFilters])

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id && f.isDefault !== true))
  }, [])

  const updateFilter = useCallback((id: string, updates: Partial<SavedFilter>) => {
    setSavedFilters(prev => 
      prev.map(f => 
        f.id === id 
          ? { ...f, ...updates }
          : f
      )
    )
  }, [])

  return {
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    updateFilter,
    getDefaultFilters
  }
}
