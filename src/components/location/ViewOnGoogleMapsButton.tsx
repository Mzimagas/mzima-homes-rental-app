'use client'

import React, { useMemo, useRef, useEffect } from 'react'

interface ViewOnGoogleMapsButtonProps {
  lat?: number | null
  lng?: number | null
  address?: string | null
  propertyName?: string
  className?: string
  debug?: boolean
  debugContext?: string
}

function buildGoogleMapsUrl(
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
  debug?: boolean,
  context?: string
): string | null {
  // Only log in development and avoid duplicate logging
  if (debug && process.env.NODE_ENV !== 'production') {
    console.group(`🗺️ Google Maps URL Generation${context ? ` - ${context}` : ''}`)
    console.log('🔍 Coordinate validation:', {
      latValid: lat != null && !Number.isNaN(lat),
      lngValid: lng != null && !Number.isNaN(lng),
      latType: typeof lat,
      lngType: typeof lng,
      latValue: lat,
      lngValue: lng,
    })
  }

  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    // Use lat/lng directly for more precise location
    const url = `https://www.google.com/maps?q=${lat},${lng}`
    if (debug) {
            console.groupEnd()
    }
    return url
  }

  const q = (address ?? '').trim()
  if (q.length > 0) {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(q)}`
    if (debug) {
            console.groupEnd()
    }
    return url
  }

  if (debug) {
        console.groupEnd()
  }
  return null
}

export default function ViewOnGoogleMapsButton({
  lat,
  lng,
  address,
  propertyName,
  className = '',
  debug = false,
  debugContext,
}: ViewOnGoogleMapsButtonProps) {
  // Memoize URL generation to avoid recomputation on every render
  const mapsUrl = useMemo(() => {
    return buildGoogleMapsUrl(lat, lng, address, debug, debugContext)
  }, [lat, lng, address, debug, debugContext])

  // Track logging to avoid duplicates in StrictMode
  const hasLogged = useRef(false)

  useEffect(() => {
    if (debug && process.env.NODE_ENV !== 'production' && !hasLogged.current) {
      hasLogged.current = true
      // Logging is now handled in buildGoogleMapsUrl with production guards
    }
  }, [debug, lat, lng, address])

  // Lazy click handler - only generate URL when actually needed
  const handleClick = () => {
    if (mapsUrl) {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (!mapsUrl) {
    return (
      <div className={`text-xs text-gray-400 px-3 py-2 ${className}`}>No location available</div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center space-x-2 px-3 py-2 
        bg-blue-50 hover:bg-blue-100 
        border border-blue-200 hover:border-blue-300
        rounded-lg transition-all duration-200 
        text-blue-700 hover:text-blue-800 
        text-sm font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${className}
      `}
      title={`View ${propertyName || 'property'} location on Google Maps`}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
          clipRule="evenodd"
        />
      </svg>
      <span>View on Google Maps</span>
      <svg
        className="w-3 h-3 opacity-60"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </button>
  )
}
