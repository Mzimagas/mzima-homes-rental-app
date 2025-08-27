'use client'

import { ExclamationTriangleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'

interface PermissionDeniedProps {
  title?: string
  message?: string
  requiredPermission?: string
  currentRole?: string
  showContactInfo?: boolean
  className?: string
}

export default function PermissionDenied({
  title = 'Access Denied',
  message,
  requiredPermission = 'user management',
  currentRole,
  showContactInfo = true,
  className = '',
}: PermissionDeniedProps) {
  const defaultMessage = `You don't have permission to access ${requiredPermission} for this property.`

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ShieldExclamationIcon className="h-8 w-8 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-red-800 mb-2">{title}</h3>

          <p className="text-red-700 mb-4">{message || defaultMessage}</p>

          {currentRole && (
            <div className="mb-4">
              <p className="text-sm text-red-600">
                <strong>Your current role:</strong> {currentRole}
              </p>
            </div>
          )}

          <div className="bg-red-100 rounded-md p-3 mb-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">Required Permissions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Only property <strong>OWNERS</strong> can manage users
                  </li>
                  <li>User management includes inviting, removing, and changing user roles</li>
                  <li>Contact the property owner to request access or role changes</li>
                </ul>
              </div>
            </div>
          </div>

          {showContactInfo && (
            <div className="border-t border-red-200 pt-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">How to get access:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Contact the property owner to request user management permissions</li>
                <li>• Ask to be assigned the "OWNER" role for this property</li>
                <li>• Property owners can manage user roles from this same interface</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Specific variants for common use cases
export function UserManagementDenied({
  currentRole,
  className,
}: {
  currentRole?: string
  className?: string
}) {
  return (
    <PermissionDenied
      title="User Management Access Denied"
      message="You need OWNER permissions to manage users for this property."
      requiredPermission="user management"
      currentRole={currentRole}
      className={className}
    />
  )
}

export function PropertyEditDenied({
  currentRole,
  className,
}: {
  currentRole?: string
  className?: string
}) {
  return (
    <PermissionDenied
      title="Property Edit Access Denied"
      message="You need OWNER or PROPERTY_MANAGER permissions to edit this property."
      requiredPermission="property editing"
      currentRole={currentRole}
      className={className}
    />
  )
}
