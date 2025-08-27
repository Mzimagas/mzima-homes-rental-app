import {
  SubdivisionPipelineStageData,
  SUBDIVISION_PIPELINE_STAGES,
} from '../types/property-management.types'

// Initialize subdivision pipeline stages with default data
export const initializeSubdivisionPipelineStages = (): SubdivisionPipelineStageData[] => {
  return SUBDIVISION_PIPELINE_STAGES.map((stage) => ({
    stage_id: stage.id,
    status: stage.id === 1 ? 'In Progress' : 'Not Started',
    started_date: stage.id === 1 ? new Date().toISOString() : undefined,
    notes: '',
    documents: [],
  }))
}

// Calculate overall progress based on completed stages
export const calculateSubdivisionOverallProgress = (
  stageData: SubdivisionPipelineStageData[]
): number => {
  const completedStages = stageData.filter((stage) =>
    ['Completed', 'Approved', 'Finalized'].includes(stage.status)
  ).length
  return Math.round((completedStages / SUBDIVISION_PIPELINE_STAGES.length) * 100)
}

// Get the current active stage
export const getCurrentSubdivisionStage = (stageData: SubdivisionPipelineStageData[]): number => {
  // Find the first non-completed stage
  for (let i = 0; i < stageData.length; i++) {
    const stage = stageData[i]
    if (!['Completed', 'Approved', 'Finalized'].includes(stage.status)) {
      return stage.stage_id
    }
  }
  return SUBDIVISION_PIPELINE_STAGES.length // All stages completed
}

// Map subdivision stage to subdivision status
export const mapStageToSubdivisionStatus = (stages: SubdivisionPipelineStageData[]): string => {
  const completionStatuses = ['Completed', 'Approved', 'Finalized']

  // Check if all stages are completed
  const allCompleted = stages.every((stage) => completionStatuses.includes(stage.status))
  if (allCompleted) return 'COMPLETED'

  // Find the current active stage (first non-completed stage)
  const currentStage = getCurrentSubdivisionStage(stages)

  // Map current stage to subdivision status
  const stageStatusMap: { [key: number]: string } = {
    1: 'PLANNING', // Planning & Design
    2: 'SURVEY_ORDERED', // Survey Ordered
    3: 'SURVEY_COMPLETED', // Survey Completed
    4: 'APPROVAL_PENDING', // Approval Pending
    5: 'APPROVED', // Approved
    6: 'PLOTS_CREATED', // Plots Created
    7: 'COMPLETED', // Completed
  }

  return stageStatusMap[currentStage] || 'PLANNING'
}

// Get subdivision stage by ID
export const getSubdivisionStageById = (stageId: number) => {
  return SUBDIVISION_PIPELINE_STAGES.find((stage) => stage.id === stageId)
}

// Check if a subdivision stage is completed
export const isSubdivisionStageCompleted = (stageData: SubdivisionPipelineStageData): boolean => {
  return ['Completed', 'Approved', 'Finalized'].includes(stageData.status)
}

// Check if a subdivision stage is accessible (current or previous stages)
export const isSubdivisionStageAccessible = (stageId: number, currentStage: number): boolean => {
  return stageId <= currentStage
}

// Get subdivision stage status color
export const getSubdivisionStageStatusColor = (
  stageData: SubdivisionPipelineStageData,
  isActive: boolean,
  isCompleted: boolean
): string => {
  if (isCompleted) return 'bg-green-500 text-white'
  if (isActive) return 'bg-orange-500 text-white'
  return 'bg-gray-300 text-gray-600'
}

// Get subdivision stage card styling
export const getSubdivisionStageCardStyling = (
  isActive: boolean,
  isCompleted: boolean,
  canAccess: boolean
): string => {
  if (isCompleted) {
    return 'border-green-300 bg-green-50 hover:bg-green-100'
  }
  if (isActive) {
    return 'border-orange-300 bg-orange-50 hover:bg-orange-100'
  }
  if (canAccess) {
    return 'border-gray-300 bg-white hover:bg-gray-50'
  }
  return 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
}

// Format subdivision stage duration
export const formatSubdivisionStageDuration = (startDate?: string, endDate?: string): string => {
  if (!startDate) return 'Not started'
  if (!endDate) return `Started ${new Date(startDate).toLocaleDateString()}`

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
}

// Get subdivision stage progress percentage
export const getSubdivisionStageProgress = (
  stageData: SubdivisionPipelineStageData[]
): { [key: number]: number } => {
  const progress: { [key: number]: number } = {}

  stageData.forEach((stage) => {
    if (isSubdivisionStageCompleted(stage)) {
      progress[stage.stage_id] = 100
    } else if (stage.started_date) {
      progress[stage.stage_id] = 50 // In progress
    } else {
      progress[stage.stage_id] = 0 // Not started
    }
  })

  return progress
}

