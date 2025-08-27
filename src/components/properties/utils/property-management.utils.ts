import {
  PropertyWithLifecycle,
  HandoverPipelineStageData,
  HANDOVER_PIPELINE_STAGES,
  PendingChanges,
} from '../types/property-management.types'

// Property source and lifecycle utilities
export const getSourceIcon = (source?: string): string => {
  switch (source) {
    case 'PURCHASE_PIPELINE':
      return '🏢'
    case 'SUBDIVISION_PROCESS':
      return '🏗️'
    case 'DIRECT_ADDITION':
    default:
      return '🏠'
  }
}

export const getSourceLabel = (source?: string): string => {
  switch (source) {
    case 'PURCHASE_PIPELINE':
      return 'Purchased'
    case 'SUBDIVISION_PROCESS':
      return 'From Subdivision'
    case 'DIRECT_ADDITION':
    default:
      return 'Direct Addition'
  }
}

export const getLifecycleStatusColor = (status?: string): string => {
  const colors = {
    ACTIVE: 'bg-green-100 text-green-800',
    SUBDIVIDED: 'bg-purple-100 text-purple-800',
    PURCHASED: 'bg-blue-100 text-blue-800',
    UNDER_DEVELOPMENT: 'bg-yellow-100 text-yellow-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
  } as const
  // @ts-ignore
  return (status && colors[status as keyof typeof colors]) || 'bg-gray-100 text-gray-800'
}

// Handover pipeline utilities
export const initializeHandoverPipelineStages = (): HandoverPipelineStageData[] => {
  return HANDOVER_PIPELINE_STAGES.map((stage) => ({
    stage_id: stage.id,
    status: stage.id === 1 ? 'In Progress' : 'Not Started',
    started_date: stage.id === 1 ? new Date().toISOString() : undefined,
    notes: '',
    documents: [],
  }))
}

export const calculateHandoverProgress = (stageData: HandoverPipelineStageData[]): number => {
  const completedStages = stageData.filter((stage) =>
    [
      'Completed',
      'Verified',
      'Finalized',
      'Processed',
      'Approved',
      'Signed',
      'Registered',
    ].includes(stage.status)
  ).length
  return Math.round((completedStages / HANDOVER_PIPELINE_STAGES.length) * 100)
}

export const getCurrentHandoverStage = (stageData: HandoverPipelineStageData[]): number => {
  for (let i = 0; i < stageData.length; i++) {
    const stage = stageData[i]
    if (
      ![
        'Completed',
        'Verified',
        'Finalized',
        'Processed',
        'Approved',
        'Signed',
        'Registered',
      ].includes(stage.status)
    ) {
      return stage.stage_id
    }
  }
  return HANDOVER_PIPELINE_STAGES.length
}

export const determineHandoverStatus = (stageData: HandoverPipelineStageData[]): string => {
  const progress = calculateHandoverProgress(stageData)
  if (progress === 100) return 'COMPLETED'
  if (progress >= 75) return 'CLOSING'
  if (progress >= 50) return 'FINANCING'
  if (progress >= 25) return 'DUE_DILIGENCE'
  if (progress > 0) return 'NEGOTIATING'
  return 'IDENTIFIED'
}

// Pending changes utilities
export const hasPendingChanges = (propertyId: string, pendingChanges: PendingChanges): boolean => {
  const changes = pendingChanges[propertyId]
  return !!(changes && (changes.subdivision !== undefined || changes.handover !== undefined))
}

export const getPendingSubdivisionValue = (
  property: PropertyWithLifecycle,
  pendingChanges: PendingChanges
): string => {
  const pending = pendingChanges[property.id]?.subdivision
  if (pending !== undefined) return pending
  switch (property.subdivision_status) {
    case 'SUBDIVIDED':
      return 'Subdivided'
    case 'SUB_DIVISION_STARTED':
      return 'Sub-Division Started'
    case 'NOT_STARTED':
    default:
      return 'Not Started'
  }
}

export const getPendingHandoverValue = (
  property: PropertyWithLifecycle,
  pendingChanges: PendingChanges
): string => {
  const pending = pendingChanges[property.id]?.handover
  if (pending !== undefined) return pending
  return property.handover_status === 'COMPLETED'
    ? 'Handed Over'
    : property.handover_status === 'IN_PROGRESS'
      ? 'In Progress'
      : 'Not Started'
}

// Authentication error handling
export const isAuthError = (error: any): boolean => {
  return (
    error?.message?.includes('Invalid Refresh Token') ||
    error?.message?.includes('Auth session missing') ||
    error?.message?.includes('JWT')
  )
}

export const redirectToLogin = (context: string): void => {
  window.location.href = `/auth/login?message=Session expired. Please log in again.&context=${context}`
}
