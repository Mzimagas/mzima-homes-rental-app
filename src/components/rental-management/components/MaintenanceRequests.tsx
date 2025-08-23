'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'
import { MaintenanceRequest, MaintenanceRequestFormData } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface MaintenanceRequestsProps {
  onDataChange?: () => void
}

const maintenanceSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  unit_id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'COSMETIC', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
})

export default function MaintenanceRequests({ onDataChange }: MaintenanceRequestsProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showAddRequestModal, setShowAddRequestModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceSchema)
  })

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await RentalManagementService.getMaintenanceRequests()
      setRequests(data)
    } catch (err: any) {
      console.error('Error loading maintenance requests:', err)
      setError(err.message || 'Failed to load maintenance requests')
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleRequestClick = (request: MaintenanceRequest) => {
    setSelectedRequest(request)
    setShowRequestModal(true)
  }

  const handleAddRequest = async (data: MaintenanceRequestFormData) => {
    try {
      setSubmitting(true)
      await RentalManagementService.createMaintenanceRequest({
        ...data,
        status: 'SUBMITTED',
        submitted_date: new Date().toISOString(),
      })
      await loadRequests()
      setShowAddRequestModal(false)
      reset()
      onDataChange?.()
    } catch (err: any) {
      console.error('Error creating maintenance request:', err)
      setError(err.message || 'Failed to create maintenance request')
    } finally {
      setSubmitting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'ACKNOWLEDGED': return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return <LoadingCard title="Loading maintenance requests..." />
  }

  if (error && requests.length === 0) {
    return (
      <ErrorCard
        title="Error Loading Maintenance Requests"
        message={error}
        onRetry={loadRequests}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Maintenance Requests</h2>
          <p className="text-sm text-gray-500">Track and manage property maintenance requests</p>
        </div>
        <Button onClick={() => setShowAddRequestModal(true)} variant="primary">
          Log Request
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <TextField
            placeholder="Search maintenance requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Priority' },
              { value: 'URGENT', label: 'Urgent' },
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' },
            ]}
          />
        </div>
        <Button onClick={loadRequests} variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Maintenance Requests ({filteredRequests.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRequestClick(request)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {request.title}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Category:</span> {request.category}
                      </div>
                      <div>
                        <span className="font-medium">Property:</span> {(request as any).properties?.name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Unit:</span> {(request as any).units?.unit_label || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span> {formatDate(request.submitted_date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Maintenance Requests Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'No requests match your search criteria.'
              : 'No maintenance requests have been logged yet.'}
          </p>
          <Button onClick={() => setShowAddRequestModal(true)} variant="primary">
            Log Request
          </Button>
        </div>
      )}

      {/* Add Request Modal */}
      <Modal
        isOpen={showAddRequestModal}
        onClose={() => {
          setShowAddRequestModal(false)
          reset()
        }}
        title="Log Maintenance Request"
      >
        <form onSubmit={handleSubmit(handleAddRequest)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
              <select
                {...register('property_id')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Property</option>
                {/* TODO: Load properties dynamically */}
              </select>
              {errors.property_id && (
                <p className="text-xs text-red-600 mt-1">{errors.property_id.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                {...register('unit_id')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Unit (Optional)</option>
                {/* TODO: Load units dynamically based on selected property */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                {...register('category')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="HVAC">HVAC</option>
                <option value="APPLIANCE">Appliance</option>
                <option value="STRUCTURAL">Structural</option>
                <option value="COSMETIC">Cosmetic</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.category && (
                <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
              <select
                {...register('priority')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              {errors.priority && (
                <p className="text-xs text-red-600 mt-1">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <TextField
            label="Title *"
            {...register('title')}
            error={errors.title?.message}
            placeholder="Brief description of the issue"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              {...register('description')}
              rows={4}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Detailed description of the maintenance issue..."
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddRequestModal(false)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Log Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false)
          setSelectedRequest(null)
        }}
        title={selectedRequest ? `Maintenance Request Details` : ''}
      >
        {selectedRequest && (
          <div className="p-6 space-y-6">
            {/* Request Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Request Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Title</label>
                  <p className="text-sm text-gray-900">{selectedRequest.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <p className="text-sm text-gray-900">{selectedRequest.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedRequest.priority)}`}>
                    {selectedRequest.priority}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">{selectedRequest.description}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button variant="primary" className="flex-1">
                Update Status
              </Button>
              <Button variant="secondary" className="flex-1">
                Assign Contractor
              </Button>
              <Button variant="secondary">
                Add Photos
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
