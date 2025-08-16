'use client'

import { useState, useEffect } from 'react'
import supabase from '../../lib/supabase-client'
import { usePropertyAccess, getRoleDisplayName, getRoleDescription, type UserRole } from '../../hooks/usePropertyAccess'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { UserManagementDenied } from '../common/PermissionDenied'

interface PropertyUser {
  id: string
  user_id: string
  role: UserRole
  status: string
  accepted_at: string | null
  user_email?: string
  user_name?: string
}

interface UserInvitation {
  id: string
  email: string
  role: UserRole
  status: string
  expires_at: string
  invited_at: string
}

export default function UserManagement() {
  const { currentProperty, canManageUsers, userRole } = usePropertyAccess()
  const [users, setUsers] = useState<PropertyUser[]>([])
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('VIEWER')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // supabase client is imported above

  useEffect(() => {
    if (currentProperty) {
      // Add a small delay to ensure authentication is ready
      const timer = setTimeout(() => {
        loadUsers()
        loadInvitations()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [currentProperty])

  const loadUsers = async () => {
    if (!currentProperty) return

    try {
      const { data, error } = await supabase
        .from('property_users')
        .select(`
          id,
          user_id,
          role,
          status,
          accepted_at
        `)
        .eq('property_id', currentProperty.property_id)
        .eq('status', 'ACTIVE')

      if (error) throw error

      // Get user details from auth.users (this might need to be done differently depending on your setup)
      const usersWithDetails = data?.map((user: any) => ({
        ...user,
        user_email: 'user@example.com', // Placeholder - you'll need to get this from your user management system
        user_name: 'User Name' // Placeholder
      })) || []

      setUsers(usersWithDetails)
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Failed to load users')
    }
  }

  const loadInvitations = async (retryCount = 0) => {
    if (!currentProperty) {
      console.log('❌ loadInvitations: No current property')
      return
    }

    console.log('🔍 loadInvitations: Starting invitation load process (attempt', retryCount + 1, ')')
    console.log('📍 Property ID:', currentProperty.property_id)
    console.log('🔑 Supabase client type:', supabase.supabaseUrl ? 'Configured' : 'Not configured')

    try {
      // Check authentication state first
      console.log('🔐 Checking authentication state...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        // Extract full error details for debugging
        const authErrorInfo = {
          message: authError.message || 'No message',
          name: authError.name || 'No name',
          status: authError.status || 'No status',
          code: authError.code || 'No code',
          isAuthError: authError.__isAuthError || false,
          errorString: String(authError)
        }

        console.error('❌ Authentication error details:', authErrorInfo)

        // Handle specific authentication errors
        if (authError.message?.includes('Auth session missing') || authError.__isAuthError) {
          // Try to refresh the session if this is the first attempt
          if (retryCount === 0) {
            console.log('🔄 Attempting to refresh session...')
            try {
              const { error: refreshError } = await supabase.auth.refreshSession()
              if (!refreshError) {
                console.log('✅ Session refreshed, retrying...')
                return loadInvitations(retryCount + 1)
              } else {
                console.log('❌ Session refresh failed:', refreshError)
              }
            } catch (refreshErr) {
              console.log('❌ Session refresh exception:', refreshErr)
            }
          }

          // Provide clear guidance to the user
          setError('Authentication required: Please sign in to access user management features. Click here to go to login page.')
          return
        }

        if (authError.message?.includes('JWT')) {
          setError('Your session has expired. Please sign in again to continue.')
          return
        }

        setError(`Authentication error: ${authError.message || 'Please sign in to continue'}`)
        return
      }

      if (!user) {
        console.error('❌ No authenticated user found')
        setError('Please sign in to access user management features')
        return
      }

      console.log('✅ User authenticated:', user.id, user.email)

      // Check user's property access
      console.log('🏠 Checking property access...')
      const { data: propertyAccess, error: accessError } = await supabase
        .from('property_users')
        .select('role, status')
        .eq('user_id', user.id)
        .eq('property_id', currentProperty.property_id)
        .eq('status', 'ACTIVE')
        .single()

      if (accessError) {
        console.error('❌ Property access check error:', accessError)
        // Don't throw here, continue with the invitation query
      } else {
        console.log('✅ Property access confirmed:', propertyAccess)
      }

      console.log('📨 Executing invitation query...')
      const queryStart = Date.now()

      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('property_id', currentProperty.property_id)
        .eq('status', 'PENDING')

      const queryTime = Date.now() - queryStart
      console.log(`⏱️ Query completed in ${queryTime}ms`)

      if (error) {
        // Extract error properties properly (some are non-enumerable)
        const errorInfo = {
          message: error.message || 'No message',
          details: error.details || 'No details',
          hint: error.hint || 'No hint',
          code: error.code || 'No code',
          status: error.status || 'No status',
          name: error.name || 'No name',
          // Use getOwnPropertyNames to get non-enumerable properties
          allProperties: Object.getOwnPropertyNames(error),
          // Convert to string to get full error representation
          errorString: String(error),
          // Check if it's an auth error
          isAuthError: error.__isAuthError || false
        }

        console.error('❌ Supabase query error:', errorInfo)

        // Set user-friendly error message
        if (error.__isAuthError) {
          setError(`Authentication error: ${error.message || 'Please sign in again'}`)
          return
        }

        if (error.code === '42501') {
          setError('Access denied: You do not have permission to view invitations for this property')
          return
        }

        setError(`Database error: ${error.message || 'Unknown error occurred'}`)
        return
      }

      console.log('✅ Invitations loaded successfully:', {
        count: data?.length || 0,
        data: data
      })
      setInvitations(data || [])

    } catch (err) {
      // Comprehensive error extraction that handles non-enumerable properties
      const e1 = err as any
      const errorInfo = {
        errorType: typeof e1,
        errorConstructor: e1?.constructor?.name,
        errorMessage: e1?.message,
        errorDetails: e1?.details,
        errorCode: e1?.code,
        errorHint: e1?.hint,
        errorStatus: e1?.status,
        errorName: e1?.name,
        isAuthError: e1?.__isAuthError,
        // Get all properties including non-enumerable ones
        allProperties: e1 ? Object.getOwnPropertyNames(e1) : [],
        // Convert to string representation
        errorString: String(e1),
        // Proper JSON serialization
        errorJSON: e1 ? JSON.stringify(e1, Object.getOwnPropertyNames(e1)) : 'null'
      }

      console.error('❌ Error in loadInvitations:', errorInfo)

      // Extract meaningful error message
      let errorMessage = 'Unknown error occurred'

      const e2 = err as any
      if (e2?.message) {
        errorMessage = e2.message
      } else if (err?.toString && typeof err.toString === 'function') {
        errorMessage = err.toString()
      } else if (typeof err === 'string') {
        errorMessage = err
      }

      // Don't set error state if we already handled it above (auth errors, permission errors)
      if (!error) {
        setError(`Failed to load invitations: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProperty || !inviteEmail.trim()) return

    try {
      setInviting(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_invitations')
        .insert({
          property_id: currentProperty.property_id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invited_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      setInvitations(prev => [...prev, data])
      
      // Reset form
      setInviteEmail('')
      setInviteRole('VIEWER')
      setShowInviteForm(false)

      // TODO: Send invitation email
      alert(`Invitation sent to ${inviteEmail}`)

    } catch (err) {
      const e3 = err as any
      console.error('Error inviting user:', {
        error: e3,
        message: e3 instanceof Error ? e3.message : 'Unknown error',
        details: e3?.details,
        code: e3?.code
      })
      setError(`Failed to send invitation: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'REVOKED' })
        .eq('id', invitationId)

      if (error) {
        console.error('Supabase error revoking invitation:', {
          message: error.message,
          details: error.details,
          code: error.code
        })
        throw error
      }

      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } catch (err) {
      console.error('Error revoking invitation:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      })
      setError(`Failed to revoke invitation: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return

    try {
      const { error } = await supabase
        .from('property_users')
        .update({ status: 'REVOKED' })
        .eq('id', userId)

      if (error) throw error

      setUsers(prev => prev.filter(user => user.id !== userId))
    } catch (err) {
      console.error('Error removing user:', err)
      setError('Failed to remove user')
    }
  }

  if (!currentProperty) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Select a property to manage users</p>
      </div>
    )
  }

  // Check if user has permission to manage users
  if (!canManageUsers || !currentProperty.can_manage_users) {
    return (
      <UserManagementDenied
        currentRole={userRole || 'Unknown'}
        className="mx-auto max-w-2xl"
      />
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Property Team - {currentProperty.property_name}
        </h2>
        <button
          onClick={() => setShowInviteForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Invite User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <div className="flex space-x-2">
              {error.includes('Authentication required') || error.includes('sign in') ? (
                <button
                  onClick={() => {
                    window.location.href = `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`
                  }}
                  className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  Sign In
                </button>
              ) : null}
              <button
                onClick={() => {
                  setError(null)
                  loadInvitations()
                  loadUsers()
                }}
                className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Users */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Current Users ({users.length})
          </h3>
          
          {users.length === 0 ? (
            <p className="text-gray-500">No users found</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.user_email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.user_email}</p>
                        <p className="text-sm text-gray-500">{getRoleDisplayName(user.role)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'OWNER' ? 'bg-green-100 text-green-800' :
                      user.role === 'PROPERTY_MANAGER' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'LEASING_AGENT' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'MAINTENANCE_COORDINATOR' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                    {user.role !== 'OWNER' && (
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove user"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Pending Invitations ({invitations.length})
            </h3>
            
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-sm text-gray-500">
                      Invited as {getRoleDisplayName(invitation.role)} • 
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Revoke invitation"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invite User</h3>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="MAINTENANCE_COORDINATOR">Maintenance Coordinator</option>
                    <option value="LEASING_AGENT">Leasing Agent</option>
                    <option value="PROPERTY_MANAGER">Property Manager</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {getRoleDescription(inviteRole)}
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
