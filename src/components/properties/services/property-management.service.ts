import supabase from '../../../lib/supabase-client'
import { PropertyWithLifecycle, PendingChanges } from '../types/property-management.types'
import { isAuthError, redirectToLogin } from '../utils/property-management.utils'

export class PropertyManagementService {
  // Helper function to handle authentication errors
  static async handleAuthError(error: any, context: string): Promise<boolean> {
    console.error(`Authentication error in ${context}:`, error)

    if (isAuthError(error)) {
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.error('Error signing out:', signOutError)
      }
      redirectToLogin(context)
      return true
    }
    return false
  }

  // Load all properties with lifecycle information
  static async loadProperties(): Promise<PropertyWithLifecycle[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        const handled = await this.handleAuthError(authError, 'loadProperties')
        if (handled) return []
      }
      if (!user) {
        console.error('No authenticated user found')
        window.location.href = '/auth/login?message=Please log in to access properties.'
        return []
      }

      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_source,
          lifecycle_status,
          subdivision_status,
          handover_status,
          handover_date,
          source_reference_id,
          parent_property_id,
          purchase_completion_date,
          subdivision_date,
          acquisition_notes,
          expected_rental_income_kes,
          sale_price_kes,
          estimated_value_kes,
          total_area_sqm,
          total_area_acres,
          purchase_price_agreement_kes
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // For now, return data without land financial transformation until DB migration is applied
      return (data as PropertyWithLifecycle[]) || []
    } catch (error) {
      console.error('Error loading properties:', error)
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
    console.log('savePropertyChanges called with:', { propertyId, changes })

    if (!changes) {
      console.log('No changes provided, returning false')
      return false
    }

    try {
      const updateData: any = {}
      const property = properties.find(p => p.id === propertyId)
      if (!property) {
        console.error('Property not found:', propertyId)
        alert('Property not found. Please refresh and try again.')
        return false
      }

      console.log('Found property:', property)

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
          const match = document.cookie.split(';').map(p => p.trim()).find(p => p.startsWith('csrf-token='))
          if (!match) return null
          return decodeURIComponent(match.split('=')[1])
        } catch {
          return null
        }
      }

      const csrfToken = getCsrfToken()
      console.log('CSRF token:', csrfToken ? 'Found' : 'Not found')
      if (!csrfToken) throw new Error('CSRF token not found. Please refresh the page and try again.')

      console.log('Getting session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session result:', { session: session ? 'Found' : 'Not found', error: sessionError })

      if (sessionError) {
        console.error('Session error:', sessionError)
        if (isAuthError(sessionError)) {
          try {
            console.log('Attempting session refresh...')
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError) {
              console.log('Session refresh successful, retrying...')
              return this.savePropertyChanges(propertyId, changes, properties) // retry once
            }
            console.error('Session refresh failed:', refreshError)
          } catch (refreshErr) {
            console.error('Session refresh exception:', refreshErr)
          }
          alert('Your session has expired. Please log in again.')
          window.location.href = '/auth/login?message=Session expired. Please log in again.'
          return false
        }
        throw new Error(`Authentication error: ${sessionError.message}`)
      }

      if (!session) {
        console.error('No session found')
        alert('You are not logged in. Please log in to save changes.')
        window.location.href = '/auth/login?message=Please log in to save changes.'
        return false
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      console.log('Making PATCH request to:', `/api/properties/${propertyId}`)
      console.log('Request headers:', headers)
      console.log('Request body:', JSON.stringify(updateData))

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(updateData),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error Response:', errorData)
        throw new Error(`Failed to update property: ${response.status} ${response.statusText}`)
      }

      return true
    } catch (err: any) {
      console.error('Error saving changes:', err)
      console.error('Error type:', typeof err)
      console.error('Error name:', err?.name)
      console.error('Error message:', err?.message)
      console.error('Error stack:', err?.stack)

      // Handle specific fetch errors
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        alert('Network error: Unable to connect to the server. Please check your internet connection and try again.')
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
