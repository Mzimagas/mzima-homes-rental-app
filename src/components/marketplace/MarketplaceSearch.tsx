'use client'

import { useState, useEffect } from 'react'
import { FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useDebounce } from '../../hooks/useDebounce'

interface MarketplaceSearchProps {
  onSearchChange: (searchTerm: string) => void
  onSizeFilterChange: (sizeFilter: string) => void
  placeholder?: string
  resultsCount?: number
  totalCount?: number
  className?: string
  searchTerm: string
  selectedSizeFilter: string
}

export default function MarketplaceSearch({
  onSearchChange,
  onSizeFilterChange,
  placeholder = 'Search properties by name, location, description...',
  resultsCount,
  totalCount,
  className = '',
  searchTerm,
  selectedSizeFilter,
}: MarketplaceSearchProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300)

  // Call the parent's search handler when debounced value changes
  useEffect(() => {
    onSearchChange(debouncedSearchTerm)
  }, [debouncedSearchTerm, onSearchChange])

  // Sync with external search term changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  const handleClear = () => {
    setLocalSearchTerm('')
  }

  const landSizeFilters = [
    { value: 'all', label: 'All Sizes' },
    { value: '50x100', label: '50 x 100 (≈0.1 Ha)' },
    { value: '100x100', label: '100 x 100 (≈0.2 Ha)' },
    { value: 'half_acre', label: 'Half Acre (≈0.2 Ha)' },
  ]

  const showResultsCount = resultsCount !== undefined && totalCount !== undefined

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 md:p-6 ${className}`}>
      <div className="space-y-4">
        {/* Search Input Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Properties
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={placeholder}
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              />
              {localSearchTerm && (
                <button
                  onClick={handleClear}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Land Size Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Land Size
            </label>
            <select
              value={selectedSizeFilter}
              onChange={(e) => onSizeFilterChange(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
            >
              {landSizeFilters.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setLocalSearchTerm('')
              onSizeFilterChange('all')
            }}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"
          >
            🏠 All Properties
          </button>
          <button
            onClick={() => onSizeFilterChange('50x100')}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              selectedSizeFilter === '50x100'
                ? 'text-blue-700 bg-blue-50 border border-blue-200'
                : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            📐 50 x 100
          </button>
          <button
            onClick={() => onSizeFilterChange('100x100')}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              selectedSizeFilter === '100x100'
                ? 'text-green-700 bg-green-50 border border-green-200'
                : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            📏 100 x 100
          </button>
          <button
            onClick={() => onSizeFilterChange('half_acre')}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              selectedSizeFilter === 'half_acre'
                ? 'text-purple-700 bg-purple-50 border border-purple-200'
                : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            🏞️ Half Acre
          </button>
        </div>

        {/* Results Count */}
        {showResultsCount && (
          <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
            <div>
              {localSearchTerm ? (
                resultsCount === 0 ? (
                  <span className="text-gray-500">
                    No properties found for &quot;{localSearchTerm}&quot;
                  </span>
                ) : (
                  <span>
                    Showing {resultsCount} of {totalCount} properties
                    <span className="text-gray-500"> for &quot;{localSearchTerm}&quot;</span>
                  </span>
                )
              ) : selectedSizeFilter !== 'all' ? (
                <span>
                  Showing {resultsCount} {landSizeFilters.find(s => s.value === selectedSizeFilter)?.label.toLowerCase()} properties
                </span>
              ) : (
                <span>Showing all {totalCount} available properties</span>
              )}
            </div>
            {(localSearchTerm || selectedSizeFilter !== 'all') && (
              <button
                onClick={() => {
                  setLocalSearchTerm('')
                  onSizeFilterChange('all')
                }}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
