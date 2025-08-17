"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

type UnitRow = {
  unit_id: string
  property_id: string
  property_name: string
  physical_address?: string | null
  unit_label: string
  monthly_rent_kes: number | null
}

type Amenity = { code: string; label: string }

type Suggestion = {
  id: string
  type: 'property' | 'unit' | 'location' | 'amenity' | 'history'
  label: string
  subLabel?: string
}

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  onClear: () => void
  searching: boolean
  units: UnitRow[]
  amenities: Amenity[]
  selectedAmenities: string[]
  onToggleAmenity: (code: string) => void
  onApplyQuickFilter: (key: 'UNDER_50K' | '50K_100K' | '100K_PLUS') => void
}

const HISTORY_KEY = 'rentSearchHistory'

function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      if (saved) setHistory(JSON.parse(saved))
    } catch {}
  }, [])

  const add = (term: string) => {
    if (!term.trim()) return
    setHistory((prev) => {
      const next = [term, ...prev.filter((h) => h.toLowerCase() !== term.toLowerCase())].slice(0, 8)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const remove = (term: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.toLowerCase() !== term.toLowerCase())
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const clearAll = () => {
    setHistory([])
    try { localStorage.removeItem(HISTORY_KEY) } catch {}
  }

  return { history, add, remove, clearAll }
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  searching,
  units,
  amenities,
  selectedAmenities,
  onToggleAmenity,
  onApplyQuickFilter,
}: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = 'rent-search-listbox'
  const { history, add: addHistory, remove: removeHistory, clearAll } = useSearchHistory()

  // Derived data for suggestions
  const propertySuggestions = useMemo(() => {
    const map = new Map<string, string>()
    units.forEach((u) => map.set(u.property_name, u.property_name))
    return Array.from(map.values())
  }, [units])

  const locationSuggestions = useMemo(() => {
    const set = new Set<string>()
    units.forEach((u) => u.physical_address && set.add(u.physical_address))
    return Array.from(set)
  }, [units])

  const unitSuggestions = useMemo(() => units.map((u) => `${u.property_name} – ${u.unit_label}`), [units])

  const query = value.trim().toLowerCase()

  const filteredSuggestions: Suggestion[] = useMemo(() => {
    if (!open) return []

    const matches = (arr: string[], type: Suggestion['type'], subLabel?: (s: string) => string): Suggestion[] => {
      return arr
        .filter((s) => (query ? s.toLowerCase().includes(query) : true))
        .slice(0, 5)
        .map((s, i) => ({ id: `${type}-${i}-${s}`, type, label: s, subLabel: subLabel ? subLabel(s) : undefined }))
    }

    const out: Suggestion[] = []

    if (query.length) {
      out.push(
        ...matches(propertySuggestions, 'property'),
        ...matches(unitSuggestions, 'unit'),
        ...matches(locationSuggestions, 'location'),
        ...matches(amenities.map((a) => a.label), 'amenity', (s) => 'Amenity')
      )
    } else {
      // Show history when no query
      out.push(...history.map((h, i) => ({ id: `history-${i}-${h}`, type: 'history', label: h })))
    }

    return out.slice(0, 12)
  }, [open, query, propertySuggestions, unitSuggestions, locationSuggestions, amenities, history])

  const selectSuggestion = (s: Suggestion) => {
    if (s.type === 'amenity') {
      const amenity = amenities.find((a) => a.label === s.label)
      if (amenity) onToggleAmenity(amenity.code)
      return
    }
    onChange(s.label)
    addHistory(s.label)
    onSubmit(s.label)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    addHistory(value)
    onSubmit(value)
    setOpen(false)
    setActiveIndex(-1)
  }

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!inputRef.current) return
      if (!(e.target as Node).isConnected) return
      const container = inputRef.current.closest('[data-search-container]')
      if (container && !container.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" data-search-container>
      <form onSubmit={handleSubmit} aria-label="Search rentals">
        <div
          role="combobox"
          aria-expanded={open}
          aria-owns={listboxId}
          aria-haspopup="listbox"
          className="relative"
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
              if (!filteredSuggestions.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, filteredSuggestions.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') {
                if (activeIndex >= 0) {
                  e.preventDefault()
                  selectSuggestion(filteredSuggestions[activeIndex])
                } else {
                  handleSubmit()
                }
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? filteredSuggestions[activeIndex]?.id : undefined}
            placeholder="Search by property, unit, location or amenity..."
            className="form-input pl-10 pr-24 text-lg"
          />

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={() => { onClear(); setOpen(false); }}
              className="absolute inset-y-0 right-10 px-2 text-quaternary hover:text-secondary transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
              <svg className="animate-spin h-5 w-5 mx-1 text-inverse" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
              {!query && history.length > 0 && (
                <button onClick={clearAll} className="text-xs text-tertiary hover:text-secondary transition-colors">Clear history</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onApplyQuickFilter('UNDER_50K')} className="px-3 py-1.5 text-sm rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors">Under 50k</button>
              <button onClick={() => onApplyQuickFilter('50K_100K')} className="px-3 py-1.5 text-sm rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors">50k - 100k</button>
              <button onClick={() => onApplyQuickFilter('100K_PLUS')} className="px-3 py-1.5 text-sm rounded-full bg-tertiary hover:bg-primary-50 hover:text-brand transition-colors">100k+</button>
            </div>
            {/* Amenity chips */}
            {amenities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {amenities.slice(0, 8).map((a) => (
                  <button
                    key={a.code}
                    onClick={() => onToggleAmenity(a.code)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      selectedAmenities.includes(a.code) ? 'bg-primary-600 text-inverse border-primary-600 shadow-sm' : 'bg-elevated text-secondary border-medium hover:border-brand hover:bg-primary-25 hover:text-brand'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Suggestions */}
          <ul role="listbox" id={listboxId} className="max-h-72 overflow-auto">
            {filteredSuggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-tertiary">{query ? 'No suggestions' : 'Start typing to search...'}</li>
            ) : (
              filteredSuggestions.map((s, idx) => (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={idx === activeIndex}
                  id={s.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(s)}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                    idx === activeIndex ? 'bg-primary-50 text-brand' : 'hover:bg-secondary text-secondary'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs px-2 py-0.5 rounded-full border border-light text-tertiary bg-tertiary">
                      {s.type}
                    </span>
                    <span className="font-medium">{s.label}</span>
                    {s.subLabel && <span className="text-xs text-quaternary">{s.subLabel}</span>}
                  </div>
                  {s.type === 'history' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeHistory(s.label) }}
                      aria-label={`Remove ${s.label} from history`}
                      className="text-xs text-quaternary hover:text-tertiary transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
