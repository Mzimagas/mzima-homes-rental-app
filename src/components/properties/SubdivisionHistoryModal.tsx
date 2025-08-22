'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { SubdivisionHistoryEntry, SubdivisionHistoryService } from '../../lib/services/subdivision-history'

interface SubdivisionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  propertyName: string
}

export default function SubdivisionHistoryModal({
  isOpen,
  onClose,
  propertyId,
  propertyName
}: SubdivisionHistoryModalProps) {
  const [history, setHistory] = useState<SubdivisionHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = async () => {
    if (!isOpen || !propertyId) return

    setLoading(true)
    setError(null)

    try {
      const historyData = await SubdivisionHistoryService.getSubdivisionHistory(propertyId)
      setHistory(historyData)
    } catch (err: any) {
      console.error('Error loading subdivision history:', err)
      setError(err.message || 'Failed to load subdivision history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadHistory()
    }
  }, [isOpen, propertyId])

  const getActionTypeDisplay = (actionType: string) => {
    switch (actionType) {
      case 'PLAN_CREATED':
        return { text: 'Plan Created', icon: '🏗️', color: 'text-green-700 bg-green-50' }
      case 'PLAN_MODIFIED':
        return { text: 'Plan Modified', icon: '✏️', color: 'text-blue-700 bg-blue-50' }
      case 'STATUS_CHANGED':
        return { text: 'Status Changed', icon: '🔄', color: 'text-orange-700 bg-orange-50' }
      case 'PLAN_CANCELLED':
        return { text: 'Plan Cancelled', icon: '❌', color: 'text-red-700 bg-red-50' }
      default:
        return { text: actionType, icon: '📝', color: 'text-gray-700 bg-gray-50' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Subdivision History - ${propertyName}`}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading history...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm">No subdivision history recorded yet.</p>
            <p className="text-xs text-gray-400 mt-1">History will appear here once subdivision activities begin.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {history.map((entry, index) => {
              const actionDisplay = getActionTypeDisplay(entry.action_type)
              
              return (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${actionDisplay.color}`}>
                          <span className="mr-1">{actionDisplay.icon}</span>
                          {actionDisplay.text}
                        </span>
                        {entry.subdivision_name && (
                          <span className="text-sm font-medium text-gray-900">
                            {entry.subdivision_name}
                          </span>
                        )}
                      </div>

                      {/* Status Change Details */}
                      {entry.action_type === 'STATUS_CHANGED' && (
                        <div className="mb-2 text-sm text-gray-600">
                          <span>Status: </span>
                          {entry.previous_status && (
                            <span className="text-gray-500">{entry.previous_status} → </span>
                          )}
                          <span className="font-medium text-gray-900">{entry.new_status}</span>
                        </div>
                      )}

                      {/* Plot Information */}
                      {entry.total_plots_planned && (
                        <div className="mb-2 text-sm text-gray-600">
                          <span>Planned Plots: </span>
                          <span className="font-medium">{entry.total_plots_planned}</span>
                        </div>
                      )}

                      {/* Reason */}
                      <div className="mb-2">
                        <p className="text-sm text-gray-600">
                          <strong>Reason:</strong> {entry.change_reason}
                        </p>
                      </div>

                      {/* Change Summary for Plan Modifications */}
                      {entry.action_type === 'PLAN_MODIFIED' && entry.details && (
                        <div className="mb-2">
                          <div className="text-sm">
                            <strong>Changes Made:</strong>
                            <div className="mt-1 space-y-1">
                              {(() => {
                                const changes = []



                                // Only show actual changes - compare previous vs new values
                                if (entry.details.previous_values && entry.details.new_values) {
                                  // Get all unique field names from both objects
                                  const allFields = new Set([
                                    ...Object.keys(entry.details.previous_values),
                                    ...Object.keys(entry.details.new_values)
                                  ])

                                  allFields.forEach((field: string) => {
                                    if (field === 'updated_at') return // Skip timestamp

                                    const oldValue = entry.details.previous_values[field]
                                    const newValue = entry.details.new_values[field]

                                    // Only include if values are actually different
                                    if (oldValue !== newValue) {
                                      changes.push({ field, oldValue, newValue })
                                    }
                                  })
                                }

                                // If no previous values, show new additions only
                                else if (entry.details.new_values && !entry.details.previous_values) {
                                  Object.keys(entry.details.new_values).forEach((field: string) => {
                                    if (field === 'updated_at') return // Skip timestamp

                                    const newValue = entry.details.new_values[field]
                                    if (newValue !== undefined && newValue !== null && newValue !== '') {
                                      changes.push({ field, oldValue: undefined, newValue })
                                    }
                                  })
                                }

                                return changes.map(({ field, oldValue, newValue }) => {
                                  // Format field name for display
                                  const fieldName = field
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, l => l.toUpperCase())
                                    .replace(/Kes/g, 'KES')

                                  return (
                                    <div key={field} className="text-xs bg-blue-50 p-2 rounded border">
                                      <span className="font-medium">{fieldName}:</span>
                                      <div className="flex items-center space-x-2 mt-1">
                                        {oldValue !== undefined && oldValue !== null && oldValue !== '' && oldValue !== 'Updated' ? (
                                          <>
                                            <span className="text-red-600 line-through">{String(oldValue)}</span>
                                            <span className="text-gray-400">→</span>
                                          </>
                                        ) : oldValue === undefined && newValue !== 'Updated' ? (
                                          <span className="text-gray-500 text-xs">(new)</span>
                                        ) : null}
                                        <span className="text-green-600 font-medium">
                                          {newValue !== undefined && newValue !== null && newValue !== ''
                                            ? String(newValue)
                                            : '(removed)'
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })
                              })()}

                              {/* Show message if no changes detected */}
                              {(() => {
                                const hasAnyData = entry.details.updated_fields || entry.details.new_values || entry.details.previous_values

                                if (!hasAnyData) {
                                  return (
                                    <div className="text-xs text-gray-500 italic">
                                      Subdivision plan was updated but specific changes are not available.
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 text-right">
                      <div>#{history.length - index}</div>
                    </div>
                  </div>

                  {/* Footer with user and timestamp */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-4">
                      <span>
                        👤 {entry.changed_by_name}
                      </span>
                      <span>
                        🕒 {formatDate(entry.changed_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
