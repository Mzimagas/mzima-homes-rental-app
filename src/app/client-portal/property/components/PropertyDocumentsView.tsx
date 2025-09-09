'use client'

import { useState, useEffect } from 'react'

interface Document {
  id: string
  name: string
  type: string
  status: 'PENDING' | 'COMPLETED' | 'VERIFIED'
  uploaded_at?: string
  file_url?: string
  notes?: string
}

interface PropertyDocumentsViewProps {
  propertyId: string
  handoverId: string
}

export default function PropertyDocumentsView({ propertyId, handoverId }: PropertyDocumentsViewProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
  }, [propertyId, handoverId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      
      // Mock data for now - replace with actual API call
      const mockDocuments: Document[] = [
        {
          id: '1',
          name: 'Title Deed',
          type: 'LEGAL',
          status: 'COMPLETED',
          uploaded_at: '2024-01-15T10:00:00Z',
          file_url: '/documents/title-deed.pdf',
          notes: 'Original title deed verified and processed'
        },
        {
          id: '2',
          name: 'Property Survey Report',
          type: 'SURVEY',
          status: 'COMPLETED',
          uploaded_at: '2024-01-20T14:30:00Z',
          file_url: '/documents/survey-report.pdf'
        },
        {
          id: '3',
          name: 'Purchase Agreement',
          type: 'LEGAL',
          status: 'PENDING',
          notes: 'Awaiting final signatures'
        },
        {
          id: '4',
          name: 'Property Valuation',
          type: 'FINANCIAL',
          status: 'VERIFIED',
          uploaded_at: '2024-01-18T09:15:00Z',
          file_url: '/documents/valuation.pdf'
        }
      ]

      setDocuments(mockDocuments)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'VERIFIED':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '✅'
      case 'VERIFIED':
        return '🔍'
      case 'PENDING':
        return '⏳'
      default:
        return '📄'
    }
  }

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'LEGAL':
        return '⚖️'
      case 'FINANCIAL':
        return '💰'
      case 'SURVEY':
        return '📐'
      default:
        return '📄'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Documents Overview */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Documents</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.status === 'COMPLETED' || d.status === 'VERIFIED').length}
            </div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {documents.filter(d => d.status === 'PENDING').length}
            </div>
            <div className="text-sm text-yellow-700">Pending</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{documents.length}</div>
            <div className="text-sm text-gray-700">Total Documents</div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Status</h3>
        
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h4>
            <p className="text-gray-600">Documents will appear here as they are processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div key={document.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getDocumentTypeIcon(document.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{document.name}</h4>
                      <p className="text-sm text-gray-600">Type: {document.type}</p>
                      {document.uploaded_at && (
                        <p className="text-xs text-gray-500">
                          Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(document.status)}`}>
                      {getStatusIcon(document.status)} {document.status}
                    </span>
                    
                    {document.file_url && (
                      <button
                        onClick={() => window.open(document.file_url, '_blank')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
                
                {document.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">{document.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Categories */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Categories</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['LEGAL', 'FINANCIAL', 'SURVEY'].map((category) => {
            const categoryDocs = documents.filter(d => d.type === category)
            const completedDocs = categoryDocs.filter(d => d.status === 'COMPLETED' || d.status === 'VERIFIED')
            
            return (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{getDocumentTypeIcon(category)}</span>
                  <h4 className="font-medium text-gray-900">{category}</h4>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>{completedDocs.length} of {categoryDocs.length} completed</p>
                  
                  {categoryDocs.length > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(completedDocs.length / categoryDocs.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
