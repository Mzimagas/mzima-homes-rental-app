'use client'

import React, { useState } from 'react'

export interface SearchFilter {
  key: string
  label: string
  type: 'select' | 'multiselect' | 'date' | 'range' | 'text'
  options?: { value: string; label: string }[]
  value?: any
}

interface SearchFiltersProps {
  filters: SearchFilter[]
  onFiltersChange: (filters: Record<string, any>) => void
  onClear: () => void
  className?: string
}

/**
 * Advanced search filters component
 */
export default function SearchFilters({
  filters,
  onFiltersChange,
  onClear,
  className = ''
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...activeFilters, [key]: value }
    if (!value || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key]
    }
    setActiveFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClear = () => {
    setActiveFilters({})
    onClear()
  }

  const activeFilterCount = Object.keys(activeFilters).length

  return (
    <div className={`relative ${className}`}>
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium ${
          activeFilterCount > 0
            ? 'bg-blue-50 text-blue-700 border-blue-300'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Search Filters</h3>
            <div className="flex items-center space-x-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClear}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                
                {filter.type === 'select' && (
                  <select
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'multiselect' && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {filter.options?.map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(activeFilters[filter.key] || []).includes(option.value)}
                          onChange={(e) => {
                            const current = activeFilters[filter.key] || []
                            const newValue = e.target.checked
                              ? [...current, option.value]
                              : current.filter((v: string) => v !== option.value)
                            handleFilterChange(filter.key, newValue)
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {filter.type === 'range' && (
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={activeFilters[filter.key]?.min || ''}
                      onChange={(e) => handleFilterChange(filter.key, {
                        ...activeFilters[filter.key],
                        min: e.target.value
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={activeFilters[filter.key]?.max || ''}
                      onChange={(e) => handleFilterChange(filter.key, {
                        ...activeFilters[filter.key],
                        max: e.target.value
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {filter.type === 'text' && (
                  <input
                    type="text"
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${filter.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Quick Filter Presets */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Filters</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleFilterChange('status', 'active')}
                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200"
              >
                Active Only
              </button>
              <button
                onClick={() => handleFilterChange('type', 'property')}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
              >
                Properties
              </button>
              <button
                onClick={() => handleFilterChange('type', 'tenant')}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200"
              >
                Tenants
              </button>
              <button
                onClick={() => handleFilterChange('type', 'payment')}
                className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
              >
                Payments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Default search filters configuration
 */
export const defaultSearchFilters: SearchFilter[] = [
  {
    key: 'type',
    label: 'Content Type',
    type: 'multiselect',
    options: [
      { value: 'property', label: 'Properties' },
      { value: 'tenant', label: 'Tenants' },
      { value: 'payment', label: 'Payments' },
      { value: 'unit', label: 'Units' },
      { value: 'document', label: 'Documents' },
      { value: 'maintenance', label: 'Maintenance' }
    ]
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'overdue', label: 'Overdue' }
    ]
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'date'
  },
  {
    key: 'amountRange',
    label: 'Amount Range (KES)',
    type: 'range'
  },
  {
    key: 'propertyType',
    label: 'Property Type',
    type: 'select',
    options: [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'mixed', label: 'Mixed Use' },
      { value: 'industrial', label: 'Industrial' }
    ]
  }
]
