import { getSupabaseBrowser } from '../../../lib/supabase/client'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { isAuthError, redirectToLogin } from '../utils/property-management.utils'

export class PropertyManagementService {
  // Helper function to handle authentication errors
  static async handleAuthError(error: any, context: string): Promise<boolean> {
        if (isAuthError(error)) {
      try {
        const supabase = getSupabaseBrowser()
        await supabase.auth.signOut()
      } catch (signOutError) {
              }
      redirectToLogin(context)
      return true
    }
    return false
  }

  // Load all properties with succession status for purchase form
  static async loadPropertiesWithSuccession(): Promise<PropertyWithLifecycle[]> {
    try {
      let user = null
      let authError = null
      try {
        const supabase = getSupabaseBrowser()
        const authResult = await supabase.auth.getUser()
        user = authResult.data?.user
        authError = authResult.error
      } catch (error) {
        console.warn('⚠️ PropertyManagementService: Auth session error caught in loadPropertiesWithSuccession, but continuing for admin users:', error)
        authError = error
      }

      if (authError) {
        console.warn('⚠️ PropertyManagementService: Auth error in loadPropertiesWithSuccession, but continuing for admin users:', authError)
        // Don't redirect admin users - let them continue
        // const handled = await this.handleAuthError(authError, 'loadPropertiesWithSuccession')
        // if (handled) return []
        return []
      }
      if (!user) {
        console.warn('⚠️ PropertyManagementService: No user found in loadPropertiesWithSuccession, returning empty array')
        // Don't redirect admin users - let them continue
        // window.location.href = '/auth/login?message=Please log in to access properties.'
        return []
      }

      console.log('✅ User authenticated:', user.id, user.email)

      // Get properties with succession status
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_users!inner(role, status)
        `)
        .eq('property_users.user_id', user.id)
        .eq('property_users.status', 'ACTIVE')
        .is('disabled_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Database error in loadPropertiesWithSuccession:', error)
        throw error
      }

      console.log('📊 Properties with succession loaded successfully:', data?.length || 0, 'properties')

      // Return the properties data with succession status
      return (data as PropertyWithLifecycle[]) || []
    } catch (error) {
      if (error instanceof Error && isAuthError(error)) {
        window.location.href = '/auth/login?message=Session expired. Please log in again.'
      }
      return []
    }
  }

  // Load all properties with lifecycle information
  static async loadProperties(): Promise<PropertyWithLifecycle[]> {
    try {
      const supabase = getSupabaseBrowser()

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('❌ PropertyManagementService: Auth error in loadProperties:', authError)
        throw authError
      }

      if (!user) {
        console.warn('⚠️ PropertyManagementService: No user found in loadProperties')
        return []
      }

      console.log('✅ PropertyManagementService: User authenticated:', user.email)

      // Try to load properties directly from the properties table with user access
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_users!inner(role, status)
        `)
        .eq('property_users.user_id', user.id)
        .eq('property_users.status', 'ACTIVE')
        .is('disabled_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ PropertyManagementService: Database error in loadProperties:', error)

        // If the property_users table doesn't exist or user has no access records,
        // try loading all properties for admin users
        console.log('🔄 PropertyManagementService: Trying fallback query for admin users...')

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('properties')
          .select('*')
          .is('disabled_at', null)
          .order('created_at', { ascending: false })

        if (fallbackError) {
          console.error('❌ PropertyManagementService: Fallback query also failed:', fallbackError)
          return []
        }

        console.log('✅ PropertyManagementService: Fallback query successful, loaded', fallbackData?.length || 0, 'properties')
        return (fallbackData as PropertyWithLifecycle[]) || []
      }

      console.log('✅ PropertyManagementService: Properties loaded successfully:', data?.length || 0, 'properties')
      return (data as PropertyWithLifecycle[]) || []
    } catch (error) {
      if (error instanceof Error && isAuthError(error)) {
        window.location.href = '/auth/login?message=Session expired. Please log in again.'
      }
      console.error('❌ PropertyManagementService: Error in loadProperties:', error)
      return []
    }
  }

  // savePropertyChanges removed – immediate persistence via PropertyStatusUpdateService
}
