'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '../../ui'
import { RoleManagementService } from '../../../lib/auth/role-management.service'
import getSupabaseClient from '../../../lib/supabase-client'

const supabase = getSupabaseClient()

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
}

interface UserRole {
  id: string
  user_id: string
  role: string
  assigned_at: string
  assigned_by: string
  is_active: boolean
}

export default function AdvancedRoleManager() {
  const [users, setUsers] = useState<User[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [error, setError] = useState<string>('')
  const [demoMode, setDemoMode] = useState(false)
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set())

  // Toggle role expansion
  const toggleRoleExpansion = (roleId: string) => {
    const newExpanded = new Set(expandedRoles)
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId)
    } else {
      newExpanded.add(roleId)
    }
    setExpandedRoles(newExpanded)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Get current user first
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) {
                return
      }

      if (user) {
        setUsers([
          {
            id: user.id,
            email: user.email || 'Unknown',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
          },
        ])

        // Load user roles using the database function
        const { data: roleResult, error: rolesError } = await supabase.rpc('get_current_user_roles')

        if (rolesError) {
                    setError('Failed to load user roles')
          setUserRoles([])
        } else if (roleResult && roleResult.success) {
          setUserRoles(roleResult.roles || [])
          setError('') // Clear any previous errors
        } else {
                    setError(roleResult?.error || 'Unknown error loading roles')
          setUserRoles([])
        }
      }
    } catch (error) {
            setError('Failed to load role data. You may not have sufficient permissions.')
      // Set default empty state
      setUsers([])
      setUserRoles([])
    } finally {
      setLoading(false)
    }
  }

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) {
      alert('Please select both user and role')
      return
    }

    try {
      // Use the database function instead of the service for better compatibility
      const { data: result, error } = await supabase.rpc('assign_default_role')

      if (error) {
                alert(`Failed to assign role: ${error.message || 'Unknown error'}`)
      } else if (result && !result.success) {
        alert(`Cannot assign role: ${result.error}`)
      } else {
        alert('Role assigned successfully!')
        setShowAssignModal(false)
        setSelectedUser('')
        setSelectedRole('')
        loadData()
      }
    } catch (error) {
            alert('Failed to assign role: ' + (error as Error).message)
    }
  }

  const revokeRole = async (userId: string, role: string) => {
    if (!confirm(`Are you sure you want to revoke the ${role} role?`)) return

    try {
      // Direct database update for revoking roles
      const { error } = await supabase
        .from('security_user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role', role)
        .eq('is_active', true)

      if (error) {
                alert(`Failed to revoke role: ${error.message || 'Unknown error'}`)
      } else {
        alert('Role revoked successfully!')
        loadData()
      }
    } catch (error) {
            alert('Failed to revoke role: ' + (error as Error).message)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'finance_manager':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'property_manager':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'legal':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'workflow_manager':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'risk_manager':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const availableRoles = RoleManagementService.getAllRoles()

  // TODO: Replace with real data from your user management system
  const demoUserRoles: any[] = [] // Empty - replace with real user role data
  const demoUsers: any[] = [] // Empty - replace with real user data

  const displayUserRoles = demoMode ? demoUserRoles : userRoles
  const displayUsers = demoMode ? demoUsers : users

  if (loading) {
    return <div className="p-4">Loading role management...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Advanced Role Management</h3>
          <p className="text-sm text-gray-600">
            Manage user roles and permissions across the system
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={loadData}
            variant="outline"
            className="bg-gray-50 hover:bg-gray-100 border-gray-200"
          >
            🔄 Refresh
          </Button>
          <Button
            onClick={() => setDemoMode(!demoMode)}
            variant="outline"
            className="bg-purple-50 hover:bg-purple-100 border-purple-200"
          >
            {demoMode ? '📊 Live Mode' : '🎭 Demo Mode'}
          </Button>
          <Button
            onClick={() => setShowAssignModal(true)}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
          >
            👥 Assign Role
          </Button>
        </div>
      </div>

      {/* Demo Mode Indicator */}
      {demoMode && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-700">
            🎭 Demo Mode Active - Showing sample data for demonstration
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && !demoMode && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">⚠️ {error}</p>
          <button
            onClick={() => setError('')}
            className="text-xs text-red-600 hover:text-red-800 mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h4 className="text-lg font-semibold mb-4">Assign Role</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select user...</option>
                  {displayUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} {demoMode ? '(Demo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select role...</option>
                  {availableRoles.map((role) => (
                    <option key={role.role} value={role.role}>
                      {role.display_name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button onClick={assignRole}>Assign Role</Button>
            </div>
          </div>
        </div>
      )}

      {/* Current Role Assignments */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Current Role Assignments</h4>

        {displayUserRoles.length === 0 ? (
          <div className="text-center py-8">
            {error ? (
              <div className="text-gray-500">
                <p>Unable to load role assignments due to permissions.</p>
                <p className="text-sm mt-2">
                  This feature requires admin access to view all user roles.
                </p>
                <Button onClick={loadData} variant="outline" className="mt-3">
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="text-gray-500">No role assignments found</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayUserRoles.map((userRole) => {
              const user = displayUsers.find((u) => u.id === userRole.user_id)
              const roleDefinition = availableRoles.find((r) => r.role === userRole.role)

              return (
                <div
                  key={userRole.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium">{user?.email || 'Unknown User'}</div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(userRole.role)}`}
                      >
                        {roleDefinition?.display_name || userRole.role}
                      </span>
                      {!userRole.is_active && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Assigned: {new Date(userRole.assigned_at).toLocaleDateString()}
                    </div>
                    {roleDefinition && (
                      <div className="text-xs text-gray-400 mt-1">{roleDefinition.description}</div>
                    )}
                  </div>

                  {userRole.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeRole(userRole.user_id, userRole.role)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Role Definitions Reference - Compact with Expandable Permissions */}
      <div className="mt-6 pt-4 border-t">
        <h4 className="font-medium text-gray-900 mb-3 text-base sm:text-lg">
          Available Roles & Permissions
        </h4>
        <div className="space-y-2">
          {availableRoles.slice(0, 6).map((role) => {
            const isExpanded = expandedRoles.has(role.role)

            return (
              <div key={role.role} className="border rounded-lg bg-gray-50">
                {/* Compact Row */}
                <div
                  className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleRoleExpansion(role.role)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(role.role)}`}
                        >
                          {role.display_name}
                        </span>
                        <span className="text-xs text-gray-500">L{role.hierarchy_level}</span>
                        <span className="text-xs text-blue-600 font-medium">
                          {role.permissions.length} perms
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{role.description}</p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span
                        className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expandable Permissions */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-200 bg-white">
                    <div className="pt-3">
                      <h5 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2">
                        Permissions ({role.permissions.length}):
                      </h5>
                      {/* Mobile: Vertical list */}
                      <div className="block sm:hidden space-y-1">
                        {role.permissions.map((permission) => (
                          <div
                            key={permission}
                            className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded border-l-2 border-blue-300"
                          >
                            •{' '}
                            {permission === '*'
                              ? '🔓 ALL PERMISSIONS'
                              : permission.replace(/_/g, ' ')}
                          </div>
                        ))}
                      </div>
                      {/* Desktop: Badge layout */}
                      <div className="hidden sm:flex flex-wrap gap-1">
                        {role.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono"
                            title={permission}
                          >
                            {permission === '*'
                              ? '🔓 ALL PERMISSIONS'
                              : permission.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
