// Mapping and Geospatial Services for Land Management
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GeoJSON types
export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
}

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][] // Array of linear rings
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: GeoJSONPoint | GeoJSONPolygon
  properties: Record<string, any>
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

// Mapping service class
export class MappingService {
  // Convert coordinates to PostGIS geometry
  static coordinatesToPostGIS(coordinates: number[][], type: 'POINT' | 'POLYGON' = 'POLYGON'): string {
    if (type === 'POINT' && coordinates.length === 1) {
      const [lng, lat] = coordinates[0]
      return `POINT(${lng} ${lat})`
    }
    
    if (type === 'POLYGON') {
      const coordString = coordinates.map(ring => 
        '(' + ring.map(coord => `${coord[0]} ${coord[1]}`).join(',') + ')'
      ).join(',')
      return `POLYGON(${coordString})`
    }
    
    throw new Error('Invalid coordinates or type')
  }

  // Convert PostGIS geometry to GeoJSON
  static postGISToGeoJSON(wkt: string): GeoJSONPoint | GeoJSONPolygon | null {
    try {
      if (wkt.startsWith('POINT')) {
        const coords = wkt.match(/POINT\(([^)]+)\)/)
        if (coords) {
          const [lng, lat] = coords[1].split(' ').map(Number)
          return { type: 'Point', coordinates: [lng, lat] }
        }
      }
      
      if (wkt.startsWith('POLYGON')) {
        const coords = wkt.match(/POLYGON\(\(([^)]+)\)\)/)
        if (coords) {
          const points = coords[1].split(',').map(point => {
            const [lng, lat] = point.trim().split(' ').map(Number)
            return [lng, lat]
          })
          return { type: 'Polygon', coordinates: [points] }
        }
      }
      
