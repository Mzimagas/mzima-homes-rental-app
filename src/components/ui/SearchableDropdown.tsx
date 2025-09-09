'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

export interface DropdownOption {
  id: string
  label: string
  sublabel?: string
  value?: any
}

interface SearchableDropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  disabled?: boolean
  emptyMessage?: string
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  required = false,
  className = '',
  disabled = false,
  emptyMessage = 'No options found',
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState<DropdownOption[]>(options)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options)
    } else {
      const filtered = options.filter(
        (option) =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (option.sublabel && option.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredOptions(filtered)
    }
  }, [searchTerm, options])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const selectedOption = options.find((option) => option.id === value)

  const handleSelect = (optionId: string) => {
    onChange(optionId)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0].id)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <span className="flex items-center">
          {selectedOption ? (
            <span className="block truncate">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-gray-500 ml-2">({selectedOption.sublabel})</span>
              )}
            </span>
          ) : (
            <span className="block truncate text-gray-500">{placeholder}</span>
          )}
        </span>
        <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {selectedOption && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto p-1 hover:bg-gray-100 rounded"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          ) : (
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Search Input */}
          <div className="sticky top-0 bg-white px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">{emptyMessage}</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`
                    w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                    ${option.id === value ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                  `}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-sm text-gray-500">{option.sublabel}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
