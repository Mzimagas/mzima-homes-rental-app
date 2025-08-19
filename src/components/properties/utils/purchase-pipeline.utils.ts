import { 
  PipelineStageData, 
  PIPELINE_STAGES 
} from '../types/purchase-pipeline.types'

// Initialize pipeline stages with default data
export const initializePipelineStages = (): PipelineStageData[] => {
  return PIPELINE_STAGES.map(stage => ({
    stage_id: stage.id,
    status: stage.id === 1 ? 'In Progress' : 'Not Started',
    started_date: stage.id === 1 ? new Date().toISOString() : undefined,
    notes: '',
    documents: [],
  }))
}

// Calculate overall progress based on completed stages
export const calculateOverallProgress = (stageData: PipelineStageData[]): number => {
  const completedStages = stageData.filter(stage =>
    ["Completed", "Verified", "Finalized", "Processed", "Approved", "Fully Signed", "Registered", "LCB Approved & Forms Signed"].includes(stage.status)
  ).length
  return Math.round((completedStages / PIPELINE_STAGES.length) * 100)
}

// Get the current active stage
export const getCurrentStage = (stageData: PipelineStageData[]): number => {
  // Find the first non-completed stage
  for (let i = 0; i < stageData.length; i++) {
    const stage = stageData[i]
    if (!["Completed", "Verified", "Finalized", "Processed", "Approved", "Fully Signed", "Registered", "LCB Approved & Forms Signed"].includes(stage.status)) {
      return stage.stage_id
    }
  }
  return PIPELINE_STAGES.length // All stages completed
}

/**
 * Auto-update purchase status based on current active pipeline stage
 *
 * The purchase status now reflects the current stage being worked on:
 * - IDENTIFIED: Stage 1 (Initial Search & Evaluation)
 * - NEGOTIATING: Stage 2 (Survey & Mapping)
 * - DUE DILIGENCE: Stage 3 (Legal Verification)
 * - UNDER CONTRACT: Stage 4 (Agreement & Documentation)
 * - FINANCING: Stage 5-6 (Down Payment & Subsequent Payments)
 * - CLOSING: Stage 7-8 (LCB Meeting & Title Registration)
 * - COMPLETED: All stages completed
 */
export const determinePurchaseStatus = (stages: PipelineStageData[]): string => {
  const completionStatuses = [
    "Completed", "Verified", "Finalized", "Processed", "Approved",
    "Fully Signed", "Registered", "LCB Approved & Forms Signed"
  ]

  // Check if all stages are completed
  const allCompleted = stages.every(stage => completionStatuses.includes(stage.status))
  if (allCompleted) return 'COMPLETED'

  // Find the current active stage (first non-completed stage)
  const currentStage = getCurrentStage(stages)

  // Map current stage to purchase status
  const stageStatusMap: { [key: number]: string } = {
    1: "IDENTIFIED",      // Initial Search & Evaluation
    2: "NEGOTIATING",     // Survey & Mapping
    3: "DUE_DILIGENCE",   // Legal Verification
    4: "UNDER_CONTRACT",  // Agreement & Documentation
    5: "FINANCING",       // Down Payment
    6: "FINANCING",       // Subsequent Payments
    7: "CLOSING",         // LCB Meeting & Forms
    8: "CLOSING"          // Title Registration
  }

  return stageStatusMap[currentStage] || "IDENTIFIED"
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

// Check if a stage is completed
export const isStageCompleted = (stageData: PipelineStageData): boolean => {
  return ["Completed", "Verified", "Finalized", "Processed", "Approved", "Fully Signed", "Registered", "LCB Approved & Forms Signed"].includes(stageData.status)
}

// Check if a stage is accessible (current or previous stages)
export const isStageAccessible = (stageId: number, currentStage: number): boolean => {
  return stageId <= currentStage
}

// Get stage status color
export const getStageStatusColor = (stageData: PipelineStageData, isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return 'bg-green-500 text-white'
  if (isActive) return 'bg-blue-500 text-white'
  return 'bg-gray-300 text-gray-600'
}

// Get stage card styling
export const getStageCardStyling = (isActive: boolean, isCompleted: boolean, canAccess: boolean): string => {
  if (isActive) {
    return 'border-blue-500 bg-blue-50 shadow-md'
  }
  if (isCompleted) {
    return 'border-green-500 bg-green-50 shadow-md'
  }
  if (canAccess) {
    return 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg'
  }
  return 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
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
export const calculateBalanceDue = (negotiatedPrice?: number, askingPrice?: number, depositPaid?: number): number => {
  const totalPrice = negotiatedPrice || askingPrice || 0
  const deposit = depositPaid || 0
  return Math.max(0, totalPrice - deposit)
}

// Get stage by ID
export const getStageById = (stageId: number): PipelineStage | undefined => {
  return PIPELINE_STAGES.find(stage => stage.id === stageId)
}

// Validate stage transition
export const canTransitionToStatus = (currentStatus: string, newStatus: string, stageId: number): boolean => {
  const stage = getStageById(stageId)
  if (!stage) return false
  
  return stage.statusOptions.includes(newStatus)
}
