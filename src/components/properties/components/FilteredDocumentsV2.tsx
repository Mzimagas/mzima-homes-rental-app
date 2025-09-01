'use client'

import { useMemo } from 'react'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { 
  getStageConfig, 
  getWorkflowType, 
  getStageFilteringSummary,
  WORKFLOW_LABELS,
  WORKFLOW_COLORS,
  getPipelineName,
  type WorkflowType 
} from '../utils/stage-filtering.utils'
import DirectAdditionDocumentsV2 from './DirectAdditionDocumentsV2'

interface FilteredDocumentsV2Props {
  propertyId: string
  propertyName: string
  property: PropertyWithLifecycle
  showFilteringInfo?: boolean
  onStageChange?: (stage: number) => void
}

/**
 * Filtered Documents Component with Automatic Stage Filtering
 * Automatically applies stage filtering based on property workflow type:
 * - Direct Addition: Stages 1-10 only
 * - Purchase Pipeline: Stages 1-10 only (overrides PIPELINE_STAGES)
 * - Handover: Stages 1-10 only (overrides HANDOVER_PIPELINE_STAGES)
 * - Subdivision: Stages 11-16 only (overrides SUBDIVISION_PIPELINE_STAGES)
 */
export default function FilteredDocumentsV2({ 
  propertyId, 
  propertyName, 
  property,
  showFilteringInfo = false,
  onStageChange 
}: FilteredDocumentsV2Props) {
  
  // Get workflow configuration with strict stage filtering
  const stageConfig = useMemo(() => getStageConfig(property), [property])
  const workflowType = stageConfig.workflowType
  const pipeline = getPipelineName(workflowType)
  
  // Get filtering summary for debugging
  const filteringSummary = useMemo(() => getStageFilteringSummary(property), [property])
  
  // Determine stage filter based on workflow type
  const stageFilter = useMemo(() => {
    switch (workflowType) {
      case 'subdivision':
        return 'stages_11_16' as const
      case 'direct_addition':
      case 'purchase_pipeline':
      case 'handover':
      default:
        return 'stages_1_10' as const
    }
  }, [workflowType])
  
  return (
    <div className="space-y-6">
      {/* Workflow Type Header with Stage Filtering Info */}
      <div className={`bg-${WORKFLOW_COLORS[workflowType]}-50 border border-${WORKFLOW_COLORS[workflowType]}-200 rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold text-${WORKFLOW_COLORS[workflowType]}-900`}>
              {WORKFLOW_LABELS[workflowType]} Documents
            </h3>
            <p className={`text-sm text-${WORKFLOW_COLORS[workflowType]}-700 mt-1`}>
              {workflowType === 'subdivision' 
                ? `Showing subdivision stages ${stageConfig.displayRange.min}-${stageConfig.displayRange.max} (${stageConfig.docTypes.length} document types)`
                : `Showing stages ${stageConfig.displayRange.min}-${stageConfig.displayRange.max} (${stageConfig.docTypes.length} document types)`
              }
            </p>
          </div>
          
          {/* Stage Range Indicator */}
          <div className={`px-3 py-1 bg-${WORKFLOW_COLORS[workflowType]}-100 text-${WORKFLOW_COLORS[workflowType]}-800 rounded-full text-sm font-medium`}>
            {workflowType === 'subdivision' 
              ? `Stages ${stageConfig.displayRange.min}-${stageConfig.displayRange.max}`
              : `Stages ${stageConfig.stageRange.min}-${stageConfig.stageRange.max}`
            }
          </div>
        </div>
        
        {/* Stage Filtering Enforcement Notice */}
        <div className={`mt-3 p-2 bg-${WORKFLOW_COLORS[workflowType]}-100 rounded text-xs`}>
          <div className="flex items-center gap-2">
            <span className="font-medium">🎯 Stage Filtering Active:</span>
            <span>
              {workflowType === 'subdivision' 
                ? 'Only subdivision documents (stages 11-16) are shown. Regular documents (stages 1-10) are hidden.'
                : 'Only regular documents (stages 1-10) are shown. Subdivision documents (stages 11-16) are hidden.'
              }
            </span>
          </div>
        </div>
      </div>
      
      {/* Debug Information (if enabled) */}
      {showFilteringInfo && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">🔍 Stage Filtering Debug Info</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Workflow Type:</span> {filteringSummary.workflowType}
            </div>
            <div>
              <span className="font-medium">Stage Range:</span> {filteringSummary.stageRange}
            </div>
            <div>
              <span className="font-medium">Display Range:</span> {filteringSummary.displayRange}
            </div>
            <div>
              <span className="font-medium">Document Count:</span> {filteringSummary.documentCount}
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Visible Documents:</span> {filteringSummary.visibleDocuments.join(', ')}
            </div>
            {filteringSummary.hiddenDocuments.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                <span className="font-medium">Hidden Documents:</span> {filteringSummary.hiddenDocuments.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Workflow-Specific Information */}
      {workflowType === 'subdivision' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-orange-600 font-medium">📋</span>
            <span className="text-sm text-orange-700">
              <strong>Subdivision Process:</strong> Complete documents for stages 1-6 to progress through the subdivision workflow. 
              These correspond to actual stages 11-16 in the system.
            </span>
          </div>
        </div>
      )}
      
      {(workflowType === 'purchase_pipeline' || workflowType === 'handover') && (
        <div className={`bg-${WORKFLOW_COLORS[workflowType]}-50 border border-${WORKFLOW_COLORS[workflowType]}-200 rounded-lg p-3`}>
          <div className="flex items-center gap-2">
            <span className={`text-${WORKFLOW_COLORS[workflowType]}-600 font-medium`}>📋</span>
            <span className={`text-sm text-${WORKFLOW_COLORS[workflowType]}-700`}>
              <strong>{WORKFLOW_LABELS[workflowType]}:</strong> Complete documents for stages 1-10 to progress through the workflow. 
              Subdivision documents are not applicable for this property type.
            </span>
          </div>
        </div>
      )}
      
      {/* Documents Component with Stage Filtering */}
      <DirectAdditionDocumentsV2
        propertyId={propertyId}
        propertyName={propertyName}
        pipeline={pipeline}
        property={property}
        stageFilter={stageFilter}
      />
    </div>
  )
}

/**
 * Hook to get workflow-aware stage information
 */
export function useWorkflowStages(property: PropertyWithLifecycle) {
  const stageConfig = useMemo(() => getStageConfig(property), [property])
  
  return {
    workflowType: stageConfig.workflowType,
    stageRange: stageConfig.stageRange,
    displayRange: stageConfig.displayRange,
    docTypes: stageConfig.docTypes,
    stageNumbers: stageConfig.stageNumbers,
    visibleStageCount: stageConfig.visibleStageCount,
    isStageVisible: (stage: number) => stageConfig.stageNumbers.includes(stage),
    getDisplayStage: (actualStage: number) => {
      if (stageConfig.workflowType === 'subdivision') {
        return actualStage - 10 // Map 11-16 to 1-6
      }
      return actualStage
    }
  }
}

/**
 * Utility component to show stage filtering status
 */
export function StageFilteringStatus({ property }: { property: PropertyWithLifecycle }) {
  const summary = getStageFilteringSummary(property)
  
  return (
    <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
      {summary.workflowType} • Stages {summary.stageRange} • {summary.documentCount} docs
    </div>
  )
}
