'use client'

import React, { useState } from 'react'
import { Button } from '../../../ui'
import { 
  UserPermissions, 
  SectionPermission, 
  PermissionLevel, 
  Section,
  DetailPermission 
} from '../types'
import { 
  createDefaultUserPermissions,
  DEFAULT_SECTIONS,
  DEFAULT_DETAIL_PERMISSIONS 
} from '../utils/permissionUtils'
import { 
  getAllRoleTemplates,
  applyRoleTemplate,
  setAllSectionsPermission 
} from '../utils/roleTemplates'

interface PermissionAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (permissions: UserPermissions[]) => void
  selectedUsers: string[]
  selectedProperty: string
  isAssigning?: boolean
}

export default function PermissionAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  selectedUsers,
  selectedProperty,
  isAssigning = false
}: PermissionAssignmentModalProps) {
  const [currentPermissions, setCurrentPermissions] = useState<UserPermissions[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Initialize permissions when modal opens
  React.useEffect(() => {
    if (isOpen && selectedUsers.length > 0) {
      const initialPermissions = selectedUsers.map(userId => 
        createDefaultUserPermissions(
          userId, 
          `user-${userId}@example.com`, // Replace with actual user lookup
          selectedProperty === 'global'
        )
      )
      setCurrentPermissions(initialPermissions)
    }
  }, [isOpen, selectedUsers, selectedProperty])

  if (!isOpen) return null

  const roleTemplates = getAllRoleTemplates()

  // Update section permission
  const updateSectionPermission = (
    userIndex: number, 
    sectionIndex: number, 
    level: PermissionLevel
  ) => {
    const updated = [...currentPermissions]
    updated[userIndex].sections[sectionIndex].level = level
    
    // Update all detail permissions to match section level
    const details = {} as Record<DetailPermission, PermissionLevel>
    DEFAULT_DETAIL_PERMISSIONS.forEach(detail => {
      details[detail] = level
    })
    updated[userIndex].sections[sectionIndex].details = details
    
    setCurrentPermissions(updated)
  }

  // Update detail permission
  const updateDetailPermission = (
    userIndex: number,
    sectionIndex: number,
    detail: DetailPermission,
    level: PermissionLevel
  ) => {
    const updated = [...currentPermissions]
    updated[userIndex].sections[sectionIndex].details[detail] = level
    setCurrentPermissions(updated)
  }

  // Apply role template
  const applyTemplate = (userIndex: number, templateKey: keyof typeof import('../utils/roleTemplates').ROLE_TEMPLATES) => {
    const updated = [...currentPermissions]
    updated[userIndex] = applyRoleTemplate(updated[userIndex], templateKey)
    setCurrentPermissions(updated)
  }

  // Set all sections permission
  const setAllSections = (userIndex: number, level: PermissionLevel) => {
    const updated = [...currentPermissions]
    updated[userIndex] = setAllSectionsPermission(updated[userIndex], level)
    setCurrentPermissions(updated)
  }

  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  // Handle assignment
  const handleAssign = () => {
    onAssign(currentPermissions)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Detailed Permission Assignment</h3>
          <Button
            onClick={onClose}
            variant="secondary"
            className="text-gray-500"
          >
            ✕
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {currentPermissions.map((userPerm, userIndex) => (
            <div key={userIndex} className="mb-8 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">
                  User: {userPerm.email}
                </h4>
                <div className="flex space-x-2">
                  {/* Role Templates */}
                  <div className="flex flex-wrap gap-2">
                    {roleTemplates.map(template => (
                      <Button
                        key={template.key}
                        onClick={() => applyTemplate(userIndex, template.key)}
                        variant="secondary"
                        className="text-sm"
                      >
                        {template.icon} {template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setAllSections(userIndex, 'view')}
                    variant="secondary"
                    className="text-sm"
                  >
                    👁️ Set All View
                  </Button>
                  <Button
                    onClick={() => setAllSections(userIndex, 'edit')}
                    variant="secondary"
                    className="text-sm"
                  >
                    ✏️ Set All Edit
                  </Button>
                  <Button
                    onClick={() => setAllSections(userIndex, 'none')}
                    variant="secondary"
                    className="text-sm"
                  >
                    🚫 Clear All
                  </Button>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-3">
                {userPerm.sections.map((section, sectionIndex) => {
                  const isExpanded = expandedRows.has(userIndex * 100 + sectionIndex)
                  
                  return (
                    <div key={section.section} className="border border-gray-200 rounded-md">
                      <div className="p-3 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900 capitalize">
                            {section.section.replace('_', ' ')}
                          </span>
                          <select
                            value={section.level}
                            onChange={(e) => updateSectionPermission(
                              userIndex, 
                              sectionIndex, 
                              e.target.value as PermissionLevel
                            )}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="none">🚫 No Access</option>
                            <option value="view">👁️ View Only</option>
                            <option value="edit">✏️ Edit Access</option>
                          </select>
                        </div>
                        <Button
                          onClick={() => toggleRowExpansion(userIndex * 100 + sectionIndex)}
                          variant="secondary"
                          className="text-xs px-2 py-1"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </Button>
                      </div>

                      {/* Detail Permissions */}
                      {isExpanded && (
                        <div className="p-3 border-t border-gray-200">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">Detail Permissions</h6>
                          <div className="grid grid-cols-2 gap-3">
                            {DEFAULT_DETAIL_PERMISSIONS.map(detail => (
                              <div key={detail} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 capitalize">
                                  {detail.replace('_', ' ')}
                                </span>
                                <select
                                  value={section.details[detail]}
                                  onChange={(e) => updateDetailPermission(
                                    userIndex,
                                    sectionIndex,
                                    detail,
                                    e.target.value as PermissionLevel
                                  )}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                                >
                                  <option value="none">🚫</option>
                                  <option value="view">👁️</option>
                                  <option value="edit">✏️</option>
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isAssigning || currentPermissions.length === 0}
          >
            {isAssigning ? 'Assigning...' : `Assign Permissions (${currentPermissions.length} users)`}
          </Button>
        </div>
      </div>
    </div>
  )
}
