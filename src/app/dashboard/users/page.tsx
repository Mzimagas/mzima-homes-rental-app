'use client'

import { useState } from 'react'
import UserManagement from '../../../components/property/UserManagement'
import { PropertySelectorCompact } from '../../../components/property/PropertySelector'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'
import { UserManagementDenied } from '../../../components/common/PermissionDenied'

export default function UserManagementPage() {
  const { currentProperty, properties, loading, canManageUsers, userRole } = usePropertyAccess()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage user access and permissions for your properties
          </p>
        </div>
        {properties.length > 1 && (
          <div className="w-64">
            <PropertySelectorCompact />
          </div>
        )}
      </div>

      {/* Property Selector for single property or no properties */}
      {properties.length === 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              You need to have access to at least one property to manage users.
            </p>
          </div>
        </div>
      )}

      {properties.length === 1 && !currentProperty && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Select a Property</h3>
            <p className="mt-1 text-sm text-gray-500 mb-4">
              Choose a property to manage its users and permissions.
            </p>
            <PropertySelectorCompact className="max-w-sm mx-auto" />
          </div>
        </div>
      )}

      {/* User Management Component */}
      {currentProperty && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {currentProperty.property_name}
                </h2>
                <p className="text-sm text-gray-500">
                  Your role: <span className="font-medium">{currentProperty.user_role}</span>
                  {currentProperty.can_manage_users && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Can manage users
                    </span>
                  )}
                </p>
              </div>
              <div className="flex space-x-2">
                {currentProperty.can_edit_property && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Can Edit Property
                  </span>
                )}
                {currentProperty.can_manage_tenants && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Can Manage Tenants
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
            {/* Permission check is handled inside UserManagement component */}
            <UserManagement />
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">User Roles & Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800">OWNER</h4>
            <p className="text-blue-700">Full access to all property features and user management</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">PROPERTY_MANAGER</h4>
            <p className="text-blue-700">Manage tenants, maintenance, and day-to-day operations</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">LEASING_AGENT</h4>
            <p className="text-blue-700">Handle tenant applications and lease management</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">MAINTENANCE_COORDINATOR</h4>
            <p className="text-blue-700">Manage maintenance requests and work orders</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">VIEWER</h4>
            <p className="text-blue-700">Read-only access to property information</p>
          </div>
        </div>
      </div>
    </div>
  )
}
