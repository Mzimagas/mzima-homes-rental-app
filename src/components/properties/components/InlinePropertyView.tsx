'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import PropertyCard, { PropertyCardHeader, PropertyCardContent, PropertyCardFooter } from './PropertyCard'
import { PropertyWithLifecycle } from '../types/property-management.types'
import {
  getSourceIcon,
  getSourceLabel,
  getLifecycleStatusColor,
} from '../utils/property-management.utils'
import { useTabState, TabNavigation, TabContent, PROPERTY_TABS, useTabNavigation } from '../utils/tab-utils'
import supabase from '../../../lib/supabase-client'

import PropertyAcquisitionFinancials from './PropertyAcquisitionFinancials'
import PurchasePipelineDocuments from './PurchasePipelineDocuments'
import DirectAdditionDocumentsV2 from './DirectAdditionDocumentsV2'
import HandoverDocumentsV2 from './HandoverDocumentsV2'

import SubdivisionProgressTracker from './SubdivisionProgressTracker'
import SubdivisionStageModal from './SubdivisionStageModal'
import { PurchaseItem } from '../types/purchase-pipeline.types'
import { SubdivisionPipelineStageData } from '../types/property-management.types'
import { PurchasePipelineService } from '../services/purchase-pipeline.service'
import {
  initializePipelineStages,
  getPurchaseStatusColor,
  formatCurrency,
  calculateBalanceDue,
} from '../utils/purchase-pipeline.utils'
import {
  initializeSubdivisionPipelineStages,
  calculateSubdivisionOverallProgress,
  getCurrentSubdivisionStage,
  mapSubdivisionStatusToStages,
  getCurrentSubdivisionStageFromStatus,
  calculateSubdivisionProgressFromStatus,
} from '../utils/subdivision-pipeline.utils'

interface InlinePropertyViewProps {
  property: PropertyWithLifecycle
  onClose: () => void
}

interface PropertyDocument {
  id: string
  title: string
  doc_type: string
  file_url: string
  file_name: string
  file_size_bytes: number
  mime_type: string
  uploaded_at: string
  description?: string
}

interface PurchasePipelineDocument {
  stage_id: number
  stage_name: string
  documents: PropertyDocument[]
}

type TabType = 'details' | 'financial' | 'documents'

