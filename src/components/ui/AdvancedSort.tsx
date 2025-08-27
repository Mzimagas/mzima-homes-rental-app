'use client'

import React, { useState } from 'react'
import {
  ArrowsUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

interface SortOption {
  id: string
  label: string
  field: string
  type?: 'string' | 'number' | 'date' | 'boolean'
}

interface SortRule {
  field: string
  direction: 'asc' | 'desc'
  label: string
}

interface AdvancedSortProps {
  sortOptions: SortOption[]
  sortRules: SortRule[]
  onChange: (sortRules: SortRule[]) => void
  className?: string
  maxRules?: number
  showPresets?: boolean
}

interface SortPreset {
  id: string
  label: string
  rules: SortRule[]
}

export default function AdvancedSort({
  sortOptions,
  sortRules,
  onChange,
  className = '',
  maxRules = 3,
  showPresets = true,
}: AdvancedSortProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const addSortRule = () => {
    if (sortRules.length >= maxRules) return

    // Find the first available sort option
    const usedFields = sortRules.map((rule) => rule.field)
    const availableOption = sortOptions.find((option) => !usedFields.includes(option.field))

    if (availableOption) {
      const newRule: SortRule = {
        field: availableOption.field,
        direction: 'asc',
        label: availableOption.label,
      }
      onChange([...sortRules, newRule])
    }
  }

  const updateSortRule = (index: number, updates: Partial<SortRule>) => {
    const newRules = [...sortRules]
    newRules[index] = { ...newRules[index], ...updates }

    // Update label if field changed
    if (updates.field) {
      const option = sortOptions.find((opt) => opt.field === updates.field)
      if (option) {
        newRules[index].label = option.label
      }
    }

    onChange(newRules)
  }

  const removeSortRule = (index: number) => {
    const newRules = sortRules.filter((_, i) => i !== index)
    onChange(newRules)
  }

  const moveSortRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...sortRules]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex >= 0 && targetIndex < newRules.length) {
      ;[newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]]
      onChange(newRules)
    }
  }

  const applyPreset = (preset: SortPreset) => {
    onChange(preset.rules)
    setIsExpanded(false)
  }

  const clearAllRules = () => {
    onChange([])
  }

  const getAvailableOptions = (currentField?: string) => {
    const usedFields = sortRules.map((rule) => rule.field).filter((field) => field !== currentField)
    return sortOptions.filter((option) => !usedFields.includes(option.field))
  }

  // Predefined sort presets
  const presets: SortPreset[] = [
    {
      id: 'name_asc',
      label: 'Name (A-Z)',
      rules: [{ field: 'name', direction: 'asc', label: 'Name' }],
    },
    {
      id: 'name_desc',
      label: 'Name (Z-A)',
      rules: [{ field: 'name', direction: 'desc', label: 'Name' }],
    },
    {
      id: 'date_newest',
      label: 'Newest First',
      rules: [{ field: 'created_at', direction: 'desc', label: 'Date Created' }],
    },
    {
      id: 'date_oldest',
      label: 'Oldest First',
      rules: [{ field: 'created_at', direction: 'asc', label: 'Date Created' }],
    },
    {
      id: 'amount_high',
      label: 'Amount (High to Low)',
      rules: [{ field: 'amount', direction: 'desc', label: 'Amount' }],
    },
    {
      id: 'amount_low',
      label: 'Amount (Low to High)',
      rules: [{ field: 'amount', direction: 'asc', label: 'Amount' }],
    },
  ]

  const availablePresets = presets.filter((preset) =>
    preset.rules.every((rule) => sortOptions.some((option) => option.field === rule.field))
  )

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <ArrowsUpDownIcon className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Sort</h3>
          {sortRules.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {sortRules.length} rule{sortRules.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {sortRules.length > 0 && (
            <button
              onClick={clearAllRules}
              className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ChevronDownIcon
              className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Sort Controls */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Presets */}
          {showPresets && availablePresets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Sort</h4>
              <div className="flex flex-wrap gap-2">
                {availablePresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Sort Rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Custom Sort</h4>
              {sortRules.length < maxRules && getAvailableOptions().length > 0 && (
                <button
                  onClick={addSortRule}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-3 w-3 mr-1" />
                  Add Rule
                </button>
              )}
            </div>

            {sortRules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ArrowsUpDownIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No sort rules defined</p>
                <p className="text-xs">Add a rule to customize sorting</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortRules.map((rule, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Priority indicator */}
                    <div className="flex flex-col items-center space-y-1">
                      <span className="text-xs font-medium text-gray-500">{index + 1}</span>
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveSortRule(index, 'up')}
                          disabled={index === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUpIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveSortRule(index, 'down')}
                          disabled={index === sortRules.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDownIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Field selector */}
                    <div className="flex-1">
                      <select
                        value={rule.field}
                        onChange={(e) => updateSortRule(index, { field: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {getAvailableOptions(rule.field).map((option) => (
                          <option key={option.id} value={option.field}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Direction selector */}
                    <div>
                      <select
                        value={rule.direction}
                        onChange={(e) =>
                          updateSortRule(index, { direction: e.target.value as 'asc' | 'desc' })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeSortRule(index)}
                      className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sort Summary */}
          {sortRules.length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Sort order:{' '}
                {sortRules.map((rule, index) => (
                  <span key={index}>
                    {index > 0 && ', then by '}
                    <span className="font-medium">{rule.label}</span>
                    <span className="text-gray-400"> ({rule.direction === 'asc' ? '↑' : '↓'})</span>
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Predefined sort options for common use cases

export const propertySortOptions: SortOption[] = [
  { id: 'name', label: 'Property Name', field: 'name', type: 'string' },
  { id: 'address', label: 'Address', field: 'address', type: 'string' },
  { id: 'property_type', label: 'Property Type', field: 'property_type', type: 'string' },
  { id: 'monthly_rent', label: 'Monthly Rent', field: 'monthly_rent', type: 'number' },
  { id: 'total_units', label: 'Total Units', field: 'total_units', type: 'number' },
  { id: 'occupancy_rate', label: 'Occupancy Rate', field: 'occupancy_rate', type: 'number' },
  { id: 'created_at', label: 'Date Created', field: 'created_at', type: 'date' },
  { id: 'updated_at', label: 'Last Updated', field: 'updated_at', type: 'date' },
]

export const tenantSortOptions: SortOption[] = [
  { id: 'full_name', label: 'Name', field: 'full_name', type: 'string' },
  { id: 'email', label: 'Email', field: 'email', type: 'string' },
  { id: 'monthly_rent', label: 'Monthly Rent', field: 'monthly_rent', type: 'number' },
  { id: 'lease_start_date', label: 'Lease Start', field: 'lease_start_date', type: 'date' },
  { id: 'lease_end_date', label: 'Lease End', field: 'lease_end_date', type: 'date' },
  { id: 'status', label: 'Status', field: 'status', type: 'string' },
  { id: 'created_at', label: 'Date Added', field: 'created_at', type: 'date' },
]

export const paymentSortOptions: SortOption[] = [
  { id: 'payment_date', label: 'Payment Date', field: 'payment_date', type: 'date' },
  { id: 'due_date', label: 'Due Date', field: 'due_date', type: 'date' },
  { id: 'amount', label: 'Amount', field: 'amount', type: 'number' },
  { id: 'status', label: 'Status', field: 'status', type: 'string' },
  { id: 'payment_method', label: 'Payment Method', field: 'payment_method', type: 'string' },
  { id: 'tenant_name', label: 'Tenant Name', field: 'tenant_name', type: 'string' },
  { id: 'property_name', label: 'Property Name', field: 'property_name', type: 'string' },
]
