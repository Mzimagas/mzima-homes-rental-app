'use client'

import { useState } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'

// Import administration components (to be created)
import UserManagement from '../../../components/administration/UserManagement'
import AuditTrail from '../../../components/administration/AuditTrail'
import DocumentManagement from '../../../components/administration/DocumentManagement'

type AdministrationTab = 'users' | 'audit' | 'documents'

export default function AdministrationPage() {
  const { user } = useAuth()
  const { properties } = usePropertyAccess()
  const [activeTab, setActiveTab] = useState<AdministrationTab>('users')

  // Check if user has user management permissions for any property
  const canManageAnyUsers = properties.some(property => property.can_manage_users)

  const tabs = [
    { 
      id: 'users' as const, 
      name: 'User Management', 
      icon: '👥',
      description: 'Manage users, roles, and permissions',
      requiresPermission: true
    },
    { 
      id: 'audit' as const, 
      name: 'Audit Trail', 
      icon: '📋',
      description: 'View system activity and changes',
      requiresPermission: false
    },
    { 
      id: 'documents' as const, 
      name: 'Document Management', 
      icon: '📁',
      description: 'Manage documents for properties and rentals',
      requiresPermission: false
    },
  ]

  // Filter tabs based on permissions
  const availableTabs = tabs.filter(tab => 
    !tab.requiresPermission || canManageAnyUsers
  )

  // Ensure active tab is available to user
  if (!availableTabs.find(tab => tab.id === activeTab)) {
    setActiveTab(availableTabs[0]?.id || 'audit')
  }

  const handleTabChange = (tabId: AdministrationTab) => {
    setActiveTab(tabId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Administration</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage users, audit trails, and documents across your property management system
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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.name}</div>
                  <div className="text-xs text-gray-400 font-normal">
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          {activeTab === 'users' && canManageAnyUsers && (
            <UserManagement />
          )}
          
          {activeTab === 'audit' && (
            <AuditTrail />
          )}
          
          {activeTab === 'documents' && (
            <DocumentManagement />
          )}

          {/* Access Denied Message */}
          {activeTab === 'users' && !canManageAnyUsers && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                You don't have permission to manage users. Contact your administrator for access to user management features.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Administration Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">👥</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <p className="text-sm text-gray-500">
                {canManageAnyUsers 
                  ? 'Manage user accounts, roles, and permissions'
                  : 'View user information (read-only access)'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📋</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Audit Trail</h3>
              <p className="text-sm text-gray-500">
                Track all system activities and changes for compliance
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📁</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Document Management</h3>
              <p className="text-sm text-gray-500">
                Centralized document storage for properties and rentals
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
