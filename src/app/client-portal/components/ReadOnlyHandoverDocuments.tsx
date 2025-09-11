'use client'

import { useState, useEffect } from 'react'
import { useToast } from '../../../components/ui/Toast'

interface ReadOnlyHandoverDocumentsProps {
  propertyId: string
  propertyName: string
}

interface DocumentType {
  key: string
  label: string
  description: string
  required: boolean
  stage: number
}

interface PropertyDocument {
  id: string
  property_id: string
  pipeline: string
  doc_type: string
  file_path: string
  file_name: string
  file_ext: string | null
  file_size: number
  mime_type: string | null
  uploaded_by: string | null
  uploaded_at: string
  meta: Record<string, any>
}

interface DocumentStatusRecord {
  id: string
  property_id: string
  pipeline: string
  doc_type: string
  status: 'PENDING' | 'UPLOADED' | 'VERIFIED' | 'REJECTED'
  is_na: boolean
  note: string | null
  updated_at: string
}

// Document types for handover pipeline (stages 1-10)
const HANDOVER_DOCUMENT_TYPES: DocumentType[] = [
  // Stage 1-2: Initial Documentation
  { key: 'title_deed', label: 'Title Deed', description: 'Original or certified copy of title deed', required: true, stage: 1 },
  { key: 'seller_id', label: 'Seller ID Copy', description: 'Copy of seller\'s national ID or passport', required: true, stage: 1 },
  { key: 'spousal_consent', label: 'Spousal Consent', description: 'Consent from seller\'s spouse if applicable', required: false, stage: 1 },
  { key: 'spouse_id_kra', label: 'Spouse ID/KRA PIN', description: 'Spouse identification and KRA PIN if applicable', required: false, stage: 1 },
  
  // Stage 3-4: Legal Documentation
  { key: 'lra_33_forms', label: 'LRA 33 Forms', description: 'Land Registration Authority forms', required: true, stage: 3 },
  { key: 'sales_agreement', label: 'Sales Agreement', description: 'Signed sales agreement between parties', required: true, stage: 3 },
  { key: 'valuation_report', label: 'Valuation Report', description: 'Professional property valuation report', required: true, stage: 4 },
  
  // Stage 5-6: Due Diligence
  { key: 'search_certificate', label: 'Search Certificate', description: 'Official land search certificate', required: true, stage: 5 },
  { key: 'survey_report', label: 'Survey Report', description: 'Land survey and boundary report', required: true, stage: 5 },
  { key: 'clearance_certificates', label: 'Clearance Certificates', description: 'Tax and other clearance certificates', required: true, stage: 6 },
  
  // Stage 7-8: Financial Documentation
  { key: 'payment_receipts', label: 'Payment Receipts', description: 'Receipts for all payments made', required: true, stage: 7 },
  { key: 'bank_statements', label: 'Bank Statements', description: 'Buyer\'s bank statements for verification', required: true, stage: 7 },
  
  // Stage 9-10: Transfer Documentation
  { key: 'transfer_documents', label: 'Transfer Documents', description: 'Documents for property transfer', required: true, stage: 9 },
  { key: 'completion_certificate', label: 'Completion Certificate', description: 'Certificate of completion', required: true, stage: 10 },
]

export default function ReadOnlyHandoverDocuments({ propertyId, propertyName }: ReadOnlyHandoverDocumentsProps) {
  const [documents, setDocuments] = useState<PropertyDocument[]>([])
  const [documentStates, setDocumentStates] = useState<Record<string, DocumentStatusRecord>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadDocuments()
  }, [propertyId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load documents and their status
      const [docsResponse, statusResponse] = await Promise.all([
        fetch(`/api/properties/${propertyId}/documents?pipeline=handover`),
        fetch(`/api/properties/${propertyId}/document-status?pipeline=handover`)
      ])

      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        const statusMap: Record<string, DocumentStatusRecord> = {}
        statusData.statuses?.forEach((status: DocumentStatusRecord) => {
          statusMap[status.doc_type] = status
        })
        setDocumentStates(statusMap)
      }
    } catch (error) {
      console.error('Error loading documents:', error)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const getDocumentStatus = (docType: string) => {
    const docs = documents.filter(doc => doc.doc_type === docType)
    const status = documentStates[docType]
    
    if (status?.is_na) return 'N/A'
    if (docs.length > 0) return 'Uploaded'
    if (status?.status === 'PENDING') return 'Pending'
    return 'Not Started'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Uploaded': return 'bg-green-100 text-green-800'
      case 'N/A': return 'bg-gray-100 text-gray-600'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const handleDisabledAction = (action: string) => {
    showToast(`${action} is not available in read-only mode. Contact support for assistance.`, {
      variant: 'info'
    })
  }

  const downloadDocument = async (document: PropertyDocument) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/documents/${document.id}/download`)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = document.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      showToast('Failed to download document', { variant: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Property Documents</h4>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Read-only view</span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div>
            <h5 className="font-medium text-blue-900">Document Access Information</h5>
            <p className="text-sm text-blue-800 mt-1">
              You can view and download available documents. Upload and editing functions are managed by our team.
              Contact support if you need to submit additional documents.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {HANDOVER_DOCUMENT_TYPES.map((docType) => {
          const status = getDocumentStatus(docType.key)
          const docs = documents.filter(doc => doc.doc_type === docType.key)
          const statusRecord = documentStates[docType.key]

          return (
            <div key={docType.key} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h5 className="font-medium text-gray-900">{docType.label}</h5>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    {docType.required && (
                      <span className="text-xs text-red-600 font-medium">Required</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{docType.description}</p>

                  {/* Document Files */}
                  {docs.length > 0 && (
                    <div className="space-y-2">
                      <h6 className="text-sm font-medium text-gray-700">Uploaded Files:</h6>
                      {docs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700">{doc.file_name}</span>
                            <span className="text-xs text-gray-500">
                              ({(doc.file_size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            onClick={() => downloadDocument(doc)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status Notes */}
                  {statusRecord?.note && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <span className="font-medium">Note:</span> {statusRecord.note}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {/* Disabled Upload Button */}
                  <button
                    onClick={() => handleDisabledAction('Document upload')}
                    className="px-3 py-1 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed"
                    disabled
                  >
                    Upload
                  </button>

                  {/* Disabled Mark N/A Button */}
                  <button
                    onClick={() => handleDisabledAction('Mark as N/A')}
                    className="px-3 py-1 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed"
                    disabled
                  >
                    Mark N/A
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
