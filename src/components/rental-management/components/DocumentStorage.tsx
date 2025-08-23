'use client'

import { useState } from 'react'
import { Button, TextField, Select } from '../../ui'

interface DocumentStorageProps {
  onDataChange?: () => void
}

export default function DocumentStorage({ onDataChange }: DocumentStorageProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [documentType, setDocumentType] = useState('all')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Document Storage</h2>
          <p className="text-sm text-gray-500">Manage lease documents and property files</p>
        </div>
        <Button variant="primary">
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
        <Button variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-6xl mb-4">📁</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Document Storage</h3>
        <p className="text-gray-500 mb-4">
          This feature will include secure document storage, organization, and sharing capabilities.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Document Types:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Lease agreements</li>
              <li>• Inspection reports</li>
              <li>• Maintenance records</li>
              <li>• Property photos</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Features:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Secure cloud storage</li>
              <li>• Version control</li>
              <li>• Access permissions</li>
              <li>• Digital signatures</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Organization:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Property-based folders</li>
              <li>• Tenant document groups</li>
              <li>• Search and tagging</li>
              <li>• Automated filing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h4 className="font-medium text-gray-900 mb-2">Lease Agreements</h4>
          <p className="text-sm text-gray-500 mb-3">0 documents</p>
          <Button variant="secondary" size="sm" className="w-full">
            View All
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h4 className="font-medium text-gray-900 mb-2">Inspection Reports</h4>
          <p className="text-sm text-gray-500 mb-3">0 documents</p>
          <Button variant="secondary" size="sm" className="w-full">
            View All
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <h4 className="font-medium text-gray-900 mb-2">Maintenance Records</h4>
          <p className="text-sm text-gray-500 mb-3">0 documents</p>
          <Button variant="secondary" size="sm" className="w-full">
            View All
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-4xl mb-3">📷</div>
          <h4 className="font-medium text-gray-900 mb-2">Property Photos</h4>
          <p className="text-sm text-gray-500 mb-3">0 documents</p>
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
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-gray-500">No documents uploaded yet</p>
            <Button variant="primary" className="mt-4">
              Upload Your First Document
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
