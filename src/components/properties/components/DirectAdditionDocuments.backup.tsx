'use client'

import { useState, useEffect } from 'react'
import supabase from '../../../lib/supabase-client'
import UploadDebugger from '../../debug/UploadDebugger'

interface DirectAdditionDocumentsProps {
  propertyId: string
  propertyName: string
}

interface DocumentFile {
  id: string
  title: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
  uploaded_at: string
  doc_type: string
}

// Kenya Property Acquisition Document Types
const KENYA_PROPERTY_DOCUMENTS = [
  {
    id: 'title_deed',
    type: 'title',
    label: 'Copy of Title/Title Number',
    description: 'Original title deed or certified copy with title number',
    icon: '📜',
    required: true,
    multiple: false
  },
  {
    id: 'property_images',
    type: 'photo',
    label: 'Property Images',
    description: 'Multiple photographs of the property (exterior, interior, boundaries)',
    icon: '📸',
    required: true,
    multiple: true
  },
  {
    id: 'search_certificate',
    type: 'other',
    label: 'Search Certificate',
    description: 'Official property search from the Ministry of Lands',
    icon: '🔍',
    required: true,
    multiple: false
  },
  {
    id: 'minutes_decision',
    type: 'other',
    label: 'Minutes/Decision to Buy',
    description: 'Meeting minutes or documentation showing decision-making process',
    icon: '📋',
    required: true,
    multiple: false
  },
  {
    id: 'agreement_seller',
    type: 'agreement',
    label: 'Agreement with Seller',
    description: 'Signed purchase agreement or sale contract with the property seller',
    icon: '🤝',
    required: true,
    multiple: false
  },
  {
    id: 'lcb_consent',
    type: 'approval',
    label: 'LCB Consent',
    description: 'Land Control Board consent for the transaction',
    icon: '✅',
    required: true,
    multiple: false
  },
  {
    id: 'valuation_report',
    type: 'other',
    label: 'Valuation Report',
    description: 'Professional property valuation report',
    icon: '💰',
    required: true,
    multiple: false
  },
  {
    id: 'assessment',
    type: 'other',
    label: 'Assessment',
    description: 'Property assessment documentation',
    icon: '📊',
    required: true,
    multiple: false
  },
  {
    id: 'stamp_duty',
    type: 'receipt',
    label: 'Stamp Duty Payment',
    description: 'Ardhi Sasa stamp duty payment receipts and confirmation',
    icon: '🧾',
    required: true,
    multiple: true
  },
  {
    id: 'registered_title',
    type: 'title',
    label: 'Registered Title',
    description: 'Final registered title deed after transfer completion',
    icon: '🏆',
    required: false,
    multiple: false
  }
]

