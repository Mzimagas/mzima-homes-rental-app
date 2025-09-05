'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { PropertyPipelineFilter, PropertyStatusFilter } from '../utils/stage-filtering.utils'

export interface PropertyFilterPanelProps {
  // Filter values
  pipelineFilter: PropertyPipelineFilter
  statusFilter: PropertyStatusFilter
  propertyTypes: string[]

  // Filter counts for display
  filterCounts?: Record<PropertyPipelineFilter, number>

  // Filter setters
  onPipelineChange: (pipeline: PropertyPipelineFilter) => void
  onStatusChange: (status: PropertyStatusFilter) => void
  onPropertyTypesChange: (types: string[]) => void

  // Utility functions
  onClearFilters: () => void
  onApplyPreset: (preset: 'active' | 'subdivision' | 'handover' | 'completed') => void

  // UI props
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onUserInteraction?: () => void
  className?: string
}

const PIPELINE_OPTIONS: {
  value: PropertyPipelineFilter
  label: string
  icon: string
  description: string
}[] = [
  {
    value: 'all',
    label: 'All Properties',
    icon: '🏠',
    description: 'Show all properties regardless of pipeline',
  },
  {
    value: 'direct_addition',
    label: 'Direct Addition',
    icon: '➕',
    description: 'Properties added directly to the system',
  },
  {
    value: 'purchase_pipeline',
    label: 'Purchase Pipeline',
    icon: '🏢',
    description: 'Properties being acquired through purchase',
  },
  {
    value: 'subdivision',
    label: 'Subdivision',
    icon: '📐',
    description: 'Properties created through subdivision',
  },
  {
    value: 'handover',
    label: 'Handover',
    icon: '🤝',
    description: 'Properties in handover process',
  },
]

const STATUS_OPTIONS: { value: PropertyStatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Statuses', color: 'gray' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'completed', label: 'Completed', color: 'blue' },
  { value: 'inactive', label: 'Inactive', color: 'red' },
]

const PROPERTY_TYPE_OPTIONS = [
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'HOUSE', label: 'House' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'LAND', label: 'Land' },
  { value: 'TOWNHOUSE', label: 'Townhouse' },
]

const PRESET_FILTERS = [
  { key: 'active', label: 'Active Properties', icon: '🟢' },
  { key: 'purchase', label: 'Purchase Pipeline', icon: '🏢' },
  { key: 'subdivision', label: 'Subdivision', icon: '📐' },
  { key: 'handover', label: 'Handover', icon: '🤝' },
  { key: 'completed', label: 'Completed', icon: '✅' },
] as const

export default function PropertyFilterPanel({
  pipelineFilter,
  statusFilter,
  propertyTypes,
  filterCounts,
  onPipelineChange,
  onStatusChange,
  onPropertyTypesChange,
  onClearFilters,
  onApplyPreset,
  isCollapsed = false,
  onToggleCollapse,
  onUserInteraction,
  className = '',
}: PropertyFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    pipeline: true,
    status: true,
    propertyTypes: false,
    presets: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handlePropertyTypeToggle = (type: string) => {
    const newTypes = propertyTypes.includes(type)
      ? propertyTypes.filter((t) => t !== type)
      : [...propertyTypes, type]
    onPropertyTypesChange(newTypes)
  }

  const hasActiveFilters =
    pipelineFilter !== 'all' || statusFilter !== 'all' || propertyTypes.length > 0

  if (isCollapsed) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm ${className}`}>
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-between w-full text-left touch-manipulation"
        >
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-900">Filters</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Active
              </span>
            )}
          </div>
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
      onMouseEnter={onUserInteraction}
      onFocus={onUserInteraction}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Property Filters</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {[
                pipelineFilter !== 'all' ? 1 : 0,
                statusFilter !== 'all' ? 1 : 0,
                propertyTypes.length,
              ].reduce((a, b) => a + b, 0)}{' '}
              active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Clear</span>
            </button>
          )}
          {onToggleCollapse && (
            <button onClick={onToggleCollapse} className="text-gray-500 hover:text-gray-700">
              <ChevronUpIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Presets */}
        <div>
          <button
            onClick={() => toggleSection('presets')}
            className="flex items-center justify-between w-full text-left mb-3 touch-manipulation"
          >
            <span className="text-sm font-medium text-gray-900">Quick Filters</span>
            {expandedSections.presets ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.presets && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_FILTERS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => onApplyPreset(preset.key)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                >
                  <span>{preset.icon}</span>
                  <span className="truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline Filter */}
        <div>
          <button
            onClick={() => toggleSection('pipeline')}
            className="flex items-center justify-between w-full text-left mb-3 touch-manipulation"
          >
            <span className="text-sm font-medium text-gray-900">Pipeline Type</span>
            {expandedSections.pipeline ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.pipeline && (
            <div className="space-y-3">
              {PIPELINE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start space-x-3 cursor-pointer group touch-manipulation min-h-[44px]"
                >
                  <input
                    type="radio"
                    name="pipeline"
                    value={option.value}
                    checked={pipelineFilter === option.value}
                    onChange={() => onPipelineChange(option.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
                  />
                  <div className="flex items-start space-x-2 flex-1 min-w-0">
                    <span className="text-sm mt-0.5">{option.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                          {option.label}
                        </span>
                        {filterCounts && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {filterCounts[option.value]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div>
          <button
            onClick={() => toggleSection('status')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <span className="text-sm font-medium text-gray-900">Status</span>
            {expandedSections.status ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.status && (
            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={statusFilter === option.value}
                    onChange={() => onStatusChange(option.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full bg-${option.color}-500`}></div>
                    <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                      {option.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Property Types Filter */}
        <div>
          <button
            onClick={() => toggleSection('propertyTypes')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <span className="text-sm font-medium text-gray-900">Property Types</span>
            {expandedSections.propertyTypes ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.propertyTypes && (
            <div className="space-y-2">
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={propertyTypes.includes(option.value)}
                    onChange={() => handlePropertyTypeToggle(option.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
