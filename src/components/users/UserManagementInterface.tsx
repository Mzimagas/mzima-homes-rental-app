'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui'
import UserCard from './UserCard'
import UserAddition from './UserAddition'
import UserEditModal from './UserEditModal'
import UserDetailsModal from './UserDetailsModal'
import UserFilters from './UserFilters'
import { User, UserFilters as UserFiltersType } from '../../types/user'

interface UserManagementInterfaceProps {
  className?: string
}

export default function UserManagementInterface({ className = '' }: UserManagementInterfaceProps) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [filters, setFilters] = useState<UserFiltersType>({
    search: '',
    status: 'all',
    role: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })

  // Fetch users from API
  const fetchUsers = useCallback(async (page = 1, searchTerm = '') => {
    setLoading(true)
    setError(null)
    
    try {
      const url = new URL('/api/admin/users', window.location.origin)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('limit', pagination.limit.toString())
      if (searchTerm) {
        url.searchParams.set('search', searchTerm)
      }

      const response = await fetch(url.toString())
      
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
        role: 'member', // Default role - can be enhanced later
        isActive: user.status === 'active',
        status: user.status,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        profileComplete: user.profile_complete
      }))

      setUsers(transformedUsers)
      setFilteredUsers(transformedUsers)
      setPagination(prev => ({
        ...prev,
        page: data.pagination?.page || 1,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0
      }))
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  // Apply filters and sorting
  const applyFilters = useCallback(() => {
    let filtered = [...users]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.memberNumber?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => 
        filters.status === 'active' ? user.isActive : !user.isActive
      )
    }

    // Role filter (can be enhanced when role data is available)
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role)
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name || ''
          bValue = b.name || ''
          break
        case 'email':
          aValue = a.email
          bValue = b.email
          break
        case 'created_at':
          aValue = new Date(a.createdAt || 0)
          bValue = new Date(b.createdAt || 0)
          break
        case 'last_login':
          aValue = new Date(a.lastLogin || 0)
          bValue = new Date(b.lastLogin || 0)
          break
        default:
          aValue = a.name || ''
          bValue = b.name || ''
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredUsers(filtered)
  }, [users, filters])

  // Handle user actions
  const handleUserUpdated = useCallback(() => {
    fetchUsers(pagination.page, filters.search)
    setEditingUser(null)
  }, [fetchUsers, pagination.page, filters.search])

  const handleUserAdded = useCallback(() => {
    fetchUsers(pagination.page, filters.search)
    setShowAddUser(false)
  }, [fetchUsers, pagination.page, filters.search])

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      // Refresh user list
      fetchUsers(pagination.page, filters.search)
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Failed to delete user. Please try again.')
    }
  }, [fetchUsers, pagination.page, filters.search])

  const handleToggleStatus = useCallback(async (userId: string, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus ? 'active' : 'inactive'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, isActive: newStatus, status: newStatus ? 'active' : 'inactive' }
          : user
      ))
    } catch (err) {
      console.error('Error updating user status:', err)
      alert('Failed to update user status. Please try again.')
    }
  }, [])

  // Effects
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: UserFiltersType) => {
    setFilters(newFilters)
    if (newFilters.search !== filters.search) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        fetchUsers(1, newFilters.search)
      }, 300)
      return () => clearTimeout(timeoutId)
    }
  }, [filters.search, fetchUsers])

  const handlePageChange = useCallback((newPage: number) => {
    fetchUsers(newPage, filters.search)
  }, [fetchUsers, filters.search])

  if (showAddUser) {
    return (
      <div className={className}>
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowAddUser(false)}
            className="mb-4"
          >
            ← Back to User List
          </Button>
        </div>
        <UserAddition onUserAdded={handleUserAdded} />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage system users and their permissions
          </p>
        </div>
        <Button
          onClick={() => setShowAddUser(true)}
          className="mt-4 sm:mt-0"
        >
          Add New User
        </Button>
      </div>

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        userCount={filteredUsers.length}
        totalUsers={users.length}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading users...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <Button
            variant="outline"
            onClick={() => fetchUsers()}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600 mb-6">
              {filters.search || filters.status !== 'all' || filters.role !== 'all'
                ? 'No users match your current filters. Try adjusting your search criteria.'
                : 'Get started by adding your first user to the system.'
              }
            </p>
            <Button onClick={() => setShowAddUser(true)}>
              Add First User
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* User Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={() => setEditingUser(user)}
                onView={() => setViewingUser(user)}
                onDelete={() => handleDeleteUser(user.id)}
                onToggleStatus={(newStatus) => handleToggleStatus(user.id, newStatus)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} users
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

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
    </div>
  )
}
