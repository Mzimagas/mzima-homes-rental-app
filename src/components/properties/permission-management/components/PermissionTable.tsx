'use client'

import React from 'react'
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
  className = ''
}: PermissionTableProps) {
  
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
              {selectedPermissions.length} permission{selectedPermissions.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <Button
                onClick={onBulkRemove}
                variant="danger"
                className="text-sm"
              >
                🗑️ Remove Selected
              </Button>
              <Button
                onClick={onClearSelection}
                variant="secondary"
                className="text-sm"
              >
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
                    checked={selectedPermissions.length === permissions.length && permissions.length > 0}
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
                  className={selectedPermissions.includes(index) ? 'bg-blue-50' : 'hover:bg-gray-50'}
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
                          {permission.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {permission.userId}
                        </div>
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
                    <div className="text-sm text-gray-900">
                      {getPermissionSummary(permission)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      permission.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : permission.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
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
                        onClick={() => onRemovePermission(index)}
                        variant="secondary"
                        className="text-xs px-2 py-1 text-red-600"
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
    </div>
  )
}
