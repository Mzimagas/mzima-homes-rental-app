'use client'

import { useEffect, useState } from 'react'
import { RoleManagementService } from '../../lib/auth/role-management.service'
import AuditTrailDashboard from '../properties/components/AuditTrailDashboard'
import SecurityTestPanel from '../properties/components/SecurityTestPanel'

export default function AuditTrail() {
  const [userRole, setUserRole] = useState<string>('property_manager')

  useEffect(() => {
    const load = async () => {
      try {
        const role = await RoleManagementService.getCurrentUserRole()
        setUserRole(role)
      } catch (e) {
        setUserRole('viewer')
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">Audit Trail</h2>
        <p className="text-sm text-gray-500 mt-1">
          Monitor system changes, manage approvals, and ensure data integrity across all property management activities
        </p>
      </div>

      {/* Security Test Panel */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Testing</h3>
        <SecurityTestPanel />
      </div>

      {/* Audit Trail Dashboard */}
      <div className="bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Activity Log</h3>
        <AuditTrailDashboard userRole={userRole} />
      </div>
    </div>
  )
}
