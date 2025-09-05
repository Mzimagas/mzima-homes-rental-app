/**
 * Dashboard Search and Filtering System
 * Advanced search capabilities following properties module patterns with global search integration
 * Features real-time search, filters, saved searches, and keyboard shortcuts
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ClockIcon,
  BookmarkIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { useDashboardContext } from '../../../contexts/DashboardContextProvider'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'

// Search and filter interfaces
export interface SearchFilter {
  id: string
  label: string
  type: 'text' | 'select' | 'date' | 'range' | 'boolean' | 'multiselect'
  options?: { value: string; label: string }[]
  value: any
  placeholder?: string
  min?: number
  max?: number
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  filters: SearchFilter[]
  timestamp: Date
  isGlobal?: boolean
}

export interface SearchResult {
  id: string
  type: 'property' | 'tenant' | 'payment' | 'document' | 'report'
  title: string
  subtitle?: string
  description?: string
  metadata?: Record<string, any>
  relevance: number
}

// Component props
export interface DashboardSearchProps {
  placeholder?: string
  showFilters?: boolean
  showSavedSearches?: boolean
  onSearch?: (query: string, filters: SearchFilter[]) => void
  onResultSelect?: (result: SearchResult) => void
  className?: string
}

// Search suggestion component
interface SearchSuggestionProps {
  suggestion: string
  query: string
  onClick: (suggestion: string) => void
}

const SearchSuggestion: React.FC<SearchSuggestionProps> = ({ suggestion, query, onClick }) => {
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900">{part}</mark>
      ) : part
    )
  }

  return (
    <button
      onClick={() => onClick(suggestion)}
      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-2">
        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-900">
          {highlightMatch(suggestion, query)}
        </span>
      </div>
    </button>
  )
}

// Filter component
interface FilterComponentProps {
  filter: SearchFilter
  onChange: (filterId: string, value: any) => void
}

const FilterComponent: React.FC<FilterComponentProps> = ({ filter, onChange }) => {
  const handleChange = (value: any) => {
    onChange(filter.id, value)
  }

  switch (filter.type) {
    case 'text':
      return (
        <input
          type="text"
          value={filter.value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={filter.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      )
    
    case 'select':
      return (
        <select
          value={filter.value || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All {filter.label}</option>
          {filter.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    
    case 'date':
      return (
        <input
          type="date"
          value={filter.value || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      )
    
    case 'range':
      return (
        <div className="flex space-x-2">
          <input
            type="number"
            value={filter.value?.min || ''}
            onChange={(e) => handleChange({ ...filter.value, min: e.target.value })}
            placeholder="Min"
            min={filter.min}
            max={filter.max}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="number"
            value={filter.value?.max || ''}
            onChange={(e) => handleChange({ ...filter.value, max: e.target.value })}
            placeholder="Max"
            min={filter.min}
            max={filter.max}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )
    
    case 'boolean':
      return (
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={filter.value || false}
            onChange={(e) => handleChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{filter.label}</span>
        </label>
      )
    
    case 'multiselect':
      return (
        <div className="space-y-2">
          {filter.options?.map(option => (
            <label key={option.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filter.value?.includes(option.value) || false}
                onChange={(e) => {
                  const currentValues = filter.value || []
                  const newValues = e.target.checked
                    ? [...currentValues, option.value]
                    : currentValues.filter((v: string) => v !== option.value)
                  handleChange(newValues)
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      )
    
    default:
      return null
  }
}

// Saved searches component
interface SavedSearchesProps {
  searches: SavedSearch[]
  onSelect: (search: SavedSearch) => void
  onDelete: (searchId: string) => void
}

const SavedSearches: React.FC<SavedSearchesProps> = ({ searches, onSelect, onDelete }) => {
  if (searches.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <BookmarkIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No saved searches</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {searches.map(search => (
        <div key={search.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
          <button
            onClick={() => onSelect(search)}
            className="flex-1 text-left"
          >
            <div className="font-medium text-gray-900">{search.name}</div>
            <div className="text-sm text-gray-600">{search.query}</div>
            <div className="text-xs text-gray-500">
              {search.timestamp.toLocaleDateString()}
            </div>
          </button>
          <button
            onClick={() => onDelete(search.id)}
            className="p-1 text-gray-400 hover:text-red-600 rounded"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * Main Dashboard Search Component
 */
