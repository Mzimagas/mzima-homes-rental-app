'use client'

import React, { useState, useEffect } from 'react'
import { useRBAC } from '../../lib/auth/rbac'
import AdminBackdoorService from '../../lib/auth/admin-backdoor'

interface BackdoorStatus {
  isPermanentSuperAdmin: boolean
  systemIntegrity: {
    valid: boolean
    issues: string[]
  }
  totalSuperAdmins: number
  lastValidation?: string
}

export default function BackdoorStatusCard() {
  const { user, isPermanentSuperAdmin } = useRBAC()
  const [status, setStatus] = useState<BackdoorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && isPermanentSuperAdmin) {
      loadBackdoorStatus()
    } else {
      setLoading(false)
    }
  }, [user, isPermanentSuperAdmin])

  const loadBackdoorStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get system validation
      const validation = AdminBackdoorService.validateBackdoorIntegrity()
      const superAdmins = AdminBackdoorService.getPermanentSuperAdmins()

      setStatus({
        isPermanentSuperAdmin: user?.email ? AdminBackdoorService.isPermanentSuperAdmin(user.email) : false,
        systemIntegrity: validation,
        totalSuperAdmins: superAdmins.length,
        lastValidation: new Date().toISOString()
      })
    } catch (err) {
      setError('Failed to load backdoor status')
      console.error('Backdoor status error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEmergencyAccess = async () => {
    if (!user?.email) return

    try {
      setLoading(true)
      const response = await fetch('/api/admin/emergency-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          action: 'create_access'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Emergency access ensured successfully')
        await loadBackdoorStatus()
      } else {
        alert(`Emergency access failed: ${result.error}`)
      }
    } catch (err) {
      alert('Emergency access request failed')
      console.error('Emergency access error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Only show to permanent super-admins
  if (!isPermanentSuperAdmin) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600 text-xl mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Backdoor Status Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={loadBackdoorStatus}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🔐</div>
            <div>
              <h3 className="text-lg font-medium text-blue-900">Administrative Backdoor System</h3>
              <p className="text-sm text-blue-700">Security safeguard and emergency access control</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {status?.systemIntegrity.valid ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                ✅ System Valid
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                ⚠️ Issues Detected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">System Status</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Super-Admin Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  status?.isPermanentSuperAdmin 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {status?.isPermanentSuperAdmin ? '✅ Permanent' : '❌ Standard'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Super-Admins</span>
                <span className="text-sm font-medium text-gray-900">
                  {status?.totalSuperAdmins || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">System Integrity</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  status?.systemIntegrity.valid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {status?.systemIntegrity.valid ? '✅ Valid' : '⚠️ Issues'}
                </span>
              </div>

              {status?.lastValidation && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Validation</span>
                  <span className="text-xs text-gray-500">
                    {new Date(status.lastValidation).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Emergency Actions</h4>
            
            <div className="space-y-3">
              <button
                onClick={handleEmergencyAccess}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Processing...' : '🚨 Ensure Emergency Access'}
              </button>

              <button
                onClick={loadBackdoorStatus}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Validating...' : '🔍 Validate System'}
              </button>

              <a
                href="/api/admin/emergency-access?email=mzimagas@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium text-center"
              >
                📊 View API Status
              </a>
            </div>
          </div>
        </div>

        {/* Issues Display */}
        {status?.systemIntegrity.issues && status.systemIntegrity.issues.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h5 className="font-medium text-red-800 mb-2">⚠️ System Issues Detected</h5>
            <ul className="space-y-1">
              {status.systemIntegrity.issues.map((issue, index) => (
                <li key={index} className="text-sm text-red-700">
                  • {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="text-yellow-600 text-lg mr-3">⚠️</div>
            <div>
              <h5 className="font-medium text-yellow-800">Security Notice</h5>
              <p className="text-sm text-yellow-700 mt-1">
                This backdoor system provides emergency access capabilities. All actions are logged for security auditing. 
                Only use emergency functions when normal access methods have failed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
