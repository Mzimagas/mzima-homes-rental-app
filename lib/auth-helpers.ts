import { supabase } from './supabase-client'

export interface AuthSetupResult {
  success: boolean
  message: string
  landlordId?: string
}

/**
 * Ensures the current user has proper landlord access set up
 * This function will:
 * 1. Check if user is authenticated
 * 2. Check if user has landlord access
 * 3. If not, attempt to create a landlord record and link it to the user
 */
export async function ensureUserLandlordAccess(): Promise<AuthSetupResult> {
  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        success: false,
        message: 'User not authenticated. Please sign in first.'
      }
    }

    // Check if user already has landlord access
    const { data: landlordIds, error: landlordError } = await supabase.rpc('get_user_landlord_ids', {
      user_uuid: user.id
    })

    if (landlordError) {
      return {
        success: false,
        message: `Error checking landlord access: ${landlordError.message}`
      }
    }

    // If user already has landlord access, return success
    if (landlordIds && landlordIds.length > 0) {
      return {
        success: true,
        message: 'User already has landlord access',
        landlordId: landlordIds[0]
      }
    }

    // User doesn't have landlord access, try to create it
    return await createLandlordAccessForUser(user)
    
  } catch (err: any) {
    return {
      success: false,
      message: `Unexpected error: ${err.message}`
    }
  }
}

/**
 * Creates a landlord record and links it to the current user
 */
async function createLandlordAccessForUser(user: any): Promise<AuthSetupResult> {
  try {
    // Check if a landlord record already exists for this email
    const { data: existingLandlords, error: checkError } = await supabase
      .from('landlords')
      .select('id')
      .eq('email', user.email)
      .limit(1)

    if (checkError) {
      return {
        success: false,
        message: `Error checking existing landlords: ${checkError.message}`
      }
    }

    let landlordId: string

    if (existingLandlords && existingLandlords.length > 0) {
      // Use existing landlord record
      landlordId = existingLandlords[0].id
    } else {
      // Create new landlord record
      const { data: newLandlord, error: createError } = await supabase
        .from('landlords')
        .insert([{
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          phone: user.user_metadata?.phone || '+254700000000' // Default phone
        }])
        .select()
        .single()

      if (createError) {
        return {
          success: false,
          message: `Error creating landlord record: ${createError.message}`
        }
      }

      landlordId = newLandlord.id
    }

    // Create user role assignment
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([{
        user_id: user.id,
        landlord_id: landlordId,
        role: 'LANDLORD'
      }])

    if (roleError) {
      // Check if it's a duplicate key error (role already exists)
      if (roleError.code === '23505') {
        return {
          success: true,
          message: 'User role assignment already exists',
          landlordId: landlordId
        }
      }
      
      return {
        success: false,
        message: `Error creating user role: ${roleError.message}`
      }
    }

    // Create default notification rule
    await createDefaultNotificationRule(landlordId)

    return {
      success: true,
      message: 'Successfully created landlord access for user',
      landlordId: landlordId
    }

  } catch (err: any) {
    return {
      success: false,
      message: `Error setting up landlord access: ${err.message}`
    }
  }
}

/**
 * Creates a default notification rule for a new landlord
 */
async function createDefaultNotificationRule(landlordId: string): Promise<void> {
  try {
    await supabase
      .from('notification_rules')
      .insert([{
        landlord_id: landlordId,
        type: 'rent_due',
        name: 'Rent Due Reminder',
        description: 'Notify tenants when rent is due',
        enabled: true,
        trigger_days: 3,
        channels: ['email']
      }])
  } catch (err) {
    // Ignore errors when creating default notification rule
    console.warn('Could not create default notification rule:', err)
  }
}

/**
 * Enhanced getUserLandlordIds that can auto-setup access if needed
 */
export async function getUserLandlordIdsWithAutoSetup(autoSetup: boolean = false): Promise<{
  data: string[] | null
  error: string | null
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { data: null, error: 'User not authenticated' }
    }

    // Try to get landlord IDs
    const { data, error } = await supabase.rpc('get_user_landlord_ids', { user_uuid: user.id })

    if (error) {
      return { data: null, error: error.message }
    }

    const landlordIds = data || []

    // If no landlord access and auto-setup is enabled, try to create it
    if (landlordIds.length === 0 && autoSetup) {
      const setupResult = await ensureUserLandlordAccess()
      
      if (setupResult.success && setupResult.landlordId) {
        return { data: [setupResult.landlordId], error: null }
      } else {
        return { data: null, error: setupResult.message }
      }
    }

    return { data: landlordIds, error: null }
  } catch (err: any) {
    return { data: null, error: err.message }
  }
}

/**
 * Check if the current user has proper authentication and landlord access
 */
export async function checkUserAccess(): Promise<{
  isAuthenticated: boolean
  hasLandlordAccess: boolean
  landlordIds: string[]
  error?: string
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        isAuthenticated: false,
        hasLandlordAccess: false,
        landlordIds: []
      }
    }

    const { data: landlordIds, error: landlordError } = await supabase.rpc('get_user_landlord_ids', {
      user_uuid: user.id
    })

    if (landlordError) {
      return {
        isAuthenticated: true,
        hasLandlordAccess: false,
        landlordIds: [],
        error: landlordError.message
      }
    }

    return {
      isAuthenticated: true,
      hasLandlordAccess: (landlordIds && landlordIds.length > 0),
      landlordIds: landlordIds || []
    }
  } catch (err: any) {
    return {
      isAuthenticated: false,
      hasLandlordAccess: false,
      landlordIds: [],
      error: err.message
    }
  }
}
