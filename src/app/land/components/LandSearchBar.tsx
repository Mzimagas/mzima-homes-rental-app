'use client'
import { useState, useRef, useEffect } from 'react'

type LandProperty = {
  property_id: string
  property_name: string
  physical_address?: string
  property_type: string
  total_area_sqm?: number
  total_area_acres?: number
  zoning_classification?: string
}

interface LandSearchBarProps {
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  onClear: () => void
  searching: boolean
  landProperties: LandProperty[]
  selectedPropertyType: string
  onPropertyTypeChange: (type: string) => void
  selectedUtilities: string[]
  onToggleUtility: (utility: string) => void
  onApplyAreaFilter: (key: 'SMALL' | 'MEDIUM' | 'LARGE') => void
  onApplyPriceFilter: (key: 'UNDER_1M' | '1M_5M' | '5M_PLUS') => void
}

const LAND_UTILITIES = [
  { code: 'electricity', label: 'Electricity' },
  { code: 'water', label: 'Water' },
  { code: 'sewer', label: 'Sewer' },
  { code: 'internet', label: 'Internet' },
]

const PROPERTY_TYPES = [
  { code: 'RESIDENTIAL_LAND', label: 'Residential Land' },
  { code: 'COMMERCIAL_LAND', label: 'Commercial Land' },
  { code: 'AGRICULTURAL_LAND', label: 'Agricultural Land' },
  { code: 'MIXED_USE_LAND', label: 'Mixed-Use Land' },
]

export default function LandSearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  searching,
  landProperties,
  selectedPropertyType,
  onPropertyTypeChange,
  selectedUtilities,
  onToggleUtility,
  onApplyAreaFilter,
  onApplyPriceFilter,
}: LandSearchBarProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate suggestions based on search query
  const query = value.trim().toLowerCase()
  const suggestions =
    query.length > 0
      ? [
          ...landProperties
            .filter(
              (p) =>
                p.property_name.toLowerCase().includes(query) ||
                p.physical_address?.toLowerCase().includes(query) ||
                p.zoning_classification?.toLowerCase().includes(query)
            )
            .slice(0, 8)
            .map((p) => ({
              id: `property-${p.property_id}`,
              type: 'property',
              label: p.property_name,
              subLabel: p.physical_address,
              area: p.total_area_acres
                ? `${p.total_area_acres} acres`
                : p.total_area_sqm
                  ? `${p.total_area_sqm.toLocaleString()} sqm`
                  : null,
            })),
        ]
      : []

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    onSubmit(value)
    setOpen(false)
    setActiveIndex(-1)
  }

  const selectSuggestion = (suggestion: any) => {
    onChange(suggestion.label)
    onSubmit(suggestion.label)
    setOpen(false)
    setActiveIndex(-1)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!inputRef.current?.closest('[data-land-search-container]')?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" data-land-search-container>
      <form onSubmit={handleSubmit} aria-label="Search land and plots">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-quaternary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setOpen(true)
              setActiveIndex(-1)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setOpen(true)
              if (!suggestions.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') {
                if (activeIndex >= 0) {
                  e.preventDefault()
                  selectSuggestion(suggestions[activeIndex])
                }
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder="Search land by location, size, or zoning..."
            className="form-input pl-10 pr-24 text-lg"
          />

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onClear()
                setOpen(false)
              }}
              className="absolute inset-y-0 right-10 px-2 text-quaternary hover:text-secondary transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="absolute inset-y-0 right-0 px-4 text-inverse bg-primary-600 hover:bg-primary-700 rounded-r-lg transition-colors shadow-sm hover:shadow-md"
            aria-label="Search"
          >
            {searching ? (
              <svg
                className="animate-spin h-5 w-5 mx-1 text-inverse"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-elevated border border-light rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          {/* Quick Filters */}
          <div className="px-4 py-3 border-b border-light bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-tertiary">Quick Filters</span>
            </div>

            {/* Property Type Filters */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type.code}
                    onClick={() =>
                      onPropertyTypeChange(selectedPropertyType === type.code ? '' : type.code)
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      selectedPropertyType === type.code
                        ? 'bg-primary-600 text-inverse border border-primary-600 shadow-sm'
                        : 'bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Area Filters */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onApplyAreaFilter('SMALL')}
                  className="px-3 py-1.5 text-xs rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors"
                >
                  Under 1 Acre
                </button>
                <button
                  onClick={() => onApplyAreaFilter('MEDIUM')}
                  className="px-3 py-1.5 text-xs rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors"
                >
                  1-5 Acres
                </button>
                <button
                  onClick={() => onApplyAreaFilter('LARGE')}
                  className="px-3 py-1.5 text-xs rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors"
                >
                  5+ Acres
                </button>
              </div>
            </div>

            {/* Price Filters */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onApplyPriceFilter('UNDER_1M')}
                  className="px-3 py-1.5 text-xs rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors"
                >
                  Under 1M
                </button>
                <button
                  onClick={() => onApplyPriceFilter('1M_5M')}
                  className="px-3 py-1.5 text-xs rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors"
                >
                  1M - 5M
                </button>
                <button
                  onClick={() => onApplyPriceFilter('5M_PLUS')}
                  className="px-3 py-1.5 text-xs rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors"
                >
                  5M+
                </button>
              </div>
            </div>

            {/* Utility Filters */}
            <div className="flex flex-wrap gap-2">
              {LAND_UTILITIES.map((utility) => (
                <button
                  key={utility.code}
                  onClick={() => onToggleUtility(utility.code)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedUtilities.includes(utility.code)
                      ? 'bg-primary-600 text-inverse border-primary-600 shadow-sm'
                      : 'bg-elevated text-secondary border-medium hover:border-brand hover:bg-primary-25 hover:text-brand'
                  }`}
                >
                  {utility.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <ul className="max-h-72 overflow-auto">
            {suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-tertiary">
                {query ? 'No land properties found' : 'Start typing to search...'}
              </li>
            ) : (
              suggestions.map((s, idx) => (
                <li
                  key={s.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => selectSuggestion(s)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    idx === activeIndex
                      ? 'bg-primary-50 text-brand'
                      : 'hover:bg-secondary text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.label}</div>
                      {s.subLabel && <div className="text-xs text-quaternary">{s.subLabel}</div>}
                    </div>
                    {s.area && (
                      <div className="text-xs text-tertiary bg-tertiary px-2 py-1 rounded-full">
                        {s.area}
                      </div>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
