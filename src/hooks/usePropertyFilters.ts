'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { PropertyWithLifecycle } from '../components/properties/types/property-management.types'
import {
  PropertyFilters,
  PropertyPipelineFilter,
  PropertyStatusFilter,
  applyPropertyFilters,
  getFilterCounts,
} from '../components/properties/utils/stage-filtering.utils'

export interface UsePropertyFiltersOptions {
  initialFilters?: Partial<PropertyFilters>
  persistKey?: string
  debounceMs?: number
}

export interface UsePropertyFiltersReturn {
  filters: PropertyFilters
  filteredProperties: PropertyWithLifecycle[]
  filterCounts: Record<PropertyPipelineFilter, number>
  totalCount: number
  filteredCount: number
  setPipelineFilter: (pipeline: PropertyPipelineFilter) => void
  setStatusFilter: (status: PropertyStatusFilter) => void
  setPropertyTypesFilter: (types: string[]) => void
  setSearchTerm: (term: string) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  applyPreset: (preset: 'active' | 'subdivision' | 'handover' | 'completed') => void
}

const defaultFilters: PropertyFilters = {
  pipeline: 'all',
  status: 'all',
  propertyTypes: [],
  searchTerm: '',
}

export function usePropertyFilters(
  properties: PropertyWithLifecycle[],
  options: UsePropertyFiltersOptions = {}
): UsePropertyFiltersReturn {
  const { initialFilters = {}, persistKey, debounceMs = 300 } = options

  // Initialize filters
  const [filters, setFilters] = useState<PropertyFilters>(() => {
    const initial = { ...defaultFilters, ...initialFilters }

    // Load from localStorage if persistKey is provided
    if (persistKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(persistKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          return { ...initial, ...parsed }
        }
      } catch (error) {
        // Silently fail to load saved filters
      }
    }

    return initial
  })

  // Save filters to localStorage
  useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(persistKey, JSON.stringify(filters))
      } catch (error) {
        // Silently fail to save filters
      }
    }
  }, [filters, persistKey])

  // Apply filters to get filtered properties
  const filteredProperties = useMemo(() => {
    return applyPropertyFilters(properties, filters)
  }, [properties, filters])

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return getFilterCounts(properties)
  }, [properties])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.pipeline !== 'all' ||
      filters.status !== 'all' ||
      filters.propertyTypes.length > 0 ||
      filters.searchTerm.trim() !== ''
    )
  }, [filters])

  // Filter setters
  const setPipelineFilter = useCallback((pipeline: PropertyPipelineFilter) => {
    setFilters((prev) => ({ ...prev, pipeline }))
  }, [])

  const setStatusFilter = useCallback((status: PropertyStatusFilter) => {
    setFilters((prev) => ({ ...prev, status }))
  }, [])

  const setPropertyTypesFilter = useCallback((propertyTypes: string[]) => {
    setFilters((prev) => ({ ...prev, propertyTypes }))
  }, [])

  const setSearchTerm = useCallback((searchTerm: string) => {
    setFilters((prev) => ({ ...prev, searchTerm }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  // Apply preset filters (excluding purchase pipeline)
  const applyPreset = useCallback((preset: 'active' | 'subdivision' | 'handover' | 'completed') => {
    switch (preset) {
      case 'active':
        setFilters({
          pipeline: 'all',
          status: 'active',
          propertyTypes: [],
          searchTerm: '',
        })
        break
      case 'subdivision':
        setFilters({
          pipeline: 'subdivision',
          status: 'all',
          propertyTypes: [],
          searchTerm: '',
        })
        break
      case 'handover':
        setFilters({
          pipeline: 'handover',
          status: 'all',
          propertyTypes: [],
          searchTerm: '',
        })
        break
      case 'completed':
        setFilters({
          pipeline: 'all',
          status: 'completed',
          propertyTypes: [],
          searchTerm: '',
        })
        break
    }
  }, [])

  return {
    filters,
    filteredProperties,
    filterCounts,
    totalCount: properties.length,
    filteredCount: filteredProperties.length,
    setPipelineFilter,
    setStatusFilter,
    setPropertyTypesFilter,
    setSearchTerm,
    clearFilters,
    hasActiveFilters,
    applyPreset,
  }
}
