'use client'

import { 
  HANDOVER_PIPELINE_STAGES,
  HandoverPipelineStageData 
} from '../types/property-management.types'

interface HandoverProgressTrackerProps {
  currentStage: number
  stageData: HandoverPipelineStageData[]
  onStageClick: (stageId: number) => void
  overallProgress: number
  handoverId: string
  onStageUpdate: (handoverId: string, stageId: number, newStatus: string, notes?: string) => Promise<void>
}

// Helper functions for handover stages
const isHandoverStageCompleted = (stageData: HandoverPipelineStageData): boolean => {
  return ['Completed', 'Verified', 'Finalized', 'Processed', 'Approved', 'Signed', 'Registered'].includes(stageData.status)
}

const isHandoverStageAccessible = (stageId: number, currentStage: number): boolean => {
  return stageId <= currentStage
}

const getHandoverStageStatusColor = (stageData: HandoverPipelineStageData, isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return 'bg-green-500 text-white'
  if (isActive) return 'bg-blue-500 text-white'
  return 'bg-gray-300 text-gray-600'
}

const getHandoverStageCardStyling = (isActive: boolean, isCompleted: boolean, canAccess: boolean): string => {
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

export default function HandoverProgressTracker({
  currentStage,
  stageData,
  onStageClick,
  overallProgress,
  handoverId,
  onStageUpdate
}: HandoverProgressTrackerProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">Handover Progress</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">Progress:</span>
          <span className="text-xs font-medium text-purple-600">{overallProgress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
        <div 
          className="bg-purple-600 h-1.5 rounded-full transition-all duration-300" 
          style={{ width: `${overallProgress}%` }} 
        />
      </div>

      {/* Stage Cards Grid - Smaller and more compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {HANDOVER_PIPELINE_STAGES.map((stage) => {
          const stageInfo = stageData.find(s => s.stage_id === stage.id)
          const isActive = currentStage === stage.id
          const isCompleted = stageInfo ? isHandoverStageCompleted(stageInfo) : false
          const canAccess = isHandoverStageAccessible(stage.id, currentStage)

          return (
            <div
              key={stage.id}
              className={`relative p-2 rounded-md border cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                getHandoverStageCardStyling(isActive, isCompleted, canAccess)
              }`}
              onClick={() => canAccess && onStageClick(stage.id)}
              title={`${stage.name} - ${stage.description}`}
            >
              {/* Stage Number - Smaller */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                getHandoverStageStatusColor(stageInfo!, isActive, isCompleted)
              }`}>
                {isCompleted ? '✓' : stage.id}
              </div>

              {/* Stage Info - Compact */}
              <div>
                <h4 className="font-medium text-xs text-gray-900 mb-1 leading-tight">{stage.name}</h4>
                
                {/* Status */}
                <div className="flex flex-col space-y-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium text-center ${
                    isCompleted 
                      ? 'bg-green-100 text-green-800'
                      : isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stageInfo?.status || 'Not Started'}
                  </span>
                  
                  {/* Estimated Days - Smaller */}
                  <span className="text-xs text-gray-500 text-center">
                    {stage.estimatedDays}d
                  </span>
                </div>

                {/* Progress Indicator */}
                {isActive && (
                  <div className="absolute top-1 right-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                )}

                {/* Completion Indicator */}
                {isCompleted && (
                  <div className="absolute top-1 right-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stage Navigation Info - Compact */}
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          Click any accessible stage to edit
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Stage {currentStage} of {HANDOVER_PIPELINE_STAGES.length}</span>
        </div>
      </div>
    </div>
  )
}
