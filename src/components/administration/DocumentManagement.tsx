'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../ui'
import { LoadingCard } from '../ui/loading'
import { ErrorCard } from '../ui/error'
import Modal from '../ui/Modal'

interface DocumentManagementProps {
  // Optional props for context-specific usage
  propertyId?: string
  tenantId?: string
}

interface Document {
  id: string
  name: string
  type: string
  category: 'property' | 'rental' | 'legal' | 'financial' | 'maintenance' | 'other'
  size: number
  uploaded_at: string
  property_id?: string
  tenant_id?: string
  url: string
  tags?: string[]
  description?: string
}

interface DocumentUpload {
  file: File
  type: string
  category: string
  property_id?: string
  tenant_id?: string
  description?: string
  tags?: string[]
}

export default function DocumentManagement({ propertyId, tenantId }: DocumentManagementProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadType, setUploadType] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadTags, setUploadTags] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [propertyId, tenantId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Implement actual document loading from Supabase
      // For now, using mock data
      const mockDocuments: Document[] = [
        {
          id: '1',
          name: 'Property Deed - Westlands Plot',
          type: 'deed',
          category: 'property',
          size: 2048000,
          uploaded_at: new Date().toISOString(),
          property_id: 'prop-1',
          url: '#',
          tags: ['legal', 'ownership'],
          description: 'Original property deed document',
        },
        {
          id: '2',
          name: 'Lease Agreement - Unit 2A',
          type: 'lease_agreement',
          category: 'rental',
          size: 1024000,
          uploaded_at: new Date().toISOString(),
          property_id: 'prop-1',
          tenant_id: 'tenant-1',
          url: '#',
          tags: ['lease', 'rental'],
          description: 'Standard lease agreement for rental unit',
        },
      ]

      setDocuments(mockDocuments)
    } catch (err) {
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
    if (!selectedFile || !uploadCategory || !uploadType) return

    try {
      setUploading(true)
      // TODO: Implement file upload to Supabase Storage
            alert('Document upload functionality will be implemented in the next phase')
      setShowUploadModal(false)
      setSelectedFile(null)
      setUploadCategory('')
      setUploadType('')
      setUploadDescription('')
      setUploadTags('')
      loadDocuments()
    } catch (error) {
            setError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    return matchesSearch && matchesCategory && matchesType
  })

  const getDocumentCounts = () => {
    return {
      property: documents.filter((d) => d.category === 'property').length,
      rental: documents.filter((d) => d.category === 'rental').length,
      legal: documents.filter((d) => d.category === 'legal').length,
      financial: documents.filter((d) => d.category === 'financial').length,
      maintenance: documents.filter((d) => d.category === 'maintenance').length,
      other: documents.filter((d) => d.category === 'other').length,
    }
  }

  const counts = getDocumentCounts()

  if (loading) {
    return <LoadingCard title="Loading documents..." />
  }

  if (error) {
    return <ErrorCard title="Failed to load documents" message={error} onRetry={loadDocuments} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Document Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Centralized document storage for properties, rentals, and administrative files
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowUploadModal(true)}>
            Upload Document
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <TextField
            placeholder="Search documents, descriptions, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'property', label: 'Property Documents' },
              { value: 'rental', label: 'Rental Documents' },
              { value: 'legal', label: 'Legal Documents' },
              { value: 'financial', label: 'Financial Documents' },
              { value: 'maintenance', label: 'Maintenance Records' },
              { value: 'other', label: 'Other Documents' },
            ]}
          />
        </div>
        <div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'deed', label: 'Property Deeds' },
              { value: 'lease_agreement', label: 'Lease Agreements' },
              { value: 'inspection_report', label: 'Inspection Reports' },
              { value: 'maintenance_record', label: 'Maintenance Records' },
              { value: 'financial_statement', label: 'Financial Statements' },
              { value: 'photo', label: 'Photos' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
      </div>

      {/* Document Categories Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { key: 'property', label: 'Property', icon: '🏠', count: counts.property },
          { key: 'rental', label: 'Rental', icon: '🏢', count: counts.rental },
          { key: 'legal', label: 'Legal', icon: '⚖️', count: counts.legal },
          { key: 'financial', label: 'Financial', icon: '💰', count: counts.financial },
          { key: 'maintenance', label: 'Maintenance', icon: '🔧', count: counts.maintenance },
          { key: 'other', label: 'Other', icon: '📄', count: counts.other },
        ].map((category) => (
          <div
            key={category.key}
            className={`bg-white border rounded-lg p-4 text-center cursor-pointer transition-colors ${
              categoryFilter === category.key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() =>
              setCategoryFilter(categoryFilter === category.key ? 'all' : category.key)
            }
          >
            <div className="text-2xl mb-2">{category.icon}</div>
            <div className="text-sm font-medium text-gray-900">{category.label}</div>
            <div className="text-xs text-gray-500">{category.count} docs</div>
          </div>
        ))}
      </div>

      {/* Documents List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Documents ({filteredDocuments.length})
          </h3>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || categoryFilter !== 'all' || typeFilter !== 'all'
                ? 'No documents match your search criteria.'
                : 'Start organizing your documents by uploading your first file.'}
            </p>
            <Button variant="primary" onClick={() => setShowUploadModal(true)}>
              Upload First Document
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
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
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{document.name}</div>
                        {document.description && (
                          <div className="text-sm text-gray-500">{document.description}</div>
                        )}
                        {document.tags && document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {document.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="capitalize">{document.category}</span>
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
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false)
          setSelectedFile(null)
          setUploadCategory('')
          setUploadType('')
          setUploadDescription('')
          setUploadTags('')
        }}
        title="Upload Document"
      >
        <div className="space-y-6">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select File *</label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx,.xls"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Category</option>
              <option value="property">Property Documents</option>
              <option value="rental">Rental Documents</option>
              <option value="legal">Legal Documents</option>
              <option value="financial">Financial Documents</option>
              <option value="maintenance">Maintenance Records</option>
              <option value="other">Other Documents</option>
            </select>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Type</option>
              <option value="deed">Property Deed</option>
              <option value="lease_agreement">Lease Agreement</option>
              <option value="inspection_report">Inspection Report</option>
              <option value="maintenance_record">Maintenance Record</option>
              <option value="financial_statement">Financial Statement</option>
              <option value="photo">Photo</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the document"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., legal, important, 2024"
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
                setUploadCategory('')
                setUploadType('')
                setUploadDescription('')
                setUploadTags('')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !uploadCategory || !uploadType}
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
