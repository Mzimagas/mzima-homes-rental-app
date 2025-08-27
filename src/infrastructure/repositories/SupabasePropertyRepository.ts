/**
 * Supabase Property Repository Implementation
 * Implements PropertyRepository using Supabase as the data store
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Property, PropertyStatus, PropertyType, LifecycleStatus } from '../../domain/entities/Property'
import { PropertyRepository, PropertySearchCriteria } from '../../domain/repositories/PropertyRepository'
import { Address } from '../../domain/value-objects/Address'

interface PropertyRecord {
  id: string
  name: string
  physical_address?: string
  property_type: string
  status?: string
  lifecycle_status?: string
  landlord_id: string
  total_area_acres?: number
  description?: string
  amenities?: string[]
  lat?: number
  lng?: number
  created_at: string
  updated_at: string
}

export class SupabasePropertyRepository implements PropertyRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Property | null> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return this.toDomain(data)
  }

  async findByIds(ids: string[]): Promise<Property[]> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .in('id', ids)

    if (error || !data) {
      return []
    }

    return data.map(record => this.toDomain(record))
  }

  async save(property: Property): Promise<void> {
    const record = this.toRecord(property)

    const { error } = await this.supabase
      .from('properties')
      .upsert(record)

    if (error) {
      throw new Error(`Failed to save property: ${error.message}`)
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('properties')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete property: ${error.message}`)
    }
  }

  async findAll(): Promise<Property[]> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map(record => this.toDomain(record))
  }

  async findByOwnerId(ownerId: string): Promise<Property[]> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', ownerId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map(record => this.toDomain(record))
  }

  async findByStatus(status: PropertyStatus): Promise<Property[]> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map(record => this.toDomain(record))
  }

  async findByLifecycleStatus(lifecycleStatus: LifecycleStatus): Promise<Property[]> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('lifecycle_status', lifecycleStatus)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map(record => this.toDomain(record))
  }

  async search(criteria: PropertySearchCriteria): Promise<Property[]> {
    let query = this.supabase.from('properties').select('*')

    // Apply filters
    if (criteria.name) {
      query = query.ilike('name', `%${criteria.name}%`)
    }

    if (criteria.address) {
      query = query.ilike('physical_address', `%${criteria.address}%`)
    }

    if (criteria.propertyType) {
      query = query.eq('property_type', criteria.propertyType)
    }

    if (criteria.status) {
      query = query.eq('status', criteria.status)
    }

    if (criteria.lifecycleStatus) {
      query = query.eq('lifecycle_status', criteria.lifecycleStatus)
    }

    if (criteria.ownerId) {
      query = query.eq('landlord_id', criteria.ownerId)
    }

    if (criteria.minArea) {
      query = query.gte('total_area_acres', criteria.minArea)
    }

    if (criteria.maxArea) {
      query = query.lte('total_area_acres', criteria.maxArea)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map(record => this.toDomain(record))
  }

  async findAvailableProperties(): Promise<Property[]> {
    return this.findByStatus('AVAILABLE')
  }

  async findPropertiesNeedingMaintenance(): Promise<Property[]> {
    return this.findByStatus('MAINTENANCE')
  }

  async findPropertiesReadyForHandover(): Promise<Property[]> {
    return this.findByLifecycleStatus('SUBDIVISION')
  }

  async findPropertiesInAcquisition(): Promise<Property[]> {
    return this.findByLifecycleStatus('ACQUISITION')
  }

  async countByStatus(): Promise<Record<PropertyStatus, number>> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('status')

    if (error || !data) {
      return {
        'AVAILABLE': 0,
        'OCCUPIED': 0,
        'MAINTENANCE': 0,
        'INACTIVE': 0
      }
    }

    const counts = data.reduce((acc, record) => {
      const status = (record.status as PropertyStatus) || 'INACTIVE'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<PropertyStatus, number>)

    return {
      'AVAILABLE': counts['AVAILABLE'] || 0,
      'OCCUPIED': counts['OCCUPIED'] || 0,
      'MAINTENANCE': counts['MAINTENANCE'] || 0,
      'INACTIVE': counts['INACTIVE'] || 0
    }
  }

  async countByType(): Promise<Record<PropertyType, number>> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('property_type')

    if (error || !data) {
      return {
        'APARTMENT': 0,
        'HOUSE': 0,
        'COMMERCIAL': 0,
        'LAND': 0,
        'TOWNHOUSE': 0
      }
    }

    const counts = data.reduce((acc, record) => {
      const type = (record.property_type as PropertyType) || 'HOUSE'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<PropertyType, number>)

    return {
      'APARTMENT': counts['APARTMENT'] || 0,
      'HOUSE': counts['HOUSE'] || 0,
      'COMMERCIAL': counts['COMMERCIAL'] || 0,
      'LAND': counts['LAND'] || 0,
      'TOWNHOUSE': counts['TOWNHOUSE'] || 0
    }
  }

  async countByLifecycleStatus(): Promise<Record<LifecycleStatus, number>> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('lifecycle_status')

    if (error || !data) {
      return {
        'ACQUISITION': 0,
        'SUBDIVISION': 0,
        'HANDOVER': 0,
        'RENTAL_READY': 0,
        'DISPOSED': 0
      }
    }

    const counts = data.reduce((acc, record) => {
      const status = (record.lifecycle_status as LifecycleStatus) || 'ACQUISITION'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<LifecycleStatus, number>)

    return {
      'ACQUISITION': counts['ACQUISITION'] || 0,
      'SUBDIVISION': counts['SUBDIVISION'] || 0,
      'HANDOVER': counts['HANDOVER'] || 0,
      'RENTAL_READY': counts['RENTAL_READY'] || 0,
      'DISPOSED': counts['DISPOSED'] || 0
    }
  }

  async getTotalAreaByOwner(ownerId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('total_area_acres')
      .eq('landlord_id', ownerId)

    if (error || !data) {
      return 0
    }

    return data.reduce((total, record) => {
      return total + (record.total_area_acres || 0)
    }, 0)
  }

  async existsByName(name: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('id')
      .eq('name', name)
      .limit(1)

    return !error && data && data.length > 0
  }

  async existsByAddress(address: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('id')
      .eq('physical_address', address)
      .limit(1)

    return !error && data && data.length > 0
  }

  private toDomain(record: PropertyRecord): Property {
    const address = new Address({
      street: record.physical_address,
      country: 'Kenya', // Default for this application
      coordinates: record.lat && record.lng ? {
        latitude: record.lat,
        longitude: record.lng
      } : undefined
    })

    return new Property({
      id: record.id,
      name: record.name,
      address,
      propertyType: (record.property_type as PropertyType) || 'HOUSE',
      status: (record.status as PropertyStatus) || 'INACTIVE',
      lifecycleStatus: (record.lifecycle_status as LifecycleStatus) || 'ACQUISITION',
      ownerId: record.landlord_id,
      totalAreaAcres: record.total_area_acres,
      description: record.description,
      amenities: record.amenities || [],
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    })
  }

  private toRecord(property: Property): PropertyRecord {
    return {
      id: property.id,
      name: property.name,
      physical_address: property.address.getFullAddress(),
      property_type: property.propertyType,
      status: property.status,
      lifecycle_status: property.lifecycleStatus,
      landlord_id: property.ownerId,
      total_area_acres: property.totalAreaAcres,
      description: property.description,
      amenities: property.amenities,
      lat: property.address.coordinates?.latitude,
      lng: property.address.coordinates?.longitude,
      created_at: property.createdAt.toISOString(),
      updated_at: property.updatedAt.toISOString()
    }
  }
}
