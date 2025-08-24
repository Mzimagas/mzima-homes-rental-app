'use client'

import { useState } from 'react'
import UserWorkflowNavigation, { UserTab } from '../users/UserManagementTabs'
import ComprehensiveUserManagement from '../users/ComprehensiveUserManagement'
import GranularPermissionManager from '../properties/components/GranularPermissionManager'
import DeletedUsersManagement from '../users/DeletedUsersManagement'

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<UserTab>('addition')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage user accounts, permissions, and access control across your property management system
        </p>
      </div>

      {/* Workflow Navigation */}
      <UserWorkflowNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === 'addition' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">User Accounts</h3>
                <p className="text-sm text-gray-500">View existing users and create new user accounts</p>
              </div>
            </div>
            <ComprehensiveUserManagement />
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Permission Management</h3>
                <p className="text-sm text-gray-500">Manage user permissions, access control, and role assignments with lifecycle-based filtering</p>
              </div>
            </div>
            <GranularPermissionManager />
          </div>
        )}

        {activeTab === 'deleted' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Deleted Users Management</h3>
                <p className="text-sm text-gray-500">Restore or permanently delete soft deleted users</p>
              </div>
            </div>
            <DeletedUsersManagement />
          </div>
        )}
      </div>
    </div>
  )
}
