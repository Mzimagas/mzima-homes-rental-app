'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui'
import { HandoverItem } from '../properties/types/property-management.types'
import { useTabState, TabNavigation, TabContent, HANDOVER_TABS } from '../properties/utils/tab-utils'
import { formatCurrency } from '../../lib/export-utils'

interface ClientHandoverViewProps {
  propertyId: string
  onClose: () => void
}

interface ClientHandoverData {
  handover: HandoverItem
  client_access: {
    can_view_documents: boolean
    can_view_financials: boolean
    can_download_reports: boolean
  }
}

export default function ClientHandoverView({
  propertyId,
  onClose,
}: ClientHandoverViewProps) {
  const [handoverData, setHandoverData] = useState<ClientHandoverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { activeTab, setActiveTab } = useTabState({
    defaultTab: 'details',
    persistKey: `client-handover-${propertyId}`
  })

  useEffect(() => {
    loadHandoverData()
  }, [propertyId])

  const loadHandoverData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/clients/property/${propertyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Property handover data not found')
        }
        throw new Error('Failed to load handover data')
      }

      const data = await response.json()
      setHandoverData(data)
    } catch (err) {
      console.error('Error loading handover data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load handover data')
    } finally {
      setLoading(false)
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
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
    } as const
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading handover details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Handover Details</h4>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Details</h4>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadHandoverData} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!handoverData) {
    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Handover Details</h4>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Handover Data</h4>
          <p className="text-gray-600">This property is not currently in the handover process.</p>
        </div>
      </div>
    )
  }

  const { handover, client_access } = handoverData

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Handover Details</h4>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Progress Bar */}
      {handover.overall_progress !== undefined && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{handover.overall_progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${handover.overall_progress}%` }}
            ></div>
          </div>
        </div>
      )}

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
                  <p className="text-gray-700">
                    <span className="font-medium">Current Stage:</span> {handover.current_stage}
                  </p>
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
                <h4 className="text-sm font-medium text-gray-900 mb-2">Timeline</h4>
                <div className="space-y-2">
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
                  <p className="text-gray-700">
                    <span className="font-medium">Legal Representative:</span>{' '}
                    {handover.legal_representative || 'Not specified'}
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
            {client_access.can_view_documents ? (
              <div className="text-center py-8">
                <div className="text-blue-400 text-4xl mb-4">📄</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Documents</h4>
                <p className="text-gray-600">Document access will be implemented in the next phase.</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">🔒</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Documents Not Available</h4>
                <p className="text-gray-600">Document access is not available at this stage of the handover process.</p>
              </div>
            )}
          </div>
        </TabContent>

        <TabContent activeTab={activeTab} tabId="financial">
          <div className="space-y-6">
            {client_access.can_view_financials ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Financial Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {handover.asking_price_kes && (
                      <div>
                        <span className="font-medium text-gray-700">Asking Price:</span>
                        <p className="text-gray-600">{formatCurrency(handover.asking_price_kes)}</p>
                      </div>
                    )}
                    {handover.negotiated_price_kes && (
                      <div>
                        <span className="font-medium text-gray-700">Negotiated Price:</span>
                        <p className="text-gray-600">{formatCurrency(handover.negotiated_price_kes)}</p>
                      </div>
                    )}
                    {handover.deposit_received_kes && (
                      <div>
                        <span className="font-medium text-gray-700">Deposit Received:</span>
                        <p className="text-gray-600">{formatCurrency(handover.deposit_received_kes)}</p>
                      </div>
                    )}
                    {handover.balance_due_kes && (
                      <div>
                        <span className="font-medium text-gray-700">Balance Due:</span>
                        <p className="text-gray-600">{formatCurrency(handover.balance_due_kes)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">🔒</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Financial Information Not Available</h4>
                <p className="text-gray-600">Financial details are not available at this stage of the handover process.</p>
              </div>
            )}
          </div>
        </TabContent>
      </div>
    </div>
  )
}
