// Test script for mapping utilities
const { MappingService } = require('./src/lib/services/mapping.ts')

// Test coordinate validation
console.log('Testing coordinate validation...')
console.log('Valid coordinates:', MappingService.validateCoordinates(-1.2921, 36.8219)) // Nairobi
console.log('Invalid coordinates:', MappingService.validateCoordinates(200, 200))

// Test PostGIS conversion
console.log('\nTesting PostGIS conversion...')
const coordinates = [
  [36.8219, -1.2921],
  [36.8319, -1.2921], 
  [36.8319, -1.3021],
  [36.8219, -1.3021],
  [36.8219, -1.2921]
]

const postGIS = MappingService.coordinatesToPostGIS([coordinates])
console.log('PostGIS geometry:', postGIS)

// Test GeoJSON conversion
const geoJSON = MappingService.postGISToGeoJSON(postGIS)
console.log('GeoJSON:', JSON.stringify(geoJSON, null, 2))

// Test area calculation
console.log('\nTesting area calculation...')
const area = MappingService.calculatePolygonArea(coordinates)
console.log('Area in square meters:', area)
console.log('Area in acres:', area * 0.000247105)

// Test distance calculation
console.log('\nTesting distance calculation...')
const distance = MappingService.calculateDistance(-1.2921, 36.8219, -1.3021, 36.8319)
console.log('Distance in meters:', distance)
