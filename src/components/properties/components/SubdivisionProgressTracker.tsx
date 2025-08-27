'use client'

import {
  SUBDIVISION_PIPELINE_STAGES,
  SubdivisionPipelineStageData,
  SubdivisionProgressTrackerProps,
} from '../types/property-management.types'

// Helper functions for subdivision stages
const isSubdivisionStageCompleted = (stageData: SubdivisionPipelineStageData): boolean => {
  return ['Completed', 'Approved', 'Finalized'].includes(stageData.status)
}

const isSubdivisionStageAccessible = (stageId: number, currentStage: number): boolean => {
  return stageId <= currentStage
}

const getSubdivisionStageStatusColor = (
  stageData: SubdivisionPipelineStageData,
  isActive: boolean,
  isCompleted: boolean
): string => {
  if (isCompleted) return 'bg-green-500 text-white'
  if (isActive) return 'bg-orange-500 text-white'
  return 'bg-gray-300 text-gray-600'
}

const getSubdivisionStageCardStyling = (
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

export default function SubdivisionProgressTracker({
  currentStage,
  stageData,
  onStageClick,
  overallProgress,
  subdivisionId,
  onStageUpdate,
}: SubdivisionProgressTrackerProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Subdivision Progress</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Overall Progress:</span>
          <span className="text-sm font-medium text-orange-600">{overallProgress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {SUBDIVISION_PIPELINE_STAGES.map((stage) => {
          const stageInfo = stageData.find((s) => s.stage_id === stage.id)
          const isActive = currentStage === stage.id
          const isCompleted = stageInfo ? isSubdivisionStageCompleted(stageInfo) : false
          const canAccess = isSubdivisionStageAccessible(stage.id, currentStage)

          return (
            <div
              key={stage.id}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 transform hover:scale-105 ${getSubdivisionStageCardStyling(
                isActive,
                isCompleted,
                canAccess
              )}`}
              onClick={() => canAccess && onStageClick(stage.id)}
            >
              {/* Stage Number */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${getSubdivisionStageStatusColor(
                  stageInfo!,
                  isActive,
                  isCompleted
                )}`}
              >
                {isCompleted ? '✓' : stage.id}
              </div>

              {/* Stage Info */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-1">{stage.name}</h4>
                <p className="text-xs text-gray-600 mb-2">{stage.description}</p>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isCompleted
                        ? 'bg-green-100 text-green-800'
                        : isActive
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {stageInfo?.status || 'Not Started'}
                  </span>

                  {/* Estimated Days */}
                  <span className="text-xs text-gray-500">{stage.estimatedDays}d</span>
                </div>

                {/* Progress Indicator */}
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stage Details */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stageData
          .filter((stage) => stage.started_date || stage.completed_date)
          .map((stage) => {
            const stageInfo = SUBDIVISION_PIPELINE_STAGES.find((s) => s.id === stage.stage_id)
            if (!stageInfo) return null

            return (
              <div key={stage.stage_id} className="bg-gray-50 rounded-lg p-3">
                <h5 className="font-medium text-gray-900 text-sm mb-1">{stageInfo.name}</h5>
                <div className="text-xs text-gray-600 space-y-1">
                  {stage.started_date && (
                    <div>Started: {new Date(stage.started_date).toLocaleDateString()}</div>
                  )}
                  {stage.completed_date && (
                    <div>Completed: {new Date(stage.completed_date).toLocaleDateString()}</div>
                  )}
                  {stage.notes && <div className="text-gray-700 mt-1">{stage.notes}</div>}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