export default function InlinePropertyView({ property, onClose }: InlinePropertyViewProps) {
  const { activeTab, setActiveTab } = useTabState({
    defaultTab: 'details',
    persistKey: `property-${property.id}`
  })
  const [documents, setDocuments] = useState<PropertyDocument[]>([])
  const [pipelineDocuments, setPipelineDocuments] = useState<PurchasePipelineDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Purchase pipeline state
  const [purchaseData, setPurchaseData] = useState<PurchaseItem | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)

  // Subdivision pipeline state
  const [subdivisionData, setSubdivisionData] = useState<any>(null)
  const [showSubdivisionStageModal, setShowSubdivisionStageModal] = useState(false)
  const [selectedSubdivisionStageId, setSelectedSubdivisionStageId] = useState<number | null>(null)
  const [subdivisionLoading, setSubdivisionLoading] = useState(false)

  useEffect(() => {
    loadDocuments()
    loadPipelineDocuments()
    loadPurchaseData()
    loadSubdivisionData()
  }, [property.id])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'property')
        .eq('entity_id', property.id)
        .eq('is_current_version', true)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const loadPipelineDocuments = async () => {
    try {
      // Only load pipeline documents if property came from purchase pipeline
      if (property.property_source !== 'PURCHASE_PIPELINE') {
        return
      }

      // Check if this property came from purchase pipeline
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchase_pipeline')
        .select('id, pipeline_stages')
        .eq('completed_property_id', property.id)
        .single()

      if (purchaseError || !purchaseData) return

      // Load documents for each pipeline stage
      const stageDocuments: PurchasePipelineDocument[] = []
      const stages = purchaseData.pipeline_stages || []

      for (const stage of stages) {
        const { data: stageDocsData, error: stageDocsError } = await supabase
          .from('documents')
          .select('*')
          .eq('entity_type', 'purchase_stage')
          .eq('entity_id', `${purchaseData.id}_${stage.id}`)
          .eq('is_current_version', true)

        if (!stageDocsError && stageDocsData) {
          stageDocuments.push({
            stage_id: stage.id,
            stage_name: stage.name,
            documents: stageDocsData,
          })
        }
      }

      setPipelineDocuments(stageDocuments)
    } catch (error) {}
  }

  const loadPurchaseData = async () => {
    try {
      setPipelineLoading(true)

      // Only load if property came from purchase pipeline
      if (property.property_source !== 'PURCHASE_PIPELINE') {
        setPurchaseData(null)
        return
      }

      // First try to find by completed_property_id
      let { data: purchaseData, error: purchaseError } = await supabase
        .from('purchase_pipeline')
        .select('*')
        .eq('completed_property_id', property.id)
        .maybeSingle()

      // If not found by completed_property_id, try to find by source_reference_id
      if (!purchaseData && property.source_reference_id) {
        const { data: refData, error: refError } = await supabase
          .from('purchase_pipeline')
          .select('*')
          .eq('id', property.source_reference_id)
          .maybeSingle()

        purchaseData = refData
        purchaseError = refError
      }

      if (purchaseError) {
        return
      }

      if (purchaseData) {
        setPurchaseData(purchaseData)
      } else {
        // No purchase data found, which is fine for non-pipeline properties
        setPurchaseData(null)
      }
    } catch (error) {
      setPurchaseData(null)
    } finally {
      setPipelineLoading(false)
    }
  }

  const loadSubdivisionData = async () => {
    try {
      setSubdivisionLoading(true)

      // Only load if property came from subdivision process
      if (property.property_source !== 'SUBDIVISION_PROCESS') {
        setSubdivisionData(null)
        return
      }

      // Try to find subdivision data by source_reference_id
      if (property.source_reference_id) {
        const { data: subdivisionData, error: subdivisionError } = await supabase
          .from('property_subdivisions')
          .select('*')
          .eq('id', property.source_reference_id)
          .maybeSingle()

        if (subdivisionError) {
          return
        }

        if (subdivisionData) {
          // Use saved pipeline stages if available, otherwise initialize default stages
          let stageData = subdivisionData.pipeline_stages
          let currentStage = subdivisionData.current_stage
          let overallProgress = subdivisionData.overall_progress

          // If no saved pipeline stages, initialize with default empty stages (not demo data)
          if (!stageData || stageData.length === 0) {
            stageData = initializeSubdivisionPipelineStages()
            currentStage = 1
            overallProgress = 0
          }

          setSubdivisionData({
            ...subdivisionData,
            pipeline_stages: stageData,
            current_stage: currentStage,
            overall_progress: overallProgress,
          })
        } else {
          setSubdivisionData(null)
        }
      } else {
        setSubdivisionData(null)
      }
    } catch (error) {
      setSubdivisionData(null)
    } finally {
      setSubdivisionLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      setUploading(true)

      for (const file of Array.from(files)) {
        // Upload to storage
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const extension = file.name.split('.').pop()
        const fileName = `${timestamp}_${randomString}.${extension}`
        const filePath = `properties/${property.id}/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Store the file path for signed URL generation
        // Create document record
        const { error: dbError } = await supabase.from('documents').insert({
          entity_type: 'property',
          entity_id: property.id,
          doc_type: 'other',
          title: file.name.split('.')[0],
          description: `Uploaded for ${property.name}`,
          file_url: filePath, // Store the file path instead of public URL
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          access_level: 'internal',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || 'unknown',
        })

        if (dbError) throw dbError
      }

      await loadDocuments()
    } catch (error) {
      alert('Failed to upload files')
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleDownload = async (doc: PropertyDocument) => {
    try {
      // Use the full file_url path instead of just the filename
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_url, 3600)

      if (error) throw error

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      alert('Failed to download document')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Subdivision pipeline interaction handlers
  const handleSubdivisionStageClick = (stageId: number) => {
    setSelectedSubdivisionStageId(stageId)
    setShowSubdivisionStageModal(true)
  }

  const handleSubdivisionStageUpdate = async (
    subdivisionId: string,
    stageId: number,
    newStatus: string,
    notes?: string
  ) => {
    try {
      // Update local subdivision data first for immediate UI feedback
      if (subdivisionData) {
        const updatedStages = subdivisionData.pipeline_stages.map(
          (stage: SubdivisionPipelineStageData) => {
            if (stage.stage_id === stageId) {
              // Handle date logic based on status
              const updatedStage = {
                ...stage,
                status: newStatus,
                notes: notes || stage.notes,
              }

              // Set dates based on new status
              if (newStatus === 'Not Started') {
                // Reset all dates when reverting to not started
                updatedStage.started_date = undefined
                updatedStage.completed_date = undefined
              } else if (['In Progress', 'Pending Review', 'Under Review'].includes(newStatus)) {
                // Set started date if not already set, clear completed date
                updatedStage.started_date = stage.started_date || new Date().toISOString()
                updatedStage.completed_date = undefined
              } else if (['Completed', 'Approved', 'Finalized'].includes(newStatus)) {
                // Set both started and completed dates
                updatedStage.started_date = stage.started_date || new Date().toISOString()
                updatedStage.completed_date = new Date().toISOString()
              }

              return updatedStage
            }
            return stage
          }
        )

        const currentStage = getCurrentSubdivisionStage(updatedStages)
        const overallProgress = calculateSubdivisionOverallProgress(updatedStages)

        const updatedSubdivisionData = {
          ...subdivisionData,
          pipeline_stages: updatedStages,
          current_stage: currentStage,
          overall_progress: overallProgress,
        }

        // Update local state immediately for UI responsiveness
        setSubdivisionData(updatedSubdivisionData)

        // Save to database
        const response = await fetch(`/api/property-subdivisions/${subdivisionId}/stages`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pipeline_stages: updatedStages,
            current_stage: currentStage,
            overall_progress: overallProgress,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save subdivision stage update')
        }
      }
    } catch (error) {
      // Reload subdivision data to revert any local changes if save failed
      await loadSubdivisionData()
      throw error
    }
  }

  const getCurrentSubdivisionStageData = () => {
    if (!subdivisionData || !selectedSubdivisionStageId) return undefined
    return subdivisionData.pipeline_stages?.find(
      (stage: SubdivisionPipelineStageData) => stage.stage_id === selectedSubdivisionStageId
    )
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
    return '📎'
  }

  // Helper function to refresh property data after financial updates
  const handleFinancialUpdate = (propertyId: string) => {
    // This could trigger a refresh of the property data if needed
  }





  // Listen for cross-component navigation
  useTabNavigation(property.id, setActiveTab)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
            <span className="text-lg">{getSourceIcon(property.property_source)}</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {getSourceLabel(property.property_source)}
            </span>
            {property.lifecycle_status && (
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${getLifecycleStatusColor(property.lifecycle_status)}`}
              >
                {property.lifecycle_status.replace('_', ' ')}
              </span>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            ✕ Close
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <TabNavigation
          tabs={PROPERTY_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pills"
        />
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <TabContent activeTab={activeTab} tabId="details">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Property Name</h4>
                <p className="text-gray-700">{property.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Property Type</h4>
                <p className="text-gray-700">
                  {property.property_type?.replace('_', ' ') || 'Unknown'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Physical Address</h4>
                <p className="text-gray-700">{property.physical_address}</p>
              </div>
              {property.total_area_acres && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Total Area</h4>
                  <p className="text-gray-700">{property.total_area_acres} acres</p>
                </div>
              )}
              {property.purchase_completion_date && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Purchase Date</h4>
                  <p className="text-gray-700">
                    {new Date(property.purchase_completion_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {property.subdivision_date && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Subdivision Date</h4>
                  <p className="text-gray-700">
                    {new Date(property.subdivision_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {property.acquisition_notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-gray-700 italic">{property.acquisition_notes}</p>
              </div>
            )}
          </div>
        </TabContent>

        <TabContent activeTab={activeTab} tabId="financial">
          <PropertyAcquisitionFinancials property={property} onUpdate={handleFinancialUpdate} />
        </TabContent>

        <TabContent activeTab={activeTab} tabId="documents">
          <div className="space-y-6">
            {/* Direct Addition Documents V2 - New Expandable Card System */}
            {property.property_source === 'DIRECT_ADDITION' && (
              <DirectAdditionDocumentsV2 propertyId={property.id} propertyName={property.name} />
            )}

            {/* Handover Documents V2 - For handover properties */}
            {(property.handover_status === 'IN_PROGRESS' ||
              property.handover_status === 'COMPLETED' ||
              property.handover_status === 'PENDING' ||
              property.handover_status === 'IDENTIFIED' ||
              property.handover_status === 'NEGOTIATING' ||
              property.handover_status === 'UNDER_CONTRACT' ||
              property.handover_status === 'DUE_DILIGENCE' ||
              property.handover_status === 'FINANCING' ||
              property.handover_status === 'CLOSING' ||
              (property.handover_status && property.handover_status !== 'NOT_STARTED' && property.handover_status !== 'CANCELLED')) && (
              <HandoverDocumentsV2 propertyId={property.id} propertyName={property.name} />
            )}

            {/* Purchase Pipeline Interface - Only show for purchase pipeline properties */}
            {property.property_source === 'PURCHASE_PIPELINE' && (
              <div>
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

                    {/* Purchase Card with Enhanced Border Styling */}
                    <PropertyCard
                      status={purchaseData.purchase_status}
                      interactive={false}
                      aria-label={`Purchase details: ${purchaseData.property_name}`}
                    >
                      <PropertyCardHeader>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                          <div className="md:col-span-2">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {purchaseData.property_name}
                              </h3>
                              <span className="text-lg">{getSourceIcon('PURCHASE_PIPELINE')}</span>
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                {getSourceLabel('PURCHASE_PIPELINE')}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${getPurchaseStatusColor(purchaseData.purchase_status)}`}
                              >
                                {purchaseData.purchase_status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-2">{purchaseData.property_address}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              {purchaseData.seller_name && (
                                <span>Seller: {purchaseData.seller_name}</span>
                              )}
                              {purchaseData.asking_price_kes && (
                                <span>Asking: {formatCurrency(purchaseData.asking_price_kes)}</span>
                              )}
                              {purchaseData.negotiated_price_kes && (
                                <span>
                                  Negotiated: {formatCurrency(purchaseData.negotiated_price_kes)}
                                </span>
                              )}
                              <span>Progress: {purchaseData.overall_progress}%</span>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <ViewOnGoogleMapsButton
                              lat={(purchaseData as any).property_lat ?? null}
                              lng={(purchaseData as any).property_lng ?? null}
                              address={
                                (purchaseData as any).property_physical_address ||
                                purchaseData.property_address ||
                                purchaseData.property_name
                              }
                              propertyName={purchaseData.property_name}
                              debug={process.env.NODE_ENV === 'development'}
                              debugContext={`Purchase Pipeline - ${purchaseData.property_name}`}
                            />
                          </div>
                        </div>
                      </PropertyCardHeader>

                      <PropertyCardContent>
                        {/* Financial Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-xs text-gray-500">Asking Price</div>
                            <div className="font-medium">
                              {formatCurrency(purchaseData.asking_price_kes)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Negotiated Price</div>
                            <div className="font-medium">
                              {formatCurrency(purchaseData.negotiated_price_kes)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Deposit Paid</div>
                            <div className="font-medium">
                              {formatCurrency(purchaseData.deposit_paid_kes)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Balance Due</div>
                            <div className="font-medium">
                              {formatCurrency(
                                calculateBalanceDue(
                                  purchaseData.negotiated_price_kes,
                                  purchaseData.asking_price_kes,
                                  purchaseData.deposit_paid_kes
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </PropertyCardContent>
                    </PropertyCard>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="text-4xl mb-4">🏢</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Purchase Pipeline Data Not Found
                    </h3>
                    <p className="text-gray-600">
                      This property was marked as coming from the purchase pipeline, but the
                      pipeline data could not be loaded.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Subdivision Pipeline Interface - Only show for subdivision process properties */}
            {property.property_source === 'SUBDIVISION_PROCESS' && (
              <div>
                {subdivisionLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading subdivision data...</p>
                  </div>
                ) : subdivisionData ? (
                  <div className="space-y-6">
                    {/* Subdivision Progress Tracker */}
                    <SubdivisionProgressTracker
                      currentStage={subdivisionData.current_stage || 1}
                      stageData={
                        subdivisionData.pipeline_stages || initializeSubdivisionPipelineStages()
                      }
                      onStageClick={handleSubdivisionStageClick}
                      overallProgress={subdivisionData.overall_progress || 0}
                      subdivisionId={subdivisionData.id}
                      onStageUpdate={handleSubdivisionStageUpdate}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="text-4xl mb-4">🏗️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Subdivision Data Not Found
                    </h3>
                    <p className="text-gray-600">
                      This property was marked as coming from a subdivision process, but the
                      subdivision data could not be loaded.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pipeline Documents - Only show for non-purchase pipeline properties */}
            {property.property_source !== 'PURCHASE_PIPELINE' && pipelineDocuments.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Purchase Pipeline Documents
                </h4>
                <div className="space-y-4">
                  {pipelineDocuments.map((stageDoc) => (
                    <div key={stageDoc.stage_id} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-3">{stageDoc.stage_name}</h5>
                      {stageDoc.documents.length === 0 ? (
                        <p className="text-gray-500 text-sm">No documents for this stage</p>
                      ) : (
                        <div className="space-y-2">
                          {stageDoc.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center space-x-2">
                                <span>{getFileIcon(doc.mime_type)}</span>
                                <span className="text-sm font-medium">{doc.title}</span>
                                <span className="text-xs text-gray-500">
                                  ({formatFileSize(doc.file_size_bytes)})
                                </span>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                              >
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback message when no document components render */}
            {!(property.property_source === 'DIRECT_ADDITION') &&
             !(property.handover_status === 'IN_PROGRESS' ||
               property.handover_status === 'COMPLETED' ||
               property.handover_status === 'PENDING' ||
               property.handover_status === 'IDENTIFIED' ||
               property.handover_status === 'NEGOTIATING' ||
               property.handover_status === 'UNDER_CONTRACT' ||
               property.handover_status === 'DUE_DILIGENCE' ||
               property.handover_status === 'FINANCING' ||
               property.handover_status === 'CLOSING' ||
               (property.handover_status && property.handover_status !== 'NOT_STARTED' && property.handover_status !== 'CANCELLED')) &&
             !(property.property_source === 'PURCHASE_PIPELINE') &&
             !(property.property_source === 'SUBDIVISION_PROCESS') && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-gray-600">
                  <p className="text-lg font-medium">No documents available</p>
                  <p className="mt-2">Document management is not available for this property type at this time.</p>
                </div>
              </div>
            )}
          </div>
        </TabContent>
      </div>

      {/* Stage Modal for Subdivision Pipeline */}
      {showSubdivisionStageModal && selectedSubdivisionStageId && subdivisionData && (
        <SubdivisionStageModal
          isOpen={showSubdivisionStageModal}
          onClose={() => setShowSubdivisionStageModal(false)}
          stageId={selectedSubdivisionStageId}
          subdivisionId={subdivisionData.id}
          stageData={getCurrentSubdivisionStageData()}
          onStageUpdate={handleSubdivisionStageUpdate}
        />
      )}
    </div>
  )
}
