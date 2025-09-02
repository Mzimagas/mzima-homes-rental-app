/**
 * Document Status Controls Component
 * 
 * Extracted from DirectAdditionDocumentsV2.tsx to improve maintainability.
 * Handles N/A toggle and notes functionality for documents.
 */

'use client'

import { useState } from 'react'
import { DocTypeKey } from '../../../../lib/constants/document-types'
import { DocumentTypeState } from './DocumentTypes'

interface DocumentStatusControlsProps {
  docTypeKey: DocTypeKey
  documentState: DocumentTypeState
  localNote: string
  isLocked: boolean
  documentsReadOnly: boolean
  documentsReadOnlyReason?: string
  onStatusUpdate: (docTypeKey: DocTypeKey, isNa: boolean, note?: string) => void
  onNoteChange: (docTypeKey: DocTypeKey, note: string) => void
}

export default function DocumentStatusControls({
  docTypeKey,
  documentState,
  localNote,
  isLocked,
  documentsReadOnly,
  documentsReadOnlyReason,
  onStatusUpdate,
  onNoteChange,
}: DocumentStatusControlsProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const isNA = documentState?.status?.is_na || false
  const hasFiles = documentState?.documents?.length > 0

  const handleNAToggle = async (checked: boolean) => {
    if (documentsReadOnly) {
      alert(documentsReadOnlyReason || 'Document status changes are disabled for completed properties')
      return
    }

    if (isLocked) {
      alert('Please complete the previous steps before modifying this document.')
      return
    }

    try {
      setIsUpdating(true)
      await onStatusUpdate(docTypeKey, checked, localNote)
    } catch (error) {
      console.error('Error updating N/A status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNoteChange = (note: string) => {
    if (documentsReadOnly) {
      alert(documentsReadOnlyReason || 'Document notes are disabled for completed properties')
      return
    }

    if (isLocked) {
      alert('Please complete the previous steps before modifying this document.')
      return
    }

    onNoteChange(docTypeKey, note)
  }

  return (
    <div className="space-y-3 pt-3 border-t border-gray-200">
      {/* N/A Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isNA}
              onChange={(e) => handleNAToggle(e.target.checked)}
              disabled={isUpdating || documentsReadOnly || isLocked}
              className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                documentsReadOnly || isLocked ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <span className={`text-sm font-medium ${
              documentsReadOnly || isLocked ? 'text-gray-400' : 'text-gray-700'
            }`}>
              Mark as N/A
            </span>
          </label>

          {isUpdating && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          {isNA && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              N/A
            </span>
          )}
          {hasFiles && !isNA && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {documentState.documents.length} file{documentState.documents.length !== 1 ? 's' : ''}
            </span>
          )}
          {!hasFiles && !isNA && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Missing
            </span>
          )}
        </div>
      </div>

      {/* N/A Explanation */}
      {isNA && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-600">
            This document has been marked as "Not Applicable" for this property.
            {hasFiles && ' Uploaded files will be ignored while N/A is active.'}
          </p>
        </div>
      )}

      {/* Notes Section */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium ${
          documentsReadOnly || isLocked ? 'text-gray-400' : 'text-gray-700'
        }`}>
          Notes
        </label>
        <textarea
          value={localNote}
          onChange={(e) => handleNoteChange(e.target.value)}
          disabled={documentsReadOnly || isLocked}
          placeholder={
            documentsReadOnly 
              ? 'Notes are disabled for completed properties'
              : isLocked
              ? 'Complete previous steps to add notes'
              : 'Add notes about this document...'
          }
          rows={3}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm resize-none ${
            documentsReadOnly || isLocked 
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-gray-900'
          }`}
        />
        
        {/* Character count */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {localNote.length}/500 characters
          </span>
          {localNote.length > 450 && (
            <span className="text-amber-600">
              {500 - localNote.length} characters remaining
            </span>
          )}
        </div>
      </div>

      {/* Disabled State Messages */}
      {(documentsReadOnly || isLocked) && (
        <div className={`p-2 rounded-md text-xs ${
          documentsReadOnly 
            ? 'bg-amber-50 border border-amber-200 text-amber-700'
            : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          {documentsReadOnly 
            ? (documentsReadOnlyReason || 'Status changes are disabled for completed properties')
            : 'Complete the previous steps to modify this document'
          }
        </div>
      )}
    </div>
  )
}
