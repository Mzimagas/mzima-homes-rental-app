'use client'

import { useState, useEffect } from 'react'
import supabase from '../../lib/supabase-client'
import { useAuth } from '../../lib/auth-context'

interface DuplicateGroup {
  name: string
  properties: Array<{
    id: string
    name: string
    created_at: string
    physical_address: string
  }>
}

interface DuplicatePropertyCleanerProps {
  onSuccess?: () => void
  onCancel?: () => void
  isOpen: boolean
}

export default function DuplicatePropertyCleaner({ onSuccess, onCancel, isOpen }: DuplicatePropertyCleanerProps) {
  const { user } = useAuth()
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set())
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
  const [deleteResults, setDeleteResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  })

  const findDuplicates = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get all properties created in the last 24 hours (likely bulk imports)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { data: properties, error } = await supabase
        .from('properties')
        .select('id, name, created_at, physical_address, property_type')
        .is('disabled_at', null) // Only active properties
        .gte('created_at', yesterday.toISOString()) // Recent properties
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching properties:', error)
        return
      }

      // For bulk cleanup, show all recent land properties (not just duplicates)
      if (properties && properties.length > 0) {
        // Group all recent properties as one "group" for bulk deletion
        const allRecentGroup: DuplicateGroup = {
          name: "Recent Land Properties (Last 24 Hours)",
          properties: properties.map(p => ({
            id: p.id,
            name: p.name,
            created_at: p.created_at,
            physical_address: p.physical_address || ''
          }))
        }
        setDuplicates([allRecentGroup])
      } else {
        setDuplicates([])
      }
    } catch (err) {
      console.error('Error finding duplicates:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteSelectedProperties = async () => {
    if (selectedForDeletion.size === 0) return

    setDeleting(true)
    setDeleteProgress({ current: 0, total: selectedForDeletion.size })
    setDeleteResults({ success: 0, failed: 0, errors: [] })
    console.log(`Starting deletion of ${selectedForDeletion.size} properties...`)

    try {
      let successCount = 0
      let failedCount = 0
      const errors: string[] = []
      const propertyIds = Array.from(selectedForDeletion)

      for (let i = 0; i < propertyIds.length; i++) {
        const propertyId = propertyIds[i]
        setDeleteProgress({ current: i + 1, total: propertyIds.length })
        console.log(`Deleting property ${i + 1}/${propertyIds.length}: ${propertyId}`)

        try {
          // Try direct Supabase update first (simpler approach)
          console.log(`Soft-deleting property ${propertyId} via Supabase`)
          const { error: updateError } = await supabase
            .from('properties')
            .update({
              disabled_at: new Date().toISOString(),
              disabled_by: user.id,
              disabled_reason: 'Soft deleted - duplicate cleanup'
            })
            .eq('id', propertyId)

          if (updateError) {
            console.log(`Supabase update failed, trying API route...`)
            // Fallback to API route
            const { data: { session } } = await supabase.auth.getSession()
            const csrf = document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''

            console.log(`Making DELETE request for property ${propertyId}`)
            const response = await fetch(`/api/properties/${propertyId}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrf,
                'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
              },
              credentials: 'same-origin'
            })

            console.log(`Response for ${propertyId}:`, response.status, response.statusText)

            if (response.ok) {
              successCount++
              console.log(`✓ Successfully deleted property ${propertyId} via API`)
            } else {
              failedCount++
              const errorText = await response.text()
              const errorMsg = `Property ${propertyId}: ${response.status} ${errorText}`
              errors.push(errorMsg)
              console.error(`✗ Failed to delete property ${propertyId}:`, response.status, errorText)
            }
          } else {
            // Supabase update succeeded
            successCount++
            console.log(`✓ Successfully soft-deleted property ${propertyId} via Supabase`)
          }
        } catch (err) {
          failedCount++
          const errorMsg = `Property ${propertyId}: ${err instanceof Error ? err.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`✗ Exception deleting property ${propertyId}:`, err)
        }

        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      console.log(`Deletion completed: ${successCount} successful, ${failedCount} failed`)
      setDeleteResults({ success: successCount, failed: failedCount, errors })

      // Refresh the duplicates list
      await findDuplicates()
      setSelectedForDeletion(new Set())

      if (successCount > 0 && onSuccess) {
        onSuccess()
      }
    } finally {
      setDeleting(false)
      setDeleteProgress({ current: 0, total: 0 })
    }
  }

  const toggleSelection = (propertyId: string) => {
    const newSelection = new Set(selectedForDeletion)
    if (newSelection.has(propertyId)) {
      newSelection.delete(propertyId)
    } else {
      newSelection.add(propertyId)
    }
    setSelectedForDeletion(newSelection)
  }

  const selectAllRecentProperties = () => {
    const toSelect = new Set<string>()
    duplicates.forEach(group => {
      // Select all properties in recent imports
      group.properties.forEach(prop => {
        toSelect.add(prop.id)
      })
    })
    setSelectedForDeletion(toSelect)
  }

  useEffect(() => {
    if (isOpen && user) {
      findDuplicates()
    }
  }, [isOpen, user])

  if (!isOpen) return null

  if (!user) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Required</h3>
            <p className="text-sm text-gray-600 mb-4">Please log in to manage properties.</p>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Property Cleaner
          </h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-600">Scanning for recent properties...</div>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-600">No recent properties found!</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Found {duplicates.reduce((sum, group) => sum + group.properties.length, 0)} recent properties created in the last 24 hours.
                </p>
                <button
                  onClick={selectAllRecentProperties}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Select All Recent Properties
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {duplicates.map((group, groupIndex) => (
                  <div key={groupIndex} className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-3">{group.name} ({group.properties.length} properties)</h4>
                    <div className="space-y-2">
                      {group.properties.map((property, index) => (
                        <div key={property.id} className="flex items-center justify-between bg-white p-3 rounded border">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedForDeletion.has(property.id)}
                                onChange={() => toggleSelection(property.id)}
                                className="rounded"
                              />
                              <div>
                                <div className="text-sm font-medium">
                                  {property.name}
                                  <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">RECENT</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Created: {new Date(property.created_at).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Address: {property.physical_address}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {deleting && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between text-sm text-blue-700 mb-2">
                    <span>Deleting properties...</span>
                    <span>{deleteProgress.current} / {deleteProgress.total}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {deleteResults.success > 0 || deleteResults.failed > 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm">
                    <div className="text-green-600">✓ Successfully deleted: {deleteResults.success} properties</div>
                    {deleteResults.failed > 0 && (
                      <div className="text-red-600">✗ Failed: {deleteResults.failed} properties</div>
                    )}
                  </div>
                  {deleteResults.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">View errors</summary>
                      <div className="mt-1 text-xs text-red-600 space-y-1">
                        {deleteResults.errors.map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ) : selectedForDeletion.size > 0 && !deleting ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 mb-2">
                    ⚠️ You have selected {selectedForDeletion.size} properties for deletion.
                  </p>
                  <p className="text-xs text-red-600">
                    This will soft-delete the selected properties. They can be restored later if needed.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Close
            </button>
            {duplicates.length > 0 && (
              <button
                type="button"
                onClick={deleteSelectedProperties}
                disabled={deleting || selectedForDeletion.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleting ? `Deleting ${selectedForDeletion.size} properties...` : `Delete Selected (${selectedForDeletion.size})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
