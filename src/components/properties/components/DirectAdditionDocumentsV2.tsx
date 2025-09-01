'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import supabase from '../../../lib/supabase-client'
import {
  DOC_TYPES,
  type DocTypeKey,
  type DocumentStatus,
  MAX_FILE_SIZE,
  isValidFileType,
  generateUniqueFilename,
  getFileIcon,
} from '../../../lib/constants/document-types'
import {
  getFilteredDocTypes,
  getWorkflowType,
  getDisplayStageNumber,
  type WorkflowType
} from '../utils/stage-filtering.utils'
import { useFinancialStatus } from '../../../hooks/useFinancialStatus'
import { useFinancialSync } from '../../../hooks/useFinancialSync'
import { useEnhancedWorkflow } from '../../../hooks/useEnhancedWorkflow'
import { stageHasFinancialRequirements } from '../../../lib/constants/financial-stage-requirements'
import FinancialStatusIndicator from './FinancialStatusIndicator'

interface DirectAdditionDocumentsV2Props {
  propertyId: string
  propertyName: string
  pipeline?: 'direct_addition' | 'handover' | 'subdivision'
  property?: any // For workflow type detection
  stageFilter?: 'all' | 'stages_1_10' | 'stages_11_16'
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

interface DocumentStageInfo {
  docType: {
    key: DocTypeKey
    label: string
    description: string
    icon: string
    accept: readonly string[]
    multiple: boolean
    required: boolean
    capture?: 'environment' | 'user'
  }
  stageNumber: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  isMultiDocument?: boolean
  groupedDocuments?: DocTypeKey[]
}

export default function DirectAdditionDocumentsV2({
  propertyId,
  propertyName,
  pipeline = 'direct_addition',
  property,
  stageFilter,
}: DirectAdditionDocumentsV2Props) {
  const [documentStates, setDocumentStates] = useState<Record<DocTypeKey, DocumentTypeState>>(
    {} as Record<DocTypeKey, DocumentTypeState>
  )
  const [loading, setLoading] = useState(true)
  const [localNotes, setLocalNotes] = useState<Record<DocTypeKey, string>>(
    {} as Record<DocTypeKey, string>
  )
  const updateTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Document progression state
  const [documentStages, setDocumentStages] = useState<DocumentStageInfo[]>([])
  const [currentActiveStage, setCurrentActiveStage] = useState<number>(1)

  // Financial status integration
  const {
    getStageFinancialStatus,
    getPaymentStatus,
    loading: financialLoading,
  } = useFinancialStatus(propertyId, pipeline)

  // Enhanced workflow integration
  const {
    workflowStages,
    currentMilestone,
    blockedStages,
    canProgressToStage,
    handleStageCompletion,
    getNextAction,
  } = useEnhancedWorkflow({
    propertyId,
    pipeline,
    documentStates,
    enableIntegratedLogic: true,
  })

  // Real-time financial sync
  const { isSyncing, lastSyncTime, triggerSync } = useFinancialSync({
    propertyId,
    pipeline,
    enableRealTimeSync: true,
  })

  // Define agreement stage grouping
  const AGREEMENT_STAGE_DOCUMENTS: DocTypeKey[] = [
    'original_title_deed',
    'seller_id_passport',
    'spousal_consent',
    'spouse_id_kra',
    'signed_lra33',
  ]

  // Get filtered document types based on workflow and stage filter
  const getFilteredDocTypes = useCallback(() => {
    let filteredTypes = DOC_TYPES

    // Apply stage filtering if specified
    if (stageFilter === 'stages_1_10') {
      // Show only stages 1-10 (regular documents)
      const subdivisionDocKeys: DocTypeKey[] = [
        'minutes_decision_subdivision',
        'search_certificate_subdivision',
        'lcb_consent_subdivision',
        'mutation_forms',
        'beaconing_docs',
        'title_registration_subdivision'
      ]
      filteredTypes = DOC_TYPES.filter(docType => !subdivisionDocKeys.includes(docType.key))
    } else if (stageFilter === 'stages_11_16') {
      // Show only stages 11-16 (subdivision documents)
      const subdivisionDocKeys: DocTypeKey[] = [
        'minutes_decision_subdivision',
        'search_certificate_subdivision',
        'lcb_consent_subdivision',
        'mutation_forms',
        'beaconing_docs',
        'title_registration_subdivision'
      ]
      filteredTypes = DOC_TYPES.filter(docType => subdivisionDocKeys.includes(docType.key))
    } else if (property) {
      // Auto-detect workflow type from property
      const workflowType = getWorkflowType(property)
      filteredTypes = getFilteredDocTypes(workflowType)
    }

    return filteredTypes
  }, [stageFilter, property])

  // Calculate document progression stages with multi-document agreement stage
  const calculateDocumentStages = useCallback((): DocumentStageInfo[] => {
    const stages: DocumentStageInfo[] = []
    let stageNumber = 1
    const filteredDocTypes = getFilteredDocTypes()

    for (let index = 0; index < filteredDocTypes.length; index++) {
      const docType = filteredDocTypes[index]

      // Skip agreement documents except the first one (we'll group them)
      if (
        AGREEMENT_STAGE_DOCUMENTS.includes(docType.key) &&
        docType.key !== 'original_title_deed'
      ) {
        continue
      }

      // Check if this is the agreement stage
      const isAgreementStage = docType.key === 'original_title_deed'

      if (isAgreementStage) {
        // Calculate completion for all agreement documents
        const agreementCompleted = AGREEMENT_STAGE_DOCUMENTS.every((docKey) => {
          const docState = documentStates[docKey]
          if (!docState) return false
          const hasFiles = docState.documents?.length > 0
          const isNA = docState.status?.is_na || false
          return hasFiles || isNA
        })

        // Check if previous stages are completed
        const previousStagesCompleted = stages.every((stage) => stage.isCompleted)

        stages.push({
          docType: {
            ...docType,
            label: 'Agreement with Seller Documents',
            description: 'Complete set of seller agreement and verification documents',
          },
          stageNumber,
          isActive: previousStagesCompleted && !agreementCompleted,
          isCompleted: agreementCompleted,
          isLocked: !previousStagesCompleted && !agreementCompleted,
          isMultiDocument: true,
          groupedDocuments: AGREEMENT_STAGE_DOCUMENTS,
        })
      } else {
        // Regular single document stage
        const docState = documentStates[docType.key]
        const hasFiles = docState?.documents?.length > 0
        const isNA = docState?.status?.is_na || false
        const isCompleted = hasFiles || isNA

        // Check if previous stages are completed
        const previousStagesCompleted = stages.every((stage) => stage.isCompleted)

        stages.push({
          docType,
          stageNumber,
          isActive: previousStagesCompleted && !isCompleted,
          isCompleted,
          isLocked: !previousStagesCompleted && !isCompleted,
        })
      }

      stageNumber++
    }

    return stages
  }, [documentStates, getFilteredDocTypes])

  // Update document stages when document states change
  useEffect(() => {
    if (!loading && Object.keys(documentStates).length > 0) {
      const newDocumentStages = calculateDocumentStages()
      setDocumentStages(newDocumentStages)

      // Update current active stage
      const activeStage = newDocumentStages.find((stage) => stage.isActive)
      if (activeStage) {
        setCurrentActiveStage(activeStage.stageNumber)
      }
    }
  }, [documentStates, loading, calculateDocumentStages])

  // Check if a document is locked based on progression
  const isDocumentLocked = useCallback(
    (docTypeKey: DocTypeKey): boolean => {
      const stage = documentStages.find((stage) => stage.docType.key === docTypeKey)
      return stage ? stage.isLocked : false
    },
    [documentStages]
  )

  // Initialize document states
  useEffect(() => {
    const initialStates: Record<DocTypeKey, DocumentTypeState> = {} as Record<
      DocTypeKey,
      DocumentTypeState
    >

    DOC_TYPES.forEach((docType) => {
      initialStates[docType.key] = {
        documents: [],
        status: null,
        isExpanded: false,
        isUploading: false,
      }
    })

    setDocumentStates(initialStates)
  }, [])

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true)

