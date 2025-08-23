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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showPropertyDropdown && !target.closest('.property-dropdown')) {
        setShowPropertyDropdown(false)
        setPropertySearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPropertyDropdown])

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
    if (!newUserEmail.trim()) return

    const newUser = {
      id: `user_${Date.now()}`,
      email: newUserEmail.trim()
    }

    availableUsers.push(newUser)
    setSelectedUsers([...selectedUsers, newUser.id])
    setNewUserEmail('')
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
          }))
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

      {/* User Selection */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Select Users</h4>
        
        {/* Add user by email */}
        <div className="flex space-x-2 mb-3">
          <input
            type="email"
            placeholder="Enter email address"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <Button
            onClick={addUserByEmail}
            variant="outline"
            className="text-sm"
          >
            Add User
          </Button>
        </div>

        {/* User selection */}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {availableUsers.map(user => (
            <label key={user.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={() => toggleUserSelection(user.id)}
                className="text-blue-600"
              />
              <span className="text-sm">{user.email}</span>
            </label>
          ))}
        </div>
        
        {selectedUsers.length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
            ✓ {selectedUsers.length} user(s) selected
          </div>
        )}
      </div>



      {/* Current Permissions Display */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Current Permissions</h4>
        {userPermissions.length === 0 ? (
          <p className="text-gray-500 text-sm">No permissions assigned yet</p>
        ) : (
          <div className="space-y-3">
            {userPermissions.map((userPerm, index) => (
              <div key={index} className="p-3 border rounded-lg bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-sm">{userPerm.email}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {userPerm.isGlobal ? '🌐 Global' : `🏠 Property-specific`}
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      const newPermissions = userPermissions.filter((_, i) => i !== index)
                      savePermissions(newPermissions)
                    }}
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                  >
                    Remove
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {userPerm.sections.map(section => (
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
                      {sections.find(s => s.id === section.section)?.name} ({section.level})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
