'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { useAuth } from '../../../components/auth/AuthProvider'
import supabase from '../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../components/ui/loading'
import { ErrorCard, EmptyState } from '../../../components/ui/error'
import ErrorBoundary from '../../../components/ui/ErrorBoundary'

// Lazy load document components
const DocumentUpload = lazy(() => import('../../../components/documents/document-upload'))
const DocumentList = lazy(() => import('../../../components/documents/document-list'))
const DocumentStats = lazy(() => import('../../../components/documents/document-stats'))

// Loading component for document sections
function DocumentSectionLoading() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading documents...</p>
      </div>
    </div>
  )
}

interface Document {
  id: string
  name: string
  type: 'lease_agreement' | 'receipt' | 'property_photo' | 'meter_reading' | 'other'
  file_path: string
  file_size: number
  mime_type: string
  related_id: string | null
  related_type: 'property' | 'unit' | 'tenant' | 'payment' | 'maintenance' | null
  uploaded_by: string | null
  created_at: string
  metadata?: {
    property_name?: string
    unit_label?: string
    tenant_name?: string
    description?: string
  }
}

interface DocumentStatsData {
  totalDocuments: number
  totalSize: number
  documentsByType: {
    type: string
    count: number
    size: number
  }[]
  recentUploads: number
}

export default function DocumentsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DocumentStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      // For now, using mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'

      // Get documents from Supabase Storage
      const { data: files, error: storageError } = await supabase.storage
        .from('documents')
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (storageError) {
        console.error('Storage error:', storageError)
        // Continue with empty documents if storage bucket doesn't exist yet
        setDocuments([])
        setStats({
          totalDocuments: 0,
          totalSize: 0,
          documentsByType: [],
          recentUploads: 0,
        })
        return
      }

      // Transform storage files to our document format
      const documentsData: Document[] = (files || []).map((file: any) => {
        const pathParts = String(file.name).split('/')
        const fileName = pathParts[pathParts.length - 1]
        const type = (pathParts[0] || 'other') as Document['type']

        return {
          id: file.id || file.name,
          name: fileName,
          type,
          file_path: file.name,
          file_size: file.metadata?.size || 0,
          mime_type: file.metadata?.mimetype || 'application/octet-stream',
          related_id: null,
          related_type: null,
          uploaded_by: null,
          created_at: file.created_at || new Date().toISOString(),
          metadata: {},
        }
      })

      setDocuments(documentsData)

      // Calculate stats
      const totalDocuments = documentsData.length
      const totalSize = documentsData.reduce((sum, doc) => sum + doc.file_size, 0)

      const documentsByType = Object.entries(
        documentsData.reduce(
          (acc, doc) => {
            acc[doc.type] = acc[doc.type] || { count: 0, size: 0 }
            acc[doc.type].count++
            acc[doc.type].size += doc.file_size
            return acc
          },
          {} as Record<string, { count: number; size: number }>
        )
      ).map(([type, data]) => ({ type, ...data }))

      const recentUploads = documentsData.filter((doc) => {
        const uploadDate = new Date(doc.created_at)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return uploadDate >= weekAgo
      }).length

      setStats({
        totalDocuments,
        totalSize,
        documentsByType,
        recentUploads,
      })
    } catch (err) {
      setError('Failed to load documents')
      console.error('Documents loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUploaded = () => {
    setShowUpload(false)
    loadDocuments() // Reload documents
  }

  const handleDocumentDeleted = () => {
    loadDocuments() // Reload documents
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesType = filterType === 'all' || doc.type === filterType
    const matchesSearch =
      searchTerm === '' ||
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Document Management</h1>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading documents..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Document Management</h1>
        </div>
        <ErrorCard title="Failed to load documents" message={error} onRetry={loadDocuments} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Document Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage lease agreements, receipts, and property documents
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Upload Document
        </button>
      </div>

      {/* Stats with Lazy Loading */}
      {stats && (
        <ErrorBoundary>
          <Suspense fallback={<DocumentSectionLoading />}>
            <DocumentStats stats={stats} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search documents..."
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Document Type
            </label>
            <select
              id="type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="lease_agreement">Lease Agreements</option>
              <option value="receipt">Receipts</option>
              <option value="property_photo">Property Photos</option>
              <option value="meter_reading">Meter Readings</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Documents ({filteredDocuments.length})
          </h3>
        </div>

        {filteredDocuments.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="No documents match your current filters."
            actionLabel="Upload Document"
            onAction={() => setShowUpload(true)}
          />
        ) : (
          <ErrorBoundary>
            <Suspense fallback={<DocumentSectionLoading />}>
              <DocumentList
                documents={filteredDocuments}
                onDocumentDeleted={handleDocumentDeleted}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>

      {/* Document Upload Modal with Lazy Loading */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <DocumentUpload
            isOpen={showUpload}
            onSuccess={handleDocumentUploaded}
            onCancel={() => setShowUpload(false)}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
