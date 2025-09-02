/**
 * Document Management Types and Interfaces
 * 
 * Extracted from DirectAdditionDocumentsV2.tsx to improve maintainability.
 * Contains all type definitions for document management components.
 */

import { DocTypeKey, DocumentStatus } from '../../../../lib/constants/document-types'

export interface PropertyDocument {
  id: string
  property_id: string
  doc_type: DocTypeKey
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_at: string
  uploaded_by: string
  pipeline: string
}

export interface DocumentTypeState {
  documents: PropertyDocument[]
  isExpanded: boolean
  isUploading: boolean
  status?: {
    id: string
    property_id: string
    doc_type: DocTypeKey
    is_na: boolean
    note?: string
    created_at: string
    updated_at: string
  }
}

export interface DocumentStageInfo {
  stageNumber: number
  docType: any // DOC_TYPE object
  isCompleted: boolean
  isActive: boolean
  isLocked: boolean
  isMultiDocument?: boolean
  groupedDocuments?: DocTypeKey[]
}

export interface DocumentUploadProps {
  docTypeKey: DocTypeKey
  propertyId: string
  pipeline: string
  isLocked: boolean
  isUploadDisabled: boolean
  onFileUpload: (docTypeKey: DocTypeKey, files: FileList) => Promise<void>
  onStatusUpdate: (docTypeKey: DocTypeKey, isNa: boolean, note?: string) => void
  onNoteChange: (docTypeKey: DocTypeKey, note: string) => void
  documentState: DocumentTypeState
  localNote: string
}

export interface DocumentListProps {
  documents: PropertyDocument[]
  isDeleteDisabled: boolean
  onFileDelete: (document: PropertyDocument) => Promise<void>
  onFileView: (document: PropertyDocument) => Promise<void>
}

export interface DocumentStageCardProps {
  stage: DocumentStageInfo
  documentStates: Record<DocTypeKey, DocumentTypeState>
  localNotes: Record<DocTypeKey, string>
  isUploadDisabled: boolean
  isDeleteDisabled: boolean
  financialLoading: boolean
  onToggleExpanded: (docTypeKey: DocTypeKey) => void
  onFileUpload: (docTypeKey: DocTypeKey, files: FileList) => Promise<void>
  onFileDelete: (document: PropertyDocument) => Promise<void>
  onFileView: (document: PropertyDocument) => Promise<void>
  onStatusUpdate: (docTypeKey: DocTypeKey, isNa: boolean, note?: string) => void
  onNoteChange: (docTypeKey: DocTypeKey, note: string) => void
  getStatusChip: (docTypeKey: DocTypeKey) => JSX.Element
  isAgreementSubStageLocked: (docKey: DocTypeKey) => boolean
  getNextRequiredAgreementSubStage: () => DocTypeKey | null
}

export interface DocumentProgressHeaderProps {
  propertyId: string
  propertyName: string
  pipeline?: string
  property?: any
  stats: {
    completed: number
    total: number
    percentage: number
  }
  documentStages: DocumentStageInfo[]
  currentActiveStage: number
  financialLoading: boolean
}

export interface DocumentManagerProps {
  propertyId: string
  propertyName: string
  pipeline?: 'direct_addition' | 'handover' | 'subdivision'
  property?: any
  stageFilter?: 'all' | 'stages_1_10' | 'stages_11_16'
}

// Agreement stage document keys for sequential locking
export const AGREEMENT_STAGE_DOCUMENTS: DocTypeKey[] = [
  'original_title_deed', // Sub-stage 1: Must be completed first
  'seller_id_passport', // Sub-stage 2: Requires sub-stage 1
  'spousal_consent', // Sub-stage 3: Requires sub-stages 1-2
  'spouse_id_kra', // Sub-stage 4: Requires sub-stages 1-3
  'signed_lra33', // Sub-stage 5: Requires sub-stages 1-4
]

// Document validation helpers
export const validatePropertyId = (propertyId: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(propertyId)
}

export const getDocumentStatusBadge = (
  docTypeKey: DocTypeKey,
  documentState: DocumentTypeState | undefined,
  docType: any
) => {
  const isRequired = docType?.required || false
  const hasFiles = documentState?.documents?.length > 0

  if (documentState?.status?.is_na) {
    return {
      text: 'N/A',
      className: 'bg-gray-100 text-gray-700',
      icon: '⊘'
    }
  }

  if (hasFiles) {
    const count = documentState.documents.length
    return {
      text: `${count} file${count !== 1 ? 's' : ''}`,
      className: 'bg-green-100 text-green-700',
      icon: '✓'
    }
  }

  return {
    text: isRequired ? 'Required' : 'Optional',
    className: isRequired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700',
    icon: isRequired ? '!' : '?'
  }
}

export const getDocumentStatusChip = (
  docTypeKey: DocTypeKey,
  documentState: DocumentTypeState | undefined
): { label: string; className: string } => {
  if (documentState?.status?.is_na) {
    return {
      label: 'N/A',
      className: 'bg-gray-100 text-gray-700'
    }
  }

  const fileCount = documentState?.documents.length || 0
  let status: DocumentStatus = 'missing'
  let chipClass = 'bg-red-100 text-red-700'
  let label = 'Missing'

  if (fileCount > 0) {
    status = 'uploaded'
    chipClass = 'bg-green-100 text-green-700'
    label = `${fileCount} file${fileCount !== 1 ? 's' : ''}`
  }

  return { label, className: chipClass }
}

// File validation helpers
export const validateFileForUpload = (file: File, maxSize: number): string | null => {
  if (file.size > maxSize) {
    return `File "${file.name}" is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`
  }
  
  // Add more validation as needed
  return null
}

// Document completion calculation
export const calculateDocumentCompletion = (
  documentStates: Record<DocTypeKey, DocumentTypeState>,
  filteredDocTypes: any[]
) => {
  const requiredDocs = filteredDocTypes.filter((dt) => dt.required)
  const completedDocs = requiredDocs.filter((dt) => {
    const state = documentStates[dt.key]
    return state?.status?.is_na || (state?.documents.length || 0) > 0
  })

  return {
    completed: completedDocs.length,
    total: requiredDocs.length,
    percentage: requiredDocs.length > 0 ? Math.round((completedDocs.length / requiredDocs.length) * 100) : 0
  }
}