export default function DirectAdditionDocuments({ propertyId, propertyName }: DirectAdditionDocumentsProps) {
  const [documents, setDocuments] = useState<Record<string, DocumentFile[]>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
  }, [propertyId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      console.log(`Loading documents for property: ${propertyId}`)

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'property')
        .eq('entity_id', propertyId)
        .eq('is_current_version', true)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Database query error:', error)
        throw new Error(`Failed to load documents: ${error.message}`)
      }

      console.log(`Loaded ${data?.length || 0} documents from database`)

      // Group documents by their custom document ID
      const groupedDocs: Record<string, DocumentFile[]> = {}
      data?.forEach(doc => {
        const docId = doc.metadata?.document_id || 'other'
        if (!groupedDocs[docId]) groupedDocs[docId] = []
        groupedDocs[docId].push(doc)
      })

      console.log('Grouped documents:', Object.keys(groupedDocs).map(key => `${key}: ${groupedDocs[key].length} files`))
      setDocuments(groupedDocs)

    } catch (error) {
      console.error('Error loading documents:', error)
      // Don't show alert for loading errors as it's called automatically
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (documentId: string, files: FileList) => {
    const docConfig = KENYA_PROPERTY_DOCUMENTS.find(d => d.id === documentId)
    if (!docConfig) {
      console.error('Document configuration not found for:', documentId)
      return
    }

    // Validate files
    const filesToUpload = Array.from(files)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'text/plain']

    for (const file of filesToUpload) {
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`)
        return
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" has an unsupported format. Please use PDF, DOC, DOCX, JPG, PNG, GIF, or TXT files.`)
        return
      }
    }

    setUploading(prev => ({ ...prev, [documentId]: true }))

    try {
      console.log(`Starting upload for ${filesToUpload.length} files to document type: ${documentId}`)

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        console.log(`Uploading file ${i + 1}/${filesToUpload.length}: ${file.name} (${file.size} bytes, ${file.type})`)

        // Generate unique file path
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const extension = file.name.split('.').pop() || 'bin'
        const fileName = `${timestamp}_${randomString}.${extension}`
        const filePath = `direct_addition/${propertyId}/${documentId}/${fileName}`

        console.log(`Uploading to storage path: ${filePath}`)

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw new Error(`Storage upload failed: ${uploadError.message || 'Unknown storage error'}`)
        }

        console.log('Storage upload successful:', uploadData)

        // Get current user and check if user profile exists
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error('User auth error:', userError)
        }

        let uploadedBy = null
        if (userData?.user?.id) {
          // Check if user profile exists
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', userData.user.id)
            .single()

          if (!profileError && userProfile) {
            uploadedBy = userData.user.id
            console.log('User profile found, setting uploaded_by:', uploadedBy)
          } else {
            console.log('User profile not found for user:', userData.user.id)
            console.log('Setting uploaded_by to null to avoid foreign key constraint violation')
            // Note: In a production system, you might want to create the user profile here
            // or handle this case differently based on your user management strategy
          }
        }

        // Create document record
        const documentRecord = {
          entity_type: 'property',
          entity_id: propertyId,
          doc_type: docConfig.type,
          title: `${docConfig.label} - ${file.name}`,
          description: docConfig.description,
          file_path: filePath,
          file_url: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          mime_type: file.type,
          access_level: 'internal',
          is_current_version: true,
          metadata: { document_id: documentId },
          uploaded_by: uploadedBy,
          uploaded_at: new Date().toISOString(),
        }

        console.log('Creating document record:', documentRecord)

        const { data: dbData, error: dbError } = await supabase
          .from('documents')
          .insert(documentRecord)
          .select()

        if (dbError) {
          console.error('Database insert error:', dbError)
          throw new Error(`Database insert failed: ${dbError.message || 'Unknown database error'}`)
        }

        console.log('Document record created successfully:', dbData)
      }

      console.log('All files uploaded successfully, reloading documents...')
      await loadDocuments()

      // Show success message
      const fileCount = filesToUpload.length
      alert(`Successfully uploaded ${fileCount} file${fileCount !== 1 ? 's' : ''} for ${docConfig.label}!`)

    } catch (error) {
      console.error('Error uploading files:', error)

      // Provide more specific error messages
      let errorMessage = 'Failed to upload files. Please try again.'

      if (error instanceof Error) {
        if (error.message.includes('Storage upload failed')) {
          errorMessage = 'Failed to upload files to storage. Please check your internet connection and try again.'
        } else if (error.message.includes('Database insert failed')) {
          errorMessage = 'Files uploaded but failed to save document records. Please contact support.'
        } else {
          errorMessage = `Upload failed: ${error.message}`
        }
      }

      alert(errorMessage)
    } finally {
      setUploading(prev => ({ ...prev, [documentId]: false }))
    }
  }

  const handleDownload = async (doc: DocumentFile) => {
    try {
      console.log(`Attempting to download document: ${doc.file_name} from path: ${doc.file_url}`)

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_url, 3600)

      if (error) {
        console.error('Storage signed URL error:', error)
        throw new Error(`Failed to create download link: ${error.message}`)
      }

      if (data?.signedUrl) {
        console.log('Opening signed URL:', data.signedUrl)
        window.open(data.signedUrl, '_blank')
      } else {
        throw new Error('No download URL received from storage')
      }
    } catch (error) {
      console.error('Error downloading document:', error)

      let errorMessage = 'Failed to download document. Please try again.'
      if (error instanceof Error) {
        errorMessage = `Download failed: ${error.message}`
      }

      alert(errorMessage)
    }
  }

  const getCompletionStats = () => {
    const requiredDocs = KENYA_PROPERTY_DOCUMENTS.filter(d => d.required)
    const completedDocs = requiredDocs.filter(d => documents[d.id]?.length > 0)
    return {
      completed: completedDocs.length,
      total: requiredDocs.length,
      percentage: Math.round((completedDocs.length / requiredDocs.length) * 100)
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
        <p className="text-sm text-gray-500">Please wait while we fetch your files</p>
      </div>
    )
  }

  const stats = getCompletionStats()

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Debug Tool - Remove after fixing upload issues */}
      <UploadDebugger propertyId={propertyId} />

      {/* Header with Progress - Mobile Optimized */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              🇰🇪 Kenya Property Documents
            </h3>
            <p className="text-sm text-gray-600">
              {propertyName}
            </p>
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

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${stats.percentage}%` }}
          ></div>
        </div>

        {/* Status Message */}
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
                {stats.total - stats.completed} more document{stats.total - stats.completed !== 1 ? 's' : ''} needed
              </span>
            </>
          )}
        </div>
      </div>

      {/* Document Grid - Mobile First */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {KENYA_PROPERTY_DOCUMENTS.map((docConfig) => {
          const docFiles = documents[docConfig.id] || []
          const isComplete = docFiles.length > 0
          const isUploading = uploading[docConfig.id]

          return (
            <div
              key={docConfig.id}
              className={`border-2 rounded-xl p-4 sm:p-5 transition-all duration-300 shadow-sm hover:shadow-md ${
                isComplete
                  ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 hover:border-emerald-300'
                  : docConfig.required
                    ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300'
                    : 'border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 hover:border-slate-300'
              }`}
            >
              {/* Document Header - Mobile Optimized */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl sm:text-2xl ${
                    isComplete
                      ? 'bg-emerald-100 border-2 border-emerald-200'
                      : docConfig.required
                        ? 'bg-blue-100 border-2 border-blue-200'
                        : 'bg-slate-100 border-2 border-slate-200'
                  }`}>
                    {docConfig.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                      {docConfig.label}
                    </h4>
                    <div className="flex items-center gap-1">
                      {docConfig.required && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          Required
                        </span>
                      )}
                      {isComplete && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Complete
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {docConfig.description}
                  </p>
                  {docFiles.length > 0 && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      {docFiles.length} file{docFiles.length !== 1 ? 's' : ''} uploaded
                    </p>
                  )}
                </div>
              </div>

              {/* Upload Area - Mobile Optimized */}
              <div className="mb-4">
                <label className={`
                  block w-full p-4 sm:p-5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200
                  ${isUploading
                    ? 'border-teal-300 bg-teal-50 scale-[0.98]'
                    : isComplete
                      ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100'
                      : 'border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50 hover:scale-[1.02]'
                  }
                `}>
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
                      <span className="text-sm font-medium text-teal-700">Uploading...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-2xl">
                        {isComplete ? '✅' : '📎'}
                      </div>
                      <div>
                        <span className="text-sm sm:text-base font-medium text-gray-700 block">
                          {isComplete ? 'Add more files' : `Upload ${docConfig.multiple ? 'files' : 'file'}`}
                        </span>
                        <span className="text-xs text-gray-500 mt-1 block">
                          PDF, DOC, JPG, PNG • Max 10MB each
                        </span>
                        {docConfig.multiple && (
                          <span className="text-xs text-teal-600 font-medium block mt-1">
                            Multiple files supported
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    multiple={docConfig.multiple}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(docConfig.id, e.target.files)
                        e.target.value = '' // Reset input
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    disabled={isUploading}
                  />
                </label>
              </div>

              {/* Uploaded Files - Mobile Optimized */}
              {docFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-gray-800">
                      Uploaded Files
                    </h5>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {docFiles.length} file{docFiles.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {docFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                            {file.mime_type?.includes('pdf') ? '📄' :
                             file.mime_type?.includes('image') ? '🖼️' :
                             file.mime_type?.includes('word') ? '📝' : '📎'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.file_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(file)}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 hover:border-teal-300 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary - Mobile Optimized */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📋</span>
          <h4 className="font-semibold text-gray-900">Document Checklist Summary</h4>
        </div>

        {/* Mobile: Stack layout, Desktop: Grid layout */}
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:gap-3">
          {KENYA_PROPERTY_DOCUMENTS.map((doc) => {
            const hasFiles = documents[doc.id]?.length > 0
            const fileCount = documents[doc.id]?.length || 0
            return (
              <div
                key={doc.id}
                className={`flex items-center justify-between sm:justify-start gap-3 p-3 rounded-lg border transition-colors ${
                  hasFiles
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : doc.required
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base flex-shrink-0">
                    {hasFiles ? '✅' : doc.required ? '⏳' : '⭕'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium truncate">
                    {doc.label}
                  </span>
                </div>
                {hasFiles && fileCount > 1 && (
                  <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {fileCount}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
              <span className="text-gray-600">
                {stats.completed} Completed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-600">
                {stats.total - stats.completed} Pending
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-slate-300 rounded-full"></span>
              <span className="text-gray-600">
                {KENYA_PROPERTY_DOCUMENTS.filter(d => !d.required).length} Optional
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
