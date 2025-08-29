'use client'

import { useEffect, useState } from 'react'
import { Button } from '../../ui'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'

import PropertyAcquisitionFinancials from './PropertyAcquisitionFinancials'
import PurchasePipelineDocuments from './PurchasePipelineDocuments'
import supabase from '../../../lib/supabase-client'
import { PurchaseItem, PipelineStageData } from '../types/purchase-pipeline.types'
import { PropertyWithLifecycle } from '../types/property-management.types'
import { PurchasePipelineService } from '../services/purchase-pipeline.service'
import {
  initializePipelineStages,
  getPurchaseStatusColor,
  formatCurrency,
  calculateBalanceDue,
} from '../utils/purchase-pipeline.utils'
import { getSourceIcon, getSourceLabel } from '../utils/property-management.utils'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'

interface InlinePurchaseViewProps {
  purchase: PurchaseItem
  onClose?: () => void
  onPurchaseUpdate?: (updatedPurchase: PurchaseItem) => void
}

type TabType = 'details' | 'location' | 'financial' | 'documents'

export default function InlinePurchaseView({
  purchase,
  onClose,
  onPurchaseUpdate,
}: InlinePurchaseViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')

  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [purchaseData, setPurchaseData] = useState<PurchaseItem | null>(null)

  // Always allow financial management for purchase pipeline entries
  const { properties } = usePropertyAccess()
  const hasPropertyAccess = true // User owns the purchase pipeline entry

  // Convert PurchaseItem to PropertyWithLifecycle format for PropertyAcquisitionFinancials
  const convertToProperty = (purchaseItem: PurchaseItem): PropertyWithLifecycle => {
    return {
      id: purchaseItem.id,
      name: purchaseItem.property_name,
      physical_address: purchaseItem.property_address || '',
      property_type: 'UNKNOWN' as any, // Default since purchase pipeline doesn't have this
      property_source: 'PURCHASE_PIPELINE',
      lifecycle_status: 'ACTIVE',
      purchase_price_agreement_kes:
        purchaseItem.negotiated_price_kes || purchaseItem.asking_price_kes || 0,
      purchase_completion_date: null,
      total_area_acres: null,
      subdivision_status: 'NOT_STARTED',
      subdivision_date: null,
      handover_status: 'PENDING',
      handover_date: null,
      acquisition_notes: null,
      created_at: purchaseItem.created_at,
      updated_at: purchaseItem.updated_at,
    }
  }

  useEffect(() => {
    loadPurchaseData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase.id])

  // Removed old event listener - using new direct navigation approach

  const loadPurchaseData = async () => {
    try {
      setPipelineLoading(true)
      const { data, error } = await supabase
        .from('purchase_pipeline')
        .select('*')
        .eq('id', purchase.id)
        .single()

      if (!error && data) {
        // Normalize field names to match PurchaseItem interface where needed
        const normalized: PurchaseItem = {
          id: data.id,
          property_name: data.property_name,
          property_address: data.property_address,
          property_type: data.property_type,
          seller_name: data.seller_name || undefined,
          seller_contact: data.seller_contact || undefined,
          asking_price_kes: data.asking_price_kes || undefined,
          negotiated_price_kes: data.negotiated_price_kes || undefined,
          deposit_paid_kes: data.deposit_paid_kes || undefined,
          purchase_status: data.purchase_status,
          target_completion_date: data.target_completion_date || undefined,
          legal_representative: data.legal_representative || undefined,
          financing_source: data.financing_source || undefined,
          expected_rental_income_kes: data.expected_rental_income_kes || undefined,
          expected_roi_percentage: data.expected_roi_percentage || undefined,
          risk_assessment: data.risk_assessment || undefined,
          property_condition_notes: data.property_condition_notes || undefined,
          current_stage: data.current_stage || 1,
          pipeline_stages:
            (data.pipeline_stages as PipelineStageData[]) || initializePipelineStages(),
          overall_progress: data.overall_progress || 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }
        setPurchaseData(normalized)
        // Notify parent of updated purchase data
        if (onPurchaseUpdate) {
          onPurchaseUpdate(normalized)
        }
      } else {
        setPurchaseData(purchase)
      }
    } catch (err) {
            setPurchaseData(purchase)
    } finally {
      setPipelineLoading(false)
    }
  }

  const handleStageClick = (stageId: number) => {
        // Stage functionality will be integrated into documents view
  }

  const handleStageUpdate = async (
    purchaseId: string,
    stageId: number,
    newStatus: string,
    notes?: string,
    stageData?: any
  ) => {
    await PurchasePipelineService.updateStageStatus(
      purchaseId,
      stageId,
      newStatus,
      notes,
      stageData
    )
    await loadPurchaseData()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">Purchase Details</h3>
            <span className="text-lg">{getSourceIcon('PURCHASE_PIPELINE')}</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {getSourceLabel('PURCHASE_PIPELINE')}
            </span>
            {purchaseData?.purchase_status && (
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${getPurchaseStatusColor(purchaseData.purchase_status)}`}
              >
                {purchaseData.purchase_status.replace('_', ' ')}
              </span>
            )}
          </div>
          {onClose && (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex border-b border-gray-200 mb-4">
          {(['details', 'location', 'financial', 'documents'] as TabType[]).map((tab) => (
            <button
              key={tab}
              data-tab={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 focus:outline-none transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Property Name</h4>
              <p className="text-gray-700">
                {purchaseData?.property_name || purchase.property_name}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Property Type</h4>
              <p className="text-gray-700">
                {purchaseData?.property_type?.replace('_', ' ') ||
                  purchase.property_type?.replace('_', ' ')}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Address</h4>
              <p className="text-gray-700">
                {purchaseData?.property_address || purchase.property_address}
              </p>
            </div>
            {purchaseData?.seller_name && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Seller</h4>
                <p className="text-gray-700">{purchaseData.seller_name}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-4">
            <ViewOnGoogleMapsButton
              address={
                purchaseData?.property_address ||
                purchase.property_address ||
                purchase.property_name
              }
              propertyName={purchaseData?.property_name || purchase.property_name}
            />
          </div>
        )}

        {activeTab === 'financial' && (
          <PropertyAcquisitionFinancials
            property={convertToProperty(purchaseData || purchase)}
            onUpdate={(propertyId) => {
                          }}
          />
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            {pipelineLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading pipeline data...</p>
              </div>
            ) : purchaseData ? (
              <div className="space-y-6">
                {/* Purchase Pipeline Documents */}
                <PurchasePipelineDocuments
                  propertyId={purchaseData.id}
                  propertyName={purchaseData.property_name}
                />
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">🏢</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Purchase Pipeline Data Not Found
                </h3>
                <p className="text-gray-600">
                  Pipeline data could not be loaded for this purchase.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
