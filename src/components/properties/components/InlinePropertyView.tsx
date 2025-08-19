'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import { PropertyWithLifecycle } from '../types/property-management.types'
import {
  getSourceIcon,
  getSourceLabel,
  getLifecycleStatusColor
} from '../utils/property-management.utils'
import supabase from '../../../lib/supabase-client'
import PropertyAcquisitionFinancials from './PropertyAcquisitionFinancials'
import ProgressTracker from './ProgressTracker'
import StageModal from './StageModal'
import { PurchaseItem } from '../types/purchase-pipeline.types'
import { PurchasePipelineService } from '../services/purchase-pipeline.service'
import {
  initializePipelineStages,
  getPurchaseStatusColor,
  formatCurrency,
  calculateBalanceDue
} from '../utils/purchase-pipeline.utils'

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

type TabType = 'details' | 'location' | 'financial' | 'documents'

export default function InlinePropertyView({ property, onClose }: InlinePropertyViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [documents, setDocuments] = useState<PropertyDocument[]>([])
  const [pipelineDocuments, setPipelineDocuments] = useState<PurchasePipelineDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Purchase pipeline state
  const [purchaseData, setPurchaseData] = useState<PurchaseItem | null>(null)
  const [showStageModal, setShowStageModal] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)

  useEffect(() => {
    loadDocuments()
    loadPipelineDocuments()
    loadPurchaseData()
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
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPipelineDocuments = async () => {
    try {
      // Check if this property came from purchase pipeline
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchase_pipeline')
        .select('id, pipeline_stages')
        .eq('property_id', property.id)
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
            documents: stageDocsData
          })
        }
      }

      setPipelineDocuments(stageDocuments)
    } catch (error) {
      console.error('Error loading pipeline documents:', error)
    }
  }

  const loadPurchaseData = async () => {
    try {
      setPipelineLoading(true)

      // Only load if property came from purchase pipeline
      if (property.property_source !== 'PURCHASE_PIPELINE') {
        setPurchaseData(null)
        return
      }

      // First try to find by property_id
      let { data: purchaseData, error: purchaseError } = await supabase
        .from('purchase_pipeline')
        .select('*')
        .eq('property_id', property.id)
        .maybeSingle()

      // If not found by property_id, try to find by source_reference_id
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
        console.error('Error loading purchase data:', purchaseError)
        return
      }

      if (purchaseData) {
        setPurchaseData(purchaseData)
      } else {
        // No purchase data found, which is fine for non-pipeline properties
        setPurchaseData(null)
      }
    } catch (error) {
      console.error('Error loading purchase data:', error)
      setPurchaseData(null)
    } finally {
      setPipelineLoading(false)
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
            upsert: false
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        // Create document record
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            entity_type: 'property',
            entity_id: property.id,
            doc_type: 'other',
            title: file.name.split('.')[0],
            description: `Uploaded for ${property.name}`,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type,
            access_level: 'internal',
            uploaded_by: (await supabase.auth.getUser()).data.user?.id || 'unknown'
          })

        if (dbError) throw dbError
      }

      await loadDocuments()
    } catch (error) {
      console.error('Error uploading files:', error)
      alert('Failed to upload files')
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleDownload = async (doc: PropertyDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_url.split('/').pop() || '', 3600)

      if (error) throw error
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
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

  // Pipeline interaction handlers
  const handleStageClick = (stageId: number) => {
    setSelectedStageId(stageId)
    setShowStageModal(true)
  }

  const handleStageUpdate = async (purchaseId: string, stageId: number, newStatus: string, notes?: string, stageData?: any) => {
    try {
      await PurchasePipelineService.updateStageStatus(purchaseId, stageId, newStatus, notes, stageData)
      // Reload purchase data to get updated stages
      await loadPurchaseData()
    } catch (error) {
      console.error('Error updating stage:', error)
      throw error
    }
  }

  const getCurrentStageData = () => {
    if (!purchaseData?.pipeline_stages || !selectedStageId) return undefined
    return purchaseData.pipeline_stages.find(stage => stage.stage_id === selectedStageId)
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
    console.log('Financial data updated for property:', propertyId)
  }

  const tabs = [
    { id: 'details' as TabType, label: 'Basic Info', icon: '🏠' },
    { id: 'location' as TabType, label: 'Location', icon: '📍' },
    { id: 'financial' as TabType, label: 'Financial', icon: '💰' },
    { id: 'documents' as TabType, label: 'Documents', icon: '📁' }
  ]

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
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLifecycleStatusColor(property.lifecycle_status)}`}>
                {property.lifecycle_status.replace('_', ' ')}
              </span>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            ✕ Close
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Property Name</h4>
                <p className="text-gray-700">{property.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Property Type</h4>
                <p className="text-gray-700">{property.property_type?.replace('_', ' ') || 'Unknown'}</p>
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
                  <p className="text-gray-700">{new Date(property.purchase_completion_date).toLocaleDateString()}</p>
                </div>
              )}
              {property.subdivision_date && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Subdivision Date</h4>
                  <p className="text-gray-700">{new Date(property.subdivision_date).toLocaleDateString()}</p>
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
        )}

        {activeTab === 'location' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Physical Address</h4>
                <p className="text-gray-700">{property.physical_address}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Coordinates</h4>
                <p className="text-gray-700">
                  {(property as any).lat && (property as any).lng 
                    ? `${(property as any).lat}, ${(property as any).lng}`
                    : 'Not available'
                  }
                </p>
              </div>
            </div>
            <div className="flex justify-start">
              <ViewOnGoogleMapsButton
                lat={(property as any).lat ?? null}
                lng={(property as any).lng ?? null}
                address={property.physical_address ?? property.name}
                propertyName={property.name}
              />
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <PropertyAcquisitionFinancials
            property={property}
            onUpdate={handleFinancialUpdate}
          />
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
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
                    {/* Progress Tracker */}
                    <ProgressTracker
                      currentStage={purchaseData.current_stage || 1}
                      stageData={purchaseData.pipeline_stages || initializePipelineStages()}
                      onStageClick={handleStageClick}
                      overallProgress={purchaseData.overall_progress || 0}
                      purchaseId={purchaseData.id}
                      onStageUpdate={handleStageUpdate}
                    />

                    {/* Purchase Card with Direct Addition styling */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-4">
                        <div className="md:col-span-2">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{purchaseData.property_name}</h3>
                            <span className="text-lg">{getSourceIcon('PURCHASE_PIPELINE')}</span>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              {getSourceLabel('PURCHASE_PIPELINE')}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPurchaseStatusColor(purchaseData.purchase_status)}`}>
                              {purchaseData.purchase_status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-2">{purchaseData.property_address}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {purchaseData.seller_name && <span>Seller: {purchaseData.seller_name}</span>}
                            {purchaseData.asking_price_kes && <span>Asking: {formatCurrency(purchaseData.asking_price_kes)}</span>}
                            {purchaseData.negotiated_price_kes && <span>Negotiated: {formatCurrency(purchaseData.negotiated_price_kes)}</span>}
                            <span>Progress: {purchaseData.overall_progress}%</span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <ViewOnGoogleMapsButton
                            address={purchaseData.property_address || purchaseData.property_name}
                            propertyName={purchaseData.property_name}
                          />
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-xs text-gray-500">Asking Price</div>
                          <div className="font-medium">{formatCurrency(purchaseData.asking_price_kes)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Negotiated Price</div>
                          <div className="font-medium">{formatCurrency(purchaseData.negotiated_price_kes)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Deposit Paid</div>
                          <div className="font-medium">{formatCurrency(purchaseData.deposit_paid_kes)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Balance Due</div>
                          <div className="font-medium">
                            {formatCurrency(calculateBalanceDue(
                              purchaseData.negotiated_price_kes,
                              purchaseData.asking_price_kes,
                              purchaseData.deposit_paid_kes
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="text-4xl mb-4">🏢</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Pipeline Data Not Found</h3>
                    <p className="text-gray-600">This property was marked as coming from the purchase pipeline, but the pipeline data could not be loaded.</p>
                  </div>
                )}
              </div>
            )}

            {/* Document Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="document-upload"
                  disabled={uploading}
                />
                <label htmlFor="document-upload" className="cursor-pointer">
                  <div className="text-gray-600">
                    {uploading ? 'Uploading...' : 'Click to upload documents or drag and drop'}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    PDF, Word, Excel, Images up to 10MB each
                  </div>
                </label>
              </div>
            </div>

            {/* Property Documents */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Property Documents</h4>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getFileIcon(doc.mime_type)}</span>
                        <div>
                          <p className="font-medium text-gray-900">{doc.title}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(doc.file_size_bytes)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                          {doc.description && (
                            <p className="text-sm text-gray-600">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pipeline Documents - Only show for non-purchase pipeline properties */}
            {property.property_source !== 'PURCHASE_PIPELINE' && pipelineDocuments.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Purchase Pipeline Documents</h4>
                <div className="space-y-4">
                  {pipelineDocuments.map((stageDoc) => (
                    <div key={stageDoc.stage_id} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-3">{stageDoc.stage_name}</h5>
                      {stageDoc.documents.length === 0 ? (
                        <p className="text-gray-500 text-sm">No documents for this stage</p>
                      ) : (
                        <div className="space-y-2">
                          {stageDoc.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <span>{getFileIcon(doc.mime_type)}</span>
                                <span className="text-sm font-medium">{doc.title}</span>
                                <span className="text-xs text-gray-500">({formatFileSize(doc.file_size_bytes)})</span>
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
          </div>
        )}
      </div>

      {/* Stage Modal for Purchase Pipeline */}
      {showStageModal && selectedStageId && purchaseData && (
        <StageModal
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          stageId={selectedStageId}
          purchaseId={purchaseData.id}
          stageData={getCurrentStageData()}
          onStageUpdate={handleStageUpdate}
        />
      )}
    </div>
  )
}