export const DashboardSearch: React.FC<DashboardSearchProps> = ({
  placeholder = "Search properties, tenants, payments...",
  showFilters = true,
  showSavedSearches = true,
  onSearch,
  onResultSelect,
  className = ''
}) => {
  const { state, actions } = useDashboardContext()
  const store = useDashboardStore()
  
  const [query, setQuery] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Default filters
  const [filters, setFilters] = useState<SearchFilter[]>([
    {
      id: 'type',
      label: 'Type',
      type: 'select',
      value: '',
      options: [
        { value: 'property', label: 'Properties' },
        { value: 'tenant', label: 'Tenants' },
        { value: 'payment', label: 'Payments' },
        { value: 'document', label: 'Documents' },
        { value: 'report', label: 'Reports' }
      ]
    },
    {
      id: 'location',
      label: 'Location',
      type: 'multiselect',
      value: [],
      options: [
        { value: 'westlands', label: 'Westlands' },
        { value: 'karen', label: 'Karen' },
        { value: 'kilimani', label: 'Kilimani' },
        { value: 'lavington', label: 'Lavington' }
      ]
    },
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'range',
      value: { min: '', max: '' },
      placeholder: 'Select date range'
    },
    {
      id: 'amount',
      label: 'Amount (KES)',
      type: 'range',
      value: { min: '', max: '' },
      min: 0,
      max: 1000000
    }
  ])

  // Search suggestions
  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return []
    
    const commonSearches = [
      'Westlands properties',
      'Karen villas',
      'Overdue payments',
      'Vacant units',
      'Maintenance requests',
      'Lease expirations',
      'Monthly revenue',
      'Tenant satisfaction'
    ]
    
    return commonSearches
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
  }, [query])

  // Handle search
  const handleSearch = useCallback((searchQuery: string = query) => {
    if (!searchQuery.trim()) return

    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 10)
      localStorage.setItem('dashboard-recent-searches', JSON.stringify(updated))
      return updated
    })

    // Trigger search
    if (onSearch) {
      onSearch(searchQuery, filters)
    }

    // Update context
    actions.setSearchQuery(searchQuery)
    actions.setSearchFilters(filters)

    setShowSuggestions(false)
  }, [query, filters, onSearch, actions])

  // Handle filter change
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFilters(prev => prev.map(filter => 
      filter.id === filterId ? { ...filter, value } : filter
    ))
  }, [])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion)
    handleSearch(suggestion)
  }, [handleSearch])

  // Save current search
  const handleSaveSearch = useCallback(() => {
    if (!query.trim()) return

    const searchName = prompt('Enter a name for this search:')
    if (!searchName) return

    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name: searchName,
      query,
      filters: [...filters],
      timestamp: new Date()
    }

    setSavedSearches(prev => {
      const updated = [newSearch, ...prev]
      localStorage.setItem('dashboard-saved-searches', JSON.stringify(updated))
      return updated
    })
  }, [query, filters])

  // Load saved searches
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-saved-searches')
    if (saved) {
      try {
        const searches = JSON.parse(saved).map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }))
        setSavedSearches(searches)
      } catch (error) {
        console.error('Failed to load saved searches:', error)
      }
    }

    const recent = localStorage.getItem('dashboard-recent-searches')
    if (recent) {
      try {
        setRecentSearches(JSON.parse(recent))
      } catch (error) {
        console.error('Failed to load recent searches:', error)
      }
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      
      // Escape to close suggestions
      if (event.key === 'Escape') {
        setShowSuggestions(false)
        searchInputRef.current?.blur()
      }
      
      // Enter to search
      if (event.key === 'Enter' && document.activeElement === searchInputRef.current) {
        handleSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSearch])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(prev => prev.map(filter => ({
      ...filter,
      value: filter.type === 'multiselect' ? [] : filter.type === 'range' ? { min: '', max: '' } : ''
    })))
  }, [])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.some(filter => {
      if (filter.type === 'multiselect') return filter.value?.length > 0
      if (filter.type === 'range') return filter.value?.min || filter.value?.max
      return filter.value
    })
  }, [filters])

  return (
    <div ref={searchContainerRef} className={`dashboard-search relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-1 rounded-md transition-colors ${
                hasActiveFilters || showFilterPanel
                  ? 'text-blue-600 bg-blue-100'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Filters"
            >
              <FunnelIcon className="w-4 h-4" />
            </button>
          )}
          
          {query && (
            <button
              onClick={handleSaveSearch}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
              title="Save search"
            >
              <BookmarkIcon className="w-4 h-4" />
            </button>
          )}
          
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 border border-gray-200 rounded text-xs text-gray-500">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Search Suggestions */}
      {showSuggestions && (query || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {/* Current query suggestions */}
          {suggestions.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <SearchSuggestion
                  key={index}
                  suggestion={suggestion}
                  query={query}
                  onClick={handleSuggestionClick}
                />
              ))}
            </div>
          )}
          
          {/* Recent searches */}
          {recentSearches.length > 0 && !query && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center space-x-1">
                <ClockIcon className="w-3 h-3" />
                <span>Recent</span>
              </div>
              {recentSearches.slice(0, 5).map((recent, index) => (
                <SearchSuggestion
                  key={index}
                  suggestion={recent}
                  query=""
                  onClick={handleSuggestionClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-40 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <div className="flex items-center space-x-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilterPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filters.map(filter => (
              <div key={filter.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                <FilterComponent
                  filter={filter}
                  onChange={handleFilterChange}
                />
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowFilterPanel(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleSearch()
                setShowFilterPanel(false)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Saved Searches (if enabled and has searches) */}
      {showSavedSearches && savedSearches.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Saved Searches</h4>
          <SavedSearches
            searches={savedSearches}
            onSelect={(search) => {
              setQuery(search.query)
              setFilters(search.filters)
              handleSearch(search.query)
            }}
            onDelete={(searchId) => {
              setSavedSearches(prev => {
                const updated = prev.filter(s => s.id !== searchId)
                localStorage.setItem('dashboard-saved-searches', JSON.stringify(updated))
                return updated
              })
            }}
          />
        </div>
      )}
    </div>
  )
}

export default DashboardSearch
