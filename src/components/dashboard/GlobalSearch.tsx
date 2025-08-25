'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useDashboardActions } from '../../hooks/useDashboardActions'
import { universalSearchService, SearchResult, SearchSuggestion } from '../../services/UniversalSearchService'
import { useRouter } from 'next/navigation'

interface GlobalSearchProps {
  className?: string
  placeholder?: string
  onResultSelect?: (result: SearchResult) => void
  showRecentSearches?: boolean
  maxResults?: number
}

/**
 * Global search component that searches across all dashboard data
 */
export default function GlobalSearch({ 
  className = '',
  placeholder = 'Search properties, tenants, payments...',
  onResultSelect
}: GlobalSearchProps) {
  const { state, setSearchTerm, selectProperty, selectTenant } = useDashboardActions()
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const searchResults: SearchResult[] = []

      // Search properties
      const properties = await RentalManagementService.getRentalProperties()
      const propertyResults = properties
        .filter(property => 
          property.name.toLowerCase().includes(query.toLowerCase()) ||
          property.address?.toLowerCase().includes(query.toLowerCase())
        )
        .map(property => ({
          id: `property-${property.id}`,
          type: 'property' as const,
          title: property.name,
          subtitle: property.address || 'Property',
          data: property
        }))

      // Search tenants
      const tenants = await RentalManagementService.getTenants()
      const tenantResults = tenants
        .filter(tenant => 
          tenant.full_name.toLowerCase().includes(query.toLowerCase()) ||
          tenant.email?.toLowerCase().includes(query.toLowerCase()) ||
          tenant.phone?.toLowerCase().includes(query.toLowerCase())
        )
        .map(tenant => ({
          id: `tenant-${tenant.id}`,
          type: 'tenant' as const,
          title: tenant.full_name,
          subtitle: tenant.email || tenant.phone || 'Tenant',
          data: tenant
        }))

      // Search payments
      const payments = await RentalManagementService.getPayments()
      const paymentResults = payments
        .filter(payment => 
          payment.reference_number?.toLowerCase().includes(query.toLowerCase()) ||
          payment.payment_method?.toLowerCase().includes(query.toLowerCase())
        )
        .map(payment => ({
          id: `payment-${payment.id}`,
          type: 'payment' as const,
          title: `Payment - KES ${payment.amount?.toLocaleString()}`,
          subtitle: `${payment.payment_method} - ${new Date(payment.payment_date).toLocaleDateString()}`,
          data: payment
        }))

      searchResults.push(...propertyResults, ...tenantResults, ...paymentResults)
      setResults(searchResults.slice(0, 10)) // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchTerm(query)
    setIsOpen(true)
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  const handleResultClick = (result: SearchResult) => {
    // Update context based on result type
    if (result.type === 'property') {
      selectProperty(result.data)
    } else if (result.type === 'tenant') {
      selectTenant(result.data)
    }

    // Call custom handler
    onResultSelect?.(result)
    
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'property':
        return (
          <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'tenant':
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'payment':
        return (
          <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      default:
        return (
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={state.searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <kbd className="inline-flex items-center px-2 py-1 border border-gray-200 rounded text-xs font-sans font-medium text-gray-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (state.searchTerm.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <div className="flex items-center space-x-3">
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {result.subtitle}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">
                    {result.type}
                  </span>
                </div>
              </button>
            ))
          ) : state.searchTerm.length >= 2 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No results found</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
