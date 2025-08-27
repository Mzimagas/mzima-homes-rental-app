'use client'
import { useState } from 'react'
import {
  type PropertyType,
  PropertyTypeEnum,
  getPropertyTypeLabel,
  getPropertyTypeCategory,
} from '../../lib/validation/property'
import PropertyTypeIcon from './PropertyTypeIcon'

interface PropertyTypeFilterProps {
  selectedTypes: PropertyType[]
  onSelectionChange: (types: PropertyType[]) => void
  allowMultiple?: boolean
  showCategories?: boolean
  variant?: 'buttons' | 'dropdown' | 'checkboxes'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function PropertyTypeFilter({
  selectedTypes,
  onSelectionChange,
  allowMultiple = true,
  showCategories = true,
  variant = 'buttons',
  size = 'md',
  className = '',
}: PropertyTypeFilterProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const allTypes = PropertyTypeEnum.options

  // Group types by category
  const rentalTypes = allTypes.filter((type) => getPropertyTypeCategory(type) === 'rental')
  const landTypes = allTypes.filter((type) => getPropertyTypeCategory(type) === 'land')

  const handleTypeToggle = (type: PropertyType) => {
    if (allowMultiple) {
      const newSelection = selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes, type]
      onSelectionChange(newSelection)
    } else {
      onSelectionChange(selectedTypes.includes(type) ? [] : [type])
    }
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  const selectCategory = (category: 'rental' | 'land') => {
    const categoryTypes = category === 'rental' ? rentalTypes : landTypes
    if (allowMultiple) {
      // Toggle category: if all are selected, deselect all; otherwise select all
      const allCategorySelected = categoryTypes.every((type) => selectedTypes.includes(type))
      if (allCategorySelected) {
        onSelectionChange(selectedTypes.filter((type) => !categoryTypes.includes(type)))
      } else {
        const newSelection = [...new Set([...selectedTypes, ...categoryTypes])]
        onSelectionChange(newSelection)
      }
    } else {
      onSelectionChange(categoryTypes.slice(0, 1)) // Select first type in category
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`${sizeClasses[size]} bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-between min-w-[200px]`}
        >
          <span>
            {selectedTypes.length === 0
              ? 'All Property Types'
              : selectedTypes.length === 1
                ? getPropertyTypeLabel(selectedTypes[0])
                : `${selectedTypes.length} types selected`}
          </span>
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="p-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500">Property Types</span>
                {selectedTypes.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {showCategories && (
                <>
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">Rentals</span>
                      <button
                        onClick={() => selectCategory('rental')}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        {rentalTypes.every((type) => selectedTypes.includes(type))
                          ? 'Deselect'
                          : 'Select'}{' '}
                        All
                      </button>
                    </div>
                    {rentalTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center py-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type)}
                          onChange={() => handleTypeToggle(type)}
                          className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <PropertyTypeIcon type={type} size="sm" className="mr-2" />
                        <span className="text-sm">{getPropertyTypeLabel(type)}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">Land</span>
                      <button
                        onClick={() => selectCategory('land')}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        {landTypes.every((type) => selectedTypes.includes(type))
                          ? 'Deselect'
                          : 'Select'}{' '}
                        All
                      </button>
                    </div>
                    {landTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center py-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type)}
                          onChange={() => handleTypeToggle(type)}
                          className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <PropertyTypeIcon type={type} size="sm" className="mr-2" />
                        <span className="text-sm">{getPropertyTypeLabel(type)}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {!showCategories && (
                <div>
                  {allTypes.map((type) => (
                    <label
                      key={type}
                      className="flex items-center py-1 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => handleTypeToggle(type)}
                        className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <PropertyTypeIcon type={type} size="sm" className="mr-2" />
                      <span className="text-sm">{getPropertyTypeLabel(type)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'checkboxes') {
    return (
      <div className={className}>
        <div className="space-y-2">
          {showCategories && (
            <>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Rental Properties</h4>
                  <button
                    onClick={() => selectCategory('rental')}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    {rentalTypes.every((type) => selectedTypes.includes(type))
                      ? 'Deselect'
                      : 'Select'}{' '}
                    All
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {rentalTypes.map((type) => (
                    <label key={type} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => handleTypeToggle(type)}
                        className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <PropertyTypeIcon type={type} size="sm" className="mr-2" />
                      <span className="text-sm">{getPropertyTypeLabel(type)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Land Properties</h4>
                  <button
                    onClick={() => selectCategory('land')}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    {landTypes.every((type) => selectedTypes.includes(type))
                      ? 'Deselect'
                      : 'Select'}{' '}
                    All
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {landTypes.map((type) => (
                    <label key={type} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => handleTypeToggle(type)}
                        className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <PropertyTypeIcon type={type} size="sm" className="mr-2" />
                      <span className="text-sm">{getPropertyTypeLabel(type)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {!showCategories && (
            <div className="grid grid-cols-1 gap-2">
              {allTypes.map((type) => (
                <label key={type} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <PropertyTypeIcon type={type} size="sm" className="mr-2" />
                  <span className="text-sm">{getPropertyTypeLabel(type)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default buttons variant
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {showCategories && (
          <>
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Rental Properties</span>
                <button
                  onClick={() => selectCategory('rental')}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  {rentalTypes.every((type) => selectedTypes.includes(type))
                    ? 'Deselect'
                    : 'Select'}{' '}
                  All
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {rentalTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    className={`${sizeClasses[size]} rounded-lg border transition-all flex items-center ${
                      selectedTypes.includes(type)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <PropertyTypeIcon type={type} size="sm" className="mr-1.5" />
                    {getPropertyTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Land Properties</span>
                <button
                  onClick={() => selectCategory('land')}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  {landTypes.every((type) => selectedTypes.includes(type)) ? 'Deselect' : 'Select'}{' '}
                  All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {landTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    className={`${sizeClasses[size]} rounded-lg border transition-all flex items-center ${
                      selectedTypes.includes(type)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <PropertyTypeIcon type={type} size="sm" className="mr-1.5" />
                    {getPropertyTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {!showCategories && (
          <>
            {allTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeToggle(type)}
                className={`${sizeClasses[size]} rounded-lg border transition-all flex items-center ${
                  selectedTypes.includes(type)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300 hover:bg-primary-50'
                }`}
              >
                <PropertyTypeIcon type={type} size="sm" className="mr-1.5" />
                {getPropertyTypeLabel(type)}
              </button>
            ))}
          </>
        )}

        {selectedTypes.length > 0 && (
          <button
            onClick={clearAll}
            className={`${sizeClasses[size]} text-gray-500 hover:text-gray-700 underline`}
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  )
}
