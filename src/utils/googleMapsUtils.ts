/**
 * Google Maps utility functions for generating URLs and debugging location data
 */

export interface LocationData {
  lat?: number | null
  lng?: number | null
  address?: string | null
  propertyName?: string | null
}

/**
 * Generate Google Maps URL with fallback logic
 * Priority: coordinates > address > property name
 */
export function generateGoogleMapsUrl(location: LocationData): string | null {
  const { lat, lng, address, propertyName } = location

  // First priority: Use coordinates if available and valid
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }

  // Second priority: Use address if available
  const addressToUse = (address ?? '').trim()
  if (addressToUse.length > 0) {
    return `https://www.google.com/maps/search/${encodeURIComponent(addressToUse)}`
  }

  // Third priority: Use property name if available
  const nameToUse = (propertyName ?? '').trim()
  if (nameToUse.length > 0) {
    return `https://www.google.com/maps/search/${encodeURIComponent(nameToUse)}`
  }

  // No valid location data available
  return null
}

/**
 * Validate location data and return validation results
 */
export function validateLocationData(location: LocationData): {
  isValid: boolean
  hasCoordinates: boolean
  hasAddress: boolean
  hasPropertyName: boolean
  issues: string[]
} {
  const { lat, lng, address, propertyName } = location
  const issues: string[] = []

  // Check coordinates
  const hasValidLat = lat != null && !Number.isNaN(lat) && lat >= -90 && lat <= 90
  const hasValidLng = lng != null && !Number.isNaN(lng) && lng >= -180 && lng <= 180
  const hasCoordinates = hasValidLat && hasValidLng

  if (lat != null && !hasValidLat) {
    issues.push(`Invalid latitude: ${lat} (must be between -90 and 90)`)
  }
  if (lng != null && !hasValidLng) {
    issues.push(`Invalid longitude: ${lng} (must be between -180 and 180)`)
  }

  // Check address
  const hasAddress = (address ?? '').trim().length > 0

  // Check property name
  const hasPropertyName = (propertyName ?? '').trim().length > 0

  // Overall validity
  const isValid = hasCoordinates || hasAddress || hasPropertyName

  if (!isValid) {
    issues.push('No valid location data provided (coordinates, address, or property name)')
  }

  return {
    isValid,
    hasCoordinates,
    hasAddress,
    hasPropertyName,
    issues,
  }
}

/**
 * Debug location data and log detailed information
 */
export function debugLocationData(location: LocationData, context?: string): void {
  const validation = validateLocationData(location)
  const url = generateGoogleMapsUrl(location)

  console.group(`🗺️ Google Maps Debug${context ? ` - ${context}` : ''}`)
  console.log('📍 Location Data:', location)
  console.log('✅ Validation:', validation)
  console.log('🔗 Generated URL:', url)

  if (validation.issues.length > 0) {
    console.warn('⚠️ Issues:', validation.issues)
  }

  if (validation.hasCoordinates) {
    console.log('🎯 Using coordinates (most accurate)')
  } else if (validation.hasAddress) {
    console.log('📍 Using address (fallback)')
  } else if (validation.hasPropertyName) {
    console.log('🏠 Using property name (last resort)')
  } else {
    console.error('❌ No valid location data available')
  }

  console.groupEnd()
}

/**
 * Extract location data from purchase pipeline item
 */
export function extractPurchaseLocationData(purchase: any): LocationData {
  return {
    lat: purchase.property_lat ?? null,
    lng: purchase.property_lng ?? null,
    address: purchase.property_physical_address || purchase.property_address || null,
    propertyName: purchase.property_name || null,
  }
}

/**
 * Extract location data from handover pipeline item
 */
export function extractHandoverLocationData(handover: any): LocationData {
  return {
    lat: handover.property_lat ?? null,
    lng: handover.property_lng ?? null,
    address: handover.property_physical_address || handover.property_address || null,
    propertyName: handover.property_name || null,
  }
}

/**
 * Extract location data from property object
 */
export function extractPropertyLocationData(property: any): LocationData {
  return {
    lat: property.lat ?? null,
    lng: property.lng ?? null,
    address: property.physical_address || property.address || null,
    propertyName: property.name || null,
  }
}

/**
 * Test Google Maps URL generation with sample data
 */
export function testGoogleMapsUrls(): void {
  console.group('🧪 Google Maps URL Generation Tests')

  const testCases = [
    {
      name: 'Valid Coordinates',
      data: {
        lat: -1.2921,
        lng: 36.8219,
        address: 'Nairobi, Kenya',
        propertyName: 'Test Property',
      },
      expected: 'https://www.google.com/maps?q=-1.2921,36.8219',
    },
    {
      name: 'Address Only',
      data: {
        lat: null,
        lng: null,
        address: 'Westlands, Nairobi, Kenya',
        propertyName: 'Test Property',
      },
      expected: 'https://www.google.com/maps/search/Westlands%2C%20Nairobi%2C%20Kenya',
    },
    {
      name: 'Property Name Only',
      data: { lat: null, lng: null, address: '', propertyName: 'Karen Estate Plot 123' },
      expected: 'https://www.google.com/maps/search/Karen%20Estate%20Plot%20123',
    },
    {
      name: 'No Valid Data',
      data: { lat: null, lng: null, address: '', propertyName: '' },
      expected: null,
    },
    {
      name: 'Invalid Coordinates',
      data: { lat: NaN, lng: undefined, address: 'Backup Address', propertyName: 'Test' },
      expected: 'https://www.google.com/maps/search/Backup%20Address',
    },
  ]

  testCases.forEach((testCase) => {
    const result = generateGoogleMapsUrl(testCase.data)
    const passed = result === testCase.expected

    console.log(`${passed ? '✅' : '❌'} ${testCase.name}:`)
    console.log(`   Expected: ${testCase.expected}`)
    console.log(`   Got:      ${result}`)

    if (!passed) {
      console.error(`   ❌ Test failed for: ${testCase.name}`)
    }
  })

  console.groupEnd()
}

// Export for use in development/debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).googleMapsUtils = {
    generateGoogleMapsUrl,
    validateLocationData,
    debugLocationData,
    testGoogleMapsUrls,
    extractPurchaseLocationData,
    extractHandoverLocationData,
    extractPropertyLocationData,
  }
}
