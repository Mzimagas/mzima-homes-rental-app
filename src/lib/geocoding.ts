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
  try {
    const url = new URL(NOMINATIM_BASE + '/reverse')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('format', 'json')
    url.searchParams.set('zoom', '16')
    url.searchParams.set('addressdetails', '1')

    const res = await fetch(url.toString(), {
      headers: headers(),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!res.ok) {
      console.warn(`Reverse geocoding failed: ${res.status} ${res.statusText}`)
      return null
    }

    const data = (await res.json()) as { display_name?: string, error?: string }

    if (data.error) {
      console.warn(`Reverse geocoding API error: ${data.error}`)
      return null
    }

    const address = data.display_name || null

    if (!address || address.trim() === '') {
      console.warn('Empty address returned from reverse geocoding')
      return null
    }

    return address
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
    return null
  }
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

// Heuristic: create a concise, human-friendly label like "Road, Area"
// from Nominatim display_name. Filters out country/county and picks
// the most relevant nearby locality.
export function makeFriendlyAddress(address: string): string {
  try {
    const segs = address.split(',').map(s => s.trim()).filter(Boolean)
    if (segs.length === 0) return address

    const isGeneric = (s: string) => /^(kenya|africa|east africa|[a-z ]+ county)$/i.test(s)
    const isRoady = (s: string) => /(\b|\s)(road|rd\.?|street|st\.?|avenue|ave\.?|highway|hwy\.?|way|close|lane|ln\.?|drive|dr\.?|place|pl\.?|bypass|ring road|expressway)(\b|\s)/i.test(s)

    // Prefer a road-like segment plus the next non-generic locality
    const roadIdx = segs.findIndex(isRoady)
    if (roadIdx !== -1) {
      const localityIdx = segs.findIndex((s, i) => i > roadIdx && !isGeneric(s))
      const parts = [segs[roadIdx]]
      if (localityIdx !== -1) {
        parts.push(segs[localityIdx])
      }
      return parts.join(', ')
    }

    // Otherwise take first two non-generic segments
    const filtered = segs.filter(s => !isGeneric(s))
    const short = filtered.slice(0, 2).join(', ')
    return short || segs.slice(0, 2).join(', ') || address
  } catch {
    return address
  }
}
