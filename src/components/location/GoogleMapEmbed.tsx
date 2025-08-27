'use client'

import React from 'react'

interface GoogleMapEmbedProps {
  lat?: number | null
  lng?: number | null
  address?: string | null
  className?: string
  zoom?: number // 1-21 typical
  title?: string
  // If true, render nothing when no valid location rather than a placeholder
  hideWhenEmpty?: boolean
}

function buildEmbedSrc(
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
  zoom: number = 15
): string | null {
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    // Use lat/lng directly
    return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`
  }
  const q = (address ?? '').trim()
  if (q.length > 0) {
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed`
  }
  return null
}

export default function GoogleMapEmbed({
  lat,
  lng,
  address,
  className,
  zoom = 15,
  title = 'Property location map',
  hideWhenEmpty,
}: GoogleMapEmbedProps) {
  const src = buildEmbedSrc(lat, lng, address, zoom)

  if (!src) {
    if (hideWhenEmpty) return null
    return (
      <div
        className={
          'w-full bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-500 text-sm ' +
          (className ?? '')
        }
      >
        No map location available
      </div>
    )
  }

  return (
    <div
      className={'w-full overflow-hidden rounded-md border border-gray-200 ' + (className ?? '')}
    >
      <iframe
        src={src}
        title={title}
        width="100%"
        height="100%"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        aria-label={title}
      />
    </div>
  )
}
