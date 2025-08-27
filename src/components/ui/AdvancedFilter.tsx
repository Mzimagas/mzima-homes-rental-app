'use client'

import React, { useState, useEffect } from 'react'
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

interface FilterOption {
  id: string
  label: string
  value: any
  count?: number
}

interface FilterGroup {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'range' | 'date' | 'search' | 'boolean'
  options?: FilterOption[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
  icon?: React.ComponentType<any>
}

interface FilterValue {
  [key: string]: any
}

interface AdvancedFilterProps {
  filterGroups: FilterGroup[]
  values: FilterValue
  onChange: (values: FilterValue) => void
  onReset: () => void
  className?: string
  showActiveCount?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
}

export default function AdvancedFilter({
  filterGroups,
  values,
  onChange,
  onReset,
  className = '',
  showActiveCount = true,
  collapsible = true,
  defaultExpanded = false,
}: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [activeFilters, setActiveFilters] = useState(0)

  // Count active filters
  useEffect(() => {
    const count = Object.values(values).filter((value) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some((v) => v !== null && v !== undefined && v !== '')
      }
      return value !== null && value !== undefined && value !== ''
    }).length

    setActiveFilters(count)
  }, [values])

  const handleFilterChange = (filterId: string, value: any) => {
    onChange({
      ...values,
      [filterId]: value,
    })
  }

  const handleReset = () => {
    onReset()
    if (collapsible) {
      setIsExpanded(false)
    }
  }

  const renderFilterControl = (group: FilterGroup) => {
    const value = values[group.id]
    const Icon = group.icon

    switch (group.type) {
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFilterChange(group.id, e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All {group.label}</option>
            {group.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label} {option.count !== undefined && `(${option.count})`}
              </option>
            ))}
          </select>
        )

      case 'multiselect': {
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {group.options?.map((option) => (
              <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((v) => v !== option.value)
                    handleFilterChange(group.id, newValues)
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {option.label} {option.count !== undefined && `(${option.count})`}
                </span>
              </label>
            ))}
          </div>
        )
      }

      case 'range': {
        const rangeValue = value || { min: group.min, max: group.max }
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={rangeValue.min || ''}
                onChange={(e) =>
                  handleFilterChange(group.id, {
                    ...rangeValue,
                    min: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={group.min}
                max={group.max}
                step={group.step}
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                placeholder="Max"
                value={rangeValue.max || ''}
                onChange={(e) =>
                  handleFilterChange(group.id, {
                    ...rangeValue,
                    max: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={group.min}
                max={group.max}
                step={group.step}
              />
            </div>
            {group.min !== undefined && group.max !== undefined && (
              <div className="text-xs text-gray-500">
                Range: {group.min.toLocaleString()} - {group.max.toLocaleString()}
              </div>
            )}
          </div>
        )
      }

      case 'date': {
        const dateValue = value || { start: '', end: '' }
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="date"
                  value={dateValue.start || ''}
                  onChange={(e) =>
                    handleFilterChange(group.id, {
                      ...dateValue,
                      start: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <span className="text-gray-500">to</span>
              <div className="flex-1 relative">
                <input
                  type="date"
                  value={dateValue.end || ''}
                  onChange={(e) =>
                    handleFilterChange(group.id, {
                      ...dateValue,
                      end: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        )
      }

      case 'search':
        return (
          <input
            type="text"
            placeholder={group.placeholder || `Search ${group.label.toLowerCase()}...`}
            value={value || ''}
            onChange={(e) => handleFilterChange(group.id, e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={group.id}
                checked={value === null || value === undefined}
                onChange={() => handleFilterChange(group.id, null)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">All</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={group.id}
                checked={value === true}
                onChange={() => handleFilterChange(group.id, true)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={group.id}
                checked={value === false}
                onChange={() => handleFilterChange(group.id, false)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {showActiveCount && activeFilters > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilters} active
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {activeFilters > 0 && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              Reset all
            </button>
          )}
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronDownIcon
                className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      {(!collapsible || isExpanded) && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filterGroups.map((group) => {
              const Icon = group.icon
              return (
                <div key={group.id} className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{group.label}</span>
                  </label>
                  {renderFilterControl(group)}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Predefined filter configurations for common use cases

export const propertyFilterGroups: FilterGroup[] = [
  {
    id: 'property_type',
    label: 'Property Type',
    type: 'select',
    icon: BuildingOfficeIcon,
    options: [
      { id: 'apartment', label: 'Apartment', value: 'apartment' },
      { id: 'house', label: 'House', value: 'house' },
      { id: 'condo', label: 'Condo', value: 'condo' },
      { id: 'townhouse', label: 'Townhouse', value: 'townhouse' },
    ],
  },
  {
    id: 'rent_range',
    label: 'Monthly Rent',
    type: 'range',
    icon: CurrencyDollarIcon,
    min: 0,
    max: 10000,
    step: 100,
  },
  {
    id: 'occupancy_status',
    label: 'Occupancy Status',
    type: 'select',
    icon: UserGroupIcon,
    options: [
      { id: 'occupied', label: 'Occupied', value: 'occupied' },
      { id: 'vacant', label: 'Vacant', value: 'vacant' },
      { id: 'maintenance', label: 'Under Maintenance', value: 'maintenance' },
    ],
  },
  {
    id: 'location',
    label: 'Location',
    type: 'search',
    placeholder: 'Search by address or neighborhood...',
  },
]

export const tenantFilterGroups: FilterGroup[] = [
  {
    id: 'status',
    label: 'Tenant Status',
    type: 'select',
    icon: UserGroupIcon,
    options: [
      { id: 'active', label: 'Active', value: 'active' },
      { id: 'inactive', label: 'Inactive', value: 'inactive' },
      { id: 'pending', label: 'Pending', value: 'pending' },
    ],
  },
  {
    id: 'lease_expiry',
    label: 'Lease Expiry',
    type: 'date',
    icon: CalendarIcon,
  },
  {
    id: 'rent_range',
    label: 'Monthly Rent',
    type: 'range',
    icon: CurrencyDollarIcon,
    min: 0,
    max: 10000,
    step: 100,
  },
  {
    id: 'search',
    label: 'Search',
    type: 'search',
    placeholder: 'Search by name or email...',
  },
]

export const paymentFilterGroups: FilterGroup[] = [
  {
    id: 'status',
    label: 'Payment Status',
    type: 'multiselect',
    icon: CurrencyDollarIcon,
    options: [
      { id: 'paid', label: 'Paid', value: 'paid' },
      { id: 'pending', label: 'Pending', value: 'pending' },
      { id: 'overdue', label: 'Overdue', value: 'overdue' },
      { id: 'failed', label: 'Failed', value: 'failed' },
    ],
  },
  {
    id: 'amount_range',
    label: 'Amount',
    type: 'range',
    icon: CurrencyDollarIcon,
    min: 0,
    max: 10000,
    step: 50,
  },
  {
    id: 'payment_date',
    label: 'Payment Date',
    type: 'date',
    icon: CalendarIcon,
  },
  {
    id: 'payment_method',
    label: 'Payment Method',
    type: 'select',
    options: [
      { id: 'bank_transfer', label: 'Bank Transfer', value: 'bank_transfer' },
      { id: 'credit_card', label: 'Credit Card', value: 'credit_card' },
      { id: 'cash', label: 'Cash', value: 'cash' },
      { id: 'check', label: 'Check', value: 'check' },
    ],
  },
]
