'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../lib/auth-context'
import { usePropertyAccess } from '../../../../hooks/usePropertyAccess'
import supabase from '../../../../lib/supabase-client'
import Link from 'next/link'

interface DeletedTenant {
  id: string
  full_name: string
  email?: string
  phone?: string
  current_unit_id?: string
  created_at: string
  units?: {
    id: string
    unit_label: string
    properties: {
      id: string
      name: string
    }
  }
}

interface RestoreConflict {
  type: 'occupied' | 'unavailable'
  message: string
  occupiedBy?: string
}

export default function DeletedTenantsPage() {
  const { user } = useAuth()
  const { properties } = usePropertyAccess()
  const [deletedTenants, setDeletedTenants] = useState<DeletedTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [conflictDialog, setConflictDialog] = useState<{
    tenant: DeletedTenant
    conflict: RestoreConflict
  } | null>(null)

  // Check if user has admin permissions (OWNER or PROPERTY_MANAGER)
  const hasAdminAccess = properties.some(p => 
    ['OWNER', 'PROPERTY_MANAGER'].includes(p.role)
  )

  const fetchDeletedTenants = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all property IDs the user has access to
      const propertyIds = properties.map(p => p.id)
      
      if (propertyIds.length === 0) {
        setDeletedTenants([])
        return
      }

      // Fetch deleted tenants with their unit and property information
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          full_name,
          email,
          phone,
          current_unit_id,
          created_at,
          units (
            id,
            unit_label,
            properties (
              id,
              name
            )
          )
        `)
        .eq('status', 'DELETED')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching deleted tenants:', error)
        setError('Failed to load deleted tenants')
        return
      }

      // Filter tenants based on user's property access
      const filteredTenants = (data || []).filter(tenant => {
        if (!tenant.units) return false
        return propertyIds.includes(tenant.units.properties.id)
      })

      setDeletedTenants(filteredTenants)
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (tenant: DeletedTenant, forceRestore = false) => {
    try {
      setRestoring(tenant.id)
      
      const { data: { session } } = await supabase.auth.getSession()
      const csrf = document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const response = await fetch(`/api/tenants/${tenant.id}/restore`, {
        method: 'PATCH',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          restore_to_unit: tenant.current_unit_id,
          force_restore: forceRestore
        })
      })

      const result = await response.json()

      if (response.status === 409 && result.conflict) {
        // Show conflict dialog
        setConflictDialog({
          tenant,
          conflict: result.conflict
        })
        return
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to restore tenant')
      }

      // Success
      alert(`Tenant "${tenant.full_name}" has been restored successfully`)
      fetchDeletedTenants() // Refresh the list
      setConflictDialog(null)

    } catch (err: any) {
      console.error('Restore error:', err)
      alert(err.message || 'Failed to restore tenant')
    } finally {
      setRestoring(null)
    }
  }

  const handleForceRestore = () => {
    if (conflictDialog) {
      handleRestore(conflictDialog.tenant, true)
    }
  }

  useEffect(() => {
    if (user && hasAdminAccess) {
      fetchDeletedTenants()
    }
  }, [user, hasAdminAccess, properties])

  if (!user) {
    return <div>Loading...</div>
  }

  if (!hasAdminAccess) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">
            You need OWNER or PROPERTY_MANAGER permissions to access deleted tenants.
          </p>
          <Link href="/dashboard/tenants" className="text-red-600 hover:text-red-800 underline mt-2 inline-block">
            ← Back to Active Tenants
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deleted Tenants</h1>
          <p className="text-gray-600 mt-1">
            Manage and restore soft-deleted tenant records
          </p>
        </div>
        <Link 
          href="/dashboard/tenants"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          ← Back to Active Tenants
        </Link>
      </div>

      {/* Admin Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Administrator Feature</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This page shows soft-deleted tenants that can be restored. Restoring a tenant will reactivate their account and may reassign them to their previous unit if available.
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading deleted tenants...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchDeletedTenants}
            className="text-red-600 hover:text-red-800 underline mt-2"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && deletedTenants.length === 0 && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No deleted tenants</h3>
          <p className="mt-1 text-sm text-gray-500">
            All tenants are currently active. Deleted tenants will appear here.
          </p>
        </div>
      )}

      {!loading && !error && deletedTenants.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {deletedTenants.map((tenant) => (
              <li key={tenant.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {tenant.full_name}
                      </h3>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Deleted
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <p>Email: {tenant.email || 'Not provided'}</p>
                      <p>Phone: {tenant.phone || 'Not provided'}</p>
                      {tenant.units && (
                        <p>Previous Unit: {tenant.units.unit_label} at {tenant.units.properties.name}</p>
                      )}
                      <p>Deleted: {new Date(tenant.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRestore(tenant)}
                      disabled={restoring === tenant.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {restoring === tenant.id ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conflict Resolution Dialog */}
      {conflictDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Unit Conflict</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-4">
                  Cannot restore <strong>{conflictDialog.tenant.full_name}</strong> to their previous unit:
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <p className="text-sm text-yellow-800">{conflictDialog.conflict.message}</p>
                </div>
                <p className="text-sm text-gray-600">
                  You can restore the tenant without unit assignment, and manually assign them to an available unit later.
                </p>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setConflictDialog(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceRestore}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Restore Without Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
