/**
 * Address Value Object
 * Represents a physical address with validation and formatting
 */

export interface AddressComponents {
  street?: string
  city?: string
  county?: string
  country?: string
  postalCode?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
}

export class Address {
  private readonly _street?: string
  private readonly _city?: string
  private readonly _county?: string
  private readonly _country: string
  private readonly _postalCode?: string
  private readonly _coordinates?: {
    latitude: number
    longitude: number
  }

  constructor(components: AddressComponents) {
    // Validate required fields
    if (!components.country) {
      throw new Error('Country is required for address')
    }

    // Validate coordinates if provided
    if (components.coordinates) {
      const { latitude, longitude } = components.coordinates
      if (latitude < -90 || latitude > 90) {
        throw new Error('Invalid latitude: must be between -90 and 90')
      }
      if (longitude < -180 || longitude > 180) {
        throw new Error('Invalid longitude: must be between -180 and 180')
      }
    }

    this._street = components.street?.trim()
    this._city = components.city?.trim()
    this._county = components.county?.trim()
    this._country = components.country.trim()
    this._postalCode = components.postalCode?.trim()
    this._coordinates = components.coordinates
  }

  // Getters
  get street(): string | undefined {
    return this._street
  }

  get city(): string | undefined {
    return this._city
  }

  get county(): string | undefined {
    return this._county
  }

  get country(): string {
    return this._country
  }

  get postalCode(): string | undefined {
    return this._postalCode
  }

  get coordinates(): { latitude: number; longitude: number } | undefined {
    return this._coordinates
  }

  // Utility methods
  getFullAddress(): string {
    const parts = [
      this._street,
      this._city,
      this._county,
      this._country,
      this._postalCode
    ].filter(Boolean)

    return parts.join(', ')
  }

  getShortAddress(): string {
    const parts = [this._city, this._county].filter(Boolean)
    return parts.join(', ') || this._country
  }

  hasCoordinates(): boolean {
    return this._coordinates !== undefined
  }

  distanceTo(other: Address): number | null {
    if (!this._coordinates || !other._coordinates) {
      return null
    }

    // Haversine formula for calculating distance between two points
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(other._coordinates.latitude - this._coordinates.latitude)
    const dLon = this.toRadians(other._coordinates.longitude - this._coordinates.longitude)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this._coordinates.latitude)) * 
      Math.cos(this.toRadians(other._coordinates.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  equals(other: Address): boolean {
    return (
      this._street === other._street &&
      this._city === other._city &&
      this._county === other._county &&
      this._country === other._country &&
      this._postalCode === other._postalCode &&
      this.coordinatesEqual(other._coordinates)
    )
  }

  toString(): string {
    return this.getFullAddress()
  }

  toJSON(): AddressComponents {
    return {
      street: this._street,
      city: this._city,
      county: this._county,
      country: this._country,
      postalCode: this._postalCode,
      coordinates: this._coordinates
    }
  }

  // Static factory methods
  static fromString(addressString: string, country: string = 'Kenya'): Address {
    const parts = addressString.split(',').map(part => part.trim())
    
    return new Address({
      street: parts[0],
      city: parts[1],
      county: parts[2],
      country,
      postalCode: parts[3]
    })
  }

  static fromCoordinates(latitude: number, longitude: number, country: string = 'Kenya'): Address {
    return new Address({
      country,
      coordinates: { latitude, longitude }
    })
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private coordinatesEqual(other?: { latitude: number; longitude: number }): boolean {
    if (!this._coordinates && !other) return true
    if (!this._coordinates || !other) return false
    
    return (
      Math.abs(this._coordinates.latitude - other.latitude) < 0.000001 &&
      Math.abs(this._coordinates.longitude - other.longitude) < 0.000001
    )
  }
}
