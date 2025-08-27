'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui'
import Modal from '../../ui/Modal'
import { StageModalProps } from '../types/purchase-pipeline.types'
import { getStageById } from '../utils/purchase-pipeline.utils'
import supabase from '../../../lib/supabase-client'
import { DOCUMENT_TYPES } from '../../../lib/services/documents'

interface StageDocument {
  id: string
  title: string
  file_name: string
  file_url: string
  file_size_bytes: number
  mime_type: string
  uploaded_at: string
  doc_type: string
}

// Stage-specific document requirements using actual database enum values
const STAGE_DOCUMENT_REQUIREMENTS = {
  1: { // Initial Search & Evaluation
    title: 'Property Identification Documents',
    required: [
      { type: 'photo', label: 'Property Photos', description: 'Current photos of the property' },
      { type: 'other', label: 'Location Map', description: 'Property location and access map' },
      { type: 'other', label: 'Property Details', description: 'Property specifications and features' }
    ],
    optional: [
      { type: 'other', label: 'Initial Valuation', description: 'Preliminary property valuation' },
      { type: 'correspondence', label: 'Seller Communication', description: 'Communication with property seller' }
    ]
  },
  2: { // Survey & Mapping
    title: 'Survey & Mapping Documents',
    required: [
      { type: 'survey_report', label: 'Survey Report', description: 'Professional land survey report' },
      { type: 'deed_plan', label: 'Survey Map', description: 'Detailed survey map with beacons' },
      { type: 'deed_plan', label: 'Deed Plan', description: 'Official deed plan if available' }
    ],
    optional: [
      { type: 'photo', label: 'Beacon Photos', description: 'Photos of placed survey beacons' },
      { type: 'other', label: 'Site Visit Report', description: 'Detailed site inspection report' }
    ]
  },
  3: { // Legal Verification
    title: 'Legal Verification Documents',
    required: [
      { type: 'title', label: 'Title Deed', description: 'Original or certified copy of title deed' },
      { type: 'legal', label: 'Witness Statements', description: 'Verified witness statements' },
      { type: 'legal', label: 'Legal Opinion', description: 'Lawyer\'s legal opinion on the property' }
    ],
    optional: [
      { type: 'other', label: 'Meeting Minutes', description: 'Stakeholder meeting documentation' },
      { type: 'correspondence', label: 'Legal Correspondence', description: 'Legal communication records' }
    ]
  },
  4: { // Agreement & Documentation
    title: 'Agreement & Contract Documents',
    required: [
      { type: 'agreement', label: 'Purchase Agreement', description: 'Signed purchase agreement' },
      { type: 'legal', label: 'Sale Contract', description: 'Legal sale contract' }
    ],
    optional: [
      { type: 'other', label: 'Contract Amendments', description: 'Any amendments to the original contract' },
      { type: 'legal', label: 'Contract Review', description: 'Legal review of contract terms' }
    ]
  },
  5: { // Financial Processing (Down Payment)
    title: 'Down Payment Documents',
    required: [
      { type: 'receipt', label: 'Payment Receipt', description: 'Down payment receipt' },
      { type: 'other', label: 'Bank Statement', description: 'Bank statement showing payment' }
    ],
    optional: [
      { type: 'invoice', label: 'Payment Invoice', description: 'Invoice for down payment' },
      { type: 'other', label: 'Bank Confirmation', description: 'Bank payment confirmation' }
    ]
  },
  6: { // Financial Processing (Subsequent Payments)
    title: 'Subsequent Payment Documents',
    required: [
      { type: 'receipt', label: 'Payment Receipts', description: 'All subsequent payment receipts' },
      { type: 'other', label: 'Payment Schedule', description: 'Agreed payment schedule' }
    ],
    optional: [
      { type: 'invoice', label: 'Payment Invoices', description: 'Invoices for each payment' },
      { type: 'other', label: 'Bank Statements', description: 'Bank statements for all payments' }
    ]
  },
  7: { // Final Documentation
    title: 'Final Documentation',
    required: [
      { type: 'title', label: 'Updated Title Deed', description: 'Title deed with ownership transfer' },
      { type: 'approval', label: 'Compliance Certificates', description: 'All required compliance certificates' }
    ],
    optional: [
      { type: 'other', label: 'Final Valuation', description: 'Final property valuation' },
      { type: 'other', label: 'Completion Certificate', description: 'Transaction completion certificate' }
    ]
  },
  8: { // Property Transfer & Handover
    title: 'Transfer & Handover Documents',
    required: [
      { type: 'other', label: 'Handover Certificate', description: 'Official property handover certificate' },
      { type: 'other', label: 'Keys Receipt', description: 'Receipt for property keys' }
    ],
    optional: [
      { type: 'photo', label: 'Handover Photos', description: 'Photos taken during handover' },
      { type: 'other', label: 'Condition Report', description: 'Final property condition report' }
    ]
  }
}

