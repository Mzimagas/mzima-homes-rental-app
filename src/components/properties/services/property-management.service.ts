import supabase from '../../../lib/supabase-client'
import { PropertyWithLifecycle, PendingChanges } from '../types/property-management.types'
import { isAuthError, redirectToLogin } from '../utils/property-management.utils'

export class PropertyManagementService {
  // Helper function to handle authentication errors
  static async handleAuthError(error: any, context: string): Promise<boolean> {
        if (isAuthError(error)) {
      try {
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
      let user = null
      let authError = null
      try {
        const authResult = await supabase.auth.getUser()
        user = authResult.data?.user
        authError = authResult.error
      } catch (error) {
        console.warn('⚠️ PropertyManagementService: Auth session error caught in loadProperties, but continuing for admin users:', error)
        authError = error
      }

      if (authError) {
        console.warn('⚠️ PropertyManagementService: Auth error in loadProperties, but continuing for admin users:', authError)
        // Don't redirect admin users - let them continue
        // const handled = await this.handleAuthError(authError, 'loadProperties')
        // if (handled) return []
        return []
      }
      if (!user) {
        console.warn('⚠️ PropertyManagementService: No user found in loadProperties, returning empty array')
        // Don't redirect admin users - let them continue
        // window.location.href = '/auth/login?message=Please log in to access properties.'
        return []
      }

      console.log('✅ User authenticated:', user.id, user.email)

      // Get properties the user has access to
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
        console.error('❌ Database error in loadProperties:', error)
        throw error
      }

      console.log('📊 Properties loaded successfully:', data?.length || 0, 'properties')

      // Return the properties data directly
      return (data as PropertyWithLifecycle[]) || []
    } catch (error) {
            if (error instanceof Error && isAuthError(error)) {
        window.location.href = '/auth/login?message=Session expired. Please log in again.'
      }
      return []
    }
  }

  // Save property status changes
  static async savePropertyChanges(
    propertyId: string,
    changes: PendingChanges[string],
    properties: PropertyWithLifecycle[]
  ): Promise<boolean> {
        if (!changes) {
            return false
    }

    try {
      const updateData: any = {}
      const property = properties.find((p) => p.id === propertyId)
      if (!property) {
                alert('Property not found. Please refresh and try again.')
        return false
      }

            // Handle subdivision changes
      if (changes.subdivision !== undefined) {
        const currentSubdivisionValue =
          property.subdivision_status === 'SUBDIVIDED'
            ? 'Subdivided'
            : property.subdivision_status === 'SUB_DIVISION_STARTED'
              ? 'Sub-Division Started'
              : 'Not Started'

        if (currentSubdivisionValue !== changes.subdivision) {
          if (changes.subdivision === 'Subdivided') {
            if (property.lifecycle_status !== 'ACTIVE') {
              alert('Only ACTIVE properties can be marked as subdivided')
              return false
            }
            updateData.lifecycle_status = 'SUBDIVIDED'
            updateData.subdivision_status = 'SUBDIVIDED'
            updateData.subdivision_date = new Date().toISOString().split('T')[0]
          } else if (changes.subdivision === 'Sub-Division Started') {
            updateData.subdivision_status = 'SUB_DIVISION_STARTED'
            if (property.lifecycle_status === 'SUBDIVIDED') updateData.lifecycle_status = 'ACTIVE'
            if (property.subdivision_date) updateData.subdivision_date = null
          } else if (changes.subdivision === 'Not Started') {
            updateData.subdivision_status = 'NOT_STARTED'
            if (property.lifecycle_status === 'SUBDIVIDED') updateData.lifecycle_status = 'ACTIVE'
            if (property.subdivision_date) updateData.subdivision_date = null
          }
        }
      }

      // Handle handover changes
      if (changes.handover !== undefined) {
        const currentHandoverValue =
          property.handover_status === 'COMPLETED'
            ? 'Handed Over'
            : property.handover_status === 'IN_PROGRESS'
              ? 'In Progress'
              : 'Not Started'

        if (currentHandoverValue !== changes.handover) {
          let newStatus: string
          let setDate = false
          if (changes.handover === 'Handed Over') {
            newStatus = 'COMPLETED'
            setDate = true
          } else if (changes.handover === 'In Progress') {
            newStatus = 'IN_PROGRESS'
          } else {
            newStatus = 'PENDING'
          }
          updateData.handover_status = newStatus
          updateData.handover_date = setDate ? new Date().toISOString().split('T')[0] : null
        }
      }

      if (Object.keys(updateData).length === 0) {
        return true // No changes needed
      }

      // Get CSRF token
      const getCsrfToken = () => {
        try {
          const match = document.cookie
            .split(';')
            .map((p) => p.trim())
            .find((p) => p.startsWith('csrf-token='))
          if (!match) return null
          return decodeURIComponent(match.split('=')[1])
        } catch {
          return null
        }
      }

      const csrfToken = getCsrfToken()
            if (!csrfToken)
        throw new Error('CSRF token not found. Please refresh the page and try again.')

            const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
            if (sessionError) {
                if (isAuthError(sessionError)) {
          try {
                        const { error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError) {
                            return this.savePropertyChanges(propertyId, changes, properties) // retry once
            }
                      } catch (refreshErr) {
                      }
          alert('Your session has expired. Please log in again.')
          window.location.href = '/auth/login?message=Session expired. Please log in again.'
          return false
        }
        throw new Error(`Authentication error: ${sessionError.message}`)
      }

      if (!session) {
                alert('You are not logged in. Please log in to save changes.')
        window.location.href = '/auth/login?message=Please log in to save changes.'
        return false
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

                  console.log('Request body:', JSON.stringify(updateData))

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(updateData),
      })

                  if (!response.ok) {
        const errorData = await response.text()
                throw new Error(`Failed to update property: ${response.status} ${response.statusText}`)
      }

      return true
    } catch (err: any) {
                                    // Handle specific fetch errors
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        alert(
          'Network error: Unable to connect to the server. Please check your internet connection and try again.'
        )
        return false
      }

      if (isAuthError(err)) {
        alert('Your session has expired. You will be redirected to login.')
        window.location.href = '/auth/login?message=Session expired. Please log in again.'
        return false
      }
      if (err?.message?.includes('CSRF token')) {
        alert('Security token expired. Please refresh the page and try again.')
        window.location.reload()
        return false
      }
      alert(`Failed to save changes: ${err?.message ?? 'Unknown error'}`)
      return false
    }
  }
}
