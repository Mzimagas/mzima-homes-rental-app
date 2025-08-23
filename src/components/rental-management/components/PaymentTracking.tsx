'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'

interface PaymentTrackingProps {
  onDataChange?: () => void
}

export default function PaymentTracking({ onDataChange }: PaymentTrackingProps) {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Payment Tracking</h2>
          <p className="text-sm text-gray-500">Track rent payments and collection</p>
        </div>
        <Button variant="primary">
          Record Payment
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <TextField
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            options={[
              { value: 'all', label: 'All Payments' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
        </div>
        <Button variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-6xl mb-4">💳</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Tracking</h3>
        <p className="text-gray-500 mb-4">
          This feature will include rent collection tracking, payment history, overdue notifications, and financial reporting.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Features Coming Soon:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Payment recording and tracking</li>
              <li>• Automated rent invoicing</li>
              <li>• Overdue payment alerts</li>
              <li>• Payment method management</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Integration:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• M-Pesa integration</li>
              <li>• Bank transfer tracking</li>
              <li>• Receipt generation</li>
              <li>• Financial reporting</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Analytics:</h4>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Collection rate analysis</li>
              <li>• Payment trend reports</li>
              <li>• Tenant payment history</li>
              <li>• Revenue forecasting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
