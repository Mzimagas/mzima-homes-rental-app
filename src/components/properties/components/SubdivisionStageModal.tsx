'use client'

import { useState } from 'react'
import { Button } from '../../ui'
import Modal from '../../ui/Modal'
import { 
  SUBDIVISION_PIPELINE_STAGES,
  SubdivisionPipelineStageData
} from '../types/property-management.types'

interface SubdivisionStageModalProps {
  isOpen: boolean
  onClose: () => void
  stageId: number
  subdivisionId: string
  stageData?: SubdivisionPipelineStageData
  onStageUpdate: (subdivisionId: string, stageId: number, newStatus: string, notes?: string) => Promise<void>
}

const getSubdivisionStageById = (stageId: number) => {
  return SUBDIVISION_PIPELINE_STAGES.find(stage => stage.id === stageId)
}

export default function SubdivisionStageModal({
  isOpen,
  onClose,
  stageId,
  subdivisionId,
  stageData,
  onStageUpdate
}: SubdivisionStageModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(stageData?.status || 'Not Started')
  const [notes, setNotes] = useState(stageData?.notes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stage = getSubdivisionStageById(stageId)
  if (!stage) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onStageUpdate(subdivisionId, stageId, selectedStatus, notes)
      onClose()
    } catch (error) {
      console.error('Error updating subdivision stage:', error)
      alert('Failed to update subdivision stage')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Stage ${stage.id}: ${stage.name}`}
    >
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
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="font-medium text-gray-700">Status:</span>{' '}
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Add any notes about this stage..."
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Updating...' : 'Update Stage'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
