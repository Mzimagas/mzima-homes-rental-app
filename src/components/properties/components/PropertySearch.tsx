'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '../../../hooks/useDebounce'

interface PropertySearchProps {
  onSearchChange: (searchTerm: string) => void
  placeholder?: string
  resultsCount?: number
  totalCount?: number
  className?: string
  compact?: boolean
}

export default function PropertySearch({
  onSearchChange,
  placeholder = 'Search properties by name, address, type, or notes...',
  resultsCount,
  totalCount,
  className = '',
  compact = false,
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
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
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
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Results Count */}
        {showResultsCount && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {searchTerm ? (
                resultsCount === 0 ? (
                  <span className="text-gray-500">No results found for "{searchTerm}"</span>
                ) : (
                  <span>
                    Showing {resultsCount} of {totalCount} properties
                    {searchTerm && <span className="text-gray-500"> for "{searchTerm}"</span>}
                  </span>
                )
              ) : (
                <span>Showing all {totalCount} properties</span>
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
