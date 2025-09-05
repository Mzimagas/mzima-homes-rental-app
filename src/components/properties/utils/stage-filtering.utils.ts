/**
 * Stage Filtering Utilities
 * Handles dynamic stage filtering based on property workflow type
 * Enforces strict stage ranges: 1-10 for regular workflows, 11-16 for subdivision
 */

import { DOC_TYPES, type DocTypeKey } from '../../../lib/constants/document-types'
import { PropertyWithLifecycle } from '../types/property-management.types'

export type WorkflowType = 'direct_addition' | 'purchase_pipeline' | 'handover' | 'subdivision'

/**
 * Subdivision-specific document keys (stages 10-16, displayed as 1-7)
 * Stage 10 (registered title) is the prerequisite first step for subdivision
 */
export const SUBDIVISION_DOC_KEYS: DocTypeKey[] = [
  'registered_title',  // Stage 10 -> Display Stage 1 (PREREQUISITE: Must have title to subdivide)
  'minutes_decision_subdivision',
  'search_certificate_subdivision',
  'lcb_consent_subdivision',
  'mutation_forms',
  'beaconing_docs',
  'title_registration_subdivision'
]

/**
 * Regular workflow document keys (stages 1-10)
 * Note: registered_title (stage 10) appears in BOTH regular and subdivision workflows
 */
export const REGULAR_DOC_KEYS: DocTypeKey[] = DOC_TYPES
  .filter(docType => {
    // Exclude subdivision-only docs, but keep registered_title for both workflows
    const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter(key => key !== 'registered_title')
    return !subdivisionOnlyDocs.includes(docType.key)
  })
  .map(docType => docType.key)

/**
 * Determine workflow type from property data
 * Priority: subdivision_status > handover_status > property_source
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
 * Get stage range for workflow type (STRICT ENFORCEMENT)
 * Overrides any existing stage definitions in constants
 */
export function getStageRange(workflowType: WorkflowType): { min: number; max: number } {
  switch (workflowType) {
    case 'direct_addition':
    case 'purchase_pipeline':
    case 'handover':
      // STRICT: Always stages 1-10 regardless of existing constants
      return { min: 1, max: 10 }
    case 'subdivision':
      // STRICT: Always stages 10-16 (includes title deed prerequisite) regardless of existing constants
      return { min: 10, max: 16 }
    default:
      return { min: 1, max: 10 }
  }
}

/**
 * Filter document types based on workflow type
 * Enforces strict document filtering by stage ranges
 * Note: registered_title (stage 10) appears in BOTH workflows
 */
