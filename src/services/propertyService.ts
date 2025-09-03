/**
 * Property Service for Permission Management
 * Handles fetching real property data for permission assignment
 */

import supabase from '../lib/supabase-client'
import { coerceSupabaseCoords } from '../lib/geo'

export interface Property {
  id: string
  name: string
  address: string
  property_type?: string
  location?: string
  size_acres?: number
  subdivision_status?: string
  handover_status?: string
  lifecycle_status?: string
  property_source?: string
  created_at?: string
  landlord_id?: string
  owner_id?: string
}

export interface PropertyWithAccess extends Property {
  user_role?: string
  can_manage_users?: boolean
  can_edit_property?: boolean
  can_manage_tenants?: boolean
  can_manage_maintenance?: boolean
}

/**
 * Get all properties accessible to the current user
 */
export async function getUserAccessibleProperties(): Promise<PropertyWithAccess[]> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Authentication error:', userError)
      return []
    }

    // Use the existing function to get accessible properties
    const { data, error } = await supabase.rpc('get_user_accessible_properties', {
      user_uuid: user.id,
    })

    if (error) {
      console.error('Error fetching accessible properties:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.property_id,
      name: item.property_name || 'Unnamed Property',
      address: item.property_address || 'No address provided',
      property_type: item.property_type,
      user_role: item.user_role,
      can_manage_users: item.can_manage_users,
      can_edit_property: item.can_edit_property,
      can_manage_tenants: item.can_manage_tenants,
      can_manage_maintenance: item.can_manage_maintenance,
    }))
  } catch (error) {
    console.error('Error in getUserAccessibleProperties:', error)
    return []
  }
}

/**
 * Get all properties in the system (for admin users)
 */
export async function getAllProperties(): Promise<Property[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        id,
        name,
        physical_address,
        property_type,
        total_area_acres,
        subdivision_status,
        handover_status,
        lifecycle_status,
        property_source,
        created_at,
        landlord_id,
        lat,
        lng
      `
      )
      .order('name')

    if (error) {
      console.error('Error fetching all properties:', error)
      return []
    }

    // Coerce coordinate types from Supabase Decimals to numbers
    const coercedData = coerceSupabaseCoords(data || [], 'lat', 'lng')

    return coercedData.map((property: any) => ({
      id: property.id,
      name: property.name || 'Unnamed Property',
      address: property.physical_address || 'No address provided',
      property_type: property.property_type,
      size_acres: property.total_area_acres,
      subdivision_status: property.subdivision_status,
      handover_status: property.handover_status,
      lifecycle_status: property.lifecycle_status,
      property_source: property.property_source,
      created_at: property.created_at,
      landlord_id: property.landlord_id,
      lat: property.lat,
      lng: property.lng,
    }))
  } catch (error) {
    console.error('Error in getAllProperties:', error)
    return []
  }
}

/**
 * Get properties by specific criteria for permission management
 */
export async function getPropertiesForPermissionManagement(): Promise<Property[]> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Authentication error:', userError)
      return []
    }

    // For now, let's return all properties to avoid permission complexity
    // TODO: Implement proper permission checking later
    return await getAllProperties()
  } catch (error) {
    console.error('Error in getPropertiesForPermissionManagement:', error)
    return []
  }
}

/**
 * Get property details by ID
 */
export async function getPropertyById(propertyId: string): Promise<Property | null> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        id,
        name,
        physical_address,
        property_type,
        total_area_acres,
        subdivision_status,
        handover_status,
        lifecycle_status,
        property_source,
        created_at,
        landlord_id,
        lat,
        lng
      `
      )
      .eq('id', propertyId)
      .single()

    if (error) {
      console.error('Error fetching property by ID:', error)
      return null
    }

    return {
      id: data.id,
      name: data.name || 'Unnamed Property',
      address: data.physical_address || 'No address provided',
      property_type: data.property_type,
      size_acres: data.total_area_acres,
      subdivision_status: data.subdivision_status,
      handover_status: data.handover_status,
      lifecycle_status: data.lifecycle_status,
      property_source: data.property_source,
      created_at: data.created_at,
      landlord_id: data.landlord_id,
    }
  } catch (error) {
    console.error('Error in getPropertyById:', error)
    return null
  }
}

/**
 * Search properties by name or address
 */
