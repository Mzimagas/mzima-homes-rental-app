'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { usePropertyMutualExclusivity } from '../../../hooks/usePropertyMutualExclusivity'

interface ReadOnlyDocumentContextType {
  isReadOnly: boolean
  readOnlyReason: string | null
  canUpload: boolean
  canEdit: boolean
  canDelete: boolean
  documentsReadOnly: boolean
  documentsReadOnlyReason: string | null
  checkAction: (action: 'upload' | 'edit' | 'delete') => boolean
}

const ReadOnlyDocumentContext = createContext<ReadOnlyDocumentContextType | null>(null)

interface ReadOnlyDocumentWrapperProps {
  propertyId: string
  children: ReactNode
  showBanner?: boolean
}

/**
 * Wrapper component that provides read-only context for document components
 * Automatically disables document editing when property is completed
 */
export default function ReadOnlyDocumentWrapper({
  propertyId,
  children,
  showBanner = true,
}: ReadOnlyDocumentWrapperProps) {
  const {
    documentsReadOnly,
    documentsReadOnlyReason,
    canUploadDocuments,
    canEditDocuments,
    canDeleteDocuments,
    validateDocumentAction,
  } = usePropertyMutualExclusivity(propertyId)

  const checkAction = (action: 'upload' | 'edit' | 'delete'): boolean => {
    const validation = validateDocumentAction(action)
    if (!validation.allowed) {
      alert(validation.reason)
      return false
    }
    return true
  }

  const contextValue: ReadOnlyDocumentContextType = {
    isReadOnly: documentsReadOnly,
    readOnlyReason: documentsReadOnlyReason,
    canUpload: canUploadDocuments,
    canEdit: canEditDocuments,
    canDelete: canDeleteDocuments,
    documentsReadOnly,
    documentsReadOnlyReason,
    checkAction,
  }

  return (
    <ReadOnlyDocumentContext.Provider value={contextValue}>
      <div className={documentsReadOnly ? 'read-only-mode' : ''}>
        {/* Read-Only Banner */}
        {showBanner && documentsReadOnly && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">🔒</span>
              <span className="font-medium text-amber-800">Documents are Read-Only</span>
            </div>
            <p className="mt-1 text-sm text-amber-700">
              {documentsReadOnlyReason ||
                'Property is locked after completion. Documents can be viewed but not modified.'}
            </p>
          </div>
        )}

        {/* Document Content */}
        <div className="document-content">{children}</div>

        {/* CSS for read-only styling */}
        <style jsx>{`
          .read-only-mode button:not([data-readonly-allowed]) {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: auto;
          }

          .read-only-mode button:not([data-readonly-allowed]):hover {
            opacity: 0.5;
          }

          .read-only-mode input:not([readonly]),
          .read-only-mode select:not([readonly]),
          .read-only-mode textarea:not([readonly]) {
            background-color: #f9fafb;
            border-color: #d1d5db;
            color: #6b7280;
            cursor: not-allowed;
          }

          .read-only-mode .upload-zone {
            opacity: 0.5;
            pointer-events: none;
          }

          .read-only-mode .file-input {
            pointer-events: none;
          }
        `}</style>
      </div>
    </ReadOnlyDocumentContext.Provider>
  )
}

/**
 * Hook to access read-only document context
 */
export function useDocumentReadOnlyStatus(propertyId?: string) {
  const context = useContext(ReadOnlyDocumentContext)

  // If no context, create a fallback using the hook directly
  const fallback = usePropertyMutualExclusivity(propertyId || '')

  if (context) {
    return context
  }

  // Fallback implementation
  return {
    isReadOnly: fallback.documentsReadOnly,
    readOnlyReason: fallback.documentsReadOnlyReason,
    canUpload: fallback.canUploadDocuments,
    canEdit: fallback.canEditDocuments,
    canDelete: fallback.canDeleteDocuments,
    documentsReadOnly: fallback.documentsReadOnly,
    documentsReadOnlyReason: fallback.documentsReadOnlyReason,
    checkAction: (action: 'upload' | 'edit' | 'delete') => {
      const validation = fallback.validateDocumentAction(action)
      if (!validation.allowed) {
        alert(validation.reason)
        return false
      }
      return true
    },
  }
}

/**
 * Higher-order component for wrapping document components with read-only functionality
 */
export function withReadOnlyDocuments<P extends object>(Component: React.ComponentType<P>) {
  return function ReadOnlyDocumentComponent(props: P & { propertyId: string }) {
    const { propertyId, ...componentProps } = props

    return (
      <ReadOnlyDocumentWrapper propertyId={propertyId}>
        <Component {...(componentProps as P)} />
      </ReadOnlyDocumentWrapper>
    )
  }
}

/**
 * Component for displaying read-only status information
 */
export function ReadOnlyDocumentStatus({ propertyId }: { propertyId: string }) {
  const { isReadOnly, readOnlyReason } = useDocumentReadOnlyStatus(propertyId)

  if (!isReadOnly) {
    return null
  }

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
      <div className="flex items-center">
        <span className="text-amber-600 mr-2">🔒</span>
        <span className="font-medium text-amber-800">Documents are Read-Only</span>
      </div>
      <p className="mt-1 text-sm text-amber-700">
        {readOnlyReason ||
          'Property is locked after completion. Documents can be viewed but not modified.'}
      </p>
    </div>
  )
}

/**
 * Button component that respects read-only state
 */
interface ReadOnlyAwareButtonProps {
  action: 'upload' | 'edit' | 'delete'
  onClick: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
  propertyId?: string
}

export function ReadOnlyAwareButton({
  action,
  onClick,
  children,
  className = '',
  disabled = false,
  propertyId,
}: ReadOnlyAwareButtonProps) {
  const { isReadOnly, checkAction } = useDocumentReadOnlyStatus(propertyId)

  const handleClick = () => {
    if (isReadOnly && !checkAction(action)) {
      return
    }
    onClick()
  }

  const isDisabled = disabled || isReadOnly

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-readonly-allowed={!isReadOnly}
    >
      {isReadOnly && action !== 'view' ? `🔒 ${children} (Disabled)` : children}
    </button>
  )
}

/**
 * File input component that respects read-only state
 */
interface ReadOnlyAwareFileInputProps {
  onFileSelect: (files: FileList) => void
  accept?: string
  multiple?: boolean
  className?: string
  disabled?: boolean
  propertyId?: string
}

export function ReadOnlyAwareFileInput({
  onFileSelect,
  accept,
  multiple = false,
  className = '',
  disabled = false,
  propertyId,
}: ReadOnlyAwareFileInputProps) {
  const { isReadOnly, checkAction } = useDocumentReadOnlyStatus(propertyId)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly && !checkAction('upload')) {
      return
    }

    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files)
    }
  }

  const isDisabled = disabled || isReadOnly

  return (
    <input
      type="file"
      onChange={handleFileChange}
      accept={accept}
      multiple={multiple}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'cursor-not-allowed' : ''} file-input`}
    />
  )
}
