'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import supabase from '../../../lib/supabase-client'
import { DOC_TYPES, type DocTypeKey, type DocumentStatus, MAX_FILE_SIZE, isValidFileType, generateUniqueFilename, getFileIcon } from '../../../lib/constants/document-types'

interface PurchasePipelineDocumentsV2Props {
  purchaseId: string
  stageId: number
  stageName: string
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
  status: DocumentStatus
  is_na: boolean
  note: string | null
  updated_at: string
}

interface DocumentTypeState {
  documents: PropertyDocument[]
  status: DocumentStatusRecord | null
  isExpanded: boolean
  isUploading: boolean
}

export default function PurchasePipelineDocumentsV2({ purchaseId, stageId, stageName }: PurchasePipelineDocumentsV2Props) {
  const [documentStates, setDocumentStates] = useState<Record<DocTypeKey, DocumentTypeState>>({} as Record<DocTypeKey, DocumentTypeState>)
  const [loading, setLoading] = useState(true)
  const [localNotes, setLocalNotes] = useState<Record<DocTypeKey, string>>({} as Record<DocTypeKey, string>)
  const updateTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Initialize document states
  useEffect(() => {
    const initialStates: Record<DocTypeKey, DocumentTypeState> = {} as Record<DocTypeKey, DocumentTypeState>

    DOC_TYPES.forEach(docType => {
      initialStates[docType.key] = {
        documents: [],
        status: null,
        isExpanded: false,
        isUploading: false
      }
    })

    setDocumentStates(initialStates)
  }, [])

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true)

      // Load documents
      const { data: documents, error: docsError } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', purchaseId)
        .eq('pipeline', 'purchase_pipeline')
        .order('uploaded_at', { ascending: false })

      if (docsError) throw docsError

      // Load document statuses
      const { data: statuses, error: statusError } = await supabase
        .from('property_document_status')
        .select('*')
        .eq('property_id', purchaseId)
        .eq('pipeline', 'purchase_pipeline')

      if (statusError) throw statusError

      // Group documents and statuses by type
      setDocumentStates(prev => {
        const newStates = { ...prev }

        // Reset all document arrays and statuses
        DOC_TYPES.forEach(docType => {
          newStates[docType.key] = {
            ...newStates[docType.key],
            documents: [],
            status: null
          }
        })

        // Group documents by type
        documents?.forEach(doc => {
          const docTypeKey = doc.doc_type as DocTypeKey
          if (newStates[docTypeKey]) {
            newStates[docTypeKey].documents.push(doc)
          }
        })

        // Group statuses by type
        statuses?.forEach(status => {
          const docTypeKey = status.doc_type as DocTypeKey
          if (newStates[docTypeKey]) {
            newStates[docTypeKey].status = status
          }
        })

        return newStates
      })

    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }, [purchaseId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const toggleExpanded = (docTypeKey: DocTypeKey) => {
    setDocumentStates(prev => ({
      ...prev,
      [docTypeKey]: {
        ...prev[docTypeKey],
        isExpanded: !prev[docTypeKey].isExpanded
      }
    }))
  }

  const handleFileUpload = async (docTypeKey: DocTypeKey, files: FileList) => {
    const docType = DOC_TYPES.find(dt => dt.key === docTypeKey)
    if (!docType) return

    setDocumentStates(prev => ({
      ...prev,
      [docTypeKey]: { ...prev[docTypeKey], isUploading: true }
    }))

    try {
      const filesToUpload = Array.from(files)

      // Validate files
      for (const file of filesToUpload) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File "${file.name}" is too large. Maximum size is 10MB.`)
        }
        if (!isValidFileType(file, docTypeKey)) {
          throw new Error(`File "${file.name}" has an unsupported format for this document type.`)
        }
      }

      // Upload files
      for (const file of filesToUpload) {
        const uniqueFilename = generateUniqueFilename(file.name)
        const filePath = `property-docs/${purchaseId}/${docTypeKey}/${uniqueFilename}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('property-docs')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Create document record
        const { error: dbError } = await supabase
          .from('property_documents')
          .insert({
            property_id: purchaseId,
            pipeline: 'purchase_pipeline',
            doc_type: docTypeKey,
            file_path: filePath,
            file_name: file.name,
            file_ext: file.name.split('.').pop() || null,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
            uploaded_at: new Date().toISOString(),
            meta: {
              stage_id: stageId,
              stage_name: stageName,
              original_name: file.name
            }
          })

        if (dbError) throw dbError
      }

      // Reload documents to get updated state
      await loadDocuments()

    } catch (error) {
      console.error('Error uploading files:', error)

      let errorMessage = 'Failed to upload files'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      }

      alert(errorMessage)
    } finally {
      setDocumentStates(prev => ({
        ...prev,
        [docTypeKey]: { ...prev[docTypeKey], isUploading: false }
      }))
    }
  }

  const handleFileDelete = async (document: PropertyDocument) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      // Delete from storage using API route
      const response = await fetch('/api/docs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: document.file_path })
      })

      if (!response.ok) {
        throw new Error('Failed to delete file from storage')
      }

      // Delete document record
      const { error: dbError } = await supabase
        .from('property_documents')
        .delete()
        .eq('id', document.id)

      if (dbError) throw dbError

      // Reload documents
      await loadDocuments()

    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    }
  }

  const handleViewFile = async (document: PropertyDocument) => {
    try {
      const response = await fetch('/api/docs/sign-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: document.file_path })
      })

      if (!response.ok) {
        throw new Error('Failed to get file URL')
      }

      const { url } = await response.json()
      window.open(url, '_blank')

    } catch (error) {
      console.error('Error viewing file:', error)
      alert('Failed to open file')
    }
  }

  const updateDocumentStatusImmediate = async (docTypeKey: DocTypeKey, isNa: boolean, note?: string) => {
    try {
      console.log('Updating document status:', { propertyId: purchaseId, docTypeKey, isNa, note })

      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Authentication required. Please log in and try again.')
      }

      // First, check if a status record already exists
      const { data: existingStatus, error: selectError } = await supabase
        .from('property_document_status')
        .select('*')
        .eq('property_id', purchaseId)
        .eq('pipeline', 'purchase_pipeline')
        .eq('doc_type', docTypeKey)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is fine
        console.error('Error checking existing status:', selectError)
        throw selectError
      }

      let result
      if (existingStatus) {
        // Update existing record
        result = await supabase
          .from('property_document_status')
          .update({
            is_na: isNa,
            note: note || null,
            status: isNa ? 'complete' : (existingStatus.status || 'missing'),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStatus.id)
      } else {
        // Insert new record
        result = await supabase
          .from('property_document_status')
          .insert({
            property_id: purchaseId,
            pipeline: 'purchase_pipeline',
            doc_type: docTypeKey,
            is_na: isNa,
            note: note || null,
            status: isNa ? 'complete' : 'missing'
          })
      }

      if (result.error) {
        console.error('Error updating status:', result.error)
        throw result.error
      }

      console.log('Status updated successfully')

      // Reload documents to get updated status
      await loadDocuments()

    } catch (error) {
      console.error('Error updating document status:', error)

      let errorMessage = 'Failed to update document status'
      if (error instanceof Error) {
        errorMessage = error.message
      }

      alert(errorMessage)
    }
  }

  // Debounced version to prevent rapid-fire updates
  const updateDocumentStatus = useCallback((docTypeKey: DocTypeKey, isNa: boolean, note?: string) => {
    const key = `${docTypeKey}`

    // Clear existing timeout for this document type
    if (updateTimeoutRef.current[key]) {
      clearTimeout(updateTimeoutRef.current[key])
    }

    // For immediate changes (like checkbox toggle), update immediately
    // For text changes (like notes), debounce
    const isTextChange = note !== undefined && note !== (localNotes[docTypeKey] || '')
    const delay = isTextChange ? 1000 : 0 // 1 second debounce for text, immediate for checkbox

    // Set new timeout
    updateTimeoutRef.current[key] = setTimeout(() => {
      updateDocumentStatusImmediate(docTypeKey, isNa, note)
      delete updateTimeoutRef.current[key]
    }, delay)
  }, [localNotes, purchaseId])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout)
      })
    }
  }, [])

  // Handle note changes with immediate local update and debounced save
  const handleNoteChange = useCallback((docTypeKey: DocTypeKey, note: string) => {
    // Update local state immediately for responsive UI
    setLocalNotes(prev => ({
      ...prev,
      [docTypeKey]: note
    }))

    // Debounce the status update
    const isNa = documentStates[docTypeKey]?.status?.is_na || false
    updateDocumentStatus(docTypeKey, isNa, note)
  }, [documentStates, updateDocumentStatus])

  // Initialize local notes when document states load
  useEffect(() => {
    const initialNotes: Record<DocTypeKey, string> = {} as Record<DocTypeKey, string>
    DOC_TYPES.forEach(docType => {
      const note = documentStates[docType.key]?.status?.note || ''
      initialNotes[docType.key] = note
    })
    setLocalNotes(initialNotes)
  }, [documentStates])

  const getStatusChip = (docTypeKey: DocTypeKey) => {
    const state = documentStates[docTypeKey]
    const docType = DOC_TYPES.find(dt => dt.key === docTypeKey)

    if (state?.status?.is_na) {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">N/A</span>
    }

    const fileCount = state?.documents.length || 0
    let status: DocumentStatus = 'missing'
    let chipClass = 'bg-red-100 text-red-700'
    let label = 'Missing'

    if (fileCount > 0) {
      status = 'complete'
      chipClass = 'bg-green-100 text-green-700'
      label = 'Complete'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${chipClass}`}>
        {label}
      </span>
    )
  }

  const getCompletionStats = () => {
    const requiredDocs = DOC_TYPES.filter(dt => dt.required)
    const completedDocs = requiredDocs.filter(dt => {
      const state = documentStates[dt.key]
      return state?.status?.is_na || (state?.documents.length || 0) > 0
    })

    return {
      completed: completedDocs.length,
      total: requiredDocs.length,
      percentage: requiredDocs.length > 0 ? Math.round((completedDocs.length / requiredDocs.length) * 100) : 0
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-200"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Loading documents...</p>
      </div>
    )
  }

  const stats = getCompletionStats()

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              📄 Purchase Pipeline Documents
            </h3>
            <p className="text-sm text-gray-600">Kenya Property Documentation Requirements</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.percentage}%</div>
              <div className="text-xs sm:text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-gray-700">{stats.completed}/{stats.total}</div>
              <div className="text-xs sm:text-sm text-gray-600">Required</div>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${stats.percentage}%` }}
          ></div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {stats.percentage === 100 ? (
            <>
              <span className="text-emerald-600">✅</span>
              <span className="text-emerald-700 font-medium">All required documents uploaded!</span>
            </>
          ) : (
            <>
              <span className="text-emerald-500">⏳</span>
              <span className="text-gray-600">
                {stats.total - stats.completed} more document{stats.total - stats.completed !== 1 ? 's' : ''} needed
              </span>
            </>
          )}
        </div>
      </div>

      {/* Document Cards */}
      <div className="space-y-3">
        {DOC_TYPES.map((docType) => {
          const state = documentStates[docType.key]
          const isExpanded = state?.isExpanded || false
          const isUploading = state?.isUploading || false
          const documents = state?.documents || []

          return (
            <div
              key={docType.key}
              className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {/* Card Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleExpanded(docType.key)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl flex-shrink-0">{docType.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        {docType.label}
                      </h4>
                      {docType.required && (
                        <span className="text-red-500 text-sm">*</span>
                      )}
                      {!docType.required && (
                        <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">Optional</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                      {docType.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  {getStatusChip(docType.key)}
                  {documents.length > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {documents.length} file{documents.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expandable Content */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* Upload Zone */}
                  <div>
                    <label className={`
                      block w-full p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200
                      ${isUploading 
                        ? 'border-blue-300 bg-blue-50 scale-[0.98]' 
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 hover:scale-[1.01]'
                      }
                    `}>
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                          <span className="text-sm font-medium text-blue-700">Uploading...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-4xl">📎</div>
                          <div>
                            <span className="text-base font-medium text-gray-700 block">
                              {docType.multiple ? 'Upload Files' : 'Upload File'}
                            </span>
                            <span className="text-sm text-gray-500 mt-1 block">
                              {docType.accept.join(', ')} • Max 10MB each
                            </span>
                            {docType.multiple && (
                              <span className="text-sm text-blue-600 font-medium block mt-1">
                                Multiple files supported
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        multiple={docType.multiple}
                        accept={docType.accept.join(',')}
                        capture={docType.capture as any}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileUpload(docType.key, e.target.files)
                            e.target.value = ''
                          }
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>

                  {/* File Gallery */}
                  {documents.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-gray-800">
                        Uploaded Files ({documents.length})
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {documents.map((doc) => (
                          <div
                            key={doc.document_id}
                            className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center text-lg">
                                {getFileIcon(doc.mime_type || '')}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {doc.file_name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                                <span>•</span>
                                <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewFile(doc)}
                                className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleFileDelete(doc)}
                                className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* N/A Toggle and Notes */}
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state?.status?.is_na || false}
                          onChange={(e) => updateDocumentStatus(docType.key, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Mark as N/A</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (optional)
                      </label>
                      <textarea
                        value={localNotes[docType.key] || ''}
                        onChange={(e) => handleNoteChange(docType.key, e.target.value)}
                        placeholder="Add any additional notes about this document..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
