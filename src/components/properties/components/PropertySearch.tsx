'use client'

import { useState, useEffect } from 'react'
import { FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useDebounce } from '../../../hooks/useDebounce'

interface PropertySearchProps {
  onSearchChange: (searchTerm: string) => void
  placeholder?: string
  resultsCount?: number
  totalCount?: number
  className?: string
  compact?: boolean

  // Filter integration
  showFilterToggle?: boolean
  onFilterToggle?: () => void
  hasActiveFilters?: boolean
  filterCount?: number

  // Quick filters
  showQuickFilters?: boolean
  onQuickFilter?: (preset: 'active' | 'purchase' | 'subdivision' | 'handover' | 'completed') => void
}

export default function PropertySearch({
  onSearchChange,
  placeholder = 'Search properties by name, address, type, or notes...',
  resultsCount,
  totalCount,
  className = '',
  compact = false,
  showFilterToggle = false,
  onFilterToggle,
  hasActiveFilters = false,
  filterCount = 0,
  showQuickFilters = false,
  onQuickFilter,
}: PropertySearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Call the parent's search handler when debounced value changes
  useEffect(() => {
    onSearchChange(debouncedSearchTerm)
  }, [debouncedSearchTerm, onSearchChange])

  const handleClear = () => {
    setSearchTerm('')
    onSearchChange('')
  }

  const showResultsCount = resultsCount !== undefined && totalCount !== undefined

  return (
    <div
      className={`${compact ? 'bg-gray-50 p-3 rounded-md border' : 'bg-white p-4 rounded-lg shadow'} ${className}`}
    >
      <div className="flex flex-col gap-3">
        {/* Search Input with Filter Toggle */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`block w-full pl-10 pr-10 ${compact ? 'py-1.5' : 'py-2'} border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          {showFilterToggle && onFilterToggle && (
            <button
              onClick={onFilterToggle}
              className={`relative inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                hasActiveFilters
                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title={hasActiveFilters ? `${filterCount} filters active - Click to edit` : 'Open filters'}
            >
              <FunnelIcon className="h-5 w-5" />
              {hasActiveFilters && filterCount > 0 && (
                <>
                  <span className="ml-1 hidden sm:inline text-xs">
                    {filterCount} filter{filterCount !== 1 ? 's' : ''}
                  </span>
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full sm:hidden">
                    {filterCount}
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Quick Filter Buttons */}
        {showQuickFilters && onQuickFilter && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onQuickFilter('active')}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 transition-colors"
            >
              🟢 Active
            </button>
            <button
              onClick={() => onQuickFilter('purchase')}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors"
            >
              🏢 Purchase
            </button>
            <button
              onClick={() => onQuickFilter('subdivision')}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
            >
              📐 Subdivision
            </button>
            <button
              onClick={() => onQuickFilter('handover')}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full hover:bg-orange-100 transition-colors"
            >
              🤝 Handover
            </button>
            <button
              onClick={() => onQuickFilter('completed')}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"
            >
              ✅ Completed
            </button>
          </div>
        )}

        {/* Results Count and Active Filters */}
        {showResultsCount && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div>
                {searchTerm ? (
                  resultsCount === 0 ? (
                    <span className="text-gray-500">No results found for &quot;{searchTerm}&quot;</span>
                  ) : (
                    <span>
                      Showing {resultsCount} of {totalCount} properties
                      {searchTerm && <span className="text-gray-500"> for &quot;{searchTerm}&quot;</span>}
                    </span>
                  )
                ) : (
                  <span>Showing all {totalCount} properties</span>
                )}
              </div>
              {hasActiveFilters && filterCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {filterCount} filter{filterCount !== 1 ? 's' : ''} active
                </span>
              )}
            </div>
            {searchTerm && (
              <button
                onClick={handleClear}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
