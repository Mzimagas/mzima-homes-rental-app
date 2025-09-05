'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { PropertyWithLifecycle } from '../components/properties/types/property-management.types'
import {
  PropertyFilters,
  PropertyPipelineFilter,
  PropertyStatusFilter,
  applyPropertyFilters,
  getFilterCounts
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
  
  // Filter setters
  setPipelineFilter: (pipeline: PropertyPipelineFilter) => void
  setStatusFilter: (status: PropertyStatusFilter) => void
  setPropertyTypesFilter: (types: string[]) => void
  setSearchTerm: (term: string) => void
  setDateRange: (range: { start: Date | null; end: Date | null }) => void
  
  // Utility functions
  clearFilters: () => void
  resetFilters: () => void
  hasActiveFilters: boolean
  
  // Preset filters
  applyPreset: (preset: 'active' | 'purchase' | 'subdivision' | 'handover' | 'completed') => void
}

const defaultFilters: PropertyFilters = {
  pipeline: 'all',
  status: 'all',
  propertyTypes: [],
  searchTerm: '',
  dateRange: {
    start: null,
    end: null
  }
}

export function usePropertyFilters(
  properties: PropertyWithLifecycle[],
  options: UsePropertyFiltersOptions = {}
): UsePropertyFiltersReturn {
  const {
    initialFilters = {},
    persistKey = 'property-filters',
    debounceMs = 300
  } = options

  // Initialize filters from localStorage or defaults
  const [filters, setFilters] = useState<PropertyFilters>(() => {
    if (typeof window !== 'undefined' && persistKey) {
      try {
        const saved = localStorage.getItem(persistKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          return { ...defaultFilters, ...parsed, ...initialFilters }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load saved filters:', error)
      }
    }
    return { ...defaultFilters, ...initialFilters }
  })

  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && persistKey) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(filters))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to save filters:', error)
      }
    }
  }, [filters, persistKey])

  // Apply filters to properties
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
      filters.searchTerm.trim() !== '' ||
      filters.dateRange?.start !== null ||
      filters.dateRange?.end !== null
    )
  }, [filters])

  // Filter setters
  const setPipelineFilter = useCallback((pipeline: PropertyPipelineFilter) => {
    setFilters(prev => ({ ...prev, pipeline }))
  }, [])

  const setStatusFilter = useCallback((status: PropertyStatusFilter) => {
    setFilters(prev => ({ ...prev, status }))
  }, [])

  const setPropertyTypesFilter = useCallback((propertyTypes: string[]) => {
    setFilters(prev => ({ ...prev, propertyTypes }))
  }, [])

  const setSearchTerm = useCallback((searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }))
  }, [])

  const setDateRange = useCallback((dateRange: { start: Date | null; end: Date | null }) => {
    setFilters(prev => ({ ...prev, dateRange }))
  }, [])

  // Utility functions
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilters, ...initialFilters })
  }, [initialFilters])

  // Preset filters
  const applyPreset = useCallback((preset: 'active' | 'purchase' | 'subdivision' | 'handover' | 'completed') => {
    switch (preset) {
      case 'active':
        setFilters(prev => ({ ...prev, status: 'active', pipeline: 'all' }))
        break
      case 'purchase':
        setFilters(prev => ({ ...prev, pipeline: 'purchase_pipeline', status: 'all' }))
        break
      case 'subdivision':
        setFilters(prev => ({ ...prev, pipeline: 'subdivision', status: 'all' }))
        break
      case 'handover':
        setFilters(prev => ({ ...prev, pipeline: 'handover', status: 'all' }))
        break
      case 'completed':
        setFilters(prev => ({ ...prev, status: 'completed', pipeline: 'all' }))
        break
    }
  }, [])

  return {
    filters,
    filteredProperties,
    filterCounts,
    totalCount: properties.length,
    filteredCount: filteredProperties.length,
    
    // Filter setters
    setPipelineFilter,
    setStatusFilter,
    setPropertyTypesFilter,
    setSearchTerm,
    setDateRange,
    
    // Utility functions
    clearFilters,
    resetFilters,
    hasActiveFilters,
    
    // Preset filters
    applyPreset
  }
}