      return null
    } catch (error) {
      console.error('Error converting PostGIS to GeoJSON:', error)
      return null
    }
  }

  // Calculate area of polygon in square meters
  static calculatePolygonArea(coordinates: number[][]): number {
    if (coordinates.length < 3) return 0
    
    // Use shoelace formula for area calculation
    let area = 0
    const n = coordinates.length
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += coordinates[i][0] * coordinates[j][1]
      area -= coordinates[j][0] * coordinates[i][1]
    }
    
    area = Math.abs(area) / 2
    
    // Convert from degrees to square meters (approximate)
    // This is a rough approximation - for precise calculations, use proper projection
    const metersPerDegree = 111320 // at equator
    return area * metersPerDegree * metersPerDegree
  }

  // Calculate distance between two points in meters
  static calculateDistance(point1: [number, number], point2: [number, number]): number {
    const [lng1, lat1] = point1
    const [lng2, lat2] = point2
    
    const R = 6371000 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    
    return R * c
  }

  // Get parcels within a bounding box
  static async getParcelsInBounds(
    bounds: { north: number; south: number; east: number; west: number }
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_parcels_in_bounds', {
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west
        })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting parcels in bounds:', error)
      return []
    }
  }

  // Get plots within a bounding box
  static async getPlotsInBounds(
    bounds: { north: number; south: number; east: number; west: number }
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_plots_in_bounds', {
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west
        })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting plots in bounds:', error)
      return []
    }
  }

  // Find parcels near a point
  static async findParcelsNearPoint(
    longitude: number,
    latitude: number,
    radiusMeters: number = 1000
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('find_parcels_near_point', {
          lng: longitude,
          lat: latitude,
          radius_m: radiusMeters
        })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error finding parcels near point:', error)
      return []
    }
  }

  // Check if point is within parcel
  static async isPointInParcel(
    longitude: number,
    latitude: number,
    parcelId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('is_point_in_parcel', {
          lng: longitude,
          lat: latitude,
          parcel_id: parcelId
        })

      if (error) throw error
      return data || false
    } catch (error) {
      console.error('Error checking point in parcel:', error)
      return false
    }
  }

  // Generate GeoJSON for parcels
  static async getParcelsGeoJSON(parcelIds?: string[]): Promise<GeoJSONFeatureCollection> {
    try {
      let query = supabase
        .from('parcels')
        .select(`
          parcel_id,
          lr_number,
          county,
          locality,
          acreage_ha,
          current_use,
          geojson,
          geometry
        `)

      if (parcelIds && parcelIds.length > 0) {
        query = query.in('parcel_id', parcelIds)
      }

      const { data, error } = await query

      if (error) throw error

      const features: GeoJSONFeature[] = (data || []).map(parcel => ({
        type: 'Feature',
        geometry: parcel.geojson || this.postGISToGeoJSON(parcel.geometry) || {
          type: 'Point',
          coordinates: [0, 0]
        },
        properties: {
          parcel_id: parcel.parcel_id,
          lr_number: parcel.lr_number,
          county: parcel.county,
          locality: parcel.locality,
          acreage_ha: parcel.acreage_ha,
          current_use: parcel.current_use,
          type: 'parcel'
        }
      }))

      return {
        type: 'FeatureCollection',
        features
      }
    } catch (error) {
      console.error('Error generating parcels GeoJSON:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }

  // Generate GeoJSON for plots
  static async getPlotsGeoJSON(subdivisionId?: string): Promise<GeoJSONFeatureCollection> {
    try {
      let query = supabase
        .from('plots')
        .select(`
          plot_id,
          plot_no,
          size_sqm,
          stage,
          utility_level,
          corner_plot,
          premium_location,
          geojson,
          geometry,
          subdivisions(name, status)
        `)

      if (subdivisionId) {
        query = query.eq('subdivision_id', subdivisionId)
      }

      const { data, error } = await query

      if (error) throw error

      const features: GeoJSONFeature[] = (data || []).map(plot => ({
        type: 'Feature',
        geometry: plot.geojson || this.postGISToGeoJSON(plot.geometry) || {
          type: 'Point',
          coordinates: [0, 0]
        },
        properties: {
          plot_id: plot.plot_id,
          plot_no: plot.plot_no,
          size_sqm: plot.size_sqm,
          stage: plot.stage,
          utility_level: plot.utility_level,
          corner_plot: plot.corner_plot,
          premium_location: plot.premium_location,
          subdivision_name: plot.subdivisions?.name,
          subdivision_status: plot.subdivisions?.status,
          type: 'plot'
        }
      }))

      return {
        type: 'FeatureCollection',
        features
      }
    } catch (error) {
      console.error('Error generating plots GeoJSON:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }

  // Generate beacon points for a plot
  static generateBeaconPoints(coordinates: number[][]): Array<{ id: string; coordinates: [number, number]; description: string }> {
    const beacons = []
    
    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat] = coordinates[i]
      beacons.push({
        id: `beacon_${i + 1}`,
        coordinates: [lng, lat] as [number, number],
        description: `Beacon ${i + 1}`
      })
    }
    
    return beacons
  }

  // Calculate plot frontage (length of side facing road)
  static calculateFrontage(coordinates: number[][], roadSide: 'north' | 'south' | 'east' | 'west'): number {
    if (coordinates.length < 2) return 0
    
    // Find the side facing the road and calculate its length
    // This is a simplified implementation - in practice, you'd need road data
    let sideCoords: [number, number][] = []
    
    switch (roadSide) {
      case 'north': {
        // Find northernmost side
        const maxLat = Math.max(...coordinates.map(c => c[1]))
        sideCoords = coordinates.filter(c => Math.abs(c[1] - maxLat) < 0.0001)
        break
      }
      case 'south': {
        // Find southernmost side
        const minLat = Math.min(...coordinates.map(c => c[1]))
        sideCoords = coordinates.filter(c => Math.abs(c[1] - minLat) < 0.0001)
        break
      }
      case 'east': {
        // Find easternmost side
        const maxLng = Math.max(...coordinates.map(c => c[0]))
        sideCoords = coordinates.filter(c => Math.abs(c[0] - maxLng) < 0.0001)
        break
      }
      case 'west': {
        // Find westernmost side
        const minLng = Math.min(...coordinates.map(c => c[0]))
        sideCoords = coordinates.filter(c => Math.abs(c[0] - minLng) < 0.0001)
        break
      }
    }

    if (sideCoords.length >= 2) {
      return this.calculateDistance(sideCoords[0], sideCoords[1])
    }
    
    return 0
  }

  // Validate plot geometry
  static validatePlotGeometry(coordinates: number[][]): {
    isValid: boolean
    issues: string[]
    area: number
  } {
    const issues: string[] = []
    
    // Check minimum number of points
    if (coordinates.length < 3) {
      issues.push('Plot must have at least 3 points')
    }
    
    // Check if polygon is closed
    if (coordinates.length > 0) {
      const first = coordinates[0]
      const last = coordinates[coordinates.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) {
        issues.push('Plot polygon must be closed (first and last points must be the same)')
      }
    }
    
    // Check for self-intersection (simplified check)
    if (coordinates.length > 3) {
      for (let i = 0; i < coordinates.length - 1; i++) {
        for (let j = i + 2; j < coordinates.length - 1; j++) {
          // Skip adjacent segments
          if (Math.abs(i - j) <= 1 || (i === 0 && j === coordinates.length - 2)) continue
          
          // Check if segments intersect (simplified)
          // In practice, you'd use a proper line intersection algorithm
        }
      }
    }
    
    // Calculate area
    const area = this.calculatePolygonArea(coordinates)
    
    // Check minimum area (e.g., 100 sqm)
    if (area < 100) {
      issues.push('Plot area is too small (minimum 100 sqm)')
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      area
    }
  }

  // Generate subdivision layout
  static generateSubdivisionLayout(
    parcelBoundary: number[][],
    plotSize: number,
    roadWidth: number = 10,
    utilityReserve: number = 0.1
  ): {
    plots: Array<{ id: string; coordinates: number[][]; area: number }>
    roads: Array<{ id: string; coordinates: number[][] }>
    utilities: Array<{ id: string; coordinates: number[][] }>
  } {
    // This is a simplified grid-based subdivision generator
    // In practice, you'd use sophisticated algorithms considering topography, access, etc.
    
    const plots = []
    const roads = []
    const utilities = []
    
    // Calculate bounding box
    const minLng = Math.min(...parcelBoundary.map(c => c[0]))
    const maxLng = Math.max(...parcelBoundary.map(c => c[0]))
    const minLat = Math.min(...parcelBoundary.map(c => c[1]))
    const maxLat = Math.max(...parcelBoundary.map(c => c[1]))
    
    // Convert plot size from sqm to approximate degrees
    const plotSizeDegrees = Math.sqrt(plotSize) / 111320 // rough conversion
    
    // Generate grid of plots
    let plotId = 1
    for (let lng = minLng; lng < maxLng - plotSizeDegrees; lng += plotSizeDegrees) {
      for (let lat = minLat; lat < maxLat - plotSizeDegrees; lat += plotSizeDegrees) {
        const plotCoords = [
          [lng, lat],
          [lng + plotSizeDegrees, lat],
          [lng + plotSizeDegrees, lat + plotSizeDegrees],
          [lng, lat + plotSizeDegrees],
          [lng, lat] // Close the polygon
        ]
        
        plots.push({
          id: `plot_${plotId}`,
          coordinates: plotCoords,
          area: this.calculatePolygonArea(plotCoords)
        })
        
        plotId++
      }
    }
    
    return { plots, roads, utilities }
  }
}

// Export mapping utilities
export const mappingUtils = {
  // Convert degrees to meters (approximate)
  degreesToMeters: (degrees: number, latitude: number = 0): number => {
    const metersPerDegree = 111320 * Math.cos(latitude * Math.PI / 180)
    return degrees * metersPerDegree
  },

  // Convert meters to degrees (approximate)
  metersToDegrees: (meters: number, latitude: number = 0): number => {
    const metersPerDegree = 111320 * Math.cos(latitude * Math.PI / 180)
    return meters / metersPerDegree
  },

  // Format coordinates for display
  formatCoordinates: (lng: number, lat: number): string => {
    const lngDir = lng >= 0 ? 'E' : 'W'
    const latDir = lat >= 0 ? 'N' : 'S'
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`
  },

  // Validate coordinates
  isValidCoordinate: (lng: number, lat: number): boolean => {
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
  },

  // Get Kenya bounds
  getKenyaBounds: () => ({
    north: 5.019,
    south: -4.678,
    east: 41.899,
    west: 33.908
  }),

  // Check if coordinates are within Kenya
  isInKenya: (lng: number, lat: number): boolean => {
    const bounds = mappingUtils.getKenyaBounds()
    return lng >= bounds.west && lng <= bounds.east && 
           lat >= bounds.south && lat <= bounds.north
  }
}

// Export the mapping service
export { MappingService }
