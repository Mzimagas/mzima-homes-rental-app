/**
 * Stage Filtering Utilities
 * Handles dynamic stage filtering based on property workflow type
 */

import { DOC_TYPES, type DocTypeKey } from '../../../lib/constants/document-types'
import { PropertyWithLifecycle } from '../types/property-management.types'

export type WorkflowType = 'direct_addition' | 'purchase_pipeline' | 'handover' | 'subdivision'

/**
 * Determine workflow type from property data
 */
export function getWorkflowType(property: PropertyWithLifecycle): WorkflowType {
  // Check subdivision status first (highest priority)
  if (property.subdivision_status && property.subdivision_status !== 'NOT_STARTED') {
    return 'subdivision'
  }
  
  // Check handover status
  if (property.handover_status && property.handover_status !== 'NOT_STARTED') {
    return 'handover'
  }
  
  // Check property source
  if (property.property_source === 'PURCHASE_PIPELINE') {
    return 'purchase_pipeline'
  }
  
  // Default to direct addition
  return 'direct_addition'
}

/**
 * Get stage range for workflow type
 */
export function getStageRange(workflowType: WorkflowType): { min: number; max: number } {
  switch (workflowType) {
    case 'direct_addition':
    case 'purchase_pipeline':
    case 'handover':
      return { min: 1, max: 10 }
    case 'subdivision':
      return { min: 11, max: 16 }
    default:
      return { min: 1, max: 10 }
  }
}

/**
 * Filter document types based on workflow type
 */
export function getFilteredDocTypes(workflowType: WorkflowType): typeof DOC_TYPES {
  const stageRange = getStageRange(workflowType)
  
  if (workflowType === 'subdivision') {
    // Return only subdivision-specific document types (stages 11-16)
    return DOC_TYPES.filter(docType => {
      const subdivisionDocKeys: DocTypeKey[] = [
        'minutes_decision_subdivision',
        'search_certificate_subdivision', 
        'lcb_consent_subdivision',
        'mutation_forms',
        'beaconing_docs',
        'title_registration_subdivision'
      ]
      return subdivisionDocKeys.includes(docType.key)
    })
  } else {
    // Return regular document types (stages 1-10)
    return DOC_TYPES.filter(docType => {
      const subdivisionDocKeys: DocTypeKey[] = [
        'minutes_decision_subdivision',
        'search_certificate_subdivision',
        'lcb_consent_subdivision', 
        'mutation_forms',
        'beaconing_docs',
        'title_registration_subdivision'
      ]
      return !subdivisionDocKeys.includes(docType.key)
    })
  }
}

/**
 * Get stage numbers for workflow type
 */
export function getStageNumbers(workflowType: WorkflowType): number[] {
  const range = getStageRange(workflowType)
  return Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i)
}

/**
 * Check if stage should be visible for workflow type
 */
export function isStageVisible(stageNumber: number, workflowType: WorkflowType): boolean {
  const range = getStageRange(workflowType)
  return stageNumber >= range.min && stageNumber <= range.max
}

/**
 * Map subdivision stage numbers to display numbers (11-16 → 1-6)
 */
export function getDisplayStageNumber(actualStage: number, workflowType: WorkflowType): number {
  if (workflowType === 'subdivision') {
    // Map stages 11-16 to display as 1-6
    return actualStage - 10
  }
  return actualStage
}

/**
 * Map display stage number back to actual stage number
 */
export function getActualStageNumber(displayStage: number, workflowType: WorkflowType): number {
  if (workflowType === 'subdivision') {
    // Map display stages 1-6 back to actual stages 11-16
    return displayStage + 10
  }
  return displayStage
}

/**
 * Get workflow-specific stage configuration
 */
export interface StageConfig {
  workflowType: WorkflowType
  stageRange: { min: number; max: number }
  displayRange: { min: number; max: number }
  docTypes: typeof DOC_TYPES
  stageNumbers: number[]
}

export function getStageConfig(property: PropertyWithLifecycle): StageConfig {
  const workflowType = getWorkflowType(property)
  const stageRange = getStageRange(workflowType)
  const docTypes = getFilteredDocTypes(workflowType)
  const stageNumbers = getStageNumbers(workflowType)
  
  const displayRange = workflowType === 'subdivision' 
    ? { min: 1, max: 6 }  // Display stages 11-16 as 1-6
    : stageRange
  
  return {
    workflowType,
    stageRange,
    displayRange,
    docTypes,
    stageNumbers
  }
}

/**
 * Workflow type labels for UI
 */
export const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  direct_addition: 'Direct Addition',
  purchase_pipeline: 'Purchase Pipeline', 
  handover: 'Property Handover',
  subdivision: 'Subdivision Process'
}

/**
 * Workflow type colors for UI consistency
 */
export const WORKFLOW_COLORS: Record<WorkflowType, string> = {
  direct_addition: 'blue',
  purchase_pipeline: 'green',
  handover: 'purple', 
  subdivision: 'orange'
}