export function getFilteredDocTypes(workflowType: WorkflowType): typeof DOC_TYPES {
  if (workflowType === 'subdivision') {
    // Return subdivision-specific document types (stages 10-16)
    return DOC_TYPES.filter(docType => SUBDIVISION_DOC_KEYS.includes(docType.key))
  } else {
    // Return regular document types (stages 1-10) - hide subdivision-only docs
    const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter(key => key !== 'registered_title')
    return DOC_TYPES.filter(docType => !subdivisionOnlyDocs.includes(docType.key))
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
 * Map subdivision stage numbers to display numbers (10-16 → 1-7)
 */
export function getDisplayStageNumber(actualStage: number, workflowType: WorkflowType): number {
  if (workflowType === 'subdivision') {
    // Map stages 10-16 to display as 1-7
    return actualStage - 9
  }
  return actualStage
}

/**
 * Map display stage number back to actual stage number
 */
export function getActualStageNumber(displayStage: number, workflowType: WorkflowType): number {
  if (workflowType === 'subdivision') {
    // Map display stages 1-7 back to actual stages 10-16
    return displayStage + 9
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
  visibleStageCount: number
}

export function getStageConfig(property: PropertyWithLifecycle): StageConfig {
  const workflowType = getWorkflowType(property)
  const stageRange = getStageRange(workflowType)
  const docTypes = getFilteredDocTypes(workflowType)
  const stageNumbers = getStageNumbers(workflowType)

  const displayRange = workflowType === 'subdivision'
    ? { min: 1, max: 7 }  // Display stages 10-16 as 1-7
    : stageRange

  return {
    workflowType,
    stageRange,
    displayRange,
    docTypes,
    stageNumbers,
    visibleStageCount: stageNumbers.length
  }
}

/**
 * Override pipeline stage constants based on workflow type
 * This ensures strict enforcement of stage ranges
 */
export function getOverriddenStageRange(workflowType: WorkflowType): number[] {
  const range = getStageRange(workflowType)

  // Always return the enforced range, ignoring existing constants
  return Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i)
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

/**
 * Get pipeline name for API calls based on workflow type
 */
export function getPipelineName(workflowType: WorkflowType): string {
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

/**
 * Validate if a document type is allowed for the workflow
 */
export function isDocTypeAllowedForWorkflow(docTypeKey: DocTypeKey, workflowType: WorkflowType): boolean {
  const allowedDocTypes = getFilteredDocTypes(workflowType)
  return allowedDocTypes.some(docType => docType.key === docTypeKey)
}

/**
 * Calculate workflow-aware document completion statistics
 * Uses filtered document types based on workflow, including ALL documents (required + optional)
 * Optional documents can be marked as N/A and count toward completion
 */
export function calculateWorkflowProgress(
  documentStates: Record<string, any>,
  workflowType: WorkflowType
): { completed: number; total: number; percentage: number } {
  const filteredDocTypes = getFilteredDocTypes(workflowType)
  // Include ALL documents (required + optional) since optional can be marked N/A
  const allDocs = filteredDocTypes

  const completedDocs = allDocs.filter((dt) => {
    const state = documentStates[dt.key]
    return state?.status?.is_na || (state?.documents?.length || 0) > 0
  })

  return {
    completed: completedDocs.length,
    total: allDocs.length,
    percentage: allDocs.length > 0 ? Math.round((completedDocs.length / allDocs.length) * 100) : 0,
  }
}

/**
 * Property filter types and utilities for enhanced filtering
 */
export type PropertyPipelineFilter = 'all' | 'direct_addition' | 'purchase_pipeline' | 'subdivision' | 'handover'
export type PropertyStatusFilter = 'all' | 'active' | 'inactive' | 'pending' | 'completed'

export interface PropertyFilters {
  pipeline: PropertyPipelineFilter
  status: PropertyStatusFilter
  propertyTypes: string[]
  searchTerm: string
  dateRange?: {
    start: Date | null
    end: Date | null
  }
}

/**
 * Get pipeline type for filtering purposes
 */
export function getPropertyPipelineType(property: PropertyWithLifecycle): PropertyPipelineFilter {
  const workflowType = getWorkflowType(property)

  // Debug logging to help identify filtering issues
  if (property.property_source === 'PURCHASE_PIPELINE') {
    console.log('🔍 Purchase pipeline property detected:', {
      id: property.id,
      name: property.name,
      property_source: property.property_source,
      workflowType,
      subdivision_status: property.subdivision_status,
      handover_status: property.handover_status
    })
  }

  switch (workflowType) {
    case 'subdivision':
      return 'subdivision'
    case 'handover':
      return 'handover'
    case 'purchase_pipeline':
      return 'purchase_pipeline'
    case 'direct_addition':
    default:
      return 'direct_addition'
  }
}

/**
 * Get property status for filtering purposes
 */
export function getPropertyStatusForFilter(property: PropertyWithLifecycle): PropertyStatusFilter {
  // Check if property is in an active pipeline
  if (property.subdivision_status === 'SUB_DIVISION_STARTED') {
    return 'active'
  }

  if (property.handover_status === 'IN_PROGRESS') {
    return 'active'
  }

  // Check if property is completed
  if (property.subdivision_status === 'SUBDIVIDED') {
    return 'completed'
  }

  if (property.handover_status === 'COMPLETED') {
    return 'completed'
  }

  // Check if property is pending
  if (property.lifecycle_status === 'PENDING_PURCHASE') {
    return 'pending'
  }

  // Default to active for properties in normal state
  return 'active'
}

/**
 * Filter properties based on pipeline type
 */
export function filterByPipeline(properties: PropertyWithLifecycle[], pipelineFilter: PropertyPipelineFilter): PropertyWithLifecycle[] {
  if (pipelineFilter === 'all') {
    return properties
  }

  const filtered = properties.filter(property => {
    const propertyPipeline = getPropertyPipelineType(property)
    const matches = propertyPipeline === pipelineFilter

    // Debug logging for purchase pipeline filtering
    if (pipelineFilter === 'purchase_pipeline') {
      console.log('🔍 Purchase pipeline filter check:', {
        propertyId: property.id,
        propertyName: property.name,
        property_source: property.property_source,
        propertyPipeline,
        pipelineFilter,
        matches
      })
    }

    return matches
  })

  // Log filter results
  if (pipelineFilter === 'purchase_pipeline') {
    console.log('🔍 Purchase pipeline filter results:', {
      totalProperties: properties.length,
      filteredProperties: filtered.length,
      purchaseProperties: properties.filter(p => p.property_source === 'PURCHASE_PIPELINE').length
    })
  }

  return filtered
}

/**
 * Filter properties based on status
 */
export function filterByStatus(properties: PropertyWithLifecycle[], statusFilter: PropertyStatusFilter): PropertyWithLifecycle[] {
  if (statusFilter === 'all') {
    return properties
  }

  return properties.filter(property => {
    const propertyStatus = getPropertyStatusForFilter(property)
    return propertyStatus === statusFilter
  })
}

/**
 * Filter properties based on property types
 */
export function filterByPropertyTypes(properties: PropertyWithLifecycle[], propertyTypes: string[]): PropertyWithLifecycle[] {
  if (propertyTypes.length === 0) {
    return properties
  }

  return properties.filter(property => {
    return propertyTypes.includes(property.property_type || '')
  })
}

/**
 * Filter properties based on search term
 */
export function filterBySearchTerm(properties: PropertyWithLifecycle[], searchTerm: string): PropertyWithLifecycle[] {
  if (!searchTerm.trim()) {
    return properties
  }

  const lower = searchTerm.toLowerCase()
  return properties.filter(property => {
    return (
      property.name.toLowerCase().includes(lower) ||
      (property.physical_address?.toLowerCase().includes(lower) ?? false) ||
      (property.property_type?.toLowerCase().includes(lower) ?? false) ||
      (property.notes?.toLowerCase().includes(lower) ?? false) ||
      (property.acquisition_notes?.toLowerCase().includes(lower) ?? false)
    )
  })
}

/**
 * Apply all filters to properties
 */
export function applyPropertyFilters(properties: PropertyWithLifecycle[], filters: PropertyFilters): PropertyWithLifecycle[] {
  let filtered = properties

  // Apply pipeline filter
  filtered = filterByPipeline(filtered, filters.pipeline)

  // Apply status filter
  filtered = filterByStatus(filtered, filters.status)

  // Apply property type filter
  filtered = filterByPropertyTypes(filtered, filters.propertyTypes)

  // Apply search term filter
  filtered = filterBySearchTerm(filtered, filters.searchTerm)

  return filtered
}

/**
 * Get filter counts for each pipeline type
 */
export function getFilterCounts(properties: PropertyWithLifecycle[]): Record<PropertyPipelineFilter, number> {
  const counts: Record<PropertyPipelineFilter, number> = {
    all: properties.length,
    direct_addition: 0,
    purchase_pipeline: 0,
    subdivision: 0,
    handover: 0
  }

  properties.forEach(property => {
    const pipelineType = getPropertyPipelineType(property)
    counts[pipelineType]++
  })

  return counts
}

/**
 * Get stage filtering summary for debugging/logging
 */
export function getStageFilteringSummary(property: PropertyWithLifecycle): {
  workflowType: WorkflowType
  stageRange: string
  displayRange: string
  documentCount: number
  hiddenDocuments: DocTypeKey[]
  visibleDocuments: DocTypeKey[]
} {
  const config = getStageConfig(property)
  const allDocKeys = DOC_TYPES.map(d => d.key)
  const visibleDocKeys = config.docTypes.map(d => d.key)
  const hiddenDocKeys = allDocKeys.filter(key => !visibleDocKeys.includes(key))

  return {
    workflowType: config.workflowType,
    stageRange: `${config.stageRange.min}-${config.stageRange.max}`,
    displayRange: `${config.displayRange.min}-${config.displayRange.max}`,
    documentCount: config.docTypes.length,
    hiddenDocuments: hiddenDocKeys,
    visibleDocuments: visibleDocKeys
  }
}
