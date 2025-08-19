import supabase from '../supabase-client'
import { isLandProperty, type PropertyType } from '../validation/property'

/**
 * Service for cleaning up properties in the Rentals Overview
 */
export class PropertyCleanupService {
  /**
   * Soft delete all land properties for the current user
   * This removes land properties from the Rentals Overview while preserving data
   */
  static async softDeleteLandProperties(userId: string): Promise<{
    success: boolean
    deletedCount: number
    error?: string
  }> {
    try {
      // First, get all accessible properties for the user
      const { data: accessibleProperties, error: accessError } = 
        await supabase.rpc('get_user_properties_simple')

      if (accessError) {
        console.error('Error getting accessible properties:', accessError)
        return {
          success: false,
          deletedCount: 0,
          error: `Failed to get accessible properties: ${accessError.message}`
        }
      }

      if (!accessibleProperties || accessibleProperties.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          error: 'No accessible properties found'
        }
      }

      const propertyIds = accessibleProperties
        .map(p => p.property_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)

      if (propertyIds.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          error: 'No valid property IDs found'
        }
      }

      // Get all properties that are not already soft-deleted
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, property_type')
        .in('id', propertyIds)
        .is('disabled_at', null)

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError)
        return {
          success: false,
          deletedCount: 0,
          error: `Failed to fetch properties: ${propertiesError.message}`
        }
      }

      if (!properties || properties.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          error: 'No active properties found'
        }
      }

      // Filter to only land properties
      const landProperties = properties.filter(property => 
        isLandProperty(property.property_type as PropertyType)
      )

      if (landProperties.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          error: 'No land properties found to delete'
        }
      }

      const landPropertyIds = landProperties.map(p => p.id)

      // Soft delete the land properties by setting disabled_at
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          disabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', landPropertyIds)

      if (updateError) {
        console.error('Error soft deleting land properties:', updateError)
        return {
          success: false,
          deletedCount: 0,
          error: `Failed to soft delete properties: ${updateError.message}`
        }
      }

      console.log(`Successfully soft deleted ${landProperties.length} land properties`)
      
      return {
        success: true,
        deletedCount: landProperties.length
      }

    } catch (error) {
      console.error('Unexpected error in softDeleteLandProperties:', error)
      return {
        success: false,
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get count of land properties that would be affected by soft deletion
   */
  static async getLandPropertiesCount(userId: string): Promise<{
    success: boolean
    count: number
    error?: string
  }> {
    try {
      // Get accessible properties for the user
      const { data: accessibleProperties, error: accessError } = 
        await supabase.rpc('get_user_properties_simple')

      if (accessError) {
        return {
          success: false,
          count: 0,
          error: `Failed to get accessible properties: ${accessError.message}`
        }
      }

      if (!accessibleProperties || accessibleProperties.length === 0) {
        return {
          success: true,
          count: 0
        }
      }

      const propertyIds = accessibleProperties
        .map(p => p.property_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)

      if (propertyIds.length === 0) {
        return {
          success: true,
          count: 0
        }
      }

      // Get all active properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, property_type')
        .in('id', propertyIds)
        .is('disabled_at', null)

      if (propertiesError) {
        return {
          success: false,
          count: 0,
          error: `Failed to fetch properties: ${propertiesError.message}`
        }
      }

      if (!properties) {
        return {
          success: true,
          count: 0
        }
      }

      // Count land properties
      const landPropertiesCount = properties.filter(property => 
        isLandProperty(property.property_type as PropertyType)
      ).length

      return {
        success: true,
        count: landPropertiesCount
      }

    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}
