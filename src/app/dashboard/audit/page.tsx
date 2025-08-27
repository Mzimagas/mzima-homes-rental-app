'use client'

import { useEffect, useState } from 'react'
import { RoleManagementService } from '../../../lib/auth/role-management.service'
import AuditTrailDashboard from '../../../components/properties/components/AuditTrailDashboard'
import SecurityTestPanel from '../../../components/properties/components/SecurityTestPanel'

export default function AuditTrailPage() {
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security & Audit Trail</h2>
          <p className="text-gray-600">
            Monitor changes, manage approvals, and ensure data integrity
          </p>
        </div>
      </div>

      {/* Security Test Panel */}
      <SecurityTestPanel />

      {/* Audit Trail Dashboard */}
      <AuditTrailDashboard userRole={userRole} />
    </div>
  )
}
