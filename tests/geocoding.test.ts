import { describe, it, expect } from 'vitest'
import { parseCoordinates, isValidLatLng, shortenAddress, makeFriendlyAddress } from '../src/lib/geocoding'

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



  it('creates friendly addresses from full display names', () => {
    // Test with road + locality
    expect(makeFriendlyAddress('Mombasa Road, Kaloleni, Nairobi County, Kenya')).toBe('Mombasa Road, Kaloleni')

    // Test with street + area
    expect(makeFriendlyAddress('Kenyatta Avenue, Central Business District, Nairobi, Kenya')).toBe('Kenyatta Avenue, Central Business District')

    // Test with generic filtering
    expect(makeFriendlyAddress('Main Street, Westlands, Nairobi County, Kenya, East Africa')).toBe('Main Street, Westlands')

    // Test fallback to first two segments
    expect(makeFriendlyAddress('Kilifi, Coast Province, Kenya')).toBe('Kilifi, Coast Province')

    // Test short input (no change needed)
    expect(makeFriendlyAddress('Short Name')).toBe('Short Name')

    // Test coordinates (should pass through)
    expect(makeFriendlyAddress('-1.2921, 36.8219')).toBe('-1.2921, 36.8219')
  })

  it('shortens addresses to specified number of parts', () => {
    expect(shortenAddress('Mombasa Road, Kaloleni, Nairobi County, Kenya', 3)).toBe('Mombasa Road, Kaloleni, Nairobi County')
    expect(shortenAddress('A, B, C, D, E', 2)).toBe('A, B')
    expect(shortenAddress('Single')).toBe('Single')
  })


})

