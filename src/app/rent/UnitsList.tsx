"use client"
import { useEffect, useMemo, useState } from 'react'
import { UnitCardSkeleton, ErrorState, EmptyState } from './components/LoadingStates'
import { AmenityList } from './components/AmenityIcons'
import { FavoriteButton, UnitComparison } from './components/InteractiveFeatures'
import OptimizedImage from './components/OptimizedImage'
import SearchBar from './components/SearchBar'

type UnitRow = {
  unit_id: string
  property_id: string
  property_name: string
  physical_address?: string | null
  unit_label: string
  monthly_rent_kes: number | null
  deposit_kes: number | null
  available_from?: string | null
  thumbnail_url?: string | null
}

type Amenity = { code: string; label: string }


// Enhanced unit card component
function UnitCard({ unit, highlight }: { unit: UnitRow, highlight?: (text: string) => React.ReactNode }) {
  const formatPrice = (price: number | null) => {
    if (!price) return 'Price on request'
    return `KES ${price.toLocaleString()}`
  }

  const getAvailabilityStatus = (availableFrom: string | null) => {
    if (!availableFrom) return { text: 'Available Now', color: 'bg-green-100 text-green-700 border border-green-200' }
    const date = new Date(availableFrom)
    const now = new Date()
    if (date <= now) return { text: 'Available Now', color: 'bg-green-100 text-green-700 border border-green-200' }
    return { text: `Available ${date.toLocaleDateString()}`, color: 'bg-amber-100 text-amber-700 border border-amber-200' }
  }

  const status = getAvailabilityStatus(unit.available_from)

  return (
    <a
      href={`/rent/${unit.unit_id}`}
      className="group bg-elevated rounded-xl shadow-sm border border-light overflow-hidden hover:shadow-xl hover:border-medium transition-all duration-300 transform hover:-translate-y-1 hover:scale-102"
    >
      {/* Image Container */}
      <div className="relative aspect-video bg-tertiary overflow-hidden">
        {unit.thumbnail_url ? (
          <OptimizedImage
            src={unit.thumbnail_url}
            alt={`${unit.property_name} - ${unit.unit_label}`}
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-quaternary">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1.5 text-xs font-medium rounded-full backdrop-blur-sm ${status.color}`}>
            {status.text}
          </span>
        </div>

        {/* Interactive Buttons */}
        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <FavoriteButton unitId={unit.unit_id} />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Property and Unit */}
        <div className="mb-4">
          <h3 className="font-semibold text-primary text-lg group-hover:text-brand transition-colors">
            {highlight ? highlight(unit.unit_label) : unit.unit_label}
          </h3>
          <p className="text-secondary text-sm font-medium">{highlight ? highlight(unit.property_name) : unit.property_name}</p>
          {unit.physical_address && (
            <p className="text-tertiary text-xs mt-1 flex items-center">
              <svg className="w-3 h-3 mr-1 text-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {highlight ? highlight(unit.physical_address || '') : unit.physical_address}
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="space-y-1 mb-4">
          <div className="text-2xl font-bold text-primary">
            {formatPrice(unit.monthly_rent_kes)}
            <span className="text-sm font-normal text-tertiary">/month</span>
          </div>
          {unit.deposit_kes && (
            <div className="text-sm text-secondary">
              Deposit: {formatPrice(unit.deposit_kes)}
            </div>
          )}
        </div>

        {/* View Details Button */}
        <div className="mt-auto pt-4 border-t border-light">
          <span className="text-brand text-sm font-medium group-hover:text-primary-800 flex items-center">
            View Details
            <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  )
}

export default function UnitsList() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<UnitRow[]>([])
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

  // Filters
  const [propertyId, setPropertyId] = useState('')
  const [minRent, setMinRent] = useState<string>('')
  const [maxRent, setMaxRent] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 12

  useEffect(() => {
    // Load amenity options once
    const loadAmenities = async () => {
      try {
        const res = await fetch('/api/public/amenities', { cache: 'no-store' })
        const j = await res.json()
        if (j.ok) setAmenities(j.data || [])
      } catch {}
    }
    loadAmenities()
  }, [])

  // Debounced searching flag for UX
  useEffect(() => {
    if (!searchQuery) { setSearching(false); return }
    setSearching(true)
    const t = setTimeout(() => setSearching(false), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const params = new URLSearchParams()
        if (propertyId) params.set('propertyId', propertyId)
        if (minRent) params.set('minRent', minRent)
        if (maxRent) params.set('maxRent', maxRent)
        if (selectedAmenities.length) params.set('amenities', selectedAmenities.join(','))
        const res = await fetch(`/api/public/units?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
        const j = await res.json()
        if (!j.ok) throw new Error(j?.error?.message || 'Failed to load units')
        setRows(j.data || [])
        setPage(1)
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Failed to load units')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [propertyId, minRent, maxRent, selectedAmenities])

  const properties = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach(r => map.set(r.property_id, r.property_name))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rows])

  // Filter by search query with result highlighting support
  const [highlightedQuery, setHighlightedQuery] = useState('')
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows
    const query = searchQuery.toLowerCase()
    setHighlightedQuery(query)
    return rows.filter(unit =>
      unit.property_name.toLowerCase().includes(query) ||
      unit.unit_label.toLowerCase().includes(query) ||
      unit.physical_address?.toLowerCase().includes(query)
    )
  }, [rows, searchQuery])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page])

  const pageCount = Math.ceil(filteredRows.length / pageSize) || 1

  const toggleAmenity = (code: string) => {
    setSelectedAmenities(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  // Helper: highlight search matches
  const highlightMatch = (text: string) => {
    if (!highlightedQuery) return text
    const idx = text.toLowerCase().indexOf(highlightedQuery)
    if (idx === -1) return text
    const before = text.slice(0, idx)
    const match = text.slice(idx, idx + highlightedQuery.length)
    const after = text.slice(idx + highlightedQuery.length)
    return (
      <>
        {before}<mark className="bg-amber-100 text-primary rounded px-1 font-medium">{match}</mark>{after}
      </>
    )
  }

  const clearFilters = () => {
    setPropertyId('')
    setMinRent('')
    setMaxRent('')
    setSelectedAmenities([])
    setSearchQuery('')
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-elevated rounded-xl shadow-md border border-light p-6 backdrop-blur-sm">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={(q) => setSearchQuery(q)}
            onClear={() => setSearchQuery('')}
            searching={searching}
            units={rows}
            amenities={amenities}
            selectedAmenities={selectedAmenities}
            onToggleAmenity={toggleAmenity}
            onApplyQuickFilter={(key) => {
              if (key === 'UNDER_50K') { setMinRent(''); setMaxRent('50000') }
              if (key === '50K_100K') { setMinRent('50000'); setMaxRent('100000') }
              if (key === '100K_PLUS') { setMinRent('100000'); setMaxRent('') }
            }}
          />
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Property</label>
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              className="form-input"
            >
              <option value="">All Properties</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Min Rent (KES)</label>
            <input
              value={minRent}
              onChange={e => setMinRent(e.target.value)}
              className="form-input"
              placeholder="e.g., 50,000"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Max Rent (KES)</label>
            <input
              value={maxRent}
              onChange={e => setMaxRent(e.target.value)}
              className="form-input"
              placeholder="e.g., 150,000"
              inputMode="numeric"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Amenity Filters */}
        {amenities.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-3">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {amenities.map(a => (
                <button
                  key={a.code}
                  onClick={() => toggleAmenity(a.code)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                    selectedAmenities.includes(a.code)
                      ? 'bg-primary-600 text-inverse border-primary-600 shadow-sm'
                      : 'bg-elevated text-secondary border-medium hover:border-brand hover:bg-primary-25 hover:text-brand'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            {loading ? 'Loading...' : `${filteredRows.length} Available Units`}
          </h2>
          {!loading && filteredRows.length > 0 && (
            <p className="text-secondary mt-1">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} units
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <UnitCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Error loading units"
          message={error}
          onRetry={() => window.location.reload()}
        />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          title="No units found"
          message="Try adjusting your search criteria or filters"
          onClear={clearFilters}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paged.map(unit => (
              <UnitCard key={unit.unit_id} unit={unit} highlight={highlightMatch} />
            ))}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center space-x-2">
                {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                disabled={page >= pageCount}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Unit Comparison Feature */}
      <UnitComparison />
    </div>
  )
}

