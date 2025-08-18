"use client"

import React from 'react'

interface ViewOnGoogleMapsButtonProps {
  lat?: number | null
  lng?: number | null
  address?: string | null
  propertyName?: string
  className?: string
}

function buildGoogleMapsUrl(lat?: number | null, lng?: number | null, address?: string | null): string | null {
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    // Use lat/lng directly for more precise location
    return `https://www.google.com/maps?q=${lat},${lng}`
  }
  const q = (address ?? '').trim()
  if (q.length > 0) {
    return `https://www.google.com/maps/search/${encodeURIComponent(q)}`
  }
  return null
}

export default function ViewOnGoogleMapsButton({ 
  lat, 
  lng, 
  address, 
  propertyName, 
  className = '' 
}: ViewOnGoogleMapsButtonProps) {
  const mapsUrl = buildGoogleMapsUrl(lat, lng, address)

  if (!mapsUrl) {
    return (
      <div className={`text-xs text-gray-400 px-3 py-2 ${className}`}>
        No location available
      </div>
    )
  }

  const handleClick = () => {
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
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
      <svg 
        className="w-4 h-4" 
        fill="currentColor" 
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
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