// Validate subdivision stage transition
export const canTransitionToStatus = (
  currentStatus: string,
  newStatus: string,
  stageId: number
): boolean => {
  const stage = getSubdivisionStageById(stageId)
  if (!stage) return false

  // Check if the new status is valid for this stage
  if (!stage.statusOptions.includes(newStatus)) return false

  // Allow any transition for now - can add more complex rules later
  return true
}

// Get next recommended status for a stage
export const getNextRecommendedStatus = (currentStatus: string, stageId: number): string | null => {
  const stage = getSubdivisionStageById(stageId)
  if (!stage) return null

  const statusIndex = stage.statusOptions.indexOf(currentStatus)
  if (statusIndex === -1 || statusIndex === stage.statusOptions.length - 1) return null

  return stage.statusOptions[statusIndex + 1]
}

// Map subdivision status from database to pipeline stages
export const mapSubdivisionStatusToStages = (
  subdivisionStatus: string
): SubdivisionPipelineStageData[] => {
  const statusToStageMap: { [key: string]: number } = {
    PLANNING: 1,
    SURVEY_ORDERED: 2,
    SURVEY_COMPLETED: 3,
    APPROVAL_PENDING: 4,
    APPROVED: 5,
    PLOTS_CREATED: 6,
    COMPLETED: 7,
  }

  const currentStageId = statusToStageMap[subdivisionStatus] || 1

  // More realistic base dates - starting from a few months ago
  const baseDate = new Date('2024-06-01')

  return SUBDIVISION_PIPELINE_STAGES.map((stage) => {
    if (stage.id < currentStageId) {
      // Previous stages are completed with realistic timeframes
      const stageStartDate = new Date(
        baseDate.getTime() + (stage.id - 1) * 30 * 24 * 60 * 60 * 1000
      ) // 30 days apart
      const stageEndDate = new Date(stageStartDate.getTime() + 14 * 24 * 60 * 60 * 1000) // 2 weeks duration

      const stageNotes = {
        1: 'Initial subdivision planning and design completed. Architectural plans finalized.',
        2: 'Survey ordered from licensed surveyor. Site measurements and boundary marking scheduled.',
        3: 'Professional land survey completed. Boundary beacons installed and coordinates recorded.',
      }

      return {
        stage_id: stage.id,
        status: 'Completed',
        started_date: stageStartDate.toISOString(),
        completed_date: stageEndDate.toISOString(),
        notes:
          stageNotes[stage.id as keyof typeof stageNotes] || `${stage.name} completed successfully`,
        documents: [],
      }
    } else if (stage.id === currentStageId) {
      // Current stage is in progress
      const stageStartDate = new Date(
        baseDate.getTime() + (stage.id - 1) * 30 * 24 * 60 * 60 * 1000
      )

      const currentStageNotes = {
        3: 'Survey work completed. Preparing documentation for county approval submission.',
        4: 'Subdivision application submitted to county. Awaiting planning department review.',
        5: 'County approval received. Preparing for plot demarcation and infrastructure development.',
      }

      return {
        stage_id: stage.id,
        status: 'In Progress',
        started_date: stageStartDate.toISOString(),
        notes:
          currentStageNotes[stage.id as keyof typeof currentStageNotes] ||
          `Currently working on ${stage.name.toLowerCase()}`,
        documents: [],
      }
    } else {
      // Future stages are not started
      return {
        stage_id: stage.id,
        status: 'Not Started',
        notes: '',
        documents: [],
      }
    }
  })
}

// Get current stage from subdivision status
export const getCurrentSubdivisionStageFromStatus = (subdivisionStatus: string): number => {
  const statusToStageMap: { [key: string]: number } = {
    PLANNING: 1,
    SURVEY_ORDERED: 2,
    SURVEY_COMPLETED: 3,
    APPROVAL_PENDING: 4,
    APPROVED: 5,
    PLOTS_CREATED: 6,
    COMPLETED: 7,
  }

  return statusToStageMap[subdivisionStatus] || 1
}

// Calculate progress from subdivision status
export const calculateSubdivisionProgressFromStatus = (subdivisionStatus: string): number => {
  const statusToProgressMap: { [key: string]: number } = {
    PLANNING: 14, // Stage 1 in progress
    SURVEY_ORDERED: 29, // Stage 2 in progress
    SURVEY_COMPLETED: 43, // Stage 3 in progress
    APPROVAL_PENDING: 57, // Stage 4 in progress
    APPROVED: 71, // Stage 5 in progress
    PLOTS_CREATED: 86, // Stage 6 in progress
    COMPLETED: 100, // All stages completed
  }

  return statusToProgressMap[subdivisionStatus] || 0
}
