'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../lib/auth-context'
import { usePropertyAccess } from '../../../../hooks/usePropertyAccess'
import getSupabaseClient from '../../../../lib/supabase-client'

const supabase = getSupabaseClient()
import Link from 'next/link'

interface DeletedProperty {
  id: string
  name: string
  physical_address?: string
  landlord_id?: string
  disabled_at: string
  disabled_by?: string
  disabled_reason?: string
  created_at: string
  units?: {
    id: string
    unit_label: string
    is_active: boolean
  }[]
}

export default function DeletedPropertiesPage() {
  const { user } = useAuth()
  const { properties } = usePropertyAccess()
  const [deletedProperties, setDeletedProperties] = useState<DeletedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)

  // Check if user has admin permissions (OWNER only for properties)
  const hasAdminAccess = properties.some((p) => p.user_role === 'OWNER')

  const fetchDeletedProperties = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all property IDs the user has OWNER access to
      const ownedPropertyIds = properties
        .filter((p) => p.user_role === 'OWNER')
        .map((p) => p.property_id)

      if (ownedPropertyIds.length === 0) {
        setDeletedProperties([])
        return
      }

      // Fetch deleted properties (those with disabled_at set)
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
          id,
          name,
          physical_address,
          landlord_id,
          disabled_at,
          disabled_by,
          disabled_reason,
          created_at,
          units (
            id,
            unit_label,
            is_active
          )
        `
        )
        .in('id', ownedPropertyIds)
        .not('disabled_at', 'is', null)
        .order('disabled_at', { ascending: false })

      if (error) {
        console.error('Error fetching deleted properties:', error)
        setError('Failed to load deleted properties')
        return
      }

      setDeletedProperties(data || [])
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (property: DeletedProperty) => {
    try {
      setRestoring(property.id)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const csrf = document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const response = await fetch(`/api/properties/${property.id}/restore`, {
        method: 'PATCH',
        headers,
        credentials: 'same-origin',
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to restore property')
      }

      // Success
      alert(`Property "${property.name}" has been restored successfully`)
      fetchDeletedProperties() // Refresh the list
    } catch (err: any) {
      console.error('Restore error:', err)
      alert(err.message || 'Failed to restore property')
    } finally {
      setRestoring(null)
    }
  }

  useEffect(() => {
    if (user && hasAdminAccess) {
      fetchDeletedProperties()
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
          <p className="text-red-700">You need OWNER permissions to access deleted properties.</p>
          <Link
            href="/dashboard/properties"
            className="text-red-600 hover:text-red-800 underline mt-2 inline-block"
          >
            ← Back to Active Properties
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deleted Properties</h1>
          <p className="text-gray-600 mt-1">Manage and restore soft-deleted property records</p>
        </div>
        <Link
          href="/dashboard/properties"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          ← Back to Active Properties
        </Link>
      </div>

      {/* Admin Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Owner Feature</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This page shows soft-deleted properties that can be restored. Restoring a property
              will reactivate it and make it available for tenant management.
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading deleted properties...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchDeletedProperties}
            className="text-red-600 hover:text-red-800 underline mt-2"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && deletedProperties.length === 0 && (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h10M7 15h10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No deleted properties</h3>
          <p className="mt-1 text-sm text-gray-500">
            All properties are currently active. Deleted properties will appear here.
          </p>
        </div>
      )}

      {!loading && !error && deletedProperties.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {deletedProperties.map((property) => (
              <li key={property.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">{property.name}</h3>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Deleted
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <p>Address: {property.physical_address || 'Not provided'}</p>
                      <p>Units: {property.units?.length || 0} total</p>
                      <p>Deleted: {new Date(property.disabled_at).toLocaleDateString()}</p>
                      {property.disabled_reason && <p>Reason: {property.disabled_reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleRestore(property)}
                      disabled={restoring === property.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {restoring === property.id ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
