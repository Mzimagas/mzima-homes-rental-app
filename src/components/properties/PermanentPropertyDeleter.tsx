'use client'

import { useState, useEffect } from 'react'
import supabase from '../../lib/supabase-client'
import { useAuth } from '../../lib/auth-context'

interface SoftDeletedProperty {
  id: string
  name: string
  disabled_at: string
  disabled_by: string
  disabled_reason: string
  physical_address: string
}

interface PermanentPropertyDeleterProps {
  onSuccess?: () => void
  onCancel?: () => void
  isOpen: boolean
}

export default function PermanentPropertyDeleter({ onSuccess, onCancel, isOpen }: PermanentPropertyDeleterProps) {
  const { user } = useAuth()
  const [softDeletedProperties, setSoftDeletedProperties] = useState<SoftDeletedProperty[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set())
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
  const [deleteResults, setDeleteResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  })

  const findSoftDeletedProperties = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('id, name, disabled_at, disabled_by, disabled_reason, physical_address')
        .not('disabled_at', 'is', null) // Only soft-deleted properties
        .order('disabled_at', { ascending: false })

      if (error) {
        console.error('Error fetching soft-deleted properties:', error)
        return
      }

      setSoftDeletedProperties(properties || [])
    } catch (err) {
      console.error('Error finding soft-deleted properties:', err)
    } finally {
      setLoading(false)
    }
  }

  const permanentlyDeleteProperties = async () => {
    if (selectedForDeletion.size === 0) return

    setDeleting(true)
    setDeleteProgress({ current: 0, total: selectedForDeletion.size })
    setDeleteResults({ success: 0, failed: 0, errors: [] })
    console.log(`Starting permanent deletion of ${selectedForDeletion.size} properties...`)
    
    try {
      let successCount = 0
      let failedCount = 0
      const errors: string[] = []
      const propertyIds = Array.from(selectedForDeletion)

      for (let i = 0; i < propertyIds.length; i++) {
        const propertyId = propertyIds[i]
        setDeleteProgress({ current: i + 1, total: propertyIds.length })
        console.log(`Permanently deleting property ${i + 1}/${propertyIds.length}: ${propertyId}`)
        
        try {
          // Permanently delete from database
          const { error: deleteError } = await supabase
            .from('properties')
            .delete()
            .eq('id', propertyId)

          if (deleteError) {
            failedCount++
            const errorMsg = `Property ${propertyId}: ${deleteError.message}`
            errors.push(errorMsg)
            console.error(`✗ Failed to permanently delete property ${propertyId}:`, deleteError.message)
          } else {
            successCount++
            console.log(`✓ Successfully permanently deleted property ${propertyId}`)
          }
        } catch (err) {
          failedCount++
          const errorMsg = `Property ${propertyId}: ${err instanceof Error ? err.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`✗ Exception permanently deleting property ${propertyId}:`, err)
        }

        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      console.log(`Permanent deletion completed: ${successCount} successful, ${failedCount} failed`)
      setDeleteResults({ success: successCount, failed: failedCount, errors })
      
      // Refresh the soft-deleted properties list
      await findSoftDeletedProperties()
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

  const selectAllSoftDeleted = () => {
    const toSelect = new Set<string>()
    softDeletedProperties.forEach(prop => {
      toSelect.add(prop.id)
    })
    setSelectedForDeletion(toSelect)
  }

  useEffect(() => {
    if (isOpen && user) {
      findSoftDeletedProperties()
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
            Permanent Property Deleter
          </h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-600">Scanning for soft-deleted properties...</div>
            </div>
          ) : softDeletedProperties.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-600">No soft-deleted properties found!</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Found {softDeletedProperties.length} soft-deleted properties that can be permanently removed.
                </p>
                <button
                  onClick={selectAllSoftDeleted}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Select All Soft-Deleted
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Warning: Permanent Deletion
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>This action will permanently delete the selected properties from the database. This cannot be undone!</p>
                    </div>
                  </div>
                </div>
              </div>

              {deleting && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between text-sm text-blue-700 mb-2">
                    <span>Permanently deleting properties...</span>
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
                    ⚠️ You have selected {selectedForDeletion.size} properties for permanent deletion.
                  </p>
                  <p className="text-xs text-red-600">
                    This will permanently remove these properties from the database. This action cannot be undone!
                  </p>
                </div>
              ) : null}

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {softDeletedProperties.map((property, index) => (
                  <div key={property.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between bg-white p-3 rounded border">
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
                              <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">SOFT DELETED</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Deleted: {new Date(property.disabled_at).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              Address: {property.physical_address}
                            </div>
                            {property.disabled_reason && (
                              <div className="text-xs text-gray-500">
                                Reason: {property.disabled_reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
            {softDeletedProperties.length > 0 && (
              <button
                type="button"
                onClick={permanentlyDeleteProperties}
                disabled={deleting || selectedForDeletion.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleting ? `Permanently Deleting ${selectedForDeletion.size} properties...` : `Permanently Delete Selected (${selectedForDeletion.size})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
