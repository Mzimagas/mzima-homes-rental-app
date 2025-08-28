'use client'

import { ProgressTrackerProps } from '../types/purchase-pipeline.types'
import { PIPELINE_STAGES } from '../types/purchase-pipeline.types'
import {
  isStageCompleted,
  isStageAccessible,
  getStageStatusColor,
  getStageCardStyling,
} from '../utils/purchase-pipeline.utils'

export default function ProgressTracker({
  currentStage,
  stageData,
  onStageClick,
  overallProgress,
  purchaseId,
  onStageUpdate,
}: ProgressTrackerProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Purchase Progress</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Overall Progress:</span>
          <span className="text-sm font-medium text-blue-600">{overallProgress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageInfo = stageData.find((s) => s.stage_id === stage.id)
          const isActive = currentStage === stage.id
          const isCompleted = stageInfo ? isStageCompleted(stageInfo) : false
          const canAccess = isStageAccessible(stage.id, currentStage)

          return (
            <div
              key={stage.id}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${getStageCardStyling(
                isActive,
                isCompleted,
                canAccess
              )}`}
            >
              {/* Stage Number */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${getStageStatusColor(
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
                          ? 'bg-blue-100 text-blue-800'
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
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                )}

                {/* Completion Indicator */}
                {isCompleted && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>

              {/* Stage Notes Preview */}
              {stageInfo?.notes && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 truncate" title={stageInfo.notes}>
                    📝 {stageInfo.notes}
                  </p>
                </div>
              )}

              {/* Dates */}
              {(stageInfo?.started_date || stageInfo?.completed_date) && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  {stageInfo.started_date && (
                    <p className="text-xs text-gray-500">
                      Started: {new Date(stageInfo.started_date).toLocaleDateString()}
                    </p>
                  )}
                  {stageInfo.completed_date && (
                    <p className="text-xs text-green-600">
                      Completed: {new Date(stageInfo.completed_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stage Navigation Arrows */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Click on any accessible stage to view details and update status
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            Stage {currentStage} of {PIPELINE_STAGES.length}
          </span>
        </div>
      </div>
    </div>
  )
}
