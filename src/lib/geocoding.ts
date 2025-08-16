'use client'

// Lightweight geocoding helpers using OpenStreetMap Nominatim
// Note: Respect Nominatim usage policy. We use small queries and debounce on the UI side.

export type GeocodeResult = {
  address: string
  lat: number
  lng: number
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

function headers(): Record<string, string> {
  // Provide an identifier via Referer/User-Agent implicitly; browsers set Referer.
  return {
    'Accept': 'application/json',
  }
}


export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = new URL(NOMINATIM_BASE + '/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'json')
  url.searchParams.set('zoom', '16')

  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) return null
  const data = (await res.json()) as { display_name?: string }
  return data.display_name || null
}

export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  // Supports formats like "-1.2921, 36.8219" or "lat:-1.29 lng:36.82"
  const simple = input.trim().match(/^(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/)
  if (simple) {
    const lat = parseFloat(simple[1])
    const lng = parseFloat(simple[2])
    if (isValidLatLng(lat, lng)) return { lat, lng }
  }
  const labeled = input.toLowerCase().match(/lat\s*[:=]\s*(-?\d{1,3}\.\d+)[,\s]+(lon|lng)\s*[:=]\s*(-?\d{1,3}\.\d+)/)
  if (labeled) {
    const lat = parseFloat(labeled[1])
    const lng = parseFloat(labeled[3])
    if (isValidLatLng(lat, lng)) return { lat, lng }
  }
  return null
}

export function isValidLatLng(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function shortenAddress(address: string, parts: number = 4): string {
  const segs = address.split(',').map(s => s.trim())
  return segs.slice(0, parts).join(', ')
}

