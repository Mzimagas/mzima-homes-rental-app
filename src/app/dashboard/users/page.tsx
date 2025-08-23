'use client'

import { useState } from 'react'
import UserWorkflowNavigation, { UserTab } from '../../../components/users/UserManagementTabs'
import UserAddition from '../../../components/users/UserAddition'
import GranularPermissionManager from '../../../components/properties/components/GranularPermissionManager'

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<UserTab>('addition')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management Dashboard</h1>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            Streamline your user management process with our comprehensive workflow system.
            Add new users and manage permissions efficiently.
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
                  <h2 className="text-2xl font-bold text-gray-900">User Addition</h2>
                  <p className="text-gray-600">Create new user accounts with initial role assignments</p>
                </div>
              </div>
              <UserAddition />
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Permission Management</h2>
                  <p className="text-gray-600">Manage user permissions, access control, and role assignments with lifecycle-based filtering</p>
                </div>
              </div>
              <GranularPermissionManager />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
