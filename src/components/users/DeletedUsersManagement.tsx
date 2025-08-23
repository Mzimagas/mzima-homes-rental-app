'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui'

interface DeletedUser {
  id: string
  email: string
  name?: string
  memberNumber?: string
  phoneNumber?: string
  status?: string
  createdAt?: string
  deletedAt?: string
  profileComplete?: boolean
}

interface DeletedUsersManagementProps {
  className?: string
}

export default function DeletedUsersManagement({ className = '' }: DeletedUsersManagementProps) {
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [restoringUserId, setRestoringUserId] = useState<string | null>(null)
  const [permanentDeletingUserId, setPermanentDeletingUserId] = useState<string | null>(null)

  // Fetch deleted users from API
  const fetchDeletedUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/users/deleted')
      
      if (!response.ok) {
        throw new Error('Failed to fetch deleted users')
      }

      const data = await response.json()
      
      // Transform API data
      const transformedUsers: DeletedUser[] = (data.users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.full_name,
        memberNumber: user.member_number,
        phoneNumber: user.phone_number,
        status: user.status,
        createdAt: user.created_at,
        deletedAt: user.deleted_at,
        profileComplete: user.profile_complete
      }))

      setDeletedUsers(transformedUsers)
    } catch (err) {
      console.error('Error fetching deleted users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch deleted users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeletedUsers()
  }, [fetchDeletedUsers])

  const handleRestoreUser = useCallback(async (userId: string) => {
    const userToRestore = deletedUsers.find(u => u.id === userId)
    const userName = userToRestore?.name || userToRestore?.email || 'this user'
    
    if (!confirm(`Are you sure you want to restore ${userName}?\n\nThis will reactivate the user account and make it accessible again.`)) {
      return
    }

    setRestoringUserId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/restore`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to restore user')
      }

      // Refresh deleted users list
      await fetchDeletedUsers()
      
      alert(`✅ ${userName} has been successfully restored and reactivated.`)
    } catch (err) {
      console.error('Error restoring user:', err)
      alert('❌ Failed to restore user. Please try again.')
    } finally {
      setRestoringUserId(null)
    }
  }, [deletedUsers, fetchDeletedUsers])

  const handlePermanentDelete = useCallback(async (userId: string) => {
    const userToDelete = deletedUsers.find(u => u.id === userId)
    const userName = userToDelete?.name || userToDelete?.email || 'this user'
    
    if (!confirm(`⚠️ PERMANENT DELETE WARNING ⚠️\n\nAre you absolutely sure you want to PERMANENTLY delete ${userName}?\n\nThis action:\n• Cannot be undone\n• Will remove ALL user data forever\n• Cannot be recovered\n\nType "DELETE FOREVER" in the next prompt to confirm.`)) {
      return
    }

    const confirmation = prompt('Type "DELETE FOREVER" to confirm permanent deletion:')
    if (confirmation !== 'DELETE FOREVER') {
      alert('Permanent deletion cancelled - confirmation text did not match.')
      return
    }

    setPermanentDeletingUserId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/permanent-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: 'PERMANENTLY_DELETE' })
      })

      if (!response.ok) {
        throw new Error('Failed to permanently delete user')
      }

      // Refresh deleted users list
      await fetchDeletedUsers()
      
      alert(`✅ ${userName} has been permanently deleted. All data has been removed and cannot be recovered.`)
    } catch (err) {
      console.error('Error permanently deleting user:', err)
      alert('❌ Failed to permanently delete user. Please try again.')
    } finally {
      setPermanentDeletingUserId(null)
    }
  }, [deletedUsers, fetchDeletedUsers])

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getInitials = (name?: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const filteredUsers = deletedUsers.filter(user => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.memberNumber?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">🗑️</span>
            Deleted Users
          </h3>
          <p className="text-gray-600 mt-1">
            Manage soft deleted users - restore or permanently delete
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {filteredUsers.length} of {deletedUsers.length} deleted users
          </span>
          <Button
            variant="outline"
            onClick={fetchDeletedUsers}
            disabled={loading}
          >
            <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search deleted users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading deleted users...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <Button
            variant="outline"
            onClick={fetchDeletedUsers}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-green-50 border-2 border-dashed border-green-200 rounded-xl p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {deletedUsers.length === 0 ? 'No deleted users' : 'No users match your search'}
          </h4>
          <p className="text-gray-600">
            {deletedUsers.length === 0 
              ? 'All users are active. Deleted users will appear here for recovery or permanent deletion.'
              : 'Try adjusting your search criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {/* User Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm opacity-75">
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {user.name || 'Unnamed User'}
                    </h4>
                    <p className="text-gray-600">{user.email}</p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>#{user.memberNumber}</span>
                      <span>Deleted: {formatDate(user.deletedAt)}</span>
                      <span>Created: {formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleRestoreUser(user.id)}
                    disabled={restoringUserId === user.id}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      restoringUserId === user.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white transform hover:scale-105 shadow-md'
                    }`}
                  >
                    {restoringUserId === user.id ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                        <span>Restoring...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Restore</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handlePermanentDelete(user.id)}
                    disabled={permanentDeletingUserId === user.id}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      permanentDeletingUserId === user.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white transform hover:scale-105 shadow-md'
                    }`}
                  >
                    {permanentDeletingUserId === user.id ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete Forever</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
