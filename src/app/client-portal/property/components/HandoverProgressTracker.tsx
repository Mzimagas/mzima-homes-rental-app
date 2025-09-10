'use client'

import { useState } from 'react'

interface HandoverStage {
  id: number
  name: string
  description: string
  status: string
  completed: boolean
  started_at?: string
  completed_at?: string
  notes?: string
  estimated_days?: number
}

interface HandoverProgressTrackerProps {
  handover: {
    id: string
    handover_status: string
    current_stage: string
    overall_progress: number
    pipeline_stages: HandoverStage[]
    created_at: string
    expected_completion_date?: string
  }
  property: {
    id: string
    name: string
  }
  onRefresh: () => void
}

export default function HandoverProgressTracker({ handover, property, onRefresh }: HandoverProgressTrackerProps) {
  const [expandedStage, setExpandedStage] = useState<number | null>(null)

  const getStageStatusColor = (stage: HandoverStage) => {
    if (stage.completed) {
      return 'bg-green-100 text-green-800 border-green-200'
    }
    if (stage.status === 'In Progress') {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    }
    if (stage.status === 'On Hold') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const getStageIcon = (stage: HandoverStage) => {
    if (stage.completed) {
      return '✅'
    }
    if (stage.status === 'In Progress') {
      return '🔄'
    }
    if (stage.status === 'On Hold') {
      return '⏸️'
    }
    return '⏳'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateDaysElapsed = (startDate?: string) => {
    if (!startDate) return 0
    const start = new Date(startDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Handover Progress</h2>
          <button
            onClick={onRefresh}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{handover.overall_progress}%</div>
            <div className="text-sm text-blue-700">Overall Progress</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {handover.pipeline_stages.filter(s => s.completed).length}
            </div>
            <div className="text-sm text-green-700">Stages Completed</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {handover.pipeline_stages.length}
            </div>
            <div className="text-sm text-gray-700">Total Stages</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Current Stage:</span>
            <span className="ml-2 font-medium">{handover.current_stage}</span>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <span className="ml-2 font-medium">{handover.handover_status}</span>
          </div>
          <div>
            <span className="text-gray-600">Started:</span>
            <span className="ml-2 font-medium">{formatDate(handover.created_at)}</span>
          </div>
          <div>
            <span className="text-gray-600">Expected Completion:</span>
            <span className="ml-2 font-medium">{formatDate(handover.expected_completion_date)}</span>
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Progress Timeline</h3>
        
        <div className="space-y-4">
          {handover.pipeline_stages.map((stage, index) => (
            <div key={stage.id} className="relative">
              {/* Timeline Line */}
              {index < handover.pipeline_stages.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
              )}
              
              {/* Stage Card */}
              <div className="flex items-start space-x-4">
                {/* Stage Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg ${getStageStatusColor(stage)}`}>
                  {getStageIcon(stage)}
                </div>
                
                {/* Stage Content */}
                <div className="flex-1 min-w-0">
                  <div 
                    className="cursor-pointer"
                    onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900">{stage.name}</h4>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStageStatusColor(stage)}`}>
                          {stage.status}
                        </span>
                        <span className="text-gray-400">
                          {expandedStage === stage.id ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mt-1">{stage.description}</p>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      {stage.started_at && (
                        <span>Started: {formatDate(stage.started_at)}</span>
                      )}
                      {stage.completed_at && (
                        <span>Completed: {formatDate(stage.completed_at)}</span>
                      )}
                      {stage.started_at && !stage.completed_at && (
                        <span>Days elapsed: {calculateDaysElapsed(stage.started_at)}</span>
                      )}
                      {stage.estimated_days && (
                        <span>Est. duration: {stage.estimated_days} days</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedStage === stage.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">Stage Details</h5>
                      
                      {stage.notes && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">Notes:</span>
                          <p className="text-sm text-gray-600 mt-1">{stage.notes}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Stage ID:</span>
                          <span className="ml-2 font-mono">{stage.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className="ml-2">{stage.status}</span>
                        </div>
                        {stage.estimated_days && (
                          <div>
                            <span className="text-gray-600">Estimated Duration:</span>
                            <span className="ml-2">{stage.estimated_days} days</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Completed:</span>
                          <span className="ml-2">{stage.completed ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">What's Next?</h3>
        
        {handover.handover_status === 'COMPLETED' ? (
          <div className="text-blue-800">
            <p className="mb-2">🎉 Congratulations! Your property handover is complete.</p>
            <p>You should have received all necessary documents and keys. If you have any questions, please contact our support team.</p>
          </div>
        ) : (
          <div className="text-blue-800">
            <p className="mb-2">📋 Current focus: <strong>{handover.current_stage}</strong></p>
            <p>Our team is working on the next steps. You'll receive updates as progress is made.</p>
            {handover.expected_completion_date && (
              <p className="mt-2">🗓️ Expected completion: <strong>{formatDate(handover.expected_completion_date)}</strong></p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
