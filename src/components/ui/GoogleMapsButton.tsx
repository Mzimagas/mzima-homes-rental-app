import React from 'react'
import { buildPropertyMapsUrl } from '../../lib/geo'

interface GoogleMapsButtonProps {
  property: {
    lat?: number | null
    lng?: number | null
    physical_address?: string | null
    location?: string | null
    name?: string
  }
  variant?: 'compact' | 'full'
  className?: string
}

export function GoogleMapsButton({ property, variant = 'full', className = '' }: GoogleMapsButtonProps) {
  const mapsUrl = buildPropertyMapsUrl(property)

  if (!mapsUrl) {
    return null
  }

  const hasCoordinates = property.lat && property.lng

  if (variant === 'compact') {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors ${className}`}
        aria-label="Open in Google Maps"
        title={hasCoordinates ? "Pin exact location on Google Maps" : "Search location on Google Maps"}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-3 h-3 mr-1"
        >
          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        {hasCoordinates ? 'Pin' : 'Search'}
      </a>
    )
  }

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm hover:shadow-md ${className}`}
      aria-label="View on Google Maps"
      title={hasCoordinates ? "Pin exact location on Google Maps" : "Search location on Google Maps"}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-4 h-4 mr-2"
      >
        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
      {hasCoordinates ? 'Pin Location' : 'Search on Maps'}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor" 
        className="w-3 h-3 ml-1"
      >
        <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
      </svg>
    </a>
  )
}

// Alternative button with different styling for property cards
export function GoogleMapsCardButton({ property, className = '' }: GoogleMapsButtonProps) {
  const mapsUrl = buildPropertyMapsUrl(property)

  if (!mapsUrl) {
    return null
  }

  const hasCoordinates = property.lat && property.lng

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-md transition-colors ${className}`}
      aria-label="View on Google Maps"
      title={hasCoordinates ? "Pin exact location on Google Maps" : "Search location on Google Maps"}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-3 h-3 mr-1"
      >
        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
      {hasCoordinates ? 'Pin Location' : 'Search Maps'}
    </a>
  )
}
