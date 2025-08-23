import { useState, useEffect, useCallback } from 'react'
import { UserSelectionState, User } from '../types'
import { isValidEmail } from '../utils/permissionUtils'

export const useUserSelection = () => {
  const [state, setState] = useState<UserSelectionState>({
    selectedUsers: [],
    showDropdown: false,
    searchTerm: '',
    availableUsers: [],
    loadingUsers: false
  })

  // Enhanced mock users data with more realistic scenarios
  const mockUsers: User[] = [
    { id: '1', email: 'admin@mzimahomes.com', name: 'John Admin', role: 'admin', isActive: true },
    { id: '2', email: 'supervisor@mzimahomes.com', name: 'Sarah Supervisor', role: 'supervisor', isActive: true },
    { id: '3', email: 'staff@mzimahomes.com', name: 'Mike Staff', role: 'staff', isActive: true },
    { id: '4', email: 'member@mzimahomes.com', name: 'Lisa Member', role: 'member', isActive: true },
    { id: '5', email: 'property.manager@mzimahomes.com', name: 'David Manager', role: 'staff', isActive: true },
    { id: '6', email: 'finance@mzimahomes.com', name: 'Emma Finance', role: 'supervisor', isActive: true },
    { id: '7', email: 'legal@mzimahomes.com', name: 'Robert Legal', role: 'member', isActive: true },
    { id: '8', email: 'inactive.user@mzimahomes.com', name: 'Inactive User', role: 'member', isActive: false },
    { id: '9', email: 'temp.contractor@external.com', name: 'Temp Contractor', role: 'member', isActive: true },
    { id: '10', email: 'consultant@external.com', name: 'External Consultant', role: 'member', isActive: false }
  ]

  // Load available users
  const loadUsers = useCallback(async () => {
    setState(prev => ({ ...prev, loadingUsers: true }))
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setState(prev => ({ 
        ...prev, 
        availableUsers: mockUsers,
        loadingUsers: false 
      }))
    } catch (error) {
      console.error('Error loading users:', error)
      setState(prev => ({ 
        ...prev, 
        availableUsers: [],
        loadingUsers: false 
      }))
    }
  }, [])

  // Handle user search
  const handleUserSearch = useCallback((searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm }))
    
    if (!searchTerm.trim()) {
      setState(prev => ({ ...prev, availableUsers: mockUsers }))
      return
    }

    const filteredUsers = mockUsers.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    setState(prev => ({ ...prev, availableUsers: filteredUsers }))
  }, [])

  // Toggle user selection
  const toggleUserSelection = useCallback((userId: string) => {
    setState(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }))
  }, [])

  // Select all users
  const selectAllUsers = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedUsers: prev.availableUsers.map(user => user.id)
    }))
  }, [])

  // Clear all user selections
  const clearAllUsers = useCallback(() => {
    setState(prev => ({ ...prev, selectedUsers: [] }))
  }, [])

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setState(prev => ({ ...prev, showDropdown: !prev.showDropdown }))
  }, [])

  // Enhanced key press handler with validation
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state.searchTerm.trim()) {
      e.preventDefault()

      const email = state.searchTerm.trim()

      // Check if user already exists
      const existingUser = state.availableUsers.find(u =>
        u.email.toLowerCase() === email.toLowerCase()
      )

      if (existingUser) {
        // Select existing user if not already selected
        if (!state.selectedUsers.includes(existingUser.id)) {
          setState(prev => ({
            ...prev,
            selectedUsers: [...prev.selectedUsers, existingUser.id],
            searchTerm: ''
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
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        isActive: true,
        role: 'member' // Default role for new users
      }

      setState(prev => ({
        ...prev,
        availableUsers: [newUser, ...prev.availableUsers],
        selectedUsers: [newUser.id, ...prev.selectedUsers],
        searchTerm: ''
      }))
    }
  }, [state.searchTerm, state.availableUsers, state.selectedUsers])

  // Get selected user details
  const getSelectedUserDetails = useCallback(() => {
    return state.availableUsers.filter(user => 
      state.selectedUsers.includes(user.id)
    )
  }, [state.selectedUsers, state.availableUsers])

  // Check if user is selected
  const isUserSelected = useCallback((userId: string) => {
    return state.selectedUsers.includes(userId)
  }, [state.selectedUsers])

  // Get user by ID
  const getUserById = useCallback((userId: string) => {
    return state.availableUsers.find(user => user.id === userId)
  }, [state.availableUsers])

  // Get user statistics
  const getUserStatistics = useCallback(() => {
    const total = state.availableUsers.length
    const active = state.availableUsers.filter(u => u.isActive).length
    const inactive = total - active
    const selected = state.selectedUsers.length
    const roles = Array.from(new Set(state.availableUsers.map(u => u.role).filter(Boolean)))

    return {
      total,
      active,
      inactive,
      selected,
      roles,
      canSelectMore: selected < 10,
      selectionLimit: 10
    }
  }, [state.availableUsers, state.selectedUsers])

  // Filter users by role
  const filterUsersByRole = useCallback((role: string) => {
    return state.availableUsers.filter(user => user.role === role)
  }, [state.availableUsers])

  // Get users by status
  const getUsersByStatus = useCallback((isActive: boolean) => {
    return state.availableUsers.filter(user => user.isActive === isActive)
  }, [state.availableUsers])

  // Validate selection
  const validateSelection = useCallback(() => {
    const errors: string[] = []

    if (state.selectedUsers.length === 0) {
      errors.push('At least one user must be selected')
    }

    if (state.selectedUsers.length > 10) {
      errors.push('Maximum 10 users can be selected at once')
    }

    const inactiveSelected = state.selectedUsers.filter(id => {
      const user = state.availableUsers.find(u => u.id === id)
      return user && !user.isActive
    })

    if (inactiveSelected.length > 0) {
      errors.push(`${inactiveSelected.length} inactive user(s) selected`)
    }

    return {
      isValid: errors.length === 0,
      errors
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
    validateSelection
  }
}
