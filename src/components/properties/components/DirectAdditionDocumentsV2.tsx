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
import ReadOnlyDocumentWrapper, { useDocumentReadOnlyStatus } from './ReadOnlyDocumentWrapper'
import {
  getFilteredDocTypes,
  getWorkflowType,
  getDisplayStageNumber,
  getStageConfig,
  isDocTypeAllowedForWorkflow,
  getPipelineName,
  calculateWorkflowProgress,
  SUBDIVISION_DOC_KEYS,
  REGULAR_DOC_KEYS,
  type WorkflowType,
} from '../utils/stage-filtering.utils'
import { useFinancialStatus } from '../../../hooks/useFinancialStatus'
import { useFinancialSync } from '../../../hooks/useFinancialSync'
import { useEnhancedWorkflow } from '../../../hooks/useEnhancedWorkflow'
import { stageHasFinancialRequirements } from '../../../lib/constants/financial-stage-requirements'
import FinancialStatusIndicator from './FinancialStatusIndicator'
import WorkflowProgressIndicator from './WorkflowProgressIndicator'

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

  // Surgical read-only status for completed properties
  const {
    isReadOnly,
    readOnlyReason,
    canUpload,
    canDelete,
    checkAction,
    documentsReadOnly,
    documentsReadOnlyReason
  } = useDocumentReadOnlyStatus(propertyId)

  // Surgical controls - disable specific functions when processes are completed
  const isUploadDisabled = documentsReadOnly || !canUpload
  const isDeleteDisabled = documentsReadOnly || !canDelete
  const isPaymentDisabled = documentsReadOnly // Disable payment buttons when completed

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

  // Define agreement stage grouping with sequential locking order
  const AGREEMENT_STAGE_DOCUMENTS: DocTypeKey[] = [
    'original_title_deed', // Sub-stage 1: Must be completed first
    'seller_id_passport', // Sub-stage 2: Requires sub-stage 1
    'spousal_consent', // Sub-stage 3: Requires sub-stages 1-2
    'spouse_id_kra', // Sub-stage 4: Requires sub-stages 1-3
    'signed_lra33', // Sub-stage 5: Requires sub-stages 1-4
  ]

  // Check if a sub-stage within agreement documents is locked
  const isAgreementSubStageLocked = useCallback(
    (docKey: DocTypeKey): boolean => {
      if (!AGREEMENT_STAGE_DOCUMENTS.includes(docKey)) return false

      const currentIndex = AGREEMENT_STAGE_DOCUMENTS.indexOf(docKey)
      if (currentIndex === 0) return false // First sub-stage is never locked

      // Check if all previous sub-stages are completed
      for (let i = 0; i < currentIndex; i++) {
        const prevDocKey = AGREEMENT_STAGE_DOCUMENTS[i]
        const prevState = documentStates[prevDocKey]
        const hasFiles = prevState?.documents?.length > 0
        const isNA = prevState?.status?.is_na || false

        if (!hasFiles && !isNA) {
          return true // Previous sub-stage not completed, so current is locked
        }
      }

      return false // All previous sub-stages completed
    },
    [documentStates]
  )

  // Get the next required sub-stage in agreement documents
  const getNextRequiredAgreementSubStage = useCallback((): DocTypeKey | null => {
    for (const docKey of AGREEMENT_STAGE_DOCUMENTS) {
      const state = documentStates[docKey]
      const hasFiles = state?.documents?.length > 0
      const isNA = state?.status?.is_na || false

      if (!hasFiles && !isNA) {
        return docKey // This is the next required sub-stage
      }
    }
    return null // All sub-stages completed
  }, [documentStates])

  // Get filtered document types based on workflow and stage filter
  const getFilteredDocTypesForComponent = useCallback(() => {
    let filteredTypes = DOC_TYPES

    // Apply stage filtering if specified
    if (stageFilter === 'stages_1_10') {
      // Show only stages 1-10 (regular documents) - STRICT ENFORCEMENT
      // Exclude subdivision-only docs but keep registered_title for both workflows
      const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter((key) => key !== 'registered_title')
      filteredTypes = DOC_TYPES.filter((docType) => !subdivisionOnlyDocs.includes(docType.key))
    } else if (stageFilter === 'stages_11_16') {
      // Show only stages 10-16 (subdivision documents) - STRICT ENFORCEMENT
      filteredTypes = DOC_TYPES.filter((docType) => SUBDIVISION_DOC_KEYS.includes(docType.key))
    } else if (property) {
      // Auto-detect workflow type from property and apply strict filtering
      const workflowType = getWorkflowType(property)
      filteredTypes = getFilteredDocTypes(workflowType)

      // Log filtering for debugging
      console.log(`🎯 Stage Filtering Applied:`, {
        workflowType,
        totalDocs: DOC_TYPES.length,
        filteredDocs: filteredTypes.length,
        hiddenDocs: DOC_TYPES.length - filteredTypes.length,
      })
    } else {
      // Fallback: determine from pipeline prop
      if (pipeline === 'subdivision') {
        filteredTypes = DOC_TYPES.filter((docType) => SUBDIVISION_DOC_KEYS.includes(docType.key))
      } else {
        // Exclude subdivision-only docs but keep registered_title for regular workflows
        const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter((key) => key !== 'registered_title')
        filteredTypes = DOC_TYPES.filter((docType) => !subdivisionOnlyDocs.includes(docType.key))
      }
    }

    return filteredTypes
  }, [stageFilter, property, pipeline])

  // Calculate document progression stages with multi-document agreement stage
  const calculateDocumentStages = useCallback((): DocumentStageInfo[] => {
    const stages: DocumentStageInfo[] = []
    let stageNumber = 1
    const filteredDocTypes = getFilteredDocTypesForComponent()

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
  }, [documentStates, getFilteredDocTypesForComponent])

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
    // Check surgical upload controls
    if (isUploadDisabled) {
      alert(documentsReadOnlyReason || 'Document upload is disabled for completed properties')
      return
    }

    // Check read-only status
    if (!checkAction('upload')) {
      return
    }

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
    // Check surgical delete controls
    if (isDeleteDisabled) {
      alert(documentsReadOnlyReason || 'Document deletion is disabled for completed properties')
      return
    }

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
    // Use workflow-aware progress calculation utility
    if (property) {
      const workflowType = getWorkflowType(property)
      return calculateWorkflowProgress(documentStates, workflowType)
    } else {
      // Fallback: Use filtered document types based on pipeline prop
      const filteredDocTypes = getFilteredDocTypesForComponent()
      const requiredDocs = filteredDocTypes.filter((dt) => dt.required)
      const completedDocs = requiredDocs.filter((dt) => {
        const state = documentStates[dt.key]
        return state?.status?.is_na || (state?.documents.length || 0) > 0
      })

      return {
        completed: completedDocs.length,
        total: requiredDocs.length,
        percentage:
          requiredDocs.length > 0
            ? Math.round((completedDocs.length / requiredDocs.length) * 100)
            : 0,
      }
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
            <p className="mt-2 text-sm">
              Document management is not available for this property at this time.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const stats = getCompletionStats()

  return (
    <ReadOnlyDocumentWrapper propertyId={propertyId}>
      <div className="space-y-4">
        {/* Workflow-Aware Progress Header */}
        <WorkflowProgressIndicator
          propertyId={propertyId}
          propertyName={propertyName}
          property={property}
          workflowType={
            property
              ? getWorkflowType(property)
              : pipeline === 'subdivision'
                ? 'subdivision'
                : 'direct_addition'
          }
          documentStates={documentStates}
          showDetails={true}
        />

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
                      stage.isActive
                        ? 'bg-blue-50'
                        : stage.isCompleted
                          ? 'bg-green-50'
                          : 'bg-gray-50'
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
                              disabled={isPaymentDisabled}
                              disabledReason={documentsReadOnlyReason || 'Payments disabled for completed properties'}
                            />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                          {docType.description}
                        </p>

                        {/* Multi-document progress with sub-stage information */}
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
                            of {stage.groupedDocuments.length} sub-stages completed
                          </span>

                          {stage.isLocked && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <LockClosedIcon className="h-3 w-3" />
                              Complete previous step first
                            </span>
                          )}
                        </div>

                        {/* Next required sub-stage indicator */}
                        {!stage.isLocked &&
                          (() => {
                            const nextSubStage = getNextRequiredAgreementSubStage()
                            if (nextSubStage) {
                              const nextDocType = DOC_TYPES.find((dt) => dt.key === nextSubStage)
                              const subStageIndex = AGREEMENT_STAGE_DOCUMENTS.indexOf(nextSubStage)
                              return (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                  <span className="text-blue-700 font-medium">
                                    📋 Next: Sub-stage {subStageIndex + 1} - {nextDocType?.label}
                                  </span>
                                </div>
                              )
                            }
                            return null
                          })()}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Document Cards */}
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {stage.groupedDocuments.map((docKey, subStageIndex) => {
                      const groupedDocType = DOC_TYPES.find((dt) => dt.key === docKey)
                      if (!groupedDocType) return null

                      const state = documentStates[docKey]
                      const isExpanded = state?.isExpanded || false
                      const isUploading = state?.isUploading || false
                      const documents = state?.documents || []

                      // Apply sub-stage locking for agreement documents
                      const isSubStageLocked = isAgreementSubStageLocked(docKey)
                      const isDocumentLocked = isDocLocked || isSubStageLocked
                      const nextRequiredSubStage = getNextRequiredAgreementSubStage()

                      return (
                        <div
                          key={docKey}
                          className={`border border-gray-200 rounded-lg ${
                            isSubStageLocked ? 'bg-gray-100 opacity-75' : 'bg-gray-50'
                          }`}
                        >
                          {/* Individual Document Header */}
                          <div
                            className={`flex items-center justify-between p-3 ${
                              isDocumentLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            onClick={() => !isDocumentLocked && toggleExpanded(docKey)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-lg flex-shrink-0">{groupedDocType.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm text-gray-900 truncate">
                                    Sub-stage {subStageIndex + 1}: {groupedDocType.label}
                                  </h4>
                                  {isSubStageLocked && (
                                    <LockClosedIcon className="h-3 w-3 text-gray-400" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-1">
                                  {groupedDocType.description}
                                </p>
                                {isSubStageLocked && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    Complete previous sub-stages first
                                  </p>
                                )}
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
                              {/* Sub-stage locked message */}
                              {isSubStageLocked && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <LockClosedIcon className="h-4 w-4 text-amber-600" />
                                    <span className="text-sm font-medium text-amber-800">
                                      Sub-stage {subStageIndex + 1} is locked
                                    </span>
                                  </div>
                                  <p className="text-xs text-amber-700 mt-1">
                                    Complete the previous sub-stages in order before proceeding with
                                    this document.
                                  </p>
                                </div>
                              )}

                              {/* File Upload Section */}
                              <div className="space-y-3">
                                {/* Upload Disabled Note */}
                                {isUploadDisabled && (
                                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                                    <div className="flex items-center gap-2">
                                      <span className="text-amber-600">📄🔒</span>
                                      <span className="text-xs text-amber-800 font-medium">
                                        Document upload is disabled for completed properties
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <label
                                    className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-lg transition-colors ${
                                      isDocumentLocked || isUploadDisabled
                                        ? 'border-gray-200 cursor-not-allowed opacity-50'
                                        : 'border-gray-300 hover:border-teal-400 cursor-pointer'
                                    }`}
                                  >
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
                                      disabled={isUploading || isDocumentLocked || isReadOnly || isUploadDisabled}
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
                                            disabled={isDeleteDisabled}
                                            className={`${
                                              isDeleteDisabled
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-red-600 hover:text-red-700'
                                            }`}
                                            title={isDeleteDisabled ? 'Delete disabled for completed properties' : 'Delete document'}
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
                                        className={`rounded border-gray-300 focus:ring-teal-500 ${
                                          isDocumentLocked || documentsReadOnly
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'text-teal-600'
                                        }`}
                                        disabled={isDocumentLocked || documentsReadOnly}
                                        title={documentsReadOnly ? 'Mark as N/A disabled for completed properties' : undefined}
                                      />
                                      <span className={`text-xs ${
                                        documentsReadOnly ? 'text-gray-400' : 'text-gray-700'
                                      }`}>Mark as N/A</span>
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
                                      disabled={isDocumentLocked}
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
                            disabled={isPaymentDisabled}
                            disabledReason={documentsReadOnlyReason || 'Payments disabled for completed properties'}
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
                          disabled={isUploading || isDocLocked || isReadOnly || isUploadDisabled}
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
                                  disabled={isDeleteDisabled}
                                  className={`px-2 py-1 text-xs font-medium border rounded transition-colors ${
                                    isDeleteDisabled
                                      ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                                      : 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                                  }`}
                                  title={isDeleteDisabled ? 'Delete disabled for completed properties' : 'Delete document'}
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
                            className={`rounded border-gray-300 focus:ring-teal-500 ${
                              isDocLocked || documentsReadOnly
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-teal-600'
                            }`}
                            disabled={isDocLocked || documentsReadOnly}
                            title={documentsReadOnly ? 'Mark as N/A disabled for completed properties' : undefined}
                          />
                          <span className={`text-sm ${
                            documentsReadOnly ? 'text-gray-400' : 'text-gray-700'
                          }`}>Mark as N/A</span>
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
    </ReadOnlyDocumentWrapper>
  )
}
