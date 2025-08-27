import { useState, useEffect, useCallback } from 'react'
import { UserSelectionState, User } from '../types'
import { isValidEmail } from '../utils/permissionUtils'

export const useUserSelection = () => {
  const [state, setState] = useState<UserSelectionState>({
    selectedUsers: [],
    showDropdown: false,
    searchTerm: '',
    availableUsers: [],
    loadingUsers: false,
  })

  // Empty mock users - replace with real API call in production
  // This component is designed to work with real user data from your authentication system
  const mockUsers: User[] = []

  // Load available users
  const loadUsers = useCallback(async () => {
    setState((prev) => ({ ...prev, loadingUsers: true }))

    try {
      // Fetch real users from the API
      const response = await fetch('/api/admin/users')

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()

      // Transform the data to match the User interface
      const users: User[] = (data.users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: 'member', // Default role, you can map this from user data
        isActive: user.status !== 'inactive',
      }))

      setState((prev) => ({
        ...prev,
        availableUsers: users,
        loadingUsers: false,
      }))
    } catch (error) {
      console.error('Error loading users:', error)
      setState((prev) => ({
        ...prev,
        availableUsers: [],
        loadingUsers: false,
      }))
    }
  }, [])

  // Handle user search
  const handleUserSearch = useCallback(async (searchTerm: string) => {
    setState((prev) => ({ ...prev, searchTerm, loadingUsers: true }))

    try {
      // Fetch users with search term
      const url = new URL('/api/admin/users', window.location.origin)
      if (searchTerm.trim()) {
        url.searchParams.set('search', searchTerm)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Failed to search users')
      }

      const data = await response.json()

      // Transform the data to match the User interface
      const users: User[] = (data.users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: 'member', // Default role
        isActive: user.status !== 'inactive',
      }))

      setState((prev) => ({
        ...prev,
        availableUsers: users,
        loadingUsers: false,
      }))
    } catch (error) {
      console.error('Error searching users:', error)
      setState((prev) => ({
        ...prev,
        availableUsers: [],
        loadingUsers: false,
      }))
    }
  }, [])

  // Toggle user selection
  const toggleUserSelection = useCallback((userId: string) => {
    setState((prev) => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter((id) => id !== userId)
        : [...prev.selectedUsers, userId],
    }))
  }, [])

  // Select all users
  const selectAllUsers = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedUsers: prev.availableUsers.map((user) => user.id),
    }))
  }, [])

  // Clear all user selections
  const clearAllUsers = useCallback(() => {
    setState((prev) => ({ ...prev, selectedUsers: [] }))
  }, [])

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setState((prev) => ({ ...prev, showDropdown: !prev.showDropdown }))
  }, [])

  // Enhanced key press handler with validation
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && state.searchTerm.trim()) {
        e.preventDefault()

        const email = state.searchTerm.trim()

        // Check if user already exists
        const existingUser = state.availableUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        )

        if (existingUser) {
          // Select existing user if not already selected
          if (!state.selectedUsers.includes(existingUser.id)) {
            setState((prev) => ({
              ...prev,
              selectedUsers: [...prev.selectedUsers, existingUser.id],
              searchTerm: '',
            }))
          }
          return
        }

        // Validate email format
        if (!isValidEmail(email)) {
          console.warn('Invalid email format:', email)
          return
        }

        // Check selection limit
        if (state.selectedUsers.length >= 10) {
          console.warn('Maximum 10 users can be selected')
          return
        }

        // Add new user
        const newUser: User = {
          id: `new-${Date.now()}`,
          email: email,
          name: email
            .split('@')[0]
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          isActive: true,
          role: 'member', // Default role for new users
        }

        setState((prev) => ({
          ...prev,
          availableUsers: [newUser, ...prev.availableUsers],
          selectedUsers: [newUser.id, ...prev.selectedUsers],
          searchTerm: '',
        }))
      }
    },
    [state.searchTerm, state.availableUsers, state.selectedUsers]
  )

  // Get selected user details
  const getSelectedUserDetails = useCallback(() => {
    return state.availableUsers.filter((user) => state.selectedUsers.includes(user.id))
  }, [state.selectedUsers, state.availableUsers])

  // Check if user is selected
  const isUserSelected = useCallback(
    (userId: string) => {
      return state.selectedUsers.includes(userId)
    },
    [state.selectedUsers]
  )

  // Get user by ID
  const getUserById = useCallback(
    (userId: string) => {
      return state.availableUsers.find((user) => user.id === userId)
    },
    [state.availableUsers]
  )

  // Get user statistics
  const getUserStatistics = useCallback(() => {
    const total = state.availableUsers.length
    const active = state.availableUsers.filter((u) => u.isActive).length
    const inactive = total - active
    const selected = state.selectedUsers.length
    const roles = Array.from(new Set(state.availableUsers.map((u) => u.role).filter(Boolean)))

    return {
      total,
      active,
      inactive,
      selected,
      roles,
      canSelectMore: selected < 10,
      selectionLimit: 10,
    }
  }, [state.availableUsers, state.selectedUsers])

  // Filter users by role
  const filterUsersByRole = useCallback(
    (role: string) => {
      return state.availableUsers.filter((user) => user.role === role)
    },
    [state.availableUsers]
  )

  // Get users by status
  const getUsersByStatus = useCallback(
    (isActive: boolean) => {
      return state.availableUsers.filter((user) => user.isActive === isActive)
    },
    [state.availableUsers]
  )

  // Validate selection
  const validateSelection = useCallback(() => {
    const errors: string[] = []

    if (state.selectedUsers.length === 0) {
      errors.push('At least one user must be selected')
    }

    if (state.selectedUsers.length > 10) {
      errors.push('Maximum 10 users can be selected at once')
    }

    const inactiveSelected = state.selectedUsers.filter((id) => {
      const user = state.availableUsers.find((u) => u.id === id)
      return user && !user.isActive
    })

    if (inactiveSelected.length > 0) {
      errors.push(`${inactiveSelected.length} inactive user(s) selected`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }, [state.selectedUsers, state.availableUsers])

  // Load users when component mounts
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  return {
    ...state,
    loadUsers,
    handleUserSearch,
    toggleUserSelection,
    selectAllUsers,
    clearAllUsers,
    toggleDropdown,
    handleKeyPress,
    getSelectedUserDetails,
    isUserSelected,
    getUserById,
    getUserStatistics,
    filterUsersByRole,
    getUsersByStatus,
    validateSelection,
  }
}
