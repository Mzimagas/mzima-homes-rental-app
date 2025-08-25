'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDashboardActions } from '../../hooks/useDashboardActions'
import { universalSearchService, SearchResult, SearchSuggestion } from '../../services/UniversalSearchService'
import { useRouter } from 'next/navigation'

interface EnhancedGlobalSearchProps {
  className?: string
  placeholder?: string
  onResultSelect?: (result: SearchResult) => void
  showRecentSearches?: boolean
  maxResults?: number
  fullScreen?: boolean
}

/**
 * Enhanced Global Search component with universal search capabilities
 */
export default function EnhancedGlobalSearch({ 
  className = '',
  placeholder = 'Search properties, tenants, payments...',
  onResultSelect,
  showRecentSearches = true,
  maxResults = 20,
  fullScreen = false
}: EnhancedGlobalSearchProps) {
  const { state, setSearchTerm, selectProperty, selectTenant } = useDashboardActions()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(universalSearchService.getRecentSearches())
  }, [])

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }

      if (event.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const searchResults = await universalSearchService.search(searchQuery, {
          limit: maxResults
        })
        setResults(searchResults)
        
        // Get suggestions
        const searchSuggestions = await universalSearchService.getSuggestions(searchQuery)
        setSuggestions(searchSuggestions)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [maxResults]
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSearchTerm(value)
    setSelectedIndex(-1)
    
    if (value.trim()) {
      setShowSuggestions(false)
      debouncedSearch(value)
    } else {
      setResults([])
      setShowSuggestions(showRecentSearches && recentSearches.length > 0)
    }
  }

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true)
    if (!query.trim() && showRecentSearches && recentSearches.length > 0) {
      setShowSuggestions(true)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = showSuggestions ? suggestions.length + recentSearches.length : results.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % totalItems)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0) {
        if (showSuggestions) {
          const allSuggestions = [...suggestions, ...recentSearches.map(search => ({ text: search, type: 'query' as const }))]
          const selected = allSuggestions[selectedIndex]
          if (selected) {
            setQuery(selected.text)
            debouncedSearch(selected.text)
            setShowSuggestions(false)
          }
        } else {
          const selected = results[selectedIndex]
          if (selected) {
            handleResultSelect(selected)
          }
        }
      } else if (query.trim()) {
        // Search with current query
        debouncedSearch(query)
        setShowSuggestions(false)
      }
    }
  }

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    // Update dashboard context based on result type
    if (result.type === 'property') {
      selectProperty(result.metadata)
    } else if (result.type === 'tenant') {
      selectTenant(result.metadata)
    }

    // Navigate to result URL if available
    if (result.url) {
      router.push(result.url)
    }

    // Call custom handler
    onResultSelect?.(result)

    // Close search
    setIsOpen(false)
    setQuery('')
    setResults([])
    setShowSuggestions(false)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion | string) => {
    const text = typeof suggestion === 'string' ? suggestion : suggestion.text
    setQuery(text)
    debouncedSearch(text)
    setShowSuggestions(false)
  }

  // Clear recent searches
  const handleClearRecentSearches = () => {
    universalSearchService.clearRecentSearches()
    setRecentSearches([])
    setShowSuggestions(false)
  }

  // Get result icon
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'property':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'tenant':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'payment':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Searching...</p>
            </div>
          )}

          {/* Suggestions and Recent Searches */}
          {showSuggestions && !isLoading && (
            <div className="p-2">
              {suggestions.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500 px-3 py-1">Suggestions</p>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${
                        selectedIndex === index ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              )}

              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 py-1">
                    <p className="text-xs font-medium text-gray-500">Recent Searches</p>
                    <button
                      onClick={handleClearRecentSearches}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(search)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${
                        selectedIndex === suggestions.length + index ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <svg className="inline h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {search}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {!showSuggestions && !isLoading && results.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-medium text-gray-500 px-3 py-1">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  className={`w-full text-left px-3 py-3 rounded-md hover:bg-gray-100 ${
                    selectedIndex === index ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getResultIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {result.subtitle}
                      </p>
                      {result.description && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {result.description}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {result.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!showSuggestions && !isLoading && query.trim() && results.length === 0 && (
            <div className="p-4 text-center">
              <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-gray-500">No results found for "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
