import React from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LockClosedIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { useEnhancedWorkflow } from '../../../hooks/useEnhancedWorkflow'
import { useFinancialSync } from '../../../hooks/useFinancialSync'
import { useTabNavigation } from '../../../hooks/useTabNavigation'
import { formatCurrency } from '../../../lib/constants/financial-stage-requirements'

interface WorkflowDashboardProps {
  propertyId: string
  pipeline: string
  documentStates: Record<string, any>
  className?: string
}

export const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({
  propertyId,
  pipeline,
  documentStates,
  className = '',
}) => {
  const { workflowStages, currentMilestone, blockedStages, getNextAction, criticalMilestones } =
    useEnhancedWorkflow({
      propertyId,
      pipeline,
      documentStates,
      enableIntegratedLogic: true,
    })

  const { isSyncing, lastSyncTime, triggerSync } = useFinancialSync({
    propertyId,
    pipeline,
    enableRealTimeSync: true,
  })

  const { navigateToDocuments, navigateToFinancial, navigateToPayment } = useTabNavigation()

  const nextAction = getNextAction()
  const completedStages = workflowStages.filter(
    (stage) => stage.documentsComplete && stage.financiallyComplete
  ).length
  const totalStages = workflowStages.length
  const progressPercentage = totalStages > 0 ? (completedStages / totalStages) * 100 : 0

  const handleActionClick = () => {
    if (!nextAction) return

    switch (nextAction.type) {
      case 'document':
        navigateToDocuments({ propertyId, stageNumber: nextAction.stageNumber })
        break
      case 'payment':
        navigateToPayment({ propertyId, stageNumber: nextAction.stageNumber })
        break
      case 'complete':
        // Handle completion action
        break
    }
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Workflow Progress</h3>
            <p className="text-sm text-gray-600">Integrated document and financial tracking</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Status */}
            <div className="flex items-center gap-2">
              <button
                onClick={triggerSync}
                disabled={isSyncing}
                className={`p-2 rounded-lg transition-colors ${
                  isSyncing
                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Sync financial status"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              {lastSyncTime && (
                <span className="text-xs text-gray-500">
                  Last sync: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Progress */}
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {completedStages} of {totalStages} stages
              </div>
              <div className="text-xs text-gray-600">{progressPercentage.toFixed(0)}% complete</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Next Action */}
      {nextAction && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  nextAction.priority === 'high'
                    ? 'bg-red-100 text-red-600'
                    : nextAction.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-blue-100 text-blue-600'
                }`}
              >
                {nextAction.type === 'document' ? (
                  <DocumentTextIcon className="h-5 w-5" />
                ) : nextAction.type === 'payment' ? (
                  <CurrencyDollarIcon className="h-5 w-5" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5" />
                )}
              </div>

              <div>
                <div className="font-medium text-gray-900">
                  Next Action: Stage {nextAction.stageNumber}
                </div>
                <div className="text-sm text-gray-600">{nextAction.description}</div>
              </div>
            </div>

            <button
              onClick={handleActionClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Take Action
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Current Milestone */}
      {currentMilestone && criticalMilestones[currentMilestone] && (
        <div className="p-4 border-b border-gray-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="font-medium text-yellow-900">
                Critical Milestone: {criticalMilestones[currentMilestone].name}
              </div>
              <div className="text-sm text-yellow-700">
                {criticalMilestones[currentMilestone].description}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage Overview */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Stage Overview</h4>
        <div className="space-y-2">
          {workflowStages.slice(0, 8).map((stage) => {
            const milestone = criticalMilestones[stage.stageNumber]
            const isBlocked = blockedStages.includes(stage.stageNumber)

            return (
              <div
                key={stage.stageNumber}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  stage.documentsComplete && stage.financiallyComplete
                    ? 'bg-green-50 border-green-200'
                    : isBlocked
                      ? 'bg-gray-50 border-gray-200'
                      : stage.criticalMilestone
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Stage Status Icon */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      stage.documentsComplete && stage.financiallyComplete
                        ? 'bg-green-500 text-white'
                        : isBlocked
                          ? 'bg-gray-400 text-white'
                          : 'bg-blue-500 text-white'
                    }`}
                  >
                    {stage.documentsComplete && stage.financiallyComplete ? (
                      <CheckCircleIconSolid className="h-5 w-5" />
                    ) : isBlocked ? (
                      <LockClosedIcon className="h-4 w-4" />
                    ) : (
                      stage.stageNumber
                    )}
                  </div>

                  <div>
                    <div className="font-medium text-gray-900">
                      Stage {stage.stageNumber}
                      {milestone && (
                        <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          Critical
                        </span>
                      )}
                    </div>
                    {stage.blockingReasons.length > 0 && (
                      <div className="text-xs text-red-600">{stage.blockingReasons[0]}</div>
                    )}
                  </div>
                </div>

                {/* Stage Status Indicators */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stage.documentsComplete ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title="Documents"
                  />
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stage.financiallyComplete ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title="Payments"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Documents</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Payments</span>
            </div>
          </div>
          <div className="text-gray-500">Real-time sync enabled</div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowDashboard
