import { useState, useCallback } from 'react'
import { 
  UserPermissions, 
  PermissionAssignmentState, 
  FeedbackMessage,
  FilterState,
  RoleTemplate,
  PermissionLevel 
} from '../types'
import { 
  createDefaultUserPermissions,
  hasAnyPermissions 
} from '../utils/permissionUtils'
import { 
  applyRoleTemplate,
  setAllSectionsPermission 
} from '../utils/roleTemplates'

export const usePermissionManagement = () => {
  const [userPermissions, setUserPermissions] = useState<UserPermissions[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Assignment modal state
  const [assignmentState, setAssignmentState] = useState<PermissionAssignmentState>({
    showModal: false,
    isAssigning: false,
    newUserEmail: '',
    formErrors: [],
    feedback: null
  })

  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({
    roleTemplate: 'all',
    scope: 'all',
    level: 'all',
    section: 'all'
  })

  // Save permissions to localStorage (replace with API call)
  const savePermissions = useCallback((permissions: UserPermissions[]) => {
    try {
      console.log('Saving permissions to localStorage:', permissions)
      localStorage.setItem('userPermissions', JSON.stringify(permissions))
      setUserPermissions(permissions)
      console.log('Permissions saved successfully. Total count:', permissions.length)
    } catch (error) {
      console.error('Error saving permissions:', error)
    }
  }, [])

  // Load permissions from localStorage (replace with API call)
  const loadPermissions = useCallback(() => {
    try {
      const saved = localStorage.getItem('userPermissions')
      console.log('Loading permissions from localStorage:', saved)
      if (saved) {
        const permissions = JSON.parse(saved)
        console.log('Loaded permissions:', permissions, 'Count:', permissions.length)
        setUserPermissions(permissions)
      } else {
        console.log('No permissions found in localStorage')
        setUserPermissions([])
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
    }
  }, [])

  // Add new permission
  const addPermission = useCallback((
    userId: string,
    email: string,
    propertyId?: string,
    isGlobal: boolean = false
  ) => {
    console.log('Adding permission for:', { userId, email, propertyId, isGlobal })
    const newPermission = createDefaultUserPermissions(userId, email, isGlobal)
    if (propertyId) {
      newPermission.propertyId = propertyId
    }

    console.log('Created permission:', newPermission)
    console.log('Current permissions before adding:', userPermissions)

    const updatedPermissions = [...userPermissions, newPermission]
    console.log('Updated permissions array:', updatedPermissions)

    savePermissions(updatedPermissions)

    return newPermission
  }, [userPermissions, savePermissions])

  // Update permission
  const updatePermission = useCallback((
    index: number,
    updatedPermission: UserPermissions
  ) => {
    const updatedPermissions = [...userPermissions]
    updatedPermissions[index] = updatedPermission
    savePermissions(updatedPermissions)
  }, [userPermissions, savePermissions])

  // Remove permission
  const removePermission = useCallback((index: number) => {
    const updatedPermissions = userPermissions.filter((_, i) => i !== index)
    savePermissions(updatedPermissions)
  }, [userPermissions, savePermissions])

  // Duplicate permissions to selected users
  const duplicatePermissions = useCallback((
    sourcePermission: UserPermissions,
    targetUserIds: string[]
  ) => {
    const newPermissions = targetUserIds.map(userId => ({
      ...sourcePermission,
      userId,
      email: sourcePermission.email // Keep the original email for now, should be updated with actual user lookup
    }))

    const updatedPermissions = [...userPermissions, ...newPermissions]
    savePermissions(updatedPermissions)
  }, [userPermissions, savePermissions])

  // Bulk remove permissions
  const bulkRemovePermissions = useCallback(() => {
    const updatedPermissions = userPermissions.filter((_, index) => 
      !selectedPermissions.includes(index)
    )
    savePermissions(updatedPermissions)
    setSelectedPermissions([])
    setShowBulkActions(false)
  }, [userPermissions, selectedPermissions, savePermissions])

  // Toggle permission selection
  const togglePermissionSelection = useCallback((index: number) => {
    setSelectedPermissions(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }, [])

  // Clear permission selection
  const clearPermissionSelection = useCallback(() => {
    setSelectedPermissions([])
    setShowBulkActions(false)
  }, [])

  // Apply role template to permission
  const applyRoleTemplateToPermission = useCallback((
    index: number,
    templateKey: keyof typeof import('../utils/roleTemplates').ROLE_TEMPLATES
  ) => {
    const permission = userPermissions[index]
    const updatedPermission = applyRoleTemplate(permission, templateKey)
    updatePermission(index, updatedPermission)
  }, [userPermissions, updatePermission])

  // Set all sections permission for a user
  const setAllSectionsPermissionForUser = useCallback((
    index: number,
    level: PermissionLevel
  ) => {
    const permission = userPermissions[index]
    const updatedPermission = setAllSectionsPermission(permission, level)
    updatePermission(index, updatedPermission)
  }, [userPermissions, updatePermission])

  // Filter permissions based on current filter state
  const getFilteredPermissions = useCallback(() => {
    return userPermissions.filter(permission => {
      // Filter by role template
      if (filterState.roleTemplate !== 'all') {
        // Add role template matching logic here
      }

      // Filter by scope
      if (filterState.scope !== 'all') {
        if (filterState.scope === 'global' && !permission.isGlobal) return false
        if (filterState.scope === 'property' && permission.isGlobal) return false
      }

      // Filter by level
      if (filterState.level !== 'all') {
        const hasLevel = permission.sections.some(s => s.level === filterState.level)
        if (!hasLevel) return false
      }

      // Filter by section
      if (filterState.section !== 'all') {
        const hasSection = permission.sections.some(s => 
          s.section === filterState.section && s.level !== 'none'
        )
        if (!hasSection) return false
      }

      return true
    })
  }, [userPermissions, filterState])

  // Get paginated permissions
  const getPaginatedPermissions = useCallback(() => {
    const filtered = getFilteredPermissions()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    
    return {
      permissions: filtered.slice(startIndex, endIndex),
      totalCount: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    }
  }, [getFilteredPermissions, currentPage, itemsPerPage])

  // Assignment modal functions
  const openAssignModal = useCallback(() => {
    setAssignmentState(prev => ({ ...prev, showModal: true }))
  }, [])

  const closeAssignModal = useCallback(() => {
    setAssignmentState({
      showModal: false,
      isAssigning: false,
      newUserEmail: '',
      formErrors: [],
      feedback: null
    })
  }, [])

  const setFeedback = useCallback((feedback: FeedbackMessage | null) => {
    setAssignmentState(prev => ({ ...prev, feedback }))
  }, [])

  const setFormErrors = useCallback((errors: string[]) => {
    setAssignmentState(prev => ({ ...prev, formErrors: errors }))
  }, [])

  return {
    // State
    userPermissions,
    selectedPermissions,
    showBulkActions,
    currentPage,
    itemsPerPage,
    assignmentState,
    filterState,

    // Permission CRUD
    savePermissions,
    loadPermissions,
    addPermission,
    updatePermission,
    removePermission,
    duplicatePermissions,

    // Bulk operations
    bulkRemovePermissions,
    togglePermissionSelection,
    clearPermissionSelection,

    // Role templates
    applyRoleTemplateToPermission,
    setAllSectionsPermissionForUser,

    // Filtering and pagination
    getFilteredPermissions,
    getPaginatedPermissions,
    setFilterState,
    setCurrentPage,

    // Bulk actions
    setShowBulkActions,

    // Assignment modal
    openAssignModal,
    closeAssignModal,
    setFeedback,
    setFormErrors,
    setAssignmentState
  }
}
