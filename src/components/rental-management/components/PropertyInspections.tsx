'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'
import { PropertyInspection, InspectionFormData } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface PropertyInspectionsProps {
  onDataChange?: () => void
  propertyId?: string // Optional property ID for filtering
}

const inspectionSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  unit_id: z.string().optional(),
  inspection_type: z.enum(['MOVE_IN', 'MOVE_OUT', 'ROUTINE', 'MAINTENANCE', 'EMERGENCY']),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  inspector_name: z.string().min(1, 'Inspector name is required'),
  tenant_id: z.string().optional(),
  notes: z.string().optional(),
})

export default function PropertyInspections({ onDataChange, propertyId }: PropertyInspectionsProps) {
  const [inspections, setInspections] = useState<PropertyInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema)
  })

  const selectedPropertyId = watch('property_id')

  useEffect(() => {
    loadInspections()
    if (!propertyId) {
      // Only load all properties and tenants if not filtering by specific property
      loadProperties()
      loadTenants()
    }
  }, [propertyId])

  const loadInspections = async () => {
    try {
      setLoading(true)
      // TODO: Implement getInspections in service with propertyId filtering
      // For now, using empty array but in real implementation would filter by propertyId
      setInspections([])
    } catch (error) {
      console.error('Error loading inspections:', error)
      setError('Failed to load inspections')
    } finally {
      setLoading(false)
    }
  }

  const loadProperties = async () => {
    try {
      const propertiesData = await RentalManagementService.getRentalProperties()
      setProperties(propertiesData)
    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  const loadTenants = async () => {
    try {
      const tenantsData = await RentalManagementService.getTenants()
      setTenants(tenantsData)
    } catch (error) {
      console.error('Error loading tenants:', error)
    }
  }

  const onSubmit = async (data: InspectionFormData) => {
    try {
      setSubmitting(true)
      // TODO: Implement createInspection in service
      console.log('Inspection data:', data)
      alert('Inspection scheduling functionality will be implemented in the next phase')
      setShowInspectionModal(false)
      reset()
      loadInspections()
      onDataChange?.()
    } catch (error) {
      console.error('Error creating inspection:', error)
      setError('Failed to schedule inspection')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Property Inspections</h2>
          <p className="text-sm text-gray-500">Schedule and manage property inspections</p>
        </div>
        <Button variant="primary" onClick={() => setShowInspectionModal(true)}>
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'MOVE_IN', label: 'Move-in' },
              { value: 'MOVE_OUT', label: 'Move-out' },
              { value: 'ROUTINE', label: 'Routine' },
              { value: 'MAINTENANCE', label: 'Maintenance' },
              { value: 'EMERGENCY', label: 'Emergency' },
            ]}
          />
        </div>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
        <Button variant="secondary" onClick={loadInspections}>
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingCard />
      ) : error ? (
        <ErrorCard message={error} />
      ) : (
        <div className="bg-white rounded-lg shadow">
          {inspections.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inspector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inspections.map((inspection) => (
                    <tr key={inspection.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(inspection.scheduled_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {/* TODO: Show property name */}
                        Property
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inspection.inspection_type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inspection.inspector_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          inspection.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          inspection.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          inspection.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {inspection.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Inspections Scheduled</h3>
              <p className="text-gray-500 mb-4">
                Start managing property inspections by scheduling your first inspection.
              </p>
              <Button variant="primary" onClick={() => setShowInspectionModal(true)}>
                Schedule First Inspection
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Inspection Modal */}
      <Modal
        isOpen={showInspectionModal}
        onClose={() => {
          setShowInspectionModal(false)
          reset()
        }}
        title="Schedule Inspection"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Property Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property *
            </label>
            <select
              {...register('property_id')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            {errors.property_id && (
              <p className="text-red-500 text-sm mt-1">{errors.property_id.message}</p>
            )}
          </div>

          {/* Unit Selection (Optional) */}
          {selectedPropertyId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit (Optional)
              </label>
              <select
                {...register('unit_id')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All units / Common areas</option>
                {properties
                  .find(p => p.id === selectedPropertyId)?.units?.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Inspection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inspection Type *
            </label>
            <select
              {...register('inspection_type')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select inspection type</option>
              <option value="MOVE_IN">Move-in Inspection</option>
              <option value="MOVE_OUT">Move-out Inspection</option>
              <option value="ROUTINE">Routine Inspection</option>
              <option value="MAINTENANCE">Maintenance Inspection</option>
              <option value="EMERGENCY">Emergency Inspection</option>
            </select>
            {errors.inspection_type && (
              <p className="text-red-500 text-sm mt-1">{errors.inspection_type.message}</p>
            )}
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Date *
            </label>
            <input
              type="datetime-local"
              {...register('scheduled_date')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.scheduled_date && (
              <p className="text-red-500 text-sm mt-1">{errors.scheduled_date.message}</p>
            )}
          </div>

          {/* Inspector Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inspector Name *
            </label>
            <input
              type="text"
              {...register('inspector_name')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter inspector name"
            />
            {errors.inspector_name && (
              <p className="text-red-500 text-sm mt-1">{errors.inspector_name.message}</p>
            )}
          </div>

          {/* Tenant (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant (Optional)
            </label>
            <select
              {...register('tenant_id')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select tenant (if applicable)</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes or special instructions"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowInspectionModal(false)
                reset()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Scheduling...' : 'Schedule Inspection'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
