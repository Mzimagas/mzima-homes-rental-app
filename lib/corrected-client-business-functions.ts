/**
 * Corrected Client Business Functions
 * Updated to use the new helper functions and proper authentication
 */

import { supabase } from './supabase-client'

export const correctedClientBusinessFunctions = {
  /**
   * Get properties accessible to the current user
   */
  async getUserAccessibleProperties() {
    try {
      // Ensure user is authenticated
      const { data: user, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: null, error: new Error('User must be authenticated') }
      }

      // Use the new helper function to get accessible properties
      const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')

      if (accessError) {
        return { data: null, error: accessError }
      }

      if (!accessibleProperties || accessibleProperties.length === 0) {
        return { data: [], error: null }
      }

      // Get property IDs
      const propertyIds = accessibleProperties.map(p => p.property_id)

      // Get full property details
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          physical_address,
          landlord_id,
          lat,
          lng,
          notes,
          created_at,
          updated_at
        `)
        .in('id', propertyIds)
        .order('name')

      if (propertiesError) {
        return { data: null, error: propertiesError }
      }

      return { data: properties || [], error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  },

  /**
   * Get properties with units and tenants for dashboard
   */
  async getPropertiesWithDetails() {
    try {
      // Ensure user is authenticated
      const { data: user, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: null, error: new Error('User must be authenticated') }
      }

      // Use the new helper function to get accessible properties
      const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')

      if (accessError) {
        return { data: null, error: accessError }
      }

      if (!accessibleProperties || accessibleProperties.length === 0) {
        return { data: [], error: null }
      }

      // Get property IDs
      const propertyIds = accessibleProperties.map(p => p.property_id)

      // Get full property details with units and tenants
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          physical_address,
          landlord_id,
          lat,
          lng,
          notes,
          created_at,
          updated_at,
          units (
            id,
            unit_label,
            monthly_rent_kes,
            is_active,
            tenants (
              id,
              full_name,
              status
            )
          )
        `)
        .in('id', propertyIds)
        .order('name')

      if (propertiesError) {
        return { data: null, error: propertiesError }
      }

      return { data: properties || [], error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  },

  /**
   * Create a new property using the helper function
   */
  async createProperty(propertyData: {
    name: string
    address: string
    lat?: number
    lng?: number
    notes?: string
  }) {
    try {
      // Ensure user is authenticated
      const { data: user, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: null, error: new Error('User must be authenticated') }
      }

      // Use the new helper function to create property with owner
      const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
        property_name: propertyData.name,
        property_address: propertyData.address,
        property_type: 'APARTMENT', // Default type since table doesn't have type column
        owner_user_id: user.user.id
      })

      if (createError) {
        return { data: null, error: createError }
      }

      // If we have lat/lng or notes, update the property with those details
      if (propertyData.lat || propertyData.lng || propertyData.notes) {
        const updateData: any = {}
        if (propertyData.lat) updateData.lat = propertyData.lat
        if (propertyData.lng) updateData.lng = propertyData.lng
        if (propertyData.notes) updateData.notes = propertyData.notes

        const { error: updateError } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', propertyId)

        if (updateError) {
          console.warn('Failed to update property details:', updateError.message)
          // Don't return error here since property was created successfully
        }
      }

      return { data: propertyId, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  },

  /**
   * Check if user has access to a specific property
   */
  async checkPropertyAccess(propertyId: string, requiredRoles?: string[]) {
    try {
      // Ensure user is authenticated
      const { data: user, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: false, error: new Error('User must be authenticated') }
      }

      // Use the helper function to check access
      const { data: hasAccess, error: accessError } = await supabase.rpc('user_has_property_access', {
        property_id: propertyId,
        user_id: user.user.id,
        required_roles: requiredRoles || null
      })

      if (accessError) {
        return { data: false, error: accessError }
      }

      return { data: !!hasAccess, error: null }
    } catch (err) {
      return { data: false, error: err as Error }
    }
  },

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      // Get properties with details
      const { data: properties, error: propertiesError } = await this.getPropertiesWithDetails()

      if (propertiesError) {
        return { data: null, error: propertiesError }
      }

      if (!properties || properties.length === 0) {
        return {
          data: {
            totalProperties: 0,
            totalUnits: 0,
            occupiedUnits: 0,
            vacantUnits: 0,
            occupancyRate: 0,
            monthlyRentPotential: 0,
            monthlyRentActual: 0,
            overdueAmount: 0
          },
          error: null
        }
      }

      // Calculate stats
      let totalUnits = 0
      let occupiedUnits = 0
      let totalRentPotential = 0
      let totalRentActual = 0

      for (const property of properties) {
        const units = property.units || []
        const activeUnits = units.filter(unit => unit.is_active)
        
        totalUnits += activeUnits.length
        
        for (const unit of activeUnits) {
          totalRentPotential += unit.monthly_rent_kes || 0
          
          const activeTenants = unit.tenants?.filter(tenant => tenant.status === 'ACTIVE') || []
          if (activeTenants.length > 0) {
            occupiedUnits++
            totalRentActual += unit.monthly_rent_kes || 0
          }
        }
      }

      // Get property IDs for overdue calculation
      const propertyIds = properties.map(p => p.id)

      // Get overdue invoices
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('amount_due_kes, amount_paid_kes')
        .in('property_id', propertyIds)
        .eq('status', 'OVERDUE')

      const overdueAmount = overdueInvoices?.reduce(
        (sum, invoice) => sum + ((invoice.amount_due_kes || 0) - (invoice.amount_paid_kes || 0)),
        0
      ) || 0

      return {
        data: {
          totalProperties: properties.length,
          totalUnits,
          occupiedUnits,
          vacantUnits: totalUnits - occupiedUnits,
          occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
          monthlyRentPotential: totalRentPotential,
          monthlyRentActual: totalRentActual,
          overdueAmount
        },
        error: null
      }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  },

  /**
   * Legacy function for backward compatibility
   * @deprecated Use getUserAccessibleProperties instead
   */
  async getUserLandlordIds(autoSetup?: boolean) {
    console.warn('getUserLandlordIds is deprecated. Use getUserAccessibleProperties instead.')
    
    try {
      const { data: user, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user?.user?.id) {
        return { data: [], error: new Error('User must be authenticated') }
      }

      // Check if user exists in landlords table
      const { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('id', user.user.id)
        .single()

      if (landlord) {
        return { data: [landlord.id], error: null }
      }

      if (autoSetup) {
        // Create landlord entry
        const { data: newLandlord, error: createError } = await supabase
          .from('landlords')
          .insert({
            id: user.user.id,
            full_name: user.user.user_metadata?.full_name || user.user.email?.split('@')[0] || 'Unknown',
            email: user.user.email || '',
            phone: '+254700000000'
          })
          .select('id')
          .single()

        if (createError) {
          return { data: [], error: createError }
        }

        return { data: [newLandlord.id], error: null }
      }

      return { data: [], error: null }
    } catch (err) {
      return { data: [], error: err as Error }
    }
  }
}
