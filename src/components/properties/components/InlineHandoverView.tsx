'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import HandoverFinancialSection from './HandoverFinancialSection'
import PropertyAcquisitionFinancials from './PropertyAcquisitionFinancials'
import { HandoverItem } from '../types/property-management.types'
import { initializeHandoverPipelineStages } from '../utils/property-management.utils'
import {
  HandoverFinancialsService,
  HandoverFinancialSummary,
} from '../services/handover-financials.service'
import { useTabState, TabNavigation, TabContent, HANDOVER_TABS, useTabNavigation } from '../utils/tab-utils'

import HandoverDocumentsV2 from './HandoverDocumentsV2'


interface InlineHandoverViewProps {
  handover: HandoverItem
  onClose: () => void
  onStageClick: (stageId: number, handoverId: string) => void
  onStageUpdate: (
    handoverId: string,
    stageId: number,
    newStatus: string,
    notes?: string
  ) => Promise<void>
}

export default function InlineHandoverView({
  handover,
  onClose,
  onStageClick,
  onStageUpdate,
}: InlineHandoverViewProps) {
  const { activeTab, setActiveTab } = useTabState({
    defaultTab: 'details',
    persistKey: `handover-${handover.id}`
  })

  // Listen for cross-component navigation (e.g., from "Make Payment" buttons)
  useTabNavigation(handover.property_id, setActiveTab)

  const [financialSummary, setFinancialSummary] = useState<HandoverFinancialSummary | null>(null)
  const [loadingFinancials, setLoadingFinancials] = useState(false)
  const [financialError, setFinancialError] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState<number>(handover.current_stage || 1)

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
      const summary = await HandoverFinancialsService.getHandoverFinancialSummary(
        handover.property_id
      )
      setFinancialSummary(summary)
    } catch (error) {
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
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <TabNavigation
          tabs={HANDOVER_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
        />
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        <TabContent activeTab={activeTab} tabId="details">
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
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getHandoverStatusColor(
                        handover.handover_status
                      )}`}
                    >
                      {handover.handover_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Buyer Information</h4>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Name:</span>{' '}
                    {handover.buyer_name || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Contact:</span>{' '}
                    {handover.buyer_contact || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span>{' '}
                    {handover.buyer_email || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Address:</span>{' '}
                    {handover.buyer_address || 'Not specified'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Details</h4>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Legal Representative:</span>{' '}
                    {handover.legal_representative || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Target Completion:</span>{' '}
                    {handover.target_completion_date
                      ? new Date(handover.target_completion_date).toLocaleDateString()
                      : 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Actual Completion:</span>{' '}
                    {handover.actual_completion_date
                      ? new Date(handover.actual_completion_date).toLocaleDateString()
                      : 'Not completed'}
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
        </TabContent>



        <TabContent activeTab={activeTab} tabId="documents">
          <div className="space-y-6">
            <HandoverDocumentsV2 propertyId={handover.property_id} propertyName={handover.property_name} />
          </div>
        </TabContent>


        <TabContent activeTab={activeTab} tabId="financial">
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
              <div className="space-y-6">
                {/* Use PropertyAcquisitionFinancials for acquisition costs functionality */}
                <PropertyAcquisitionFinancials
                  property={{
                    id: handover.property_id,
                    name: handover.property_name,
                    address: handover.property_address,
                    property_type: handover.property_type,
                    purchase_price_agreement_kes: handover.negotiated_price_kes || handover.asking_price_kes,
                    // Add other required PropertyWithLifecycle fields with defaults
                    created_at: handover.created_at,
                    updated_at: handover.updated_at,
                  } as any}
                  onUpdate={() => loadFinancialData()}
                />

                {/* Keep HandoverFinancialSection for handover-specific features like payment receipts */}
                <HandoverFinancialSection
                  propertyId={handover.property_id}
                  financialSummary={financialSummary}
                  onDataUpdate={loadFinancialData}
                />
              </div>
            )}
          </div>
        </TabContent>
      </div>
    </div>
  )
}