      // Validate propertyId format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(propertyId)) {
                setLoading(false)
        return
      }

      // Load documents
      const { data: documents, error: docsError } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .eq('pipeline', pipeline)
        .order('uploaded_at', { ascending: false })

      if (docsError) throw docsError

      // Load document statuses
      const { data: statuses, error: statusError } = await supabase
        .from('property_document_status')
        .select('*')
        .eq('property_id', propertyId)
        .eq('pipeline', pipeline)

      if (statusError) throw statusError

      // Group documents by type and update states
      setDocumentStates((prev) => {
        const newStates = { ...prev }

        // Reset all document arrays
        DOC_TYPES.forEach((docType) => {
          if (newStates[docType.key]) {
            newStates[docType.key].documents = []
          }
        })

        // Group documents by type
        documents?.forEach((doc: any) => {
          const docTypeKey = doc.doc_type as DocTypeKey
          if (newStates[docTypeKey]) {
            newStates[docTypeKey].documents.push(doc)
          }
        })

        // Update statuses
        statuses?.forEach((status: any) => {
          const docTypeKey = status.doc_type as DocTypeKey
          if (newStates[docTypeKey]) {
            newStates[docTypeKey].status = status
          }
        })

        return newStates
      })
    } catch (error) {
            // Provide user feedback for loading errors
      if (error instanceof Error) {
              }
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const toggleExpanded = (docTypeKey: DocTypeKey) => {
    setDocumentStates((prev) => ({
      ...prev,
      [docTypeKey]: {
        ...prev[docTypeKey],
        isExpanded: !prev[docTypeKey].isExpanded,
      },
    }))
  }

  const handleFileUpload = async (docTypeKey: DocTypeKey, files: FileList) => {
    const docType = DOC_TYPES.find((dt) => dt.key === docTypeKey)
    if (!docType) return

    // Validate propertyId format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(propertyId)) {
      alert(`Invalid property ID format: ${propertyId}. Expected UUID format.`)
      return
    }

    // Check if document is locked due to progression
    if (isDocumentLocked(docTypeKey)) {
      alert('Please complete the previous steps before uploading this document.')
      return
    }

    setDocumentStates((prev) => ({
      ...prev,
      [docTypeKey]: { ...prev[docTypeKey], isUploading: true },
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
        const filePath = `${pipeline}/${propertyId}/${docTypeKey}/${uniqueFilename}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('property-docs')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Create document record
        const { error: dbError } = await supabase.from('property_documents').insert({
          property_id: propertyId,
          pipeline,
          doc_type: docTypeKey,
          file_path: filePath,
          file_name: file.name,
          file_ext: file.name.split('.').pop() || null,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          meta: {},
        })

        if (dbError) throw dbError
      }

      // Reload documents to get updated state
      await loadDocuments()
    } catch (error) {
            let errorMessage = 'Failed to upload files'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      }

      alert(errorMessage)
    } finally {
      setDocumentStates((prev) => ({
        ...prev,
        [docTypeKey]: { ...prev[docTypeKey], isUploading: false },
      }))
    }
  }

  const handleFileDelete = async (document: PropertyDocument) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const response = await fetch('/api/docs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: document.file_path,
          documentId: document.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      // Reload documents
      await loadDocuments()
    } catch (error) {
            alert('Failed to delete file')
    }
  }

  const handleViewFile = async (document: PropertyDocument) => {
    try {
      const response = await fetch('/api/docs/sign-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: document.file_path }),
      })

      if (!response.ok) {
        throw new Error('Failed to get file URL')
      }

      const { url } = await response.json()
      window.open(url, '_blank')
    } catch (error) {
            alert('Failed to open file')
    }
  }

  const updateDocumentStatusImmediate = async (
    docTypeKey: DocTypeKey,
    isNa: boolean,
    note?: string
  ) => {
    try {
            // Validate propertyId format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(propertyId)) {
        throw new Error(`Invalid property ID format: ${propertyId}. Expected UUID format.`)
      }

      // Check authentication first
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Authentication required. Please log in and try again.')
      }

      // First, check if a status record already exists
      const { data: existingStatus, error: selectError } = await supabase
        .from('property_document_status')
        .select('*')
        .eq('property_id', propertyId)
        .eq('pipeline', pipeline)
        .eq('doc_type', docTypeKey)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is fine
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
            status: isNa ? 'complete' : existingStatus.status || 'missing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingStatus.id)
      } else {
        // Insert new record
        result = await supabase.from('property_document_status').insert({
          property_id: propertyId,
          pipeline,
          doc_type: docTypeKey,
          is_na: isNa,
          note: note || null,
          status: isNa ? 'complete' : 'missing',
        })
      }

      if (result.error) {
                // Log the full error details for debugging
                // Handle unique constraint violations specifically
        if (
          result.error.code === '23505' ||
          result.error.message?.includes('duplicate key') ||
          result.error.message?.includes('unique constraint')
        ) {
                              await loadDocuments()

          // Don't throw an error for constraint violations - just log and continue
                    return
        }

        throw new Error(`Database error: ${result.error.message || 'Unknown database error'}`)
      }

            // Update local state instead of reloading all documents
      setDocumentStates((prev) => ({
        ...prev,
        [docTypeKey]: {
          ...prev[docTypeKey],
          status: {
            id: existingStatus?.id || 'temp-id',
            property_id: propertyId,
            pipeline,
            doc_type: docTypeKey,
            status: isNa ? 'complete' : existingStatus?.status || 'missing',
            is_na: isNa,
            note: note || null,
            updated_at: new Date().toISOString(),
          },
        },
      }))
    } catch (error) {
            // Provide user feedback
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to update document status: ${errorMessage}`)
    }
  }

  // Debounced version to prevent rapid-fire updates
  const updateDocumentStatus = useCallback(
    (docTypeKey: DocTypeKey, isNa: boolean, note?: string) => {
      // Check if document is locked due to progression
      if (isDocumentLocked(docTypeKey)) {
        alert('Please complete the previous steps before modifying this document.')
        return
      }

      const key = `${docTypeKey}`

      // Clear existing timeout for this document type
      if (updateTimeoutRef.current[key]) {
        clearTimeout(updateTimeoutRef.current[key])
      }

      // For immediate changes (like checkbox toggle), update immediately
      // For text changes (like notes), debounce
      const isTextChange =
        note !== undefined && note !== (documentStates[docTypeKey]?.status?.note || '')
      const delay = isTextChange ? 1000 : 0 // 1 second debounce for text, immediate for checkbox

      // Set new timeout
      updateTimeoutRef.current[key] = setTimeout(() => {
        updateDocumentStatusImmediate(docTypeKey, isNa, note)
        delete updateTimeoutRef.current[key]
      }, delay)
    },
    [documentStates]
  )

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeoutRef.current).forEach((timeout) => {
        clearTimeout(timeout)
      })
    }
  }, [])

  // Handle note changes with immediate local update and debounced database save
  const handleNoteChange = useCallback(
    (docTypeKey: DocTypeKey, note: string) => {
      // Update local state immediately for responsive UI
      setLocalNotes((prev) => ({
        ...prev,
        [docTypeKey]: note,
      }))

      // Debounce the database update
      const isNa = documentStates[docTypeKey]?.status?.is_na || false
      updateDocumentStatus(docTypeKey, isNa, note)
    },
    [documentStates, updateDocumentStatus]
  )

  // Initialize local notes when document states load
  useEffect(() => {
    const initialNotes: Record<DocTypeKey, string> = {} as Record<DocTypeKey, string>
    DOC_TYPES.forEach((docType) => {
      const note = documentStates[docType.key]?.status?.note || ''
      initialNotes[docType.key] = note
    })
    setLocalNotes(initialNotes)
  }, [documentStates])

  const getStatusBadge = (docTypeKey: DocTypeKey) => {
    const state = documentStates[docTypeKey]
    const docType = DOC_TYPES.find((dt) => dt.key === docTypeKey)
    const isRequired = docType?.required || false
    const hasFiles = state?.documents?.length > 0

    if (state?.status?.is_na) {
      return { text: 'N/A', className: 'bg-gray-100 text-gray-800' }
    }
    if (hasFiles) {
      const count = state.documents.length
      return {
        text: `${count} file${count !== 1 ? 's' : ''}`,
        className: 'bg-green-100 text-green-800',
      }
    }
    if (isRequired) {
      return { text: 'Required', className: 'bg-red-100 text-red-800' }
    }
    return { text: 'Optional', className: 'bg-yellow-100 text-yellow-800' }
  }

  const getStatusChip = (docTypeKey: DocTypeKey) => {
    const state = documentStates[docTypeKey]
    const docType = DOC_TYPES.find((dt) => dt.key === docTypeKey)

    if (state?.status?.is_na) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
          N/A
        </span>
      )
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${chipClass}`}>{label}</span>
    )
  }

  const getCompletionStats = () => {
    const requiredDocs = DOC_TYPES.filter((dt) => dt.required)
    const completedDocs = requiredDocs.filter((dt) => {
      const state = documentStates[dt.key]
      return state?.status?.is_na || (state?.documents.length || 0) > 0
    })

    return {
      completed: completedDocs.length,
      total: requiredDocs.length,
      percentage: Math.round((completedDocs.length / requiredDocs.length) * 100),
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

  // Check if no document states loaded
  if (!loading && Object.keys(documentStates).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-600">
            <p className="text-lg font-medium">No documents available</p>
            <p className="mt-2 text-sm">Document management is not available for this property at this time.</p>
          </div>
        </div>
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
              📄 Property Documents
            </h3>
            <p className="text-sm text-gray-600">{propertyName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
                {stats.percentage}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-gray-700">
                {stats.completed}/{stats.total}
              </div>
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
              <span className="text-blue-500">⏳</span>
              <span className="text-gray-600">
                {stats.total - stats.completed} more document
                {stats.total - stats.completed !== 1 ? 's' : ''} needed
              </span>
            </>
          )}
        </div>
      </div>

      {/* Consolidated Document Progression Cards */}
      <div className="space-y-4">
        {documentStages.map((stage) => {
          const docType = stage.docType
          const isDocLocked = stage.isLocked

          // For multi-document stages, we'll render differently
          if (stage.isMultiDocument && stage.groupedDocuments) {
            return (
              <div
                key={`stage-${stage.stageNumber}`}
                className={`border rounded-xl bg-white shadow-sm transition-all duration-200 ${
                  isDocLocked
                    ? 'border-gray-200 opacity-60'
                    : stage.isActive
                      ? 'border-blue-200 shadow-md'
                      : stage.isCompleted
                        ? 'border-green-200'
                        : 'border-gray-200 hover:shadow-md'
                }`}
              >
                {/* Multi-Document Stage Header */}
                <div
                  className={`flex items-center justify-between p-4 transition-all duration-200 ${
                    stage.isActive ? 'bg-blue-50' : stage.isCompleted ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Stage Number + Status Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                        stage.isCompleted
                          ? 'bg-green-500 text-white'
                          : stage.isActive
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-400 text-white'
                      }`}
                    >
                      {stage.isCompleted ? (
                        <CheckCircleIconSolid className="h-6 w-6" />
                      ) : stage.isActive ? (
                        <ClockIcon className="h-6 w-6" />
                      ) : stage.isLocked ? (
                        <LockClosedIcon className="h-6 w-6" />
                      ) : (
                        stage.stageNumber
                      )}
                    </div>

                    {/* Document Icon */}
                    <div className="text-2xl flex-shrink-0">{docType.icon}</div>

                    {/* Stage Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-semibold text-sm sm:text-base truncate ${
                            stage.isActive
                              ? 'text-blue-900'
                              : stage.isCompleted
                                ? 'text-green-900'
                                : 'text-gray-700'
                          }`}
                        >
                          Step {stage.stageNumber}: {docType.label}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            stage.isCompleted
                              ? 'bg-green-100 text-green-800'
                              : stage.isActive
                                ? 'bg-blue-100 text-blue-800'
                                : stage.isLocked
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {stage.isCompleted
                            ? 'Completed'
                            : stage.isActive
                              ? 'Active'
                              : stage.isLocked
                                ? 'Locked'
                                : 'Pending'}
                        </span>

                        {/* Horizontal Payment Button */}
                        {!financialLoading && (
                          <FinancialStatusIndicator
                            propertyId={propertyId}
                            stageNumber={stage.stageNumber}
                            financialStatus={getStageFinancialStatus(stage.stageNumber)}
                            getPaymentStatus={getPaymentStatus}
                            pipeline={pipeline}
                            documentStates={documentStates}
                            layout="horizontal"
                            compact={true}
                          />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                        {docType.description}
                      </p>

                      {/* Multi-document progress */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-600">
                          {
                            stage.groupedDocuments.filter((docKey) => {
                              const docState = documentStates[docKey]
                              const hasFiles = docState?.documents?.length > 0
                              const isNA = docState?.status?.is_na || false
                              return hasFiles || isNA
                            }).length
                          }{' '}
                          of {stage.groupedDocuments.length} documents completed
                        </span>

                        {stage.isLocked && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <LockClosedIcon className="h-3 w-3" />
                            Complete previous step first
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Document Cards */}
                <div className="border-t border-gray-100 p-4 space-y-3">
                  {stage.groupedDocuments.map((docKey) => {
                    const groupedDocType = DOC_TYPES.find((dt) => dt.key === docKey)
                    if (!groupedDocType) return null

                    const state = documentStates[docKey]
                    const isExpanded = state?.isExpanded || false
                    const isUploading = state?.isUploading || false
                    const documents = state?.documents || []

                    return (
                      <div key={docKey} className="border border-gray-200 rounded-lg bg-gray-50">
                        {/* Individual Document Header */}
                        <div
                          className={`flex items-center justify-between p-3 ${
                            isDocLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          onClick={() => !isDocLocked && toggleExpanded(docKey)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-lg flex-shrink-0">{groupedDocType.icon}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 truncate">
                                {groupedDocType.label}
                              </h4>
                              <p className="text-xs text-gray-600 line-clamp-1">
                                {groupedDocType.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(docKey).className}`}
                            >
                              {getStatusBadge(docKey).text}
                            </span>
                            {isExpanded ? (
                              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Individual Document Expandable Content */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-3 bg-white">
                            {/* File Upload Section */}
                            <div className="space-y-3">
                              <div>
                                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-400 transition-colors cursor-pointer">
                                  <div className="text-teal-600">
                                    <svg
                                      className="w-6 h-6"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                      />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {isUploading
                                        ? 'Uploading...'
                                        : `Upload ${groupedDocType.label}`}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {groupedDocType.accept.join(', ')} • Max 10MB each
                                    </div>
                                  </div>
                                  <input
                                    type="file"
                                    multiple={groupedDocType.multiple}
                                    accept={groupedDocType.accept.join(',')}
                                    capture={(groupedDocType as any).capture}
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                        handleFileUpload(docKey, e.target.files)
                                        e.target.value = ''
                                      }
                                    }}
                                    disabled={isUploading || isDocLocked}
                                  />
                                </label>
                              </div>

                              {/* File Gallery */}
                              {documents.length > 0 && (
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-gray-700">
                                    Uploaded Files ({documents.length})
                                  </h6>
                                  <div className="space-y-2">
                                    {documents.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs"
                                      >
                                        <span className="text-lg">{groupedDocType.icon}</span>
                                        <span className="flex-1 truncate">{doc.file_name}</span>
                                        <button
                                          onClick={() => handleViewFile(doc)}
                                          className="text-teal-600 hover:text-teal-700"
                                        >
                                          View
                                        </button>
                                        <button
                                          onClick={() => handleFileDelete(doc)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* N/A and Notes Section */}
                              <div className="space-y-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={state?.status?.is_na || false}
                                      onChange={(e) =>
                                        updateDocumentStatus(docKey, e.target.checked)
                                      }
                                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                      disabled={isDocLocked}
                                    />
                                    <span className="text-xs text-gray-700">Mark as N/A</span>
                                  </label>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Notes
                                  </label>
                                  <textarea
                                    value={localNotes[docKey] || ''}
                                    onChange={(e) => handleNoteChange(docKey, e.target.value)}
                                    placeholder="Add any additional notes..."
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                    rows={2}
                                    disabled={isDocLocked}
                                  />
                                </div>
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

          // Regular single document stage
          const state = documentStates[docType.key]
          const isExpanded = state?.isExpanded || false
          const isUploading = state?.isUploading || false
          const documents = state?.documents || []

          return (
            <div
              key={docType.key}
              className={`border rounded-xl bg-white shadow-sm transition-all duration-200 ${
                isDocLocked
                  ? 'border-gray-200 opacity-60'
                  : stage.isActive
                    ? 'border-blue-200 shadow-md'
                    : stage.isCompleted
                      ? 'border-green-200'
                      : 'border-gray-200 hover:shadow-md'
              }`}
            >
              {/* Consolidated Header */}
              <div
                className={`flex items-center justify-between p-4 transition-all duration-200 ${
                  isDocLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${
                  stage.isActive ? 'bg-blue-50' : stage.isCompleted ? 'bg-green-50' : 'bg-gray-50'
                }`}
                onClick={() => !isDocLocked && toggleExpanded(docType.key)}
              >
                <div className="flex items-center gap-4">
                  {/* Combined Stage Number + Status Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                      stage.isCompleted
                        ? 'bg-green-500 text-white'
                        : stage.isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-400 text-white'
                    }`}
                  >
                    {stage.isCompleted ? (
                      <CheckCircleIconSolid className="h-6 w-6" />
                    ) : stage.isActive ? (
                      <ClockIcon className="h-6 w-6" />
                    ) : stage.isLocked ? (
                      <LockClosedIcon className="h-6 w-6" />
                    ) : (
                      stage.stageNumber
                    )}
                  </div>

                  {/* Document Icon */}
                  <div className="text-2xl flex-shrink-0">{docType.icon}</div>

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-semibold text-sm sm:text-base truncate ${
                          stage.isActive
                            ? 'text-blue-900'
                            : stage.isCompleted
                              ? 'text-green-900'
                              : 'text-gray-700'
                        }`}
                      >
                        Step {stage.stageNumber}: {docType.label}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          stage.isCompleted
                            ? 'bg-green-100 text-green-800'
                            : stage.isActive
                              ? 'bg-blue-100 text-blue-800'
                              : stage.isLocked
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {stage.isCompleted
                          ? 'Completed'
                          : stage.isActive
                            ? 'Active'
                            : stage.isLocked
                              ? 'Locked'
                              : 'Pending'}
                      </span>

                      {/* Horizontal Payment Button */}
                      {!financialLoading && (
                        <FinancialStatusIndicator
                          propertyId={propertyId}
                          stageNumber={stage.stageNumber}
                          financialStatus={getStageFinancialStatus(stage.stageNumber)}
                          getPaymentStatus={getPaymentStatus}
                          pipeline={pipeline}
                          documentStates={documentStates}
                          layout="horizontal"
                          compact={true}
                        />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                      {docType.description}
                    </p>

                    {/* File Status and Lock Message */}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(docType.key).className}`}
                      >
                        {getStatusBadge(docType.key).text}
                      </span>

                      {stage.isLocked && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <LockClosedIcon className="h-3 w-3" />
                          Complete previous step first
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand Icon */}
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
                    <label
                      className={`
                      block w-full p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200
                      ${
                        isUploading
                          ? 'border-teal-300 bg-teal-50 scale-[0.98]'
                          : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-teal-50 hover:scale-[1.01]'
                      }
                    `}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent"></div>
                          <span className="text-sm font-medium text-teal-700">Uploading...</span>
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
                              <span className="text-sm text-teal-600 font-medium block mt-1">
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
                        disabled={isUploading || isDocLocked}
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
                            key={doc.id}
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
                                className="px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition-colors"
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
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          disabled={isDocLocked}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        rows={2}
                        disabled={isDocLocked}
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
