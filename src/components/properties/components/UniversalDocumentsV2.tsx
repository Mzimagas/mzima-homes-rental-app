'use client'

import { useState, useEffect, useMemo } from 'react'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { 
  getStageConfig, 
  getWorkflowType, 
  getDisplayStageNumber,
  WORKFLOW_LABELS,
  WORKFLOW_COLORS,
  type WorkflowType 
} from '../utils/stage-filtering.utils'
import DirectAdditionDocumentsV2 from './DirectAdditionDocumentsV2'

interface UniversalDocumentsV2Props {
  propertyId: string
  propertyName: string
  property: PropertyWithLifecycle
  onStageChange?: (stage: number) => void
}

/**
 * Universal Documents Component with Dynamic Stage Filtering
 * Automatically shows relevant stages based on property workflow type
 */
export default function UniversalDocumentsV2({ 
  propertyId, 
  propertyName, 
  property,
  onStageChange 
}: UniversalDocumentsV2Props) {
  const [currentStage, setCurrentStage] = useState<number>(1)
  
  // Get workflow configuration
  const stageConfig = useMemo(() => getStageConfig(property), [property])
  const workflowType = stageConfig.workflowType
  
  // Handle stage changes
  const handleStageChange = (stage: number) => {
    setCurrentStage(stage)
    onStageChange?.(stage)
  }
  
  // Get workflow-specific pipeline name
  const getPipelineName = (workflowType: WorkflowType): string => {
    switch (workflowType) {
      case 'purchase_pipeline':
        return 'purchase_pipeline'
      case 'handover':
        return 'handover'
      case 'subdivision':
        return 'subdivision'
      case 'direct_addition':
      default:
        return 'direct_addition'
    }
  }
  
  const pipeline = getPipelineName(workflowType)
  
  return (
    <div className="space-y-6">
      {/* Workflow Type Header */}
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
            Stages {stageConfig.displayRange.min}-{stageConfig.displayRange.max}
          </div>
        </div>
      </div>
      
      {/* Documents Component */}
      {workflowType === 'subdivision' ? (
        // For subdivision, we need a specialized component or enhanced DirectAdditionDocumentsV2
        <SubdivisionDocumentsWrapper
          propertyId={propertyId}
          propertyName={propertyName}
          stageConfig={stageConfig}
          onStageChange={handleStageChange}
        />
      ) : (
        // For other workflows, use existing DirectAdditionDocumentsV2
        <DirectAdditionDocumentsV2
          propertyId={propertyId}
          propertyName={propertyName}
          pipeline={pipeline}
        />
      )}
    </div>
  )
}

/**
 * Wrapper component for subdivision documents
 * This handles the stage 11-16 → 1-6 mapping
 */
interface SubdivisionDocumentsWrapperProps {
  propertyId: string
  propertyName: string
  stageConfig: ReturnType<typeof getStageConfig>
  onStageChange: (stage: number) => void
}

function SubdivisionDocumentsWrapper({ 
  propertyId, 
  propertyName, 
  stageConfig,
  onStageChange 
}: SubdivisionDocumentsWrapperProps) {
  // For now, use DirectAdditionDocumentsV2 with subdivision pipeline
  // In the future, this could be a specialized SubdivisionDocumentsV2 component
  return (
    <div className="space-y-4">
      {/* Stage Mapping Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-orange-600 font-medium">📋</span>
          <span className="text-sm text-orange-700">
            Subdivision Process: Complete documents for stages 1-6 to progress through the subdivision workflow
          </span>
        </div>
      </div>
      
      {/* Use DirectAdditionDocumentsV2 with subdivision pipeline */}
      <DirectAdditionDocumentsV2
        propertyId={propertyId}
        propertyName={propertyName}
        pipeline="subdivision"
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
    getDisplayStage: (actualStage: number) => getDisplayStageNumber(actualStage, stageConfig.workflowType),
    isStageVisible: (stage: number) => stageConfig.stageNumbers.includes(stage)
  }
}
