'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'

interface DocumentStorageProps {
  onDataChange?: () => void
}

interface Document {
  id: string
  name: string
  type: string
  size: number
  uploaded_at: string
  property_id?: string
  tenant_id?: string
  url: string
}

interface DocumentUpload {
  file: File
  type: string
  property_id?: string
  tenant_id?: string
  description?: string
}

export default function DocumentStorage({ onDataChange }: DocumentStorageProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [documentType, setDocumentType] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      // TODO: Implement getDocuments in service
      setDocuments([])
    } catch (error) {
      console.error('Error loading documents:', error)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadType) return

    try {
      setUploading(true)
      // TODO: Implement file upload to Supabase Storage
      console.log('Uploading file:', selectedFile.name, 'Type:', uploadType)
      alert('Document upload functionality will be implemented in the next phase')
      setShowUploadModal(false)
      setSelectedFile(null)
      setUploadType('')
      setUploadDescription('')
      loadDocuments()
      onDataChange?.()
    } catch (error) {
      console.error('Error uploading document:', error)
      setError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = documentType === 'all' || doc.type === documentType
    return matchesSearch && matchesType
  })

  const getDocumentCounts = () => {
    return {
      lease_agreements: documents.filter(d => d.type === 'lease_agreements').length,
      inspection_reports: documents.filter(d => d.type === 'inspection_reports').length,
      maintenance_records: documents.filter(d => d.type === 'maintenance_records').length,
      photos: documents.filter(d => d.type === 'photos').length,
    }
  }

  const counts = getDocumentCounts()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Document Storage</h2>
          <p className="text-sm text-gray-500">Manage lease documents and property files</p>
        </div>
        <Button variant="primary" onClick={() => setShowUploadModal(true)}>
          Upload Document
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <TextField
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            options={[
              { value: 'all', label: 'All Documents' },
              { value: 'lease_agreements', label: 'Lease Agreements' },
              { value: 'inspection_reports', label: 'Inspection Reports' },
              { value: 'maintenance_records', label: 'Maintenance Records' },
              { value: 'photos', label: 'Photos' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
        <Button variant="secondary" onClick={loadDocuments}>
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingCard />
      ) : error ? (
        <ErrorCard message={error} />
      ) : filteredDocuments.length > 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((document) => (
                  <tr key={document.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {document.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {document.type.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(document.size / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(document.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button variant="secondary" size="sm">
                        View
                      </Button>
                      <Button variant="secondary" size="sm">
                        Download
                      </Button>
                      <Button variant="secondary" size="sm">
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || documentType !== 'all'
              ? 'No documents match your search criteria.'
              : 'Start organizing your documents by uploading your first file.'}
          </p>
          <Button variant="primary" onClick={() => setShowUploadModal(true)}>
            Upload First Document
          </Button>
        </div>
      )}

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h4 className="font-medium text-gray-900 mb-2">Lease Agreements</h4>
          <p className="text-sm text-gray-500 mb-3">{counts.lease_agreements} documents</p>
          <Button variant="secondary" size="sm" className="w-full">
            View All
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h4 className="font-medium text-gray-900 mb-2">Inspection Reports</h4>
          <p className="text-sm text-gray-500 mb-3">{counts.inspection_reports} documents</p>
          <Button variant="secondary" size="sm" className="w-full">
            View All
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <h4 className="font-medium text-gray-900 mb-2">Maintenance Records</h4>
          <p className="text-sm text-gray-500 mb-3">{counts.maintenance_records} documents</p>
          <Button variant="secondary" size="sm" className="w-full">
            View All
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-3">📷</div>
          <h4 className="font-medium text-gray-900 mb-2">Property Photos</h4>
          <p className="text-sm text-gray-500 mb-3">{counts.photos} documents</p>
          <Button variant="secondary" size="sm" className="w-full">
            View All
          </Button>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Documents</h3>
        </div>
        <div className="p-6">
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.slice(0, 5).map((document) => (
                <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <p className="font-medium text-gray-900">{document.name}</p>
                      <p className="text-sm text-gray-500">
                        {document.type.replace('_', ' ')} • {(document.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="secondary" size="sm">
                      View
                    </Button>
                    <Button variant="secondary" size="sm">
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-gray-500">No documents uploaded yet</p>
              <Button variant="primary" className="mt-4" onClick={() => setShowUploadModal(true)}>
                Upload Your First Document
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false)
          setSelectedFile(null)
          setUploadType('')
          setUploadDescription('')
        }}
        title="Upload Document"
      >
        <div className="space-y-6">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select File *
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type *
            </label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select document type</option>
              <option value="lease_agreements">Lease Agreement</option>
              <option value="inspection_reports">Inspection Report</option>
              <option value="maintenance_records">Maintenance Record</option>
              <option value="photos">Property Photo</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the document"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowUploadModal(false)
                setSelectedFile(null)
                setUploadType('')
                setUploadDescription('')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              disabled={!selectedFile || !uploadType || uploading}
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
