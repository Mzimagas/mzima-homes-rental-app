'use client'

import { useState } from 'react'
import { Button } from '../ui'
import GranularPermissionManager from '../properties/components/GranularPermissionManager'

export default function PermissionManagementCard() {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Section-Based Permission Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              Assign granular permissions to users across different sections and properties
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🔐</div>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              className="text-sm"
            >
              {isExpanded ? (
                <>
                  <span className="mr-1">👁️</span>
                  Hide Details
                </>
              ) : (
                <>
                  <span className="mr-1">👀</span>
                  View Details
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      {isExpanded && (
        <div className="p-6">
          <GranularPermissionManager />
        </div>
      )}

      {/* Collapsed State */}
      {!isExpanded && (
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔐</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Permission Management</h4>
            <p className="text-gray-600 mb-4">
              Manage user permissions, role templates, and section-based access control
            </p>
            <Button
              onClick={() => setIsExpanded(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Open Permission Manager
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
