'use client'

import { useMemo } from 'react'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { 
  getWorkflowType, 
  calculateWorkflowProgress,
  getStageConfig,
  WORKFLOW_LABELS,
  WORKFLOW_COLORS,
  type WorkflowType 
} from '../utils/stage-filtering.utils'

interface WorkflowProgressIndicatorProps {
  propertyId: string
  propertyName: string
  property?: PropertyWithLifecycle
  workflowType?: WorkflowType
  documentStates: Record<string, any>
  className?: string
  showDetails?: boolean
}

/**
 * Workflow-aware progress indicator that calculates completion based on filtered document types
 * Automatically adjusts progress calculation based on workflow type:
 * - Regular workflows: Progress out of stages 1-10 documents
 * - Subdivision workflow: Progress out of stages 10-16 documents (displayed as 1-7)
 */
export default function WorkflowProgressIndicator({
  propertyId,
  propertyName,
  property,
  workflowType: explicitWorkflowType,
  documentStates,
  className = '',
  showDetails = true
}: WorkflowProgressIndicatorProps) {
  
  // Determine workflow type
  const workflowType = useMemo(() => {
    if (explicitWorkflowType) return explicitWorkflowType
    if (property) return getWorkflowType(property)
    return 'direct_addition' // fallback
  }, [explicitWorkflowType, property])

  // Calculate workflow-aware progress
  const stats = useMemo(() => {
    return calculateWorkflowProgress(documentStates, workflowType)
  }, [documentStates, workflowType])

  // Get stage configuration for display
  const stageConfig = useMemo(() => {
    if (property) return getStageConfig(property)
    return null
  }, [property])

  const workflowLabel = WORKFLOW_LABELS[workflowType] || 'Property Documents'
  const workflowColor = WORKFLOW_COLORS[workflowType] || 'emerald'

  return (
    <div className={`bg-gradient-to-br from-${workflowColor}-50 via-teal-50 to-cyan-50 border border-${workflowColor}-200 rounded-xl p-4 sm:p-6 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
            📄 {workflowLabel}
          </h3>
          <p className="text-sm text-gray-600">{propertyName}</p>
          {stageConfig && showDetails && (
            <p className="text-xs text-gray-500 mt-1">
              {workflowType === 'subdivision' 
                ? `Subdivision stages ${stageConfig.displayRange.min}-${stageConfig.displayRange.max}`
                : `Stages ${stageConfig.stageRange.min}-${stageConfig.stageRange.max}`
              }
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-2xl sm:text-3xl font-bold text-${workflowColor}-600`}>
              {stats.percentage}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-xl font-semibold text-gray-700">
              {stats.completed}/{stats.total}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Required</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div
          className={`bg-gradient-to-r from-${workflowColor}-500 to-teal-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm`}
          style={{ width: `${stats.percentage}%` }}
        ></div>
      </div>

      {/* Progress Status */}
      <div className="flex items-center gap-2 text-sm">
        {stats.percentage === 100 ? (
          <>
            <span className={`text-${workflowColor}-600`}>✅</span>
            <span className={`text-${workflowColor}-700 font-medium`}>
              All required documents uploaded!
            </span>
          </>
        ) : (
          <>
            <span className="text-blue-500">⏳</span>
            <span className="text-gray-600">
              {stats.total - stats.completed} more document
              {stats.total - stats.completed !== 1 ? 's' : ''} needed
            </span>
          </>
        )}
      </div>

      {/* Workflow-specific information */}
      {showDetails && (
        <div className="mt-3 text-xs text-gray-500">
          {workflowType === 'subdivision' && (
            <span>📋 Subdivision process: {stats.total} documents required for completion</span>
          )}
          {workflowType !== 'subdivision' && (
            <span>📋 {workflowLabel}: {stats.total} documents required for completion</span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Compact version of the progress indicator for use in smaller spaces
 */
export function CompactWorkflowProgress({
  workflowType,
  documentStates,
  className = ''
}: {
  workflowType: WorkflowType
  documentStates: Record<string, any>
  className?: string
}) {
  const stats = useMemo(() => {
    return calculateWorkflowProgress(documentStates, workflowType)
  }, [documentStates, workflowType])

  const workflowColor = WORKFLOW_COLORS[workflowType] || 'emerald'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${workflowColor}-500 h-2 rounded-full transition-all duration-300`}
          style={{ width: `${stats.percentage}%` }}
        ></div>
      </div>
      <span className="text-sm font-medium text-gray-700">
        {stats.completed}/{stats.total}
      </span>
      <span className={`text-sm font-bold text-${workflowColor}-600`}>
        {stats.percentage}%
      </span>
    </div>
  )
}

/**
 * Hook for getting workflow-aware progress statistics
 */
export function useWorkflowProgress(
  documentStates: Record<string, any>,
  workflowType: WorkflowType
) {
  return useMemo(() => {
    return calculateWorkflowProgress(documentStates, workflowType)
  }, [documentStates, workflowType])
}
