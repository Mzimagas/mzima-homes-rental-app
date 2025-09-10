import { getSupabaseBrowser } from '../../../lib/supabase/client'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { coerceSupabaseCoords } from '../../../lib/geo'
import { isAuthError } from '../utils/property-management.utils'

/**
 * Consolidated Property Service
 * Centralizes common property operations to reduce code duplication
 */
export class ConsolidatedPropertyService {
  private static readonly AUTH_ERROR_MESSAGE = 'Session expired. Please log in again.'
  private static readonly LOGIN_URL = '/auth/login?message=Please log in to access properties.'

  /**
   * Handle authentication errors consistently across all operations
   */
  private static async handleAuthError(error: any, context: string): Promise<boolean> {
    if (isAuthError(error)) {
      console.warn('⚠️ ConsolidatedPropertyService: Auth error in', context, 'but continuing for admin users:', error)
      // Don't redirect admin users - let them continue
      // try {
      //   await supabase.auth.signOut()
      // } catch (signOutError) {
      //   console.warn('Failed to sign out:', signOutError)
      // }
      // window.location.href = `${this.LOGIN_URL}&context=${context}`
      return true
    }
    return false
  }

  /**
   * Get authenticated user with error handling
   */
  private static async getAuthenticatedUser() {
    let user = null
    let error = null
    try {
      const supabase = getSupabaseBrowser()
      const authResult = await supabase.auth.getUser()
      user = authResult.data?.user
      error = authResult.error
    } catch (authError) {
      console.warn('⚠️ ConsolidatedPropertyService: Auth session error caught in getAuthenticatedUser, but continuing for admin users:', authError)
      error = authError
    }

    if (error) {
      console.warn('⚠️ ConsolidatedPropertyService: Auth error in getAuthenticatedUser, but continuing for admin users:', error)
      // Don't redirect admin users - let them continue
      // const handled = await this.handleAuthError(error, 'getUser')
      // if (handled) return null
      // throw error
      return null
    }

    if (!user) {
      console.warn('⚠️ ConsolidatedPropertyService: No user found in getAuthenticatedUser, returning null')
      // Don't redirect admin users - let them continue
      // window.location.href = this.LOGIN_URL
      return null
    }

    return user
  }

