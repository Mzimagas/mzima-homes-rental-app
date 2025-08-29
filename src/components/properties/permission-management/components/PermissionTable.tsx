'use client'

import React, { useState } from 'react'
import { Button } from '../../../ui'
import { UserPermissions, FilterState } from '../types'
import { getRoleTemplate, getPermissionSummary } from '../utils/permissionUtils'

interface PermissionTableProps {
  permissions: UserPermissions[]
  selectedPermissions: number[]
  onToggleSelection: (index: number) => void
  onRemovePermission: (index: number) => void
  onDuplicatePermission: (permission: UserPermissions) => void
  onEditPermission?: (index: number) => void
  showBulkActions: boolean
  onToggleBulkActions: () => void
  onBulkRemove: () => void
  onClearSelection: () => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  availableUsers?: Array<{ id: string; email: string; name?: string }>
}

export default function PermissionTable({
  permissions,
  selectedPermissions,
  onToggleSelection,
  onRemovePermission,
  onDuplicatePermission,
  onEditPermission,
  showBulkActions,
  onToggleBulkActions,
  onBulkRemove,
  onClearSelection,
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  availableUsers = [],
}: PermissionTableProps) {
  const getUserDisplayName = (permission: UserPermissions) => {
    const user = availableUsers.find((u) => u.id === permission.userId)
        if (user?.name) return user.name

    // If no name available, try to extract a meaningful name from email
    const emailToUse = user?.email || permission.email
    const emailPart = emailToUse.split('@')[0]
    if (emailPart.startsWith('user-') && emailPart.length > 10) {
      const uuid = emailPart.replace('user-', '')
      return `User ${uuid.slice(0, 8)}...`
    }

    return emailPart || emailToUse
  }

  const getUserEmail = (permission: UserPermissions) => {
    const user = availableUsers.find((u) => u.id === permission.userId)
    const finalEmail = user?.email || permission.email
        return finalEmail
  }

  // State for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean
    index: number | null
    userName: string
  }>({
    show: false,
    index: null,
    userName: '',
  })

  // Handle delete with confirmation
  const handleDeleteClick = (index: number, permission: UserPermissions) => {
    const userName = getUserDisplayName(permission)
    setDeleteConfirmation({
      show: true,
      index,
      userName,
    })
  }

  // Confirm delete
  const confirmDelete = () => {
    if (deleteConfirmation.index !== null) {
      onRemovePermission(deleteConfirmation.index)
    }
    setDeleteConfirmation({ show: false, index: null, userName: '' })
  }

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, index: null, userName: '' })
  }

  if (permissions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-500">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Permissions Assigned</h3>
          <p className="text-sm text-gray-600">
            Start by selecting users and properties to assign permissions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Bulk Actions */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Current Permissions</h4>
        {selectedPermissions.length > 0 && (
          <Button
            onClick={onToggleBulkActions}
            className="text-blue-600 border border-blue-200 hover:bg-blue-50 text-sm bg-white"
          >
            Bulk Actions ({selectedPermissions.length})
          </Button>
        )}
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedPermissions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedPermissions.length} permission{selectedPermissions.length === 1 ? '' : 's'}{' '}
              selected
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to remove ${selectedPermissions.length} permission${selectedPermissions.length === 1 ? '' : 's'}? This action cannot be undone.`
                    )
                  ) {
                    onBulkRemove()
                  }
                }}
                variant="danger"
                className="text-sm"
              >
                🗑️ Remove Selected
              </Button>
              <Button onClick={onClearSelection} variant="secondary" className="text-sm">
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={
                      selectedPermissions.length === permissions.length && permissions.length > 0
                    }
                    onChange={() => {
                      if (selectedPermissions.length === permissions.length) {
                        onClearSelection()
                      } else {
                        permissions.forEach((_, index) => {
                          if (!selectedPermissions.includes(index)) {
                            onToggleSelection(index)
                          }
                        })
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permissions.map((permission, index) => (
                <tr
                  key={`${permission.userId}-${index}`}
                  className={
                    selectedPermissions.includes(index) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(index)}
                      onChange={() => onToggleSelection(index)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getUserDisplayName(permission)}
                        </div>
                        <div className="text-sm text-gray-500">{getUserEmail(permission)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {permission.isGlobal ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🌐 Global
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🏠 Property-Specific
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getRoleTemplate(permission)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getPermissionSummary(permission)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        permission.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : permission.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {permission.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {onEditPermission && (
                        <Button
                          onClick={() => onEditPermission(index)}
                          variant="secondary"
                          className="text-xs px-2 py-1"
                        >
                          ✏️
                        </Button>
                      )}
                      <Button
                        onClick={() => onDuplicatePermission(permission)}
                        variant="secondary"
                        className="text-xs px-2 py-1 text-blue-600"
                        title="Duplicate to selected users"
                      >
                        📋
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(index, permission)}
                        variant="secondary"
                        className="text-xs px-2 py-1 text-red-600"
                        title="Delete permission"
                      >
                        🗑️
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              variant="secondary"
              className="text-sm"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              variant="secondary"
              className="text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Confirm Permission Deletion</h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete permissions for{' '}
                <span className="font-semibold text-gray-900">{deleteConfirmation.userName}</span>?
              </p>
              <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button onClick={cancelDelete} variant="secondary" className="text-sm">
                Cancel
              </Button>
              <Button onClick={confirmDelete} variant="danger" className="text-sm">
                Delete Permission
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
