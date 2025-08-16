import { describe, it, expect } from 'vitest'
import { parseCoordinates, isValidLatLng, shortenAddress } from '../src/lib/geocoding'

describe('geocoding utils', () => {
  it('parses simple lat,lng', () => {
    expect(parseCoordinates('-1.2921, 36.8219')).toEqual({ lat: -1.2921, lng: 36.8219 })
  })

  it('parses labeled lat/lng', () => {
    expect(parseCoordinates('lat:-1.29 lng:36.82')).toEqual({ lat: -1.29, lng: 36.82 })
  })

  it('rejects invalid coords', () => {
    expect(parseCoordinates('999, 999')).toBeNull()
    expect(isValidLatLng(95, 0)).toBe(false)
    expect(isValidLatLng(0, 181)).toBe(false)
  })

  it('validates lat/lng ranges', () => {
    expect(isValidLatLng(-90, -180)).toBe(true)
    expect(isValidLatLng(90, 180)).toBe(true)
  })

  it('shortens addresses', () => {
    expect(shortenAddress('A, B, C, D, E', 3)).toBe('A, B, C')
  })
})