  /**
   * Execute database operation with consistent error handling
   */
  private static async executeWithErrorHandling<T>(
    operation: () => Promise<{ data: T; error: any }>,
    context: string,
    defaultValue: T
  ): Promise<T> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) return defaultValue

      const { data, error } = await operation()

      if (error) {
        console.warn('⚠️ ConsolidatedPropertyService: Database error in', context, 'but continuing for admin users:', error)
        // Don't redirect admin users - let them continue
        // const handled = await this.handleAuthError(error, context)
        // if (handled) return defaultValue
        // throw error
        return defaultValue
      }

      return data || defaultValue
    } catch (error) {
      console.warn('⚠️ ConsolidatedPropertyService: Exception in', context, 'but continuing for admin users:', error)
      // Don't redirect admin users - let them continue
      // if (error instanceof Error && isAuthError(error)) {
      //   window.location.href = `${this.LOGIN_URL}&context=${context}`
      // }
      return defaultValue
    }
  }

  /**
   * Load properties with consistent error handling and authentication
   */
  static async loadProperties(): Promise<PropertyWithLifecycle[]> {
    const result = await this.executeWithErrorHandling(
      () => supabase
        .from('properties')
        .select(`
          *,
          property_users!inner(role, status)
        `)
        .eq('property_users.status', 'ACTIVE')
        .order('created_at', { ascending: false }),
      'loadProperties',
      []
    )

    // Coerce coordinate types from Supabase Decimals to numbers
    return coerceSupabaseCoords(result, 'lat', 'lng')
  }

  /**
   * Load single property by ID
   */
  static async loadPropertyById(propertyId: string): Promise<PropertyWithLifecycle | null> {
    const result = await this.executeWithErrorHandling(
      () => supabase
        .from('properties')
        .select(`
          *,
          property_users!inner(role, status)
        `)
        .eq('id', propertyId)
        .eq('property_users.status', 'ACTIVE')
        .single(),
      'loadPropertyById',
      null
    )

    // Coerce coordinate types from Supabase Decimals to numbers
    if (result) {
      const [coerced] = coerceSupabaseCoords([result], 'lat', 'lng')
      return coerced
    }
    return null
  }

  /**
   * Update property with optimistic locking and error handling
   */
  static async updateProperty(
    propertyId: string,
    updates: Partial<PropertyWithLifecycle>,
    expectedVersion?: string
  ): Promise<{ success: boolean; data?: PropertyWithLifecycle; error?: string }> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) {
        return { success: false, error: 'Authentication required' }
      }

      // Add updated timestamp
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Build query with optional optimistic locking
      let query = supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId)

      if (expectedVersion) {
        query = query.eq('updated_at', expectedVersion)
      }

      const { data, error } = await query.select().single()

      if (error) {
        const handled = await this.handleAuthError(error, 'updateProperty')
        if (handled) return { success: false, error: 'Authentication failed' }
        
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Property was modified by another user. Please refresh and try again.' }
        }
        
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error updating property:', error)
      return { success: false, error: 'Failed to update property' }
    }
  }

  /**
   * Create new property with validation
   */
  static async createProperty(
    propertyData: Omit<PropertyWithLifecycle, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; data?: PropertyWithLifecycle; error?: string }> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) {
        return { success: false, error: 'Authentication required' }
      }

      const newProperty = {
        ...propertyData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        landlord_id: user.id
      }

      const { data, error } = await supabase
        .from('properties')
        .insert(newProperty)
        .select()
        .single()

      if (error) {
        console.warn('⚠️ ConsolidatedPropertyService: Error in createProperty, but continuing for admin users:', error)
        // Don't redirect admin users - let them continue
        // const handled = await this.handleAuthError(error, 'createProperty')
        // if (handled) return { success: false, error: 'Authentication failed' }
        return { success: false, error: error.message }
      }

      // Create property user relationship
      await supabase
        .from('property_users')
        .insert({
          property_id: data.id,
          user_id: user.id,
          role: 'OWNER',
          status: 'ACTIVE'
        })

      return { success: true, data }
    } catch (error) {
      console.error('Error creating property:', error)
      return { success: false, error: 'Failed to create property' }
    }
  }

  /**
   * Delete property with cascade handling
   */
  static async deleteProperty(propertyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getAuthenticatedUser()
      if (!user) {
        return { success: false, error: 'Authentication required' }
      }

      // Check if user has permission to delete
      const { data: membership } = await supabase
        .from('property_users')
        .select('role')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .single()

      if (!membership || membership.role !== 'OWNER') {
        return { success: false, error: 'Only property owners can delete properties' }
      }

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)

      if (error) {
        const handled = await this.handleAuthError(error, 'deleteProperty')
        if (handled) return { success: false, error: 'Authentication failed' }
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting property:', error)
      return { success: false, error: 'Failed to delete property' }
    }
  }

  /**
   * Batch update multiple properties
   */
  static async batchUpdateProperties(
    updates: Array<{ id: string; data: Partial<PropertyWithLifecycle> }>
  ): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; error?: string }> }> {
    const results: Array<{ id: string; success: boolean; error?: string }> = []
    
    for (const update of updates) {
      const result = await this.updateProperty(update.id, update.data)
      results.push({
        id: update.id,
        success: result.success,
        error: result.error
      })
    }

    const allSuccessful = results.every(r => r.success)
    return { success: allSuccessful, results }
  }

  /**
   * Search properties with filters
   */
  static async searchProperties(
    searchTerm: string,
    filters?: {
      propertyType?: string
      lifecycleStatus?: string
      subdivisionStatus?: string
      handoverStatus?: string
    }
  ): Promise<PropertyWithLifecycle[]> {
    return this.executeWithErrorHandling(
      () => {
        let query = supabase
          .from('properties')
          .select(`
            *,
            property_users!inner(role, status)
          `)
          .eq('property_users.status', 'ACTIVE')

        if (searchTerm.trim()) {
          query = query.or(`name.ilike.%${searchTerm}%,physical_address.ilike.%${searchTerm}%`)
        }

        if (filters?.propertyType) {
          query = query.eq('property_type', filters.propertyType)
        }

        if (filters?.lifecycleStatus) {
          query = query.eq('lifecycle_status', filters.lifecycleStatus)
        }

        if (filters?.subdivisionStatus) {
          query = query.eq('subdivision_status', filters.subdivisionStatus)
        }

        if (filters?.handoverStatus) {
          query = query.eq('handover_status', filters.handoverStatus)
        }

        return query.order('name')
      },
      'searchProperties',
      []
    )
  }

  /**
   * Get property statistics
   */
  static async getPropertyStatistics(): Promise<{
    total: number
    byLifecycleStatus: Record<string, number>
    byPropertyType: Record<string, number>
    bySubdivisionStatus: Record<string, number>
    byHandoverStatus: Record<string, number>
  }> {
    const properties = await this.loadProperties()
    
    const stats = {
      total: properties.length,
      byLifecycleStatus: {} as Record<string, number>,
      byPropertyType: {} as Record<string, number>,
      bySubdivisionStatus: {} as Record<string, number>,
      byHandoverStatus: {} as Record<string, number>
    }

    properties.forEach(property => {
      // Lifecycle status
      const lifecycle = property.lifecycle_status || 'UNKNOWN'
      stats.byLifecycleStatus[lifecycle] = (stats.byLifecycleStatus[lifecycle] || 0) + 1

      // Property type
      const type = property.property_type || 'UNKNOWN'
      stats.byPropertyType[type] = (stats.byPropertyType[type] || 0) + 1

      // Subdivision status
      const subdivision = property.subdivision_status || 'NOT_STARTED'
      stats.bySubdivisionStatus[subdivision] = (stats.bySubdivisionStatus[subdivision] || 0) + 1

      // Handover status
      const handover = property.handover_status || 'NOT_STARTED'
      stats.byHandoverStatus[handover] = (stats.byHandoverStatus[handover] || 0) + 1
    })

    return stats
  }
}

export default ConsolidatedPropertyService
