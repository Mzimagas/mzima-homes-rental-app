'use client'

import { useState } from 'react'
import { useAuth } from '../../../components/auth/AuthProvider'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'

// Import administration components
import AdministrationWorkflowNavigation, { AdministrationTab } from '../../../components/administration/components/AdministrationWorkflowNavigation'
import UserManagement from '../../../components/administration/UserManagement'
import AuditTrail from '../../../components/administration/AuditTrail'
import DocumentManagement from '../../../components/administration/DocumentManagement'

export default function AdministrationPage() {
  const { user } = useAuth()
  const { properties } = usePropertyAccess()
  const [activeTab, setActiveTab] = useState<AdministrationTab>('users')

  // Check if user has user management permissions for any property
  const canManageAnyUsers = properties.some((property) => property.can_manage_users)

  // Ensure active tab is available to user
  if (activeTab === 'users' && !canManageAnyUsers) {
    setActiveTab('audit')
  }

  const handleTabChange = (tabId: AdministrationTab) => {
    setActiveTab(tabId)
  }

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <AdministrationWorkflowNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        canManageUsers={canManageAnyUsers}
      />

      {/* Access Status Indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Administration Access</h3>
            <p className="text-sm text-gray-500 mt-1">
              Your current access level and available administration features
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">
              {canManageAnyUsers ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Admin Access
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Read-Only Access
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'users' && canManageAnyUsers && <UserManagement />}

        {activeTab === 'audit' && <AuditTrail />}

        {activeTab === 'documents' && <DocumentManagement />}

        {/* Access Denied Message */}
        {activeTab === 'users' && !canManageAnyUsers && (
          <div className="bg-white border border-gray-200 rounded-lg p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                You don't have permission to manage users. Contact your administrator for access to
                user management features.
              </p>
            </div>
          </div>
        )}
      </div>


    </div>
  )
}