export async function searchProperties(searchTerm: string): Promise<Property[]> {
  try {
    if (!searchTerm.trim()) {
      return await getPropertiesForPermissionManagement()
    }

    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        id,
        name,
        physical_address,
        property_type,
        total_area_acres,
        subdivision_status,
        handover_status,
        lifecycle_status,
        property_source,
        created_at,
        landlord_id,
        lat,
        lng
      `
      )
      .or(`name.ilike.%${searchTerm}%,physical_address.ilike.%${searchTerm}%`)
      .order('name')

    if (error) {
      console.error('Error searching properties:', error)
      return []
    }

    return (data || []).map((property: any) => ({
      id: property.id,
      name: property.name || 'Unnamed Property',
      address: property.physical_address || 'No address provided',
      property_type: property.property_type,
      size_acres: property.total_area_acres,
      subdivision_status: property.subdivision_status,
      handover_status: property.handover_status,
      lifecycle_status: property.lifecycle_status,
      property_source: property.property_source,
      created_at: property.created_at,
      landlord_id: property.landlord_id,
    }))
  } catch (error) {
    console.error('Error in searchProperties:', error)
    return []
  }
}

/**
 * Get properties filtered by lifecycle stage
 */
export async function getPropertiesByLifecycleStage(
  stage: 'purchase_pipeline' | 'subdivision' | 'handover'
): Promise<Property[]> {
  try {
    let query = supabase.from('properties').select(`
        id,
        name,
        physical_address,
        property_type,
        total_area_acres,
        subdivision_status,
        handover_status,
        lifecycle_status,
        property_source,
        created_at,
        landlord_id
      `)

    // Apply lifecycle stage filters based on actual data
    switch (stage) {
      case 'purchase_pipeline':
        // Properties in purchase pipeline
        query = query.eq('lifecycle_status', 'PENDING_PURCHASE')
        break

      case 'subdivision':
        // Properties that are in subdivision pipeline (not "NOT_STARTED")
        query = query.neq('subdivision_status', 'NOT_STARTED').not('subdivision_status', 'is', null)
        break

      case 'handover':
        // Properties actively in handover process (not just pending)
        query = query.or('handover_status.eq.IN_PROGRESS,handover_date.not.is.null')
        break
    }

    const { data, error } = await query.order('name')

    if (error) {
      console.error(`Error fetching ${stage} properties:`, error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return []
    }

    if (!data || data.length === 0) {
      console.log(`No properties found for ${stage} stage`)
      return []
    }

    return data.map((property: any) => ({
      id: property.id,
      name: property.name || 'Unnamed Property',
      address: property.physical_address || 'No address provided',
      property_type: property.property_type,
      size_acres: property.total_area_acres,
      subdivision_status: property.subdivision_status,
      handover_status: property.handover_status,
      lifecycle_status: property.lifecycle_status,
      property_source: property.property_source,
      created_at: property.created_at,
      landlord_id: property.landlord_id,
    }))
  } catch (error) {
    console.error(`Error in getPropertiesByLifecycleStage(${stage}):`, error)
    return []
  }
}

/**
 * Get properties in purchase pipeline
 */
export async function getPurchasePipelineProperties(): Promise<Property[]> {
  return getPropertiesByLifecycleStage('purchase_pipeline')
}

/**
 * Get properties in subdivision pipeline
 */
export async function getSubdivisionProperties(): Promise<Property[]> {
  return getPropertiesByLifecycleStage('subdivision')
}

/**
 * Get properties in handover process
 */
export async function getHandoverProperties(): Promise<Property[]> {
  return getPropertiesByLifecycleStage('handover')
}

/**
 * Get property statistics for permission management dashboard
 */
export async function getPropertyStats() {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('property_type, subdivision_status, handover_status, lifecycle_status')

    if (error) {
      console.error('Error fetching property stats:', error)
      return {
        total: 0,
        byType: {},
        bySubdivisionStatus: {},
        byHandoverStatus: {},
        byLifecycleStatus: {},
      }
    }

    const stats = {
      total: data?.length || 0,
      byType: {} as Record<string, number>,
      bySubdivisionStatus: {} as Record<string, number>,
      byHandoverStatus: {} as Record<string, number>,
      byLifecycleStatus: {} as Record<string, number>,
    }

    data?.forEach((property: any) => {
      // Count by type
      const type = property.property_type || 'Unknown'
      stats.byType[type] = (stats.byType[type] || 0) + 1

      // Count by subdivision status
      const subdivisionStatus = property.subdivision_status || 'Unknown'
      stats.bySubdivisionStatus[subdivisionStatus] =
        (stats.bySubdivisionStatus[subdivisionStatus] || 0) + 1

      // Count by handover status
      const handoverStatus = property.handover_status || 'Unknown'
      stats.byHandoverStatus[handoverStatus] = (stats.byHandoverStatus[handoverStatus] || 0) + 1

      // Count by lifecycle status
      const lifecycleStatus = property.lifecycle_status || 'Unknown'
      stats.byLifecycleStatus[lifecycleStatus] = (stats.byLifecycleStatus[lifecycleStatus] || 0) + 1
    })

    return stats
  } catch (error) {
    console.error('Error in getPropertyStats:', error)
    return {
      total: 0,
      byType: {},
      bySubdivisionStatus: {},
      byHandoverStatus: {},
      byLifecycleStatus: {},
    }
  }
}
