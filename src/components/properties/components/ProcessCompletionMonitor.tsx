'use client'

import { useState, useEffect } from 'react'
import { PropertyWithLifecycle } from '../types/property-management.types'

interface ProcessCompletionMonitorProps {
  property: PropertyWithLifecycle
  onProcessCompleted?: () => void
}

interface CompletionStatus {
  canComplete: boolean
  reason?: string
  progress?: number
  requirements?: {
    trackerComplete: boolean
    documentsComplete: boolean
    plotsCreated?: boolean
  }
}

export default function ProcessCompletionMonitor({ 
  property, 
  onProcessCompleted 
}: ProcessCompletionMonitorProps) {
  const [subdivisionStatus, setSubdivisionStatus] = useState<CompletionStatus | null>(null)
  const [handoverStatus, setHandoverStatus] = useState<CompletionStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [autoCompleting, setAutoCompleting] = useState(false)

  // Check completion status periodically
  useEffect(() => {
    const checkCompletionStatus = async () => {
      if (property.subdivision_status === 'SUB_DIVISION_STARTED') {
        try {
          const response = await fetch(`/api/properties/${property.id}/subdivision/auto-complete`)
          if (response.ok) {
            const data = await response.json()
            setSubdivisionStatus(data)
          }
        } catch (error) {
          console.error('Error checking subdivision completion:', error)
        }
      }

      if (property.handover_status === 'IN_PROGRESS') {
        try {
          const response = await fetch(`/api/properties/${property.id}/handover/auto-complete`)
          if (response.ok) {
            const data = await response.json()
            setHandoverStatus(data)
          }
        } catch (error) {
          console.error('Error checking handover completion:', error)
        }
      }
    }

    checkCompletionStatus()
    
    // Check every 30 seconds
    const interval = setInterval(checkCompletionStatus, 30000)
    
    return () => clearInterval(interval)
  }, [property.id, property.subdivision_status, property.handover_status])

  const handleAutoComplete = async (processType: 'subdivision' | 'handover') => {
    setAutoCompleting(true)
    try {
      const response = await fetch(`/api/properties/${property.id}/${processType}/auto-complete`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success && result.completed) {
        alert(`${processType === 'subdivision' ? 'Subdivision' : 'Handover'} completed automatically! ${result.message}`)
        onProcessCompleted?.()
      } else {
        alert(`Cannot complete ${processType}: ${result.reason || result.error}`)
      }
    } catch (error) {
      console.error(`Error auto-completing ${processType}:`, error)
      alert(`Failed to auto-complete ${processType}`)
    } finally {
      setAutoCompleting(false)
    }
  }

  const renderCompletionStatus = (
    status: CompletionStatus, 
    processType: 'subdivision' | 'handover'
  ) => {
    if (!status) return null

    const { canComplete, reason, progress, requirements } = status

    return (
      <div className={`border rounded-lg p-4 ${canComplete ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 capitalize">
            {processType} Completion Status
          </h4>
          {canComplete && (
            <button
              onClick={() => handleAutoComplete(processType)}
              disabled={autoCompleting}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            >
              {autoCompleting ? 'Completing...' : 'Complete Now'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Progress:</span>
            <span className="text-sm font-medium">{progress || 0}%</span>
          </div>

          {requirements && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>Tracker Complete:</span>
                <span className={requirements.trackerComplete ? 'text-green-600' : 'text-red-600'}>
                  {requirements.trackerComplete ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Documents Approved:</span>
                <span className={requirements.documentsComplete ? 'text-green-600' : 'text-red-600'}>
                  {requirements.documentsComplete ? '✓' : '✗'}
                </span>
              </div>
              {processType === 'subdivision' && requirements.plotsCreated !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span>Plots Created:</span>
                  <span className={requirements.plotsCreated ? 'text-green-600' : 'text-red-600'}>
                    {requirements.plotsCreated ? '✓' : '✗'}
                  </span>
                </div>
              )}
            </div>
          )}

          {!canComplete && reason && (
            <div className="text-sm text-amber-700 mt-2">
              <strong>Blocking reason:</strong> {reason}
            </div>
          )}

          {canComplete && (
            <div className="text-sm text-green-700 mt-2">
              <strong>Ready for completion!</strong> All requirements met.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Only show if processes are active
  const showSubdivision = property.subdivision_status === 'SUB_DIVISION_STARTED'
  const showHandover = property.handover_status === 'IN_PROGRESS'

  if (!showSubdivision && !showHandover) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Process Completion Monitor</h3>
        <div className="text-sm text-gray-500">
          Auto-checks every 30 seconds
        </div>
      </div>

      {showSubdivision && subdivisionStatus && renderCompletionStatus(subdivisionStatus, 'subdivision')}
      {showHandover && handoverStatus && renderCompletionStatus(handoverStatus, 'handover')}

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <strong>Process-Driven Workflow:</strong> Processes can only be started manually. 
        Completion happens automatically when all requirements are met:
        <ul className="mt-1 ml-4 list-disc">
          <li><strong>Subdivision:</strong> Tracker 100% + Documents approved + Plots created</li>
          <li><strong>Handover:</strong> Tracker 100% + Documents approved</li>
        </ul>
      </div>
    </div>
  )
}
