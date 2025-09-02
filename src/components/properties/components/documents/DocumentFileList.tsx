/**
 * Document File List Component
 * 
 * Extracted from DirectAdditionDocumentsV2.tsx to improve maintainability.
 * Displays uploaded documents with view and delete actions.
 */

'use client'

import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getFileIcon } from '../../../../lib/constants/document-types'
import { DocumentListProps, PropertyDocument } from './DocumentTypes'

export default function DocumentFileList({
  documents,
  isDeleteDisabled,
  onFileDelete,
  onFileView,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No files uploaded yet
      </div>
    )
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatUploadDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const handleDelete = async (document: PropertyDocument) => {
    if (isDeleteDisabled) {
      alert('Document deletion is disabled for completed properties')
      return
    }

    const confirmMessage = `Are you sure you want to delete "${document.file_name}"?\n\nThis action cannot be undone.`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await onFileDelete(document)
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete file. Please try again.')
    }
  }

  const handleView = async (document: PropertyDocument) => {
    try {
      await onFileView(document)
    } catch (error) {
      console.error('View error:', error)
      alert('Failed to open file. Please try again.')
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900 mb-3">
        Uploaded Files ({documents.length})
      </h4>
      
      <div className="space-y-2">
        {documents.map((document) => (
          <div
            key={document.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            {/* File Info */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* File Icon */}
              <div className="flex-shrink-0 text-lg">
                {getFileIcon(document.file_name)}
              </div>

              {/* File Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {document.file_name}
                  </p>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                    {document.file_type.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-xs text-gray-500">
                    {formatFileSize(document.file_size)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Uploaded {formatUploadDate(document.uploaded_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* View Button */}
              <button
                onClick={() => handleView(document)}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                title="View file"
              >
                <EyeIcon className="h-4 w-4" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(document)}
                disabled={isDeleteDisabled}
                className={`p-2 rounded-md transition-colors ${
                  isDeleteDisabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                }`}
                title={isDeleteDisabled ? 'Delete disabled for completed properties' : 'Delete file'}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Disabled Warning */}
      {isDeleteDisabled && documents.length > 0 && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs text-amber-700">
            File deletion is disabled for completed properties
          </p>
        </div>
      )}
    </div>
  )
}