export default function StageModal({
  isOpen,
  onClose,
  stageId,
  purchaseId,
  stageData,
  onStageUpdate,
}: StageModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(stageData?.status || 'Not Started')
  const [notes, setNotes] = useState(stageData?.notes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [documents, setDocuments] = useState<StageDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState('')
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentDescription, setDocumentDescription] = useState('')

  const stage = getStageById(stageId)
  if (!stage) return null

  // Load documents for this stage
  useEffect(() => {
    if (isOpen && purchaseId && stageId) {
      loadStageDocuments()
    }
  }, [isOpen, purchaseId, stageId])

  const loadStageDocuments = async () => {
    try {
      setLoadingDocs(true)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'purchase_stage')
        .eq('entity_id', `${purchaseId}_${stageId}`)
        .eq('is_current_version', true)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading stage documents:', error)
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleFileUpload = async (files: FileList, documentTypeId: string) => {
    const documentType = KENYAN_PROPERTY_DOCUMENTS.find(doc => doc.id === documentTypeId)
    if (!documentType) return

    setUploadingDocType(documentTypeId)
    setUploading(true)

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Generate unique file path
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const extension = file.name.split('.').pop()
        const fileName = `${timestamp}_${randomString}_${index}.${extension}`
        const filePath = `purchase_pipeline/${purchaseId}/${documentTypeId}/${fileName}`

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Create document record
        const { error: dbError } = await supabase.from('documents').insert({
          entity_type: 'purchase_pipeline',
          entity_id: purchaseId,
          doc_type: documentType.type,
          title: `${documentType.label}${files.length > 1 ? ` (${index + 1})` : ''}`,
          description: documentType.description,
          file_path: filePath,
          file_url: filePath,
          file_name: file.name,
          file_size: file.size,
          file_size_bytes: file.size,
          file_type: file.type,
          mime_type: file.type,
          access_level: 'internal',
          is_current_version: true,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          uploaded_at: new Date().toISOString(),
          metadata: {
            document_type_id: documentTypeId,
            document_type_label: documentType.label,
            is_required: documentType.required,
            priority: documentType.priority
          }
        })

        if (dbError) throw dbError
        return true
      })

      await Promise.all(uploadPromises)
      await loadStageDocuments()

    } catch (error) {
      console.error('Error uploading files:', error)
      alert(`Failed to upload ${documentType.label}`)
    } finally {
      setUploading(false)
      setUploadingDocType(null)
    }
  }

  const handleDownload = async (doc: StageDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_url, 3600)

      if (error) throw error

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onStageUpdate(purchaseId, stageId, selectedStatus, notes)
      onClose()
    } catch (error) {
      console.error('Error updating stage:', error)
      alert('Failed to update stage')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stage ${stage.id}: ${stage.name}`}>
      <div className="space-y-6">
        {/* Stage Description */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Stage Description</h4>
          <p className="text-gray-700">{stage.description}</p>
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Estimated Duration:</span> {stage.estimatedDays} days
          </div>
        </div>

        {/* Current Status */}
        {stageData && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Status:</span>{' '}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    stageData.status === 'Completed' ||
                    stageData.status === 'Verified' ||
                    stageData.status === 'Finalized'
                      ? 'bg-green-100 text-green-800'
                      : stageData.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {stageData.status}
                </span>
              </div>
              {stageData.started_date && (
                <div>
                  <span className="font-medium text-gray-700">Started:</span>{' '}
                  {new Date(stageData.started_date).toLocaleDateString()}
                </div>
              )}
              {stageData.completed_date && (
                <div>
                  <span className="font-medium text-gray-700">Completed:</span>{' '}
                  {new Date(stageData.completed_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Update Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {stage.statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Add notes about this stage..."
              disabled={isSubmitting}
            />
          </div>

          {/* Required Fields Info */}
          {stage.requiredFields && stage.requiredFields.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Required Information</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {stage.requiredFields.map((field) => (
                  <li key={field} className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Kenyan Property Acquisition Documents */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Property Acquisition Documents</h4>
                <p className="text-sm text-gray-600">Required documents for Kenyan property acquisition process</p>
              </div>
              <div className="text-sm text-gray-500">
                {documents.filter(doc => KENYAN_PROPERTY_DOCUMENTS.find(req => req.required && req.id === doc.metadata?.document_type_id)).length} / {KENYAN_PROPERTY_DOCUMENTS.filter(doc => doc.required).length} Required
              </div>
            </div>

            {/* Document Requirements Checklist */}
            {STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS] && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-sm font-medium text-blue-800 mb-2">Required Documents:</h5>
                <div className="space-y-1">
                  {STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS].required.map((req, index) => {
                    const hasDocument = documents.some(doc => doc.doc_type === req.type)
                    return (
                      <div key={index} className="flex items-center text-xs">
                        <span className={`w-3 h-3 rounded-full mr-2 ${hasDocument ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className={hasDocument ? 'text-green-700 line-through' : 'text-blue-700'}>
                          {req.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS].optional.length > 0 && (
                  <>
                    <h5 className="text-sm font-medium text-blue-800 mt-3 mb-2">Optional Documents:</h5>
                    <div className="space-y-1">
                      {STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS].optional.map((opt, index) => {
                        const hasDocument = documents.some(doc => doc.doc_type === opt.type)
                        return (
                          <div key={index} className="flex items-center text-xs">
                            <span className={`w-3 h-3 rounded-full mr-2 ${hasDocument ? 'bg-green-500' : 'bg-gray-200'}`}></span>
                            <span className={hasDocument ? 'text-green-700 line-through' : 'text-gray-600'}>
                              {opt.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Upload Form */}
            {showUploadForm && (
              <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Upload New Document</h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select document type...</option>
                      {STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS]?.required.map((req, index) => (
                        <option key={`req-${index}`} value={req.type}>{req.label} (Required)</option>
                      ))}
                      {STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS]?.optional.map((opt, index) => (
                        <option key={`opt-${index}`} value={opt.type}>{opt.label} (Optional)</option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Enter document title..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <textarea
                      value={documentDescription}
                      onChange={(e) => setDocumentDescription(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Enter document description..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file)
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                      disabled={uploading || !selectedDocType || !documentTitle.trim()}
                    />
                  </div>
                  {uploading && (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-1 text-xs text-gray-600">Uploading document...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Uploaded Documents List */}
            {loadingDocs ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <div className="text-gray-400 text-2xl mb-2">📄</div>
                <p className="text-sm text-gray-600">No documents uploaded for this stage</p>
                <p className="text-xs text-gray-500 mt-1">Upload required documents to complete this stage</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents ({documents.length})</h5>
                {documents.map((doc) => {
                  const docTypeInfo = STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS]?.required.find(req => req.type === doc.doc_type) ||
                                     STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS]?.optional.find(opt => opt.type === doc.doc_type)
                  const isRequired = STAGE_DOCUMENT_REQUIREMENTS[stageId as keyof typeof STAGE_DOCUMENT_REQUIREMENTS]?.required.some(req => req.type === doc.doc_type)

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-blue-600 text-lg">
                          {doc.mime_type.includes('pdf') ? '📄' :
                           doc.mime_type.includes('image') ? '🖼️' :
                           doc.mime_type.includes('word') ? '📝' : '📎'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                            {isRequired && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {docTypeInfo?.label || doc.doc_type} • {(doc.file_size_bytes / 1024).toFixed(1)} KB • {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                          {doc.description && (
                            <p className="text-xs text-gray-400 mt-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
                      >
                        View
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Stage'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
