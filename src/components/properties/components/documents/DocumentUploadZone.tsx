/**
 * Document Upload Zone Component
 * 
 * Extracted from DirectAdditionDocumentsV2.tsx to improve maintainability.
 * Handles file upload functionality with drag-and-drop support.
 */

'use client'

import { useRef, useState } from 'react'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { DOC_TYPES, MAX_FILE_SIZE, isValidFileType } from '../../../../lib/constants/document-types'
import { DocumentUploadProps, validateFileForUpload } from './DocumentTypes'

export default function DocumentUploadZone({
  docTypeKey,
  propertyId,
  pipeline,
  isLocked,
  isUploadDisabled,
  onFileUpload,
  documentState,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const docType = DOC_TYPES.find((dt) => dt.key === docTypeKey)
  if (!docType) return null

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (isUploadDisabled || isLocked) return

    // Validate files
    const validationErrors: string[] = []
    Array.from(files).forEach(file => {
      const error = validateFileForUpload(file, MAX_FILE_SIZE)
      if (error) validationErrors.push(error)
      
      if (!isValidFileType(file.name)) {
        validationErrors.push(`File "${file.name}" has an unsupported file type.`)
      }
    })

    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'))
      return
    }

    try {
      setIsUploading(true)
      await onFileUpload(docTypeKey, files)
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!isUploadDisabled && !isLocked) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (isUploadDisabled || isLocked) return
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleClick = () => {
    if (isUploadDisabled || isLocked) return
    fileInputRef.current?.click()
  }

  const getUploadZoneClassName = () => {
    let baseClass = "border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer"
    
    if (isUploadDisabled || isLocked) {
      return `${baseClass} border-gray-200 bg-gray-50 cursor-not-allowed`
    }
    
    if (isDragOver) {
      return `${baseClass} border-blue-400 bg-blue-50`
    }
    
    return `${baseClass} border-gray-300 hover:border-blue-400 hover:bg-blue-50`
  }

  const getUploadMessage = () => {
    if (isLocked) {
      return "Complete previous steps to unlock upload"
    }
    
    if (isUploadDisabled) {
      return "Upload disabled for completed properties"
    }
    
    if (isUploading) {
      return "Uploading files..."
    }
    
    return `Drop ${docType.label.toLowerCase()} files here or click to browse`
  }

  return (
    <div className="space-y-3">
      {/* Upload Disabled Warning */}
      {isUploadDisabled && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-700">
            Document upload is disabled for completed properties
          </p>
        </div>
      )}

      {/* Locked Warning */}
      {isLocked && !isUploadDisabled && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            Complete the previous steps before uploading this document
          </p>
        </div>
      )}

      {/* Upload Zone */}
      <div
        className={getUploadZoneClassName()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={docType.acceptedTypes?.join(',') || '*'}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isUploadDisabled || isLocked}
        />

        <div className="flex flex-col items-center space-y-2">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </>
          ) : (
            <>
              <CloudArrowUpIcon 
                className={`h-8 w-8 ${
                  isUploadDisabled || isLocked ? 'text-gray-400' : 'text-gray-500'
                }`} 
              />
              <p className={`text-sm ${
                isUploadDisabled || isLocked ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {getUploadMessage()}
              </p>
              {!isUploadDisabled && !isLocked && (
                <p className="text-xs text-gray-500">
                  Max file size: {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* File Type Information */}
      {docType.acceptedTypes && docType.acceptedTypes.length > 0 && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">Accepted formats:</span>{' '}
          {docType.acceptedTypes.join(', ').toUpperCase()}
        </div>
      )}

      {/* Document Description */}
      {docType.description && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <span className="font-medium">About this document:</span>{' '}
          {docType.description}
        </div>
      )}
    </div>
  )
}
