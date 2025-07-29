/**
 * Property Service - Production-ready service for property operations
 * Implements the new RLS-compliant property management system
 */

import { createClient } from '@supabase/supabase-js'

// Types for property operations
export interface PropertyData {
  name: string
  address: string
  type?: 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'OTHER'
}

export interface PropertyUser {
  id: string
  property_id: string
  user_id: string
  role: 'OWNER' | 'PROPERTY_MANAGER' | 'LEASING_AGENT' | 'MAINTENANCE_COORDINATOR' | 'VIEWER' | 'TENANT'
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REVOKED'
  permissions?: Record<string, any>
}

export interface Property {
  id: string
  name: string
  physical_address: string
  type: string
  landlord_id: string
  created_at: string
  updated_at: string
}

export class PropertyService {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Create a new property using the safe helper function
   */
  async createProperty(propertyData: PropertyData): Promise<{ data: string | null; error: Error | null }> {
    try {
      // Ensure user is authenticated
      const { data: user, error: userError } = await this.supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: null, error: new Error('User must be authenticated to create properties') }
      }

      // Use the safe helper function
      const { data: propertyId, error } = await this.supabase.rpc('create_property_with_owner', {
        property_name: propertyData.name,
        property_address: propertyData.address,
        property_type: propertyData.type || 'APARTMENT'
      })

      if (error) {
        return { data: null, error: new Error(`Failed to create property: ${error.message}`) }
      }

      return { data: propertyId, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  /**
   * Get all properties accessible to the current user
   */
  async getUserProperties(): Promise<{ data: Property[] | null; error: Error | null }> {
    try {
      // Ensure user is authenticated
      const { data: user, error: userError } = await this.supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: null, error: new Error('User must be authenticated to view properties') }
      }

      // Get accessible property IDs
      const { data: accessiblePropertyIds, error: accessError } = await this.supabase
        .rpc('get_user_accessible_properties')

      if (accessError) {
        return { data: null, error: new Error(`Failed to get accessible properties: ${accessError.message}`) }
      }

      if (!accessiblePropertyIds || accessiblePropertyIds.length === 0) {
        return { data: [], error: null }
      }

      // Get full property details
      const propertyIds = accessiblePropertyIds.map((item: any) => item.property_id)
      
      const { data: properties, error: propError } = await this.supabase
        .from('properties')
        .select('*')
        .in('id', propertyIds)
        .order('created_at', { ascending: false })

      if (propError) {
        return { data: null, error: new Error(`Failed to fetch properties: ${propError.message}`) }
      }

      return { data: properties, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  /**
   * Check if user has access to a specific property
   */
  async checkPropertyAccess(
    propertyId: string, 
    requiredRoles?: string[]
  ): Promise<{ hasAccess: boolean; error: Error | null }> {
    try {
      const { data: user, error: userError } = await this.supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { hasAccess: false, error: new Error('User must be authenticated') }
      }

      const { data: hasAccess, error } = await this.supabase.rpc('user_has_property_access', {
        property_id: propertyId,
        user_id: user.user.id,
        required_roles: requiredRoles || null
      })

      if (error) {
        return { hasAccess: false, error: new Error(`Access check failed: ${error.message}`) }
      }

      return { hasAccess: !!hasAccess, error: null }
    } catch (err) {
      return { hasAccess: false, error: err as Error }
    }
  }

  /**
   * Add a user to a property with a specific role
   */
  async addUserToProperty(
    propertyId: string,
    userId: string,
    role: string = 'TENANT'
  ): Promise<{ data: string | null; error: Error | null }> {
    try {
      const { data: user, error: userError } = await this.supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: null, error: new Error('User must be authenticated') }
      }

      // Check if current user can add users to this property
      const { hasAccess } = await this.checkPropertyAccess(propertyId, ['OWNER', 'PROPERTY_MANAGER'])
      
      if (!hasAccess) {
        return { data: null, error: new Error('You do not have permission to add users to this property') }
      }

      const { data: propertyUserId, error } = await this.supabase.rpc('add_user_to_property', {
        property_id: propertyId,
        new_user_id: userId,
        user_role: role,
        inviter_id: user.user.id
      })

      if (error) {
        return { data: null, error: new Error(`Failed to add user to property: ${error.message}`) }
      }

      return { data: propertyUserId, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  /**
   * Get users associated with a property
   */
  async getPropertyUsers(propertyId: string): Promise<{ data: PropertyUser[] | null; error: Error | null }> {
    try {
      // Check if user has access to view property users
      const { hasAccess } = await this.checkPropertyAccess(propertyId)
      
      if (!hasAccess) {
        return { data: null, error: new Error('You do not have access to view users for this property') }
      }

      const { data: propertyUsers, error } = await this.supabase
        .from('property_users')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: new Error(`Failed to fetch property users: ${error.message}`) }
      }

      return { data: propertyUsers, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  /**
   * Update property information
   */
  async updateProperty(
    propertyId: string, 
    updates: Partial<PropertyData>
  ): Promise<{ data: Property | null; error: Error | null }> {
    try {
      // Check if user can update this property
      const { hasAccess } = await this.checkPropertyAccess(propertyId, ['OWNER', 'PROPERTY_MANAGER'])
      
      if (!hasAccess) {
        return { data: null, error: new Error('You do not have permission to update this property') }
      }

      // Prepare update data with correct column names
      const updateData: any = {}
      if (updates.name) updateData.name = updates.name
      if (updates.address) updateData.physical_address = updates.address
      if (updates.type) updateData.type = updates.type
      updateData.updated_at = new Date().toISOString()

      const { data: property, error } = await this.supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId)
        .select()
        .single()

      if (error) {
        return { data: null, error: new Error(`Failed to update property: ${error.message}`) }
      }

      return { data: property, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  /**
   * Delete a property (only owners can do this)
   */
  async deleteProperty(propertyId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Check if user is the owner
      const { hasAccess } = await this.checkPropertyAccess(propertyId, ['OWNER'])
      
      if (!hasAccess) {
        return { success: false, error: new Error('Only property owners can delete properties') }
      }

      const { error } = await this.supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)

      if (error) {
        return { success: false, error: new Error(`Failed to delete property: ${error.message}`) }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err as Error }
    }
  }

  /**
   * Accept a property invitation
   */
  async acceptPropertyInvitation(propertyUserId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: user, error: userError } = await this.supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { success: false, error: new Error('User must be authenticated') }
      }

      const { error } = await this.supabase
        .from('property_users')
        .update({
          status: 'ACTIVE',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyUserId)
        .eq('user_id', user.user.id)
        .eq('status', 'PENDING')

      if (error) {
        return { success: false, error: new Error(`Failed to accept invitation: ${error.message}`) }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err as Error }
    }
  }

  /**
   * Get pending invitations for the current user
   */
  async getPendingInvitations(): Promise<{ data: PropertyUser[] | null; error: Error | null }> {
    try {
      const { data: user, error: userError } = await this.supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: null, error: new Error('User must be authenticated') }
      }

      const { data: invitations, error } = await this.supabase
        .from('property_users')
        .select(`
          *,
          properties:property_id (
            id,
            name,
            physical_address
          )
        `)
        .eq('user_id', user.user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: new Error(`Failed to fetch invitations: ${error.message}`) }
      }

      return { data: invitations, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }
}
