'use client'

import { useState } from 'react'
import { Button } from '../../ui'
import Modal from '../../ui/Modal'
import { HANDOVER_PIPELINE_STAGES } from '../types/property-management.types'

interface HandoverStageModalProps {
  isOpen: boolean
  onClose: () => void
  stageId: number
  handoverId: string
  stageData: any
  onStageUpdate: (
    handoverId: string,
    stageId: number,
    newStatus: string,
    notes?: string
  ) => Promise<void>
}

export default function HandoverStageModal({
  isOpen,
  onClose,
  stageId,
  handoverId,
  stageData,
  onStageUpdate,
}: HandoverStageModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(stageData?.status || 'Not Started')
  const [notes, setNotes] = useState(stageData?.notes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stage = HANDOVER_PIPELINE_STAGES.find((s) => s.id === stageId)
  if (!stage) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onStageUpdate(handoverId, stageId, selectedStatus, notes)
      onClose()
    } catch (error) {
      console.error('Error updating handover stage:', error)
      alert('Failed to update handover stage')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stage ${stage.id}: ${stage.name}`}>
      <div className="space-y-6">
        {/* Stage Description */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Stage Description</h4>
          <p className="text-gray-700">{stage.description}</p>
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Estimated Duration:</span> {stage.estimatedDays} days
          </div>
        </div>

        {/* Current Status */}
        {stageData && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Status:</span>{' '}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    stageData.status === 'Completed' ||
                    stageData.status === 'Verified' ||
                    stageData.status === 'Finalized'
                      ? 'bg-green-100 text-green-800'
                      : stageData.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {stageData.status}
                </span>
              </div>
              {stageData.started_date && (
                <div>
                  <span className="font-medium text-gray-700">Started:</span>{' '}
                  {new Date(stageData.started_date).toLocaleDateString()}
                </div>
              )}
              {stageData.completed_date && (
                <div>
                  <span className="font-medium text-gray-700">Completed:</span>{' '}
                  {new Date(stageData.completed_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Update Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {stage.statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Add notes about this handover stage..."
              disabled={isSubmitting}
            />
          </div>

          {/* Required Fields Info */}
          {stage.requiredFields && stage.requiredFields.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Required Information</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {stage.requiredFields.map((field) => (
                  <li key={field} className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Stage'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
