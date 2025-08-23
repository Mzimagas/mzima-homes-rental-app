'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'
import { LeaseAgreement, LeaseFormData } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface LeaseManagementProps {
  onDataChange?: () => void
}

const leaseSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant is required'),
  unit_id: z.string().min(1, 'Unit is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  monthly_rent_kes: z.coerce.number().min(1, 'Monthly rent is required'),
  security_deposit: z.coerce.number().optional(),
  notes: z.string().optional(),
})

export default function LeaseManagement({ onDataChange }: LeaseManagementProps) {
  const [leases, setLeases] = useState<LeaseAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedLease, setSelectedLease] = useState<LeaseAgreement | null>(null)
  const [showLeaseModal, setShowLeaseModal] = useState(false)
  const [showAddLeaseModal, setShowAddLeaseModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema)
  })

  useEffect(() => {
    loadLeases()
  }, [])

  const loadLeases = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await RentalManagementService.getLeaseAgreements()
      setLeases(data)
    } catch (err: any) {
      console.error('Error loading leases:', err)
      setError(err.message || 'Failed to load lease agreements')
    } finally {
      setLoading(false)
    }
  }

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = 
      lease.tenants?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.units?.unit_label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.units?.properties?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lease.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleLeaseClick = (lease: LeaseAgreement) => {
    setSelectedLease(lease)
    setShowLeaseModal(true)
  }

  const handleAddLease = async (data: LeaseFormData) => {
    try {
      setSubmitting(true)
      await RentalManagementService.createLeaseAgreement(data)
      await loadLeases()
      setShowAddLeaseModal(false)
      reset()
      onDataChange?.()
    } catch (err: any) {
      console.error('Error creating lease:', err)
      setError(err.message || 'Failed to create lease agreement')
    } finally {
      setSubmitting(false)
    }
  }

  const getLeaseStatus = (lease: LeaseAgreement) => {
    const now = new Date()
    const startDate = new Date(lease.start_date)
    const endDate = lease.end_date ? new Date(lease.end_date) : null

    if (lease.status === 'TERMINATED') {
      return { label: 'Terminated', color: 'bg-red-100 text-red-800' }
    }
    
    if (endDate && now > endDate) {
      return { label: 'Expired', color: 'bg-gray-100 text-gray-800' }
    }
    
    if (now >= startDate) {
      return { label: 'Active', color: 'bg-green-100 text-green-800' }
    }
    
    return { label: 'Future', color: 'bg-blue-100 text-blue-800' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return <LoadingCard title="Loading lease agreements..." />
  }

  if (error && leases.length === 0) {
    return (
      <ErrorCard
        title="Error Loading Leases"
        message={error}
        onRetry={loadLeases}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lease Management</h2>
          <p className="text-sm text-gray-500">Manage lease agreements and tenancy contracts</p>
        </div>
        <Button onClick={() => setShowAddLeaseModal(true)} variant="primary">
          Create Lease
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <TextField
            placeholder="Search by tenant name, unit, or property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'TERMINATED', label: 'Terminated' },
              { value: 'PENDING', label: 'Pending' },
            ]}
          />
        </div>
        <Button onClick={loadLeases} variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Leases List */}
      {filteredLeases.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Lease Agreements ({filteredLeases.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredLeases.map((lease) => {
              const status = getLeaseStatus(lease)
              return (
                <div
                  key={lease.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleLeaseClick(lease)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {lease.tenants?.full_name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">Unit:</span> {lease.units?.unit_label}
                        </div>
                        <div>
                          <span className="font-medium">Property:</span> {lease.units?.properties?.name}
                        </div>
                        <div>
                          <span className="font-medium">Rent:</span> KES {(lease.monthly_rent_kes || 0).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Period:</span> {formatDate(lease.start_date)} - {lease.end_date ? formatDate(lease.end_date) : 'Ongoing'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-blue-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Lease Agreements Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'No leases match your search criteria.' 
              : 'Get started by creating your first lease agreement.'}
          </p>
          <Button onClick={() => setShowAddLeaseModal(true)} variant="primary">
            Create Lease
          </Button>
        </div>
      )}

      {/* Add Lease Modal */}
      <Modal
        isOpen={showAddLeaseModal}
        onClose={() => {
          setShowAddLeaseModal(false)
          reset()
        }}
        title="Create New Lease Agreement"
      >
        <form onSubmit={handleSubmit(handleAddLease)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
              <select
                {...register('tenant_id')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Tenant</option>
                {/* TODO: Load tenants dynamically */}
              </select>
              {errors.tenant_id && (
                <p className="text-xs text-red-600 mt-1">{errors.tenant_id.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select
                {...register('unit_id')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Unit</option>
                {/* TODO: Load available units dynamically */}
              </select>
              {errors.unit_id && (
                <p className="text-xs text-red-600 mt-1">{errors.unit_id.message}</p>
              )}
            </div>

            <TextField
              label="Start Date *"
              type="date"
              {...register('start_date')}
              error={errors.start_date?.message}
            />

            <TextField
              label="End Date"
              type="date"
              {...register('end_date')}
              error={errors.end_date?.message}
            />

            <TextField
              label="Monthly Rent (KES) *"
              type="number"
              {...register('monthly_rent_kes')}
              error={errors.monthly_rent_kes?.message}
            />

            <TextField
              label="Security Deposit (KES)"
              type="number"
              {...register('security_deposit')}
              error={errors.security_deposit?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Additional lease terms and conditions..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddLeaseModal(false)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Lease
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lease Detail Modal */}
      <Modal
        isOpen={showLeaseModal}
        onClose={() => {
          setShowLeaseModal(false)
          setSelectedLease(null)
        }}
        title={selectedLease ? `Lease Agreement Details` : ''}
      >
        {selectedLease && (
          <div className="p-6 space-y-6">
            {/* Lease Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Lease Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tenant</label>
                  <p className="text-sm text-gray-900">{selectedLease.tenants?.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Unit</label>
                  <p className="text-sm text-gray-900">{selectedLease.units?.unit_label}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Property</label>
                  <p className="text-sm text-gray-900">{selectedLease.units?.properties?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaseStatus(selectedLease).color}`}>
                    {getLeaseStatus(selectedLease).label}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedLease.start_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedLease.end_date ? formatDate(selectedLease.end_date) : 'Ongoing'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Monthly Rent</label>
                  <p className="text-sm text-gray-900">KES {(selectedLease.monthly_rent_kes || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button variant="primary" className="flex-1">
                Edit Lease
              </Button>
              <Button variant="secondary" className="flex-1">
                Generate Document
              </Button>
              <Button variant="secondary">
                Terminate Lease
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
