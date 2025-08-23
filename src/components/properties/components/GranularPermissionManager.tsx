'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '../../ui'

// Permission types
type PermissionLevel = 'view' | 'edit' | 'none'
type DetailPermission = 'basic_info' | 'location' | 'financials' | 'documents'
type Section = 'direct_addition' | 'purchase_pipeline' | 'subdivision_process' | 'property_handover' | 'audit_trail'

interface SectionPermission {
  section: Section
  level: PermissionLevel
  details: Record<DetailPermission, PermissionLevel>
}

interface UserPermissions {
  userId: string
  email: string
  propertyId?: string // For property-specific permissions
  sections: SectionPermission[]
  isGlobal: boolean
  assignedAt?: string
  assignedBy?: string
  status?: 'active' | 'pending' | 'expired'
}

interface Property {
  id: string
  name: string
  address: string
}

export default function GranularPermissionManager() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>('global')
  const [userPermissions, setUserPermissions] = useState<UserPermissions[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [formErrors, setFormErrors] = useState<string[]>([])

  // Dropdown state for property selection
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false)
  const [propertySearchTerm, setPropertySearchTerm] = useState('')

  // Enhanced user selection state
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [userSearchTerm, setUserSearchTerm] = useState('')

  // Enhanced permissions management state
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [sortField, setSortField] = useState<'email' | 'role' | 'assignedAt' | 'property'>('assignedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterRoleTemplate, setFilterRoleTemplate] = useState<string>('all')
  const [filterScope, setFilterScope] = useState<'all' | 'global' | 'property'>('all')
  const [filterLevel, setFilterLevel] = useState<'all' | 'view' | 'edit'>('all')

  // Intelligent filter dependencies
  const getAvailableScopeOptions = () => {
    const baseOptions = [
      { value: 'all', label: 'All Scopes', available: true },
      { value: 'global', label: '🌐 Global Permissions', available: true },
      { value: 'property', label: '🏠 Property-Specific', available: true }
    ]

    // Role-based scope restrictions
    if (filterRoleTemplate === 'admin') {
      // Admins typically have global authority
      return baseOptions.map(opt => ({
        ...opt,
        recommended: opt.value === 'global',
        available: opt.value !== 'property' || opt.value === 'all'
      }))
    }

    if (filterRoleTemplate === 'member') {
      // Members typically limited to property-specific
      return baseOptions.map(opt => ({
        ...opt,
        recommended: opt.value === 'property',
        available: opt.value !== 'global' || opt.value === 'all'
      }))
    }

    return baseOptions
  }

  const getAvailableLevelOptions = () => {
    const baseOptions = [
      { value: 'all', label: 'All Permission Levels', available: true },
      { value: 'view', label: '👁️ View Only', available: true },
      { value: 'edit', label: '✏️ Edit Access', available: true }
    ]

    // Role-based level restrictions
    if (filterRoleTemplate === 'admin') {
      // Admins should have edit access
      return baseOptions.map(opt => ({
        ...opt,
        recommended: opt.value === 'edit',
        available: opt.value !== 'view' || opt.value === 'all'
      }))
    }

    if (filterRoleTemplate === 'supervisor') {
      // Supervisors typically view-only
      return baseOptions.map(opt => ({
        ...opt,
        recommended: opt.value === 'view',
        available: opt.value !== 'edit' || opt.value === 'all'
      }))
    }

    if (filterRoleTemplate === 'member') {
      // Members limited to view
      return baseOptions.map(opt => ({
        ...opt,
        recommended: opt.value === 'view',
        available: opt.value !== 'edit' || opt.value === 'all'
      }))
    }

    // Scope-based level restrictions
    if (filterScope === 'global' && filterRoleTemplate !== 'admin' && filterRoleTemplate !== 'all') {
      // Global permissions for non-admins should be limited
      return baseOptions.map(opt => ({
        ...opt,
        available: opt.value === 'view' || opt.value === 'all',
        warning: opt.value === 'edit' ? 'Global edit access typically restricted to administrators' : undefined
      }))
    }

    return baseOptions
  }

  // Smart filter change handlers with cascading logic
  const handleRoleTemplateChange = (newRole: string) => {
    setFilterRoleTemplate(newRole)

    // Auto-adjust scope based on role
    if (newRole === 'admin' && filterScope === 'property') {
      setFilterScope('global') // Admins typically global
    }
    if (newRole === 'member' && filterScope === 'global') {
      setFilterScope('property') // Members typically property-specific
    }

    // Auto-adjust level based on role
    if (newRole === 'admin' && filterLevel === 'view') {
      setFilterLevel('edit') // Admins should have edit
    }
    if ((newRole === 'supervisor' || newRole === 'member') && filterLevel === 'edit') {
      setFilterLevel('view') // Supervisors/Members typically view-only
    }
  }

  const handleScopeChange = (newScope: 'all' | 'global' | 'property') => {
    setFilterScope(newScope)

    // Auto-adjust level for global scope
    if (newScope === 'global' && filterLevel === 'edit' &&
        filterRoleTemplate !== 'admin' && filterRoleTemplate !== 'all') {
      setFilterLevel('view') // Non-admins with global scope should be view-only
    }
  }
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Form state for detailed permissions
  const [formState, setFormState] = useState<{
    sectionPermissions: Record<Section, PermissionLevel>
    detailPermissions: Record<Section, Record<DetailPermission, PermissionLevel>>
  }>({
    sectionPermissions: {
      direct_addition: 'none',
      purchase_pipeline: 'none',
      subdivision_process: 'none',
      property_handover: 'none',
      audit_trail: 'none'
    },
    detailPermissions: {
      direct_addition: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' },
      purchase_pipeline: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' },
      subdivision_process: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' },
      property_handover: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' },
      audit_trail: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' } // Will be ignored for audit_trail
    }
  })

  // Mock data - replace with actual data
  const availableUsers = [
    { id: '1', email: 'john@example.com' },
    { id: '2', email: 'jane@example.com' },
    { id: '3', email: 'admin@example.com' }
  ]

  const properties: Property[] = [
    { id: 'prop1', name: 'Sunset Villa', address: '123 Main St' },
    { id: 'prop2', name: 'Ocean View', address: '456 Beach Ave' },
    { id: 'prop3', name: 'Mountain Lodge', address: '789 Hill Rd' }
  ]

  const sections: { id: Section; name: string; description: string }[] = [
    { id: 'direct_addition', name: 'Direct Addition', description: 'Add properties directly to inventory' },
    { id: 'purchase_pipeline', name: 'Purchase Pipeline', description: 'Manage property acquisition process' },
    { id: 'subdivision_process', name: 'Subdivision Process', description: 'Handle property subdivision workflows' },
    { id: 'property_handover', name: 'Property Handover', description: 'Manage property transfer and handover' },
    { id: 'audit_trail', name: 'Audit Trail', description: 'View and manage system audit logs' }
  ]

  const detailPermissions: { id: DetailPermission; name: string }[] = [
    { id: 'basic_info', name: 'Basic Info' },
    { id: 'location', name: 'Location' },
    { id: 'financials', name: 'Financials' },
    { id: 'documents', name: 'Documents' }
  ]

  // Get relevant detail permissions for a section
  const getRelevantDetailPermissions = (sectionId: Section) => {
    if (sectionId === 'audit_trail') {
      // Audit trail doesn't have property details, just log access
      return []
    }
    return detailPermissions
  }

  // Filter properties based on search term
  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(propertySearchTerm.toLowerCase())
  )

  // Get display text for selected property
  const getSelectedPropertyDisplay = () => {
    if (selectedProperty === 'global') {
      return '🌐 Global Permissions (All Properties)'
    }
    const property = properties.find(p => p.id === selectedProperty)
    return property ? `🏠 ${property.name} - ${property.address}` : 'Select Property'
  }

  // Handle property selection
  const handlePropertySelect = (propertyId: string) => {
    setSelectedProperty(propertyId)
    setShowPropertyDropdown(false)
    setPropertySearchTerm('')
  }

  // Enhanced user management functions
  const filteredUsers = availableUsers.filter(user =>
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  )

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isDuplicateUser = (email: string) => {
    return availableUsers.some(user => user.email.toLowerCase() === email.toLowerCase())
  }

  const isNewEmail = userSearchTerm.includes('@') &&
    validateEmail(userSearchTerm) &&
    !isDuplicateUser(userSearchTerm)

  const getEmailInputFeedback = () => {
    if (!userSearchTerm) return null
    if (!userSearchTerm.includes('@')) return null
    if (!validateEmail(userSearchTerm)) return { type: 'error', message: 'Invalid email format' }
    if (isDuplicateUser(userSearchTerm)) return { type: 'warning', message: 'User already exists' }
    return { type: 'success', message: 'Press Enter to add user' }
  }

  const handleUserSearch = (value: string) => {
    setUserSearchTerm(value)
    setShowUserDropdown(value.length > 0 || selectedUsers.length > 0)
  }

  const handleAddUserFromSearch = () => {
    if (isNewEmail) {
      addUserByEmail()
      setUserSearchTerm('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isNewEmail) {
      handleAddUserFromSearch()
    }
  }

  const selectAllUsers = () => {
    setSelectedUsers(availableUsers.map(user => user.id))
  }

  const clearAllUsers = () => {
    setSelectedUsers([])
  }

  const removeUserFromSelection = (userId: string) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId))
  }

  // Get role template classification for a permission
  const getRoleTemplate = (permission: UserPermissions): string => {
    const sectionLevels = permission.sections.map(s => s.level)
    const hasEdit = sectionLevels.includes('edit')
    const hasView = sectionLevels.includes('view')
    const hasNone = sectionLevels.includes('none')

    // Check for specific role template patterns
    const editSections = permission.sections.filter(s => s.level === 'edit').map(s => s.section)
    const viewSections = permission.sections.filter(s => s.level === 'view').map(s => s.section)
    const noneSections = permission.sections.filter(s => s.level === 'none').map(s => s.section)

    // Admin: All sections have edit
    if (permission.sections.every(s => s.level === 'edit')) {
      return 'admin'
    }

    // Supervisor: All sections have view
    if (permission.sections.every(s => s.level === 'view')) {
      return 'supervisor'
    }

    // Staff: Direct Addition and Property Handover have edit, others view/none
    if (editSections.includes('direct_addition') && editSections.includes('property_handover') &&
        viewSections.includes('purchase_pipeline') &&
        noneSections.includes('subdivision_process') && noneSections.includes('audit_trail')) {
      return 'staff'
    }

    // Member: No direct addition or audit trail, others view
    if (noneSections.includes('direct_addition') && noneSections.includes('audit_trail') &&
        viewSections.includes('purchase_pipeline') && viewSections.includes('subdivision_process') &&
        viewSections.includes('property_handover')) {
      return 'member'
    }

    // Custom: Doesn't match any template
    return 'custom'
  }

  // Enhanced permission management functions
  const filteredAndSortedPermissions = () => {
    let filtered = userPermissions.filter(permission => {
      const matchesSearch = permission.email.toLowerCase().includes(permissionSearchTerm.toLowerCase()) ||
        permission.sections.some(section => sections.find(s => s.id === section.section)?.name.toLowerCase().includes(permissionSearchTerm.toLowerCase()))

      const matchesRoleTemplate = filterRoleTemplate === 'all' || getRoleTemplate(permission) === filterRoleTemplate
      const matchesScope = filterScope === 'all' ||
        (filterScope === 'global' && permission.isGlobal) ||
        (filterScope === 'property' && !permission.isGlobal)
      const matchesLevel = filterLevel === 'all' || permission.sections.some(section => section.level === filterLevel)

      return matchesSearch && matchesRoleTemplate && matchesScope && matchesLevel
    })

    // Sort permissions
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number

      switch (sortField) {
        case 'email':
          aValue = a.email
          bValue = b.email
          break
        case 'role':
          aValue = a.sections[0]?.level || ''
          bValue = b.sections[0]?.level || ''
          break
        case 'property':
          aValue = a.isGlobal ? 'Global' : (properties.find(p => p.id === a.propertyId)?.name || '')
          bValue = b.isGlobal ? 'Global' : (properties.find(p => p.id === b.propertyId)?.name || '')
          break
        case 'assignedAt':
        default:
          aValue = new Date(a.assignedAt || Date.now()).getTime()
          bValue = new Date(b.assignedAt || Date.now()).getTime()
          break
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }

  const paginatedPermissions = () => {
    const filtered = filteredAndSortedPermissions()
    const startIndex = (currentPage - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }

  const totalPermissions = filteredAndSortedPermissions().length
  const totalPages = Math.ceil(totalPermissions / itemsPerPage)

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const togglePermissionSelection = (index: number) => {
    setSelectedPermissions(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const selectAllPermissions = () => {
    const allIndexes = paginatedPermissions().map((_, index) => (currentPage - 1) * itemsPerPage + index)
    setSelectedPermissions(allIndexes)
  }

  const clearPermissionSelection = () => {
    setSelectedPermissions([])
  }

  const bulkRemovePermissions = () => {
    if (selectedPermissions.length === 0) return

    const confirmRemove = confirm(`Remove ${selectedPermissions.length} permission assignment(s)?`)
    if (confirmRemove) {
      const filteredPerms = filteredAndSortedPermissions()
      const toRemove = selectedPermissions.map(index => filteredPerms[index - (currentPage - 1) * itemsPerPage])

      const newPermissions = userPermissions.filter(perm =>
        !toRemove.some(remove =>
          remove.userId === perm.userId &&
          remove.propertyId === perm.propertyId
        )
      )

      savePermissions(newPermissions)
      setSelectedPermissions([])
      alert(`✅ Removed ${selectedPermissions.length} permission assignment(s)`)
    }
  }

  const duplicatePermissions = (sourcePermission: UserPermissions) => {
    if (selectedUsers.length === 0) {
      alert('Please select target users first')
      return
    }

    const confirmDuplicate = confirm(`Copy permissions from ${sourcePermission.email} to ${selectedUsers.length} selected user(s)?`)
    if (confirmDuplicate) {
      const newPermissions = [...userPermissions]

      selectedUsers.forEach(userId => {
        const user = availableUsers.find(u => u.id === userId)
        if (!user) return

        const duplicatedPermission: UserPermissions = {
          ...sourcePermission,
          userId,
          email: user.email,
          assignedAt: new Date().toISOString()
        }

        // Remove existing permission for this user/property combination
        const existingIndex = newPermissions.findIndex(p =>
          p.userId === userId &&
          (p.propertyId === duplicatedPermission.propertyId || (!p.propertyId && !duplicatedPermission.propertyId))
        )

        if (existingIndex >= 0) {
          newPermissions[existingIndex] = duplicatedPermission
        } else {
          newPermissions.push(duplicatedPermission)
        }
      })

      savePermissions(newPermissions)
      setSelectedUsers([])
      alert(`✅ Copied permissions to ${selectedUsers.length} user(s)`)
    }
  }

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  // Load saved permissions
  useEffect(() => {
    const saved = localStorage.getItem('mzima_granular_permissions')
    if (saved) {
      try {
        setUserPermissions(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading permissions:', error)
      }
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element

      if (showPropertyDropdown && !target.closest('.property-dropdown')) {
        setShowPropertyDropdown(false)
        setPropertySearchTerm('')
      }

      if (showUserDropdown && !target.closest('.user-selection-dropdown')) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPropertyDropdown, showUserDropdown])

  // Save permissions
  const savePermissions = (permissions: UserPermissions[]) => {
    setUserPermissions(permissions)
    localStorage.setItem('mzima_granular_permissions', JSON.stringify(permissions))
  }

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Add new user by email
  const addUserByEmail = () => {
    const email = userSearchTerm.trim() || newUserEmail.trim()
    if (!email) return

    const newUser = {
      id: `user_${Date.now()}`,
      email: email
    }

    availableUsers.push(newUser)
    setSelectedUsers([...selectedUsers, newUser.id])
    setNewUserEmail('')
    setUserSearchTerm('')
  }

  // Reset form state
  const resetFormState = () => {
    setFormState({
      sectionPermissions: {
        direct_addition: 'none',
        purchase_pipeline: 'none',
        subdivision_process: 'none',
        property_handover: 'none',
        audit_trail: 'none'
      },
      detailPermissions: {
        direct_addition: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' },
        purchase_pipeline: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' },
        subdivision_process: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' },
        property_handover: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' },
        audit_trail: { basic_info: 'none', location: 'none', financials: 'none', documents: 'none' } // Will be ignored for audit_trail
      }
    })
    setFormErrors([])
  }

  // Update section permission with cascading logic
  const updateSectionPermission = (section: Section, level: PermissionLevel) => {
    setFormState(prev => {
      const newState = { ...prev }
      newState.sectionPermissions[section] = level

      // Cascading logic: if section is 'none', set all details to 'none'
      if (level === 'none') {
        Object.keys(newState.detailPermissions[section]).forEach(detail => {
          newState.detailPermissions[section][detail as DetailPermission] = 'none'
        })
      }
      // If section is 'view', ensure no detail permissions exceed 'view'
      else if (level === 'view') {
        Object.keys(newState.detailPermissions[section]).forEach(detail => {
          if (newState.detailPermissions[section][detail as DetailPermission] === 'edit') {
            newState.detailPermissions[section][detail as DetailPermission] = 'view'
          }
        })
      }

      return newState
    })
  }

  // Update detail permission with hierarchy validation
  const updateDetailPermission = (section: Section, detail: DetailPermission, level: PermissionLevel) => {
    setFormState(prev => {
      const newState = { ...prev }
      const sectionLevel = newState.sectionPermissions[section]

      // Validate hierarchy: detail permission cannot exceed section permission
      if (level === 'edit' && sectionLevel !== 'edit') {
        // Auto-upgrade section permission if detail requires edit
        newState.sectionPermissions[section] = 'edit'
      } else if (level === 'view' && sectionLevel === 'none') {
        // Auto-upgrade section permission if detail requires view
        newState.sectionPermissions[section] = 'view'
      }

      newState.detailPermissions[section][detail] = level
      return newState
    })
  }

  // Bulk permission setters
  const setAllSectionsPermission = (level: PermissionLevel) => {
    setFormState(prev => {
      const newState = { ...prev }
      sections.forEach(section => {
        newState.sectionPermissions[section.id] = level
        if (level === 'none') {
          Object.keys(newState.detailPermissions[section.id]).forEach(detail => {
            newState.detailPermissions[section.id][detail as DetailPermission] = 'none'
          })
        } else {
          Object.keys(newState.detailPermissions[section.id]).forEach(detail => {
            newState.detailPermissions[section.id][detail as DetailPermission] = level
          })
        }
      })
      return newState
    })
  }

  // Role template setters
  const applyAdminTemplate = () => {
    setFormState(prev => {
      const newState = { ...prev }
      // Full edit access to all sections
      sections.forEach(section => {
        newState.sectionPermissions[section.id] = 'edit'
        // Full edit access to all details (except audit_trail which has no details)
        if (section.id !== 'audit_trail') {
          Object.keys(newState.detailPermissions[section.id]).forEach(detail => {
            newState.detailPermissions[section.id][detail as DetailPermission] = 'edit'
          })
        }
      })
      return newState
    })
  }

  const applySupervisorTemplate = () => {
    setFormState(prev => {
      const newState = { ...prev }
      // View access to all sections
      sections.forEach(section => {
        newState.sectionPermissions[section.id] = 'view'
        // View access to all details (except audit_trail which has no details)
        if (section.id !== 'audit_trail') {
          Object.keys(newState.detailPermissions[section.id]).forEach(detail => {
            newState.detailPermissions[section.id][detail as DetailPermission] = 'view'
          })
        }
      })
      return newState
    })
  }

  const applyMemberTemplate = () => {
    setFormState(prev => {
      const newState = { ...prev }

      // Define member permissions
      const memberPermissions: Record<Section, PermissionLevel> = {
        direct_addition: 'none',
        audit_trail: 'none',
        purchase_pipeline: 'view',
        subdivision_process: 'view',
        property_handover: 'view'
      }

      // Apply member permissions
      sections.forEach(section => {
        const sectionLevel = memberPermissions[section.id]
        newState.sectionPermissions[section.id] = sectionLevel

        // Set detail permissions based on section access
        if (sectionLevel === 'none') {
          Object.keys(newState.detailPermissions[section.id]).forEach(detail => {
            newState.detailPermissions[section.id][detail as DetailPermission] = 'none'
          })
        } else if (sectionLevel === 'view' && section.id !== 'audit_trail') {
          // View access to all details for sections they have access to
          Object.keys(newState.detailPermissions[section.id]).forEach(detail => {
            newState.detailPermissions[section.id][detail as DetailPermission] = 'view'
          })
        }
      })
      return newState
    })
  }

  const applyStaffTemplate = () => {
    setFormState(prev => {
      const newState = { ...prev }

      // Define staff permissions - clerical workers with specific access patterns
      const staffPermissions: Record<Section, PermissionLevel> = {
        direct_addition: 'edit',      // Can add properties as clerical duty
        purchase_pipeline: 'view',    // Can see but not modify acquisition process
        subdivision_process: 'none',  // No access to complex subdivision workflows
        property_handover: 'edit',    // Can handle handover documentation
        audit_trail: 'none'          // No access to system audit logs
      }

      // Apply staff permissions
      sections.forEach(section => {
        const sectionLevel = staffPermissions[section.id]
        newState.sectionPermissions[section.id] = sectionLevel

        // Set detail permissions based on section access and staff restrictions
        if (sectionLevel === 'none') {
          // No access to any details
          Object.keys(newState.detailPermissions[section.id]).forEach(detail => {
            newState.detailPermissions[section.id][detail as DetailPermission] = 'none'
          })
        } else if (sectionLevel === 'view' && section.id !== 'audit_trail') {
          // View access to all details for view-only sections
          Object.keys(newState.detailPermissions[section.id]).forEach(detail => {
            newState.detailPermissions[section.id][detail as DetailPermission] = 'view'
          })
        } else if (sectionLevel === 'edit' && section.id !== 'audit_trail') {
          // For edit sections, apply staff-specific detail permissions
          // Edit: Basic Info and Documents (clerical work)
          // View: Location and Financials (sensitive data protection)
          newState.detailPermissions[section.id].basic_info = 'edit'
          newState.detailPermissions[section.id].documents = 'edit'
          newState.detailPermissions[section.id].location = 'view'
          newState.detailPermissions[section.id].financials = 'view'
        }
      })
      return newState
    })
  }

  // Form validation
  const validateForm = (): string[] => {
    const errors: string[] = []

    if (selectedUsers.length === 0) {
      errors.push('Please select at least one user')
    }

    const hasAnyPermission = Object.values(formState.sectionPermissions).some(level => level !== 'none') ||
      Object.values(formState.detailPermissions).some(sectionDetails =>
        Object.values(sectionDetails).some(level => level !== 'none')
      )

    if (!hasAnyPermission) {
      errors.push('Please grant at least one permission')
    }

    return errors
  }



  // Open modal with validation
  const openAssignModal = () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user before assigning permissions')
      return
    }

    // Pre-populate with existing permissions if editing single user
    if (selectedUsers.length === 1) {
      const existingPermission = userPermissions.find(p =>
        p.userId === selectedUsers[0] &&
        (p.propertyId === (selectedProperty === 'global' ? undefined : selectedProperty))
      )

      if (existingPermission) {
        const newFormState = { ...formState }
        existingPermission.sections.forEach(section => {
          newFormState.sectionPermissions[section.section] = section.level
          Object.entries(section.details).forEach(([detail, level]) => {
            newFormState.detailPermissions[section.section][detail as DetailPermission] = level
          })
        })
        setFormState(newFormState)
      }
    }

    setShowAssignModal(true)
  }

  // Close modal and reset
  const closeAssignModal = () => {
    setShowAssignModal(false)
    resetFormState()
  }

  // Assign detailed permissions
  const assignDetailedPermissions = async () => {
    const errors = validateForm()
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    setIsAssigning(true)
    setFormErrors([])

    try {
      const newPermissions = [...userPermissions]

      selectedUsers.forEach(userId => {
        const user = availableUsers.find(u => u.id === userId)
        if (!user) return

        const userPermission: UserPermissions = {
          userId,
          email: user.email,
          propertyId: selectedProperty === 'global' ? undefined : selectedProperty,
          isGlobal: selectedProperty === 'global',
          sections: sections.map(section => ({
            section: section.id,
            level: formState.sectionPermissions[section.id],
            details: { ...formState.detailPermissions[section.id] }
          })),
          assignedAt: new Date().toISOString(),
          assignedBy: 'current_user' // In real app, get from auth context
        }

        // Remove existing permission for this user/property combination
        const existingIndex = newPermissions.findIndex(p =>
          p.userId === userId &&
          (p.propertyId === userPermission.propertyId || (!p.propertyId && !userPermission.propertyId))
        )

        if (existingIndex >= 0) {
          newPermissions[existingIndex] = userPermission
        } else {
          newPermissions.push(userPermission)
        }
      })

      savePermissions(newPermissions)
      setSelectedUsers([])
      closeAssignModal()

      alert(`✅ Detailed permissions assigned successfully to ${selectedUsers.length} user(s)`)
    } catch (error) {
      console.error('Error assigning permissions:', error)
      setFormErrors(['Failed to assign permissions. Please try again.'])
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Section-Based Permission Management</h3>
        <Button
          onClick={openAssignModal}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          📋 Assign Permissions
        </Button>
      </div>

      {/* Property Selection - Searchable Dropdown */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Permission Scope</h4>
        <div className="relative property-dropdown">
          <button
            type="button"
            onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
            className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {getSelectedPropertyDisplay()}
              </span>
              <span className={`text-gray-400 transition-transform duration-200 ${showPropertyDropdown ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showPropertyDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={propertySearchTerm}
                  onChange={(e) => setPropertySearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Options List */}
              <div className="max-h-60 overflow-y-auto">
                {/* Global Option - Always First */}
                <button
                  type="button"
                  onClick={() => handlePropertySelect('global')}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    selectedProperty === 'global' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">🌐 Global Permissions (All Properties)</span>
                    {selectedProperty === 'global' && (
                      <span className="text-blue-600 text-sm">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Apply permissions to all properties</p>
                </button>

                {/* Filtered Properties */}
                {filteredProperties.length > 0 ? (
                  filteredProperties.map(property => (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => handlePropertySelect(property.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedProperty === property.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">🏠 {property.name}</span>
                          <p className="text-xs text-gray-500">{property.address}</p>
                        </div>
                        {selectedProperty === property.id && (
                          <span className="text-blue-600 text-sm">✓</span>
                        )}
                      </div>
                    </button>
                  ))
                ) : propertySearchTerm && (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No properties found matching "{propertySearchTerm}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced User Selection */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Select Users</h4>

        {/* Selected Users as Tags */}
        {selectedUsers.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(userId => {
                const user = availableUsers.find(u => u.id === userId)
                return user ? (
                  <span
                    key={userId}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {user.email}
                    <button
                      onClick={() => removeUserFromSelection(userId)}
                      className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                      title="Remove user"
                    >
                      ✕
                    </button>
                  </span>
                ) : null
              })}
            </div>
          </div>
        )}

        {/* Bulk Actions - Only show when relevant */}
        {availableUsers.length > 3 && (
          <div className="flex gap-2 mb-3">
            <Button
              onClick={selectAllUsers}
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
            >
              ✓ Select All ({availableUsers.length})
            </Button>
            {selectedUsers.length > 0 && (
              <Button
                onClick={clearAllUsers}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
              >
                ✗ Clear All ({selectedUsers.length})
              </Button>
            )}
          </div>
        )}

        {/* Search & Add Input */}
        <div className="relative user-selection-dropdown">
          <input
            type="email"
            placeholder="Search users or add new email..."
            value={userSearchTerm}
            onChange={(e) => handleUserSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowUserDropdown(true)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Input Feedback */}
          {(() => {
            const feedback = getEmailInputFeedback()
            if (!feedback) return null

            const colors = {
              error: 'text-red-600 bg-red-50 border-red-200',
              warning: 'text-orange-600 bg-orange-50 border-orange-200',
              success: 'text-green-600 bg-green-50 border-green-200'
            }

            return (
              <div className={`mt-2 px-3 py-2 rounded-md text-xs border ${colors[feedback.type]}`}>
                {feedback.message}
              </div>
            )
          })()}

          {/* Dropdown with filtered users */}
          {showUserDropdown && (filteredUsers.length > 0 || isNewEmail) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">

              {/* Add New User Option */}
              {isNewEmail && (
                <button
                  type="button"
                  onClick={handleAddUserFromSearch}
                  className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors border-b border-gray-100 text-green-700"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">➕ Add "{userSearchTerm}"</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">Add this email as a new user</p>
                </button>
              )}

              {/* Filtered Users */}
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUserSelection(user.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedUsers.includes(user.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => {}} // Handled by button click
                        className="text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    {selectedUsers.includes(user.id) && (
                      <span className="text-blue-600 text-sm">✓</span>
                    )}
                  </div>
                </button>
              ))}

              {/* No Results */}
              {filteredUsers.length === 0 && !isNewEmail && userSearchTerm && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No users found matching "{userSearchTerm}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-3 text-sm text-gray-600">
          {selectedUsers.length} of {availableUsers.length} users selected
        </div>
      </div>



      {/* Enhanced Current Permissions Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Current Permissions</h4>
          {selectedPermissions.length > 0 && (
            <Button
              onClick={() => setShowBulkActions(!showBulkActions)}
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-sm"
            >
              Bulk Actions ({selectedPermissions.length})
            </Button>
          )}
        </div>

        {userPermissions.length === 0 ? (
          <p className="text-gray-500 text-sm">No permissions assigned yet</p>
        ) : (
          <>
            {/* Search and Filters */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              {/* Smart Filter Indicator */}
              {(filterRoleTemplate !== 'all' || filterScope !== 'all' || filterLevel !== 'all') && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">🧠</span>
                      <span className="text-sm font-medium text-blue-900">Smart Filtering Active</span>
                    </div>
                    <button
                      onClick={() => {
                        setFilterRoleTemplate('all')
                        setFilterScope('all')
                        setFilterLevel('all')
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear All Filters
                    </button>
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Filters are intelligently adjusted based on real-world permission patterns.
                    ⭐ indicates recommended combinations.
                  </div>
                </div>
              )}
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by user email or section..."
                    value={permissionSearchTerm}
                    onChange={(e) => setPermissionSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
              </div>

              {/* Filter Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* First Filter: Role Templates */}
                <div>
                  <select
                    value={filterRoleTemplate}
                    onChange={(e) => handleRoleTemplateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Role Templates</option>
                    <option value="admin">👑 Administrator</option>
                    <option value="supervisor">👁️ Supervisor</option>
                    <option value="staff">📝 Staff</option>
                    <option value="member">👤 Member</option>
                    <option value="custom">🔧 Custom Permissions</option>
                  </select>
                </div>

                {/* Second Filter: Global vs Property Specific */}
                <div>
                  <select
                    value={filterScope}
                    onChange={(e) => handleScopeChange(e.target.value as 'all' | 'global' | 'property')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getAvailableScopeOptions().map(option => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={!option.available}
                        className={option.recommended ? 'font-medium bg-blue-50' : ''}
                      >
                        {option.label}
                        {option.recommended ? ' ⭐' : ''}
                        {!option.available ? ' (Not applicable)' : ''}
                      </option>
                    ))}
                  </select>
                  {filterRoleTemplate !== 'all' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {filterRoleTemplate === 'admin' && '⭐ Admins typically have global authority'}
                      {filterRoleTemplate === 'member' && '⭐ Members typically limited to specific properties'}
                    </div>
                  )}
                </div>

                {/* Third Filter: Permission Levels */}
                <div>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as 'all' | 'view' | 'edit')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getAvailableLevelOptions().map(option => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={!option.available}
                        className={option.recommended ? 'font-medium bg-blue-50' : ''}
                      >
                        {option.label}
                        {option.recommended ? ' ⭐' : ''}
                        {!option.available ? ' (Not typical)' : ''}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const levelOptions = getAvailableLevelOptions()
                    const currentOption = levelOptions.find(opt => opt.value === filterLevel)
                    if (currentOption?.warning) {
                      return (
                        <div className="text-xs text-orange-600 mt-1">
                          ⚠️ {currentOption.warning}
                        </div>
                      )
                    }
                    if (filterRoleTemplate !== 'all') {
                      return (
                        <div className="text-xs text-gray-500 mt-1">
                          {filterRoleTemplate === 'admin' && '⭐ Admins typically have edit access'}
                          {filterRoleTemplate === 'supervisor' && '⭐ Supervisors typically have view-only access'}
                          {filterRoleTemplate === 'member' && '⭐ Members typically have view-only access'}
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {showBulkActions && selectedPermissions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedPermissions.length} permission(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={bulkRemovePermissions}
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 text-sm"
                    >
                      🗑️ Remove Selected
                    </Button>
                    <Button
                      onClick={clearPermissionSelection}
                      variant="outline"
                      className="text-gray-600 border-gray-200 hover:bg-gray-50 text-sm"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Permissions Table */}
            <div className="bg-white border rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.length === paginatedPermissions().length && paginatedPermissions().length > 0}
                    onChange={() => selectedPermissions.length === paginatedPermissions().length ? clearPermissionSelection() : selectAllPermissions()}
                    className="text-blue-600"
                  />
                  <div className="flex-1 grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
                    <button
                      onClick={() => handleSort('email')}
                      className="text-left hover:text-blue-600 flex items-center"
                    >
                      User Email
                      {sortField === 'email' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                    <span className="text-left">Role Template</span>
                    <button
                      onClick={() => handleSort('property')}
                      className="text-left hover:text-blue-600 flex items-center"
                    >
                      Scope
                      {sortField === 'property' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort('role')}
                      className="text-left hover:text-blue-600 flex items-center"
                    >
                      Permissions
                      {sortField === 'role' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort('assignedAt')}
                      className="text-left hover:text-blue-600 flex items-center"
                    >
                      Assigned
                      {sortField === 'assignedAt' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </div>
                  <div className="w-32 text-sm font-medium text-gray-700">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {paginatedPermissions().map((userPerm, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index
                  const isExpanded = expandedRows.has(globalIndex)

                  return (
                    <div key={globalIndex}>
                      {/* Main Row */}
                      <div className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(globalIndex)}
                            onChange={() => togglePermissionSelection(globalIndex)}
                            className="text-blue-600"
                          />
                          <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-900">{userPerm.email}</span>
                              <div className="text-xs text-gray-500">
                                {userPerm.assignedAt && new Date(userPerm.assignedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              {(() => {
                                const roleTemplate = getRoleTemplate(userPerm)
                                const roleTemplateLabels = {
                                  admin: '👑 Admin',
                                  supervisor: '👁️ Supervisor',
                                  staff: '📝 Staff',
                                  member: '👤 Member',
                                  custom: '🔧 Custom'
                                }
                                const roleTemplateColors = {
                                  admin: 'bg-purple-100 text-purple-800',
                                  supervisor: 'bg-blue-100 text-blue-800',
                                  staff: 'bg-teal-100 text-teal-800',
                                  member: 'bg-green-100 text-green-800',
                                  custom: 'bg-gray-100 text-gray-800'
                                }
                                return (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleTemplateColors[roleTemplate as keyof typeof roleTemplateColors]}`}>
                                    {roleTemplateLabels[roleTemplate as keyof typeof roleTemplateLabels]}
                                  </span>
                                )
                              })()}
                            </div>
                            <div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                userPerm.isGlobal
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {userPerm.isGlobal ? '🌐 Global' : '🏠 Property'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {userPerm.sections.slice(0, 2).map(section => (
                                <span
                                  key={section.section}
                                  className={`px-2 py-1 rounded text-xs ${
                                    section.level === 'edit'
                                      ? 'bg-orange-100 text-orange-800'
                                      : section.level === 'view'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {sections.find(s => s.id === section.section)?.name}
                                </span>
                              ))}
                              {userPerm.sections.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{userPerm.sections.length - 2} more
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {userPerm.assignedBy && `By: ${userPerm.assignedBy}`}
                            </div>
                          </div>
                          <div className="w-32 flex items-center space-x-2">
                            <Button
                              onClick={() => toggleRowExpansion(globalIndex)}
                              variant="outline"
                              className="text-xs px-2 py-1"
                            >
                              {isExpanded ? '▲' : '▼'}
                            </Button>
                            <Button
                              onClick={() => duplicatePermissions(userPerm)}
                              variant="outline"
                              className="text-xs px-2 py-1 text-blue-600"
                              title="Duplicate to selected users"
                            >
                              📋
                            </Button>
                            <Button
                              onClick={() => {
                                const newPermissions = userPermissions.filter((_, i) => i !== globalIndex)
                                savePermissions(newPermissions)
                              }}
                              variant="outline"
                              className="text-xs px-2 py-1 text-red-600"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <div className="px-4 py-3 bg-gray-50 border-t">
                          <div className="space-y-3">
                            <h5 className="font-medium text-gray-900">Detailed Permissions:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {userPerm.sections.map(section => (
                                <div key={section.section} className="p-3 bg-white rounded border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">
                                      {sections.find(s => s.id === section.section)?.name}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      section.level === 'edit'
                                        ? 'bg-orange-100 text-orange-800'
                                        : section.level === 'view'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {section.level}
                                    </span>
                                  </div>
                                  {section.section !== 'audit_trail' && (
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(section.details).map(([detail, level]) => (
                                        level !== 'none' && (
                                          <span
                                            key={detail}
                                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                                          >
                                            {detail.replace(/_/g, ' ')}: {level}
                                          </span>
                                        )
                                      ))}
                                    </div>
                                  )}
                                </div>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalPermissions)} of {totalPermissions} permissions
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    className="text-sm"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    className="text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detailed Permission Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Detailed Permission Assignment</h3>
                <Button
                  onClick={closeAssignModal}
                  variant="outline"
                  className="text-gray-500"
                >
                  ✕
                </Button>
              </div>

              {/* Selected Users Summary */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Assigning permissions to {selectedUsers.length} user(s):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(userId => {
                    const user = availableUsers.find(u => u.id === userId)
                    return user ? (
                      <span key={userId} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {user.email}
                      </span>
                    ) : null
                  })}
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  Scope: {selectedProperty === 'global' ? '🌐 Global (All Properties)' : `🏠 ${properties.find(p => p.id === selectedProperty)?.name}`}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>

                {/* Role Templates */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Role Templates</h5>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={applyAdminTemplate}
                      variant="outline"
                      className="text-purple-600 border-purple-200 hover:bg-purple-50 text-sm"
                    >
                      👑 Admin (Full Access)
                    </Button>
                    <Button
                      onClick={applySupervisorTemplate}
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 text-sm"
                    >
                      👁️ Supervisor (View All)
                    </Button>
                    <Button
                      onClick={applyStaffTemplate}
                      variant="outline"
                      className="text-teal-600 border-teal-200 hover:bg-teal-50 text-sm"
                    >
                      📝 Staff (Clerical Work)
                    </Button>
                    <Button
                      onClick={applyMemberTemplate}
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50 text-sm"
                    >
                      👤 Member (Limited Access)
                    </Button>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Bulk Actions</h5>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => setAllSectionsPermission('view')}
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50 text-sm"
                    >
                      👁️ Set All View
                    </Button>
                    <Button
                      onClick={() => setAllSectionsPermission('edit')}
                      variant="outline"
                      className="text-orange-600 border-orange-200 hover:bg-orange-50 text-sm"
                    >
                      ✏️ Set All Edit
                    </Button>
                    <Button
                      onClick={() => setAllSectionsPermission('none')}
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 text-sm"
                    >
                      🚫 Clear All
                    </Button>
                  </div>
                </div>
              </div>

              {/* Form Errors */}
              {formErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Please fix the following errors:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {formErrors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section-by-Section Permission Grid */}
              <div className="space-y-6">
                {sections.map(section => (
                  <div key={section.id} className="border rounded-lg p-4">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900">{section.name}</h4>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>

                    {/* Section Level Permissions */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-800 mb-2">Section Access</h5>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`${section.id}_level`}
                            value="none"
                            checked={formState.sectionPermissions[section.id] === 'none'}
                            onChange={() => updateSectionPermission(section.id, 'none')}
                            className="text-blue-600"
                          />
                          <span className="text-sm">🚫 No Access</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`${section.id}_level`}
                            value="view"
                            checked={formState.sectionPermissions[section.id] === 'view'}
                            onChange={() => updateSectionPermission(section.id, 'view')}
                            className="text-blue-600"
                          />
                          <span className="text-sm">👁️ View Only</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`${section.id}_level`}
                            value="edit"
                            checked={formState.sectionPermissions[section.id] === 'edit'}
                            onChange={() => updateSectionPermission(section.id, 'edit')}
                            className="text-blue-600"
                          />
                          <span className="text-sm">✏️ View & Edit</span>
                        </label>
                      </div>
                    </div>

                    {/* Detail Level Permissions */}
                    {getRelevantDetailPermissions(section.id).length > 0 ? (
                      <div className={`transition-opacity ${formState.sectionPermissions[section.id] === 'none' ? 'opacity-50' : ''}`}>
                        <h5 className="text-sm font-medium text-gray-800 mb-2">Detail Permissions</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {getRelevantDetailPermissions(section.id).map(detail => (
                          <div key={detail.id} className="space-y-1">
                            <span className="text-xs font-medium text-gray-700">{detail.name}</span>
                            <div className="space-y-1">
                              <label className="flex items-center space-x-1">
                                <input
                                  type="radio"
                                  name={`${section.id}_${detail.id}`}
                                  value="none"
                                  checked={formState.detailPermissions[section.id][detail.id] === 'none'}
                                  onChange={() => updateDetailPermission(section.id, detail.id, 'none')}
                                  className="text-blue-600"
                                />
                                <span className="text-xs">None</span>
                              </label>
                              <label className="flex items-center space-x-1">
                                <input
                                  type="radio"
                                  name={`${section.id}_${detail.id}`}
                                  value="view"
                                  checked={formState.detailPermissions[section.id][detail.id] === 'view'}
                                  onChange={() => updateDetailPermission(section.id, detail.id, 'view')}
                                  disabled={formState.sectionPermissions[section.id] === 'none'}
                                  className="text-blue-600"
                                />
                                <span className="text-xs">View</span>
                              </label>
                              <label className="flex items-center space-x-1">
                                <input
                                  type="radio"
                                  name={`${section.id}_${detail.id}`}
                                  value="edit"
                                  checked={formState.detailPermissions[section.id][detail.id] === 'edit'}
                                  onChange={() => updateDetailPermission(section.id, detail.id, 'edit')}
                                  disabled={formState.sectionPermissions[section.id] === 'none'}
                                  className="text-blue-600"
                                />
                                <span className="text-xs">Edit</span>
                              </label>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        📋 This section only requires access level permissions - no detail permissions needed.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Permission Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Permission Summary</h4>
                <div className="text-sm text-gray-600">
                  {Object.entries(formState.sectionPermissions).filter(([_, level]) => level !== 'none').length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(formState.sectionPermissions)
                        .filter(([_, level]) => level !== 'none')
                        .map(([sectionId, level]) => {
                          const sectionName = sections.find(s => s.id === sectionId)?.name
                          return (
                            <div key={sectionId}>
                              <span className="font-medium">{sectionName}:</span> {level}
                              {Object.entries(formState.detailPermissions[sectionId as Section])
                                .filter(([_, detailLevel]) => detailLevel !== 'none')
                                .length > 0 && (
                                <span className="ml-2 text-xs">
                                  (+ {Object.entries(formState.detailPermissions[sectionId as Section])
                                    .filter(([_, detailLevel]) => detailLevel !== 'none')
                                    .length} detail permissions)
                                </span>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <span className="text-gray-500">No permissions selected</span>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <Button
                  onClick={closeAssignModal}
                  variant="outline"
                  disabled={isAssigning}
                >
                  Cancel
                </Button>
                <Button
                  onClick={assignDetailedPermissions}
                  disabled={isAssigning || validateForm().length > 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isAssigning ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Assigning...
                    </>
                  ) : (
                    'Assign Permissions'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
