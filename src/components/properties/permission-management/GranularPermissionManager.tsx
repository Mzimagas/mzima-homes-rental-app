'use client'

import React, { useEffect } from 'react'
import { Button } from '../../ui'
import PropertySelector from './components/PropertySelector'
import UserSelector from './components/UserSelector'
import PermissionAssignmentModal from './components/PermissionAssignmentModal'
import PermissionTable from './components/PermissionTable'
import { usePermissionManagement } from './hooks/usePermissionManagement'
import { UserPermissions, FeedbackMessage } from './types'

export default function GranularPermissionManager() {
  const {
    // State
    userPermissions,
    selectedPermissions,
    showBulkActions,
    currentPage,
    assignmentState,

    // Permission CRUD
    loadPermissions,
    addPermission,
    updatePermission,
    removePermission,
    duplicatePermissions,

    // Bulk operations
    bulkRemovePermissions,
    togglePermissionSelection,
    clearPermissionSelection,

    // Filtering and pagination
    getPaginatedPermissions,
    setCurrentPage,

    // Bulk actions
    setShowBulkActions,

    // Assignment modal
    openAssignModal,
    closeAssignModal,
    setFeedback,
    setAssignmentState,
  } = usePermissionManagement()

  // Local state for selections
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([])
  const [selectedProperty, setSelectedProperty] = React.useState<string>('global')

  // Load permissions on mount
  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Get paginated permissions
  const { permissions: paginatedPermissions, totalPages } = getPaginatedPermissions()

  // Handle permission assignment
  const handleAssignPermissions = async (permissions: UserPermissions[]) => {
    setAssignmentState((prev) => ({ ...prev, isAssigning: true }))

    try {
      // Add each permission
      permissions.forEach((permission) => {
        addPermission(
          permission.userId,
          permission.email,
          permission.propertyId,
          permission.isGlobal
        )
      })

      setFeedback({
        type: 'success',
        message: `Successfully assigned permissions to ${permissions.length} user(s)`,
      })

      // Clear selections and close modal after a delay
      setTimeout(() => {
        setSelectedUsers([])
        closeAssignModal()
      }, 1500)
    } catch (error) {
      console.error('Error assigning permissions:', error)
      setFeedback({
        type: 'error',
        message: 'Failed to assign permissions. Please try again.',
      })
    } finally {
      setAssignmentState((prev) => ({ ...prev, isAssigning: false }))
    }
  }

  // Handle duplicate permissions
  const handleDuplicatePermissions = (sourcePermission: UserPermissions) => {
    if (selectedUsers.length === 0) {
      setFeedback({
        type: 'warning',
        message: 'Please select users to duplicate permissions to',
      })
      return
    }

    duplicatePermissions(sourcePermission, selectedUsers)
    setFeedback({
      type: 'success',
      message: `Duplicated permissions to ${selectedUsers.length} user(s)`,
    })
  }

  // Check if assignment is possible
  const canAssignPermissions = selectedUsers.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Permission Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Follow the steps below to assign permissions: 1) Select scope → 2) Choose users → 3)
            Assign permissions
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end space-x-3">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-medium">
            3
          </span>
          <Button
            onClick={openAssignModal}
            disabled={!canAssignPermissions}
            className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] px-4 py-2 text-sm sm:text-base"
            size="md"
          >
            <span className="hidden sm:inline">
              {canAssignPermissions
                ? `Assign Permissions (${selectedUsers.length} users)`
                : 'Select Users to Assign Permissions'}
            </span>
            <span className="sm:hidden">
              {canAssignPermissions ? `Assign (${selectedUsers.length})` : 'Select Users'}
            </span>
          </Button>
        </div>
      </div>

      {/* Feedback Messages */}
      {assignmentState.feedback && (
        <div
          className={`p-4 rounded-md ${
            assignmentState.feedback.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : assignmentState.feedback.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          <div
            className={`text-sm ${
              assignmentState.feedback.type === 'success'
                ? 'text-green-800'
                : assignmentState.feedback.type === 'error'
                  ? 'text-red-800'
                  : 'text-yellow-800'
            }`}
          >
            {assignmentState.feedback.message}
          </div>
        </div>
      )}

      {/* Step 1: Permission Scope Selection */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-medium">
            1
          </span>
          <h3 className="text-lg font-medium text-gray-900">Select Permission Scope</h3>
        </div>
        <PropertySelector onPropertySelect={setSelectedProperty} className="w-full" />
      </div>

      {/* Step 2: User Selection */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-medium">
            2
          </span>
          <h3 className="text-lg font-medium text-gray-900">Select Users</h3>
        </div>
        <UserSelector
          onSelectionChange={setSelectedUsers}
          selectedProperty={selectedProperty}
          className="w-full"
        />
      </div>

      {/* Current Permissions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <PermissionTable
          permissions={paginatedPermissions}
          selectedPermissions={selectedPermissions}
          onToggleSelection={togglePermissionSelection}
          onRemovePermission={removePermission}
          onDuplicatePermission={handleDuplicatePermissions}
          showBulkActions={showBulkActions}
          onToggleBulkActions={() => setShowBulkActions(!showBulkActions)}
          onBulkRemove={bulkRemovePermissions}
          onClearSelection={clearPermissionSelection}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Permission Assignment Modal */}
      <PermissionAssignmentModal
        isOpen={assignmentState.showModal}
        onClose={closeAssignModal}
        onAssign={handleAssignPermissions}
        selectedUsers={selectedUsers}
        selectedProperty={selectedProperty}
        isAssigning={assignmentState.isAssigning}
      />
    </div>
  )
}
