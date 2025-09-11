'use client'

import { useState, useEffect } from 'react'
import { useTabState, TabNavigation, TabContent, HANDOVER_TABS } from '../../../components/properties/utils/tab-utils'
import ReadOnlyHandoverDocuments from './ReadOnlyHandoverDocuments'
import ReadOnlyHandoverFinancials from './ReadOnlyHandoverFinancials'

interface ReadOnlyHandoverViewProps {
  propertyId: string
}

interface PropertyData {
  id: string
  name: string
  location: string
  property_type: string
  asking_price_kes: number
  description: string
  images: string[]
}

interface HandoverData {
  id: string
  handover_status: string
  current_stage: number
  overall_progress: number
  pipeline_stages: any[]
  created_at: string
  expected_completion_date?: string
}

interface ClientPropertyResponse {
  success: boolean
  property: {
    id: string
    property: PropertyData
    handover: HandoverData
    client_access: {
      can_view_documents: boolean
      can_view_financials: boolean
      can_download_reports: boolean
    }
  }
}

export default function ReadOnlyHandoverView({ propertyId }: ReadOnlyHandoverViewProps) {
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null)
  const [handoverData, setHandoverData] = useState<HandoverData | null>(null)
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
        throw new Error('Failed to load property data')
      }

      const data: ClientPropertyResponse = await response.json()

      if (!data.success || !data.property) {
        throw new Error('Invalid response format')
      }

      setPropertyData(data.property.property)
      setHandoverData(data.property.handover)
    } catch (error) {
      console.error('Error loading handover data:', error)
      setError('Failed to load property details')
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
    } as const
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading property details...</span>
      </div>
    )
  }

  if (error || !handoverData || !propertyData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Property details not available'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Property Details</h4>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Read-only view</span>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
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
                    <span className="font-medium">Name:</span> {propertyData.name}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Type:</span> {propertyData.property_type}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Location:</span> {propertyData.location}
                  </p>
                  {propertyData.asking_price_kes && (
                    <p className="text-gray-700">
                      <span className="font-medium">Asking Price:</span> KES {propertyData.asking_price_kes.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Handover Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getHandoverStatusColor(
                        handoverData.handover_status
                      )}`}
                    >
                      {handoverData.handover_status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${handoverData.overall_progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">{handoverData.overall_progress}% Complete</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Timeline</h4>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Started:</span>{' '}
                    {new Date(handoverData.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Expected Completion:</span>{' '}
                    {handoverData.expected_completion_date
                      ? new Date(handoverData.expected_completion_date).toLocaleDateString()
                      : 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Current Stage:</span> {handoverData.current_stage}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm">
                    {propertyData.description || 'No description available'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabContent>

        <TabContent activeTab={activeTab} tabId="documents">
          <ReadOnlyHandoverDocuments
            propertyId={propertyId}
            propertyName={propertyData.name}
          />
        </TabContent>

        <TabContent activeTab={activeTab} tabId="financial">
          <ReadOnlyHandoverFinancials
            propertyId={propertyId}
            handoverData={handoverData}
            propertyPrice={propertyData.asking_price_kes}
          />
        </TabContent>
      </div>
    </div>
  )
}
