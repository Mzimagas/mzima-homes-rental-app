'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import HandoverProgressTracker from './HandoverProgressTracker'
import HandoverFinancialSection from './HandoverFinancialSection'
import { HandoverItem } from '../types/property-management.types'
import { initializeHandoverPipelineStages } from '../utils/property-management.utils'
import { HandoverFinancialsService, HandoverFinancialSummary } from '../services/handover-financials.service'

interface InlineHandoverViewProps {
  handover: HandoverItem
  onClose: () => void
  onStageClick: (stageId: number, handoverId: string) => void
  onStageUpdate: (handoverId: string, stageId: number, newStatus: string, notes?: string) => Promise<void>
}

export default function InlineHandoverView({
  handover,
  onClose,
  onStageClick,
  onStageUpdate
}: InlineHandoverViewProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'financial' | 'documents'>('basic')
  const [financialSummary, setFinancialSummary] = useState<HandoverFinancialSummary | null>(null)
  const [loadingFinancials, setLoadingFinancials] = useState(false)
  const [financialError, setFinancialError] = useState<string | null>(null)

  // Load financial data when component mounts or when switching to financial tab
  useEffect(() => {
    if (activeTab === 'financial' && !financialSummary && !loadingFinancials) {
      loadFinancialData()
    }
  }, [activeTab, handover.property_id])

  const loadFinancialData = async () => {
    setLoadingFinancials(true)
    setFinancialError(null)

    try {
      const summary = await HandoverFinancialsService.getHandoverFinancialSummary(handover.property_id)
      setFinancialSummary(summary)
    } catch (error) {
      console.error('Error loading financial data:', error)
      setFinancialError(error instanceof Error ? error.message : 'Failed to load financial data')
    } finally {
      setLoadingFinancials(false)
    }
  }



  const getHandoverStatusColor = (status: string): string => {
    const colors = {
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSING: 'bg-blue-100 text-blue-800',
      FINANCING: 'bg-yellow-100 text-yellow-800',
      DUE_DILIGENCE: 'bg-purple-100 text-purple-800',
      NEGOTIATING: 'bg-orange-100 text-orange-800',
      IDENTIFIED: 'bg-gray-100 text-gray-800',
    } as const
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Handover Details</h4>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🏠 Basic Info
          </button>
          <button
            onClick={() => setActiveTab('location')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'location'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📍 Location
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'financial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💰 Financial
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📁 Documents
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Property Information</h4>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Name:</span> {handover.property_name}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Type:</span> {handover.property_type}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Address:</span> {handover.property_address}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Handover Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getHandoverStatusColor(handover.handover_status)
                      }`}
                    >
                      {handover.handover_status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Progress:</span> {handover.overall_progress}%
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Current Stage:</span> {handover.current_stage} of 8
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Buyer Information</h4>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Name:</span> {handover.buyer_name || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Contact:</span> {handover.buyer_contact || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span> {handover.buyer_email || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Address:</span> {handover.buyer_address || 'Not specified'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Details</h4>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Legal Representative:</span> {handover.legal_representative || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Target Completion:</span> {
                      handover.target_completion_date 
                        ? new Date(handover.target_completion_date).toLocaleDateString()
                        : 'Not specified'
                    }
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Actual Completion:</span> {
                      handover.actual_completion_date 
                        ? new Date(handover.actual_completion_date).toLocaleDateString()
                        : 'Not completed'
                    }
                  </p>
                </div>
              </div>
            </div>

            {(handover.risk_assessment || handover.property_condition_notes) && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes & Assessment</h4>
                <div className="space-y-2">
                  {handover.risk_assessment && (
                    <div>
                      <span className="font-medium text-gray-700">Risk Assessment:</span>
                      <p className="text-gray-600 mt-1">{handover.risk_assessment}</p>
                    </div>
                  )}
                  {handover.property_condition_notes && (
                    <div>
                      <span className="font-medium text-gray-700">Property Condition:</span>
                      <p className="text-gray-600 mt-1">{handover.property_condition_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Property Address</h4>
                <p className="text-gray-700">{handover.property_address}</p>
              </div>
            </div>
            <div className="flex justify-start">
              <ViewOnGoogleMapsButton
                address={handover.property_address || handover.property_name}
                propertyName={handover.property_name}
              />
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            {loadingFinancials ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading financial data...</div>
              </div>
            ) : financialError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800">
                  <strong>Error loading financial data:</strong> {financialError}
                </div>
                <button
                  onClick={loadFinancialData}
                  className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            ) : (
              <HandoverFinancialSection
                propertyId={handover.property_id}
                financialSummary={financialSummary}
                onDataUpdate={loadFinancialData}
              />
            )}
          </div>
        )}




        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Handover Progress Tracker */}
            <div>
              <HandoverProgressTracker
                currentStage={handover.current_stage || 1}
                stageData={handover.pipeline_stages || initializeHandoverPipelineStages()}
                onStageClick={(stageId) => onStageClick(stageId, handover.id)}
                overallProgress={handover.overall_progress || 0}
                handoverId={handover.id}
                onStageUpdate={onStageUpdate}
              />
            </div>

            {/* Progress Cards Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center text-sm text-purple-800">
                <span className="mr-2">📋</span>
                <span>Click on any accessible stage card above to view details and update status</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
