import { PipelineStageData, PipelineStage, PIPELINE_STAGES } from '../types/purchase-pipeline.types'

// Initialize pipeline stages with default data
export const initializePipelineStages = (): PipelineStageData[] => {
  return PIPELINE_STAGES.map((stage) => ({
    stage_id: stage.id,
    status: stage.id === 1 ? 'In Progress' : 'Not Started',
    started_date: stage.id === 1 ? new Date().toISOString() : undefined,
    notes: '',
    documents: [],
  }))
}
// Calculate overall progress based on completed stages
export const calculateOverallProgress = (stageData: PipelineStageData[]): number => {
  const completedStages = stageData.filter((stage) =>
    [
      'Completed',
      'Verified',
      'Finalized',
      'Processed',
      'Approved',
      'Fully Signed',
      'Registered',
      'LCB Approved & Forms Signed',
    ].includes(stage.status)
  ).length
  return Math.round((completedStages / PIPELINE_STAGES.length) * 100)
}

// Get the current active stage
export const getCurrentStage = (stageData: PipelineStageData[]): number => {
  // Find the first non-completed stage
  for (let i = 0; i < stageData.length; i++) {
    const stage = stageData[i]
    if (
      ![
        'Completed',
        'Verified',
        'Finalized',
        'Processed',
        'Approved',
        'Fully Signed',
        'Registered',
        'LCB Approved & Forms Signed',
      ].includes(stage.status)
    ) {
      return stage.stage_id
    }
  }
  return PIPELINE_STAGES.length // All stages completed
}

// Determine purchase status based on pipeline stages
export const determinePurchaseStatus = (stageData: PipelineStageData[]): string => {
  const completionStatuses = [
    'Completed',
    'Verified',
    'Finalized',
    'Processed',
    'Approved',
    'Fully Signed',
    'Registered',
    'LCB Approved & Forms Signed',
  ]

  // Check if all stages are completed
  const allCompleted = stageData.every((stage) => completionStatuses.includes(stage.status))
  if (allCompleted) return 'COMPLETED'

  // Find the current active stage (first non-completed stage)
  const currentStage = getCurrentStage(stageData)

  // Map stage to purchase status
  if (currentStage <= 1) return 'IDENTIFIED'
  if (currentStage <= 2) return 'NEGOTIATING'
  if (currentStage <= 3) return 'DUE_DILIGENCE'
  if (currentStage <= 4) return 'UNDER_CONTRACT'
  if (currentStage <= 6) return 'FINANCING'
  if (currentStage <= 8) return 'CLOSING'

  return 'IDENTIFIED' // Default fallback
}

// Get status color for purchase status badges
export const getPurchaseStatusColor = (status: string): string => {
  const colors = {
    IDENTIFIED: 'bg-gray-100 text-gray-800',
    NEGOTIATING: 'bg-yellow-100 text-yellow-800',
    DUE_DILIGENCE: 'bg-blue-100 text-blue-800',
    UNDER_CONTRACT: 'bg-purple-100 text-purple-800',
    FINANCING: 'bg-orange-100 text-orange-800',
    CLOSING: 'bg-indigo-100 text-indigo-800',
    COMPLETED: 'bg-green-100 text-green-800',
  } as const

  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

// Format currency for display
export const formatCurrency = (amount: number | undefined): string => {
  if (!amount) return 'N/A'
  return `KES ${amount.toLocaleString()}`
}

// Format percentage for display
export const formatPercentage = (percentage: number | undefined): string => {
  if (!percentage) return 'N/A'
  return `${percentage}%`
}

// Calculate balance due
export const calculateBalanceDue = (
  negotiatedPrice?: number,
  askingPrice?: number,
  depositPaid?: number
): number => {
  const totalPrice = negotiatedPrice || askingPrice || 0
  const deposit = depositPaid || 0
  return Math.max(0, totalPrice - deposit)
}

// Get stage by ID
export const getStageById = (stageId: number): PipelineStage | undefined => {
  return PIPELINE_STAGES.find((stage) => stage.id === stageId)
}

// Validate stage transition
export const canTransitionToStatus = (
  currentStatus: string,
  newStatus: string,
  stageId: number
): boolean => {
  const stage = getStageById(stageId)
  if (!stage) return false

  return stage.statusOptions.includes(newStatus)
}
