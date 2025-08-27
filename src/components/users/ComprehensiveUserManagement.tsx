'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui'
import UserEditModal from './UserEditModal'
import UserDetailsModal from './UserDetailsModal'
import UserAdditionModal from './UserAdditionModal'

interface User {
  id: string
  email: string
  name?: string
  memberNumber?: string
  phoneNumber?: string
  role: string
  isActive: boolean
  status?: string
  createdAt?: string
  lastLogin?: string | null
  profileComplete?: boolean
}

interface ComprehensiveUserManagementProps {
  className?: string
}

export default function ComprehensiveUserManagement({
  className = '',
}: ComprehensiveUserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created' | 'login'>('created')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [refreshing, setRefreshing] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [showFabAnimation, setShowFabAnimation] = useState(true)

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/users')

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()

      // Transform API data to match User interface
      const transformedUsers: User[] = (data.users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.full_name,
        memberNumber: user.member_number,
        phoneNumber: user.phone_number,
        role: 'member', // Default role
        isActive: user.status === 'active',
        status: user.status,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        profileComplete: user.profile_complete,
        deletedAt: user.deleted_at,
        isDeleted: !!user.deleted_at,
      }))

      setUsers(transformedUsers)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Keyboard shortcut for Quick Add (Ctrl/Cmd + Shift + A)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault()
        setShowQuickAddModal(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Hide FAB animation after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFabAnimation(false)
    }, 3000) // Stop animation after 3 seconds

    return () => clearTimeout(timer)
  }, [])

  // Filter and sort users
  const filteredAndSortedUsers = useCallback(() => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.memberNumber?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive)

      return matchesSearch && matchesStatus
    })

    // Sort users
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '')
        case 'email':
          return a.email.localeCompare(b.email)
        case 'login': {
          const aLogin = new Date(a.lastLogin || 0).getTime()
          const bLogin = new Date(b.lastLogin || 0).getTime()
          return bLogin - aLogin
        }
        case 'created':
        default: {
          const aCreated = new Date(a.createdAt || 0).getTime()
          const bCreated = new Date(b.createdAt || 0).getTime()
          return bCreated - aCreated
        }
      }
    })

    return filtered
  }, [users, searchTerm, statusFilter, sortBy])

  const handleQuickAddUserAdded = useCallback(() => {
    setRefreshing(true)
    fetchUsers().finally(() => setRefreshing(false))
    setShowQuickAddModal(false)
  }, [fetchUsers])

  const handleUserUpdated = useCallback(() => {
    fetchUsers()
    setEditingUser(null)
  }, [fetchUsers])

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      const userToDelete = users.find((u) => u.id === userId)
      const userName = userToDelete?.name || userToDelete?.email || 'this user'

      if (
        !confirm(
          `Are you sure you want to delete ${userName}?\n\nThis will be a soft delete - the user data will be retained and can be recovered later if needed.`
        )
      ) {
        return
      }

      setDeletingUserId(userId)
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete user')
        }

        // Refresh user list with animation
        await fetchUsers()

        // Show success message
        const userToDelete = users.find((u) => u.id === userId)
        const userName = userToDelete?.name || userToDelete?.email || 'User'
        alert(
          `✅ ${userName} has been successfully deleted.\n\nThis was a soft delete - the user data has been retained and can be recovered from the Deleted Users section if needed.`
        )
      } catch (err) {
        console.error('Error deleting user:', err)
        alert('❌ Failed to delete user. Please try again.')
      } finally {
        setDeletingUserId(null)
      }
    },
    [fetchUsers]
  )

  const handleToggleStatus = useCallback(async (userId: string, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus ? 'active' : 'inactive',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, isActive: newStatus, status: newStatus ? 'active' : 'inactive' }
            : user
        )
      )
    } catch (err) {
      console.error('Error updating user status:', err)
      alert('Failed to update user status. Please try again.')
    }
  }, [])

  const getInitials = (name?: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={className}>
      {/* Existing Users Section */}
      <div className="mb-8">
        {/* Clean Header without Quick Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="mr-2">👥</span>
              Existing Users
              {refreshing && (
                <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </h3>
            <p className="text-gray-600 mt-1">
              Manage and view all system users
              <span className="hidden lg:inline text-xs text-gray-400 ml-2">
                • Press Ctrl+Shift+A to quick add
              </span>
            </p>
          </div>

          {/* Stats */}
          <div className="mt-4 sm:mt-0 flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">{users.filter((u) => u.isActive).length} Active</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">
                {users.filter((u) => !u.isActive).length} Inactive
              </span>
            </div>
            <span className="text-gray-500 font-medium">
              {filteredAndSortedUsers().length} of {users.length} shown
            </span>
          </div>
        </div>

        {/* Quick Action Bar Above Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h4 className="text-sm font-medium text-gray-700">Quick Actions:</h4>
            <button
              onClick={() => setShowQuickAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              title="Quick Add User (Ctrl+Shift+A)"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add User
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"
              />
            </svg>
            <span>Filter and search users below</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search users by name, email, or member number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Sort and View Mode */}
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="created">Newest First</option>
                <option value="name">Name A-Z</option>
                <option value="email">Email A-Z</option>
                <option value="login">Last Login</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Grid View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="List View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || statusFilter !== 'all') && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-sm text-gray-600">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-1 text-blue-600 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Status: {statusFilter}
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="ml-1 text-green-600 hover:text-green-700"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading users...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">{error}</p>
            <Button variant="outline" onClick={() => fetchUsers()} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : filteredAndSortedUsers().length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg
                className="w-10 h-10 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {users.length === 0 ? 'No users found' : 'No users match your filters'}
            </h4>
            <p className="text-gray-600 mb-4">
              {users.length === 0
                ? 'Get started by adding your first user below.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {users.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="mb-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                : 'space-y-3'
            }
          >
            {filteredAndSortedUsers().map((user) =>
              viewMode === 'grid' ? (
                // Optimized Horizontal Grid Card
                <div
                  key={user.id}
                  className="bg-white rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 group h-full flex flex-col min-h-[300px] max-w-[280px] mx-auto"
                >
                  {/* Compact Card Header */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* User Profile Section - Optimized for horizontal layout */}
                    <div className="flex flex-col items-center text-center mb-3">
                      {/* Compact Avatar */}
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white mb-2 ${
                          user.isActive
                            ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                            : 'bg-gradient-to-br from-gray-400 to-gray-600'
                        }`}
                      >
                        {getInitials(user.name)}
                      </div>

                      {/* User Info - Centered layout */}
                      <div className="w-full">
                        <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                          {user.name || 'Unnamed User'}
                        </h3>
                        <p className="text-xs text-gray-600 mb-2 truncate">{user.email}</p>
                        <div className="flex justify-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            #{user.memberNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compact Status Section */}
                    <div className="mb-3 flex justify-center">
                      <div
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                          user.isActive
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            user.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                          }`}
                        ></div>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    {/* Compact Info Section */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 flex-1">
                      <div className="space-y-2 text-xs">
                        {user.phoneNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center">
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              Phone
                            </span>
                            <span className="text-gray-900 font-medium truncate ml-2">
                              {user.phoneNumber}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center">
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a1 1 0 011-1h3z"
                              />
                            </svg>
                            Joined
                          </span>
                          <span className="text-gray-900 font-medium">
                            {formatDate(user.createdAt)}
                          </span>
                        </div>
                        {user.lastLogin && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center">
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Login
                            </span>
                            <span className="text-gray-900 font-medium">
                              {formatDate(user.lastLogin)}
                            </span>
                          </div>
                        )}
                        {user.profileComplete && (
                          <div className="flex items-center justify-center pt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              ✓ Profile Complete
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compact Action Buttons */}
                    <div className="mt-auto">
                      {/* Primary Actions */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="flex items-center justify-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                          title="Edit User"
                        >
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setViewingUser(user)}
                          className="flex items-center justify-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                          title="View Details"
                        >
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span>View</span>
                        </button>
                      </div>

                      {/* Secondary Actions */}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deletingUserId === user.id}
                        className={`w-full flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                          deletingUserId === user.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 transform hover:scale-105'
                        }`}
                        title="Delete User"
                      >
                        {deletingUserId === user.id ? (
                          <>
                            <div className="w-3 h-3 animate-spin rounded-full border border-gray-300 border-t-gray-600 mr-1"></div>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            <span>Remove</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Enhanced User-Friendly List View (compact)
                <div
                  key={user.id}
                  className="w-full border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors group"
                >
                  <div className="px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      {/* Enhanced User Info */}
                      <div className="flex items-center space-x-3 flex-1">
                        {/* Large Avatar */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                            user.isActive
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                          }`}
                        >
                          {getInitials(user.name)}
                        </div>

                        {/* User Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {user.name || 'Unnamed User'}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                              ></span>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {user.profileComplete && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4"
                                  />
                                </svg>
                                Complete
                              </span>
                            )}
                          </div>

                          {/* Contact Info (compact, wraps to 1–2 lines) */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <div className="flex items-center min-w-0">
                              <svg
                                className="w-3 h-3 mr-1 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                                />
                              </svg>
                              <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center font-medium">
                              <svg
                                className="w-3 h-3 mr-1 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                              </svg>
                              #{user.memberNumber}
                            </div>
                            {user.phoneNumber && (
                              <div className="flex items-center min-w-0">
                                <svg
                                  className="w-3 h-3 mr-1 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                                <span className="truncate">{user.phoneNumber}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <svg
                                className="w-3 h-3 mr-1 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a1 1 0 011-1h3z"
                                />
                              </svg>
                              {formatDate(user.createdAt)}
                            </div>
                            {user.lastLogin && (
                              <div className="flex items-center">
                                <svg
                                  className="w-3 h-3 mr-1 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                {formatDate(user.lastLogin)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="flex items-center px-3 py-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors text-xs font-medium"
                          title="Edit User"
                        >
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => setViewingUser(user)}
                          className="flex items-center px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors text-xs font-medium"
                          title="View Details"
                        >
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingUserId === user.id}
                          className={`flex items-center px-3 py-1 rounded-md transition-colors text-xs font-medium ${
                            deletingUserId === user.id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                          }`}
                          title="Delete User"
                        >
                          {deletingUserId === user.id ? (
                            <>
                              <div className="w-3 h-3 animate-spin rounded-full border border-gray-300 border-t-gray-600 mr-1"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* User Management Footer */}
        {filteredAndSortedUsers().length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>All users loaded successfully</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Use "Quick Add User" to add more</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onEdit={() => {
            setEditingUser(viewingUser)
            setViewingUser(null)
          }}
        />
      )}

      {/* Quick Add User Modal */}
      <UserAdditionModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onUserAdded={handleQuickAddUserAdded}
      />

      {/* Floating Action Button (FAB) - Strategically Positioned */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => setShowQuickAddModal(true)}
          className={`group relative w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center ${
            showFabAnimation ? 'animate-bounce' : 'animate-pulse hover:animate-none'
          }`}
          title="Quick Add User (Ctrl+Shift+A)"
          aria-label="Add new user"
        >
          {/* Plus Icon */}
          <svg
            className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>

          {/* Ripple Effect */}
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
            Quick Add User
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>

        {/* Keyboard Shortcut Indicator */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center text-xs font-bold animate-bounce">
          ⌨
        </div>
      </div>

      {/* Enhanced Empty State with Prominent CTA */}
      {users.length === 0 && !loading && !error && (
        <div className="fixed inset-0 bg-gray-50 bg-opacity-95 flex items-center justify-center z-30">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg
                className="w-12 h-12 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to User Management!</h3>
            <p className="text-gray-600 mb-8">
              Get started by adding your first user to the system. You can create user accounts with
              different roles and permissions.
            </p>
            <button
              onClick={() => setShowQuickAddModal(true)}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Your First User
            </button>
            <p className="text-xs text-gray-500 mt-4">
              💡 Tip: You can also press{' '}
              <kbd className="px-2 py-1 bg-gray-200 rounded text-gray-700">Ctrl+Shift+A</kbd>{' '}
              anytime
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
