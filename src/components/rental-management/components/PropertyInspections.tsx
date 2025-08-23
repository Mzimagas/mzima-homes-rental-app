'use client'

import { useState } from 'react'
import { Button, TextField, Select } from '../../ui'

interface PropertyInspectionsProps {
  onDataChange?: () => void
}

export default function PropertyInspections({ onDataChange }: PropertyInspectionsProps) {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Property Inspections</h2>
          <p className="text-sm text-gray-500">Schedule and manage property inspections</p>
        </div>
        <Button variant="primary">
          Schedule Inspection
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <TextField
            placeholder="Search inspections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'move_in', label: 'Move-in' },
              { value: 'move_out', label: 'Move-out' },
              { value: 'routine', label: 'Routine' },
              { value: 'maintenance', label: 'Maintenance' },
            ]}
          />
        </div>
        <Button variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Property Inspections</h3>
        <p className="text-gray-500 mb-4">
          This feature will include inspection scheduling, checklists, photo documentation, and condition tracking.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Inspection Types:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Move-in inspections</li>
              <li>• Move-out inspections</li>
              <li>• Routine maintenance checks</li>
              <li>• Emergency inspections</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Features:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Digital inspection checklists</li>
              <li>• Photo documentation</li>
              <li>• Condition scoring</li>
              <li>• Report generation</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Scheduling:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Calendar integration</li>
              <li>• Automated reminders</li>
              <li>• Inspector assignment</li>
              <li>• Tenant notifications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
