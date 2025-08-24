'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'
import { LeaseAgreement, LeaseFormData } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
import { UnitAllocationService } from '../services/unit-allocation.service'
import { ConflictPreventionService, ConflictCheckResult } from '../services/conflict-prevention.service'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import supabase from '../../../lib/supabase-client'

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
  const [tenants, setTenants] = useState<any[]>([])
  const [availableUnits, setAvailableUnits] = useState<any[]>([])
  const [selectedTenant, setSelectedTenant] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [unitAvailability, setUnitAvailability] = useState<Record<string, {
    available: boolean;
    conflictingLeases?: any[];
    availableFrom?: string;
  }>>({})
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [conflictCheck, setConflictCheck] = useState<ConflictCheckResult | null>(null)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [checkingConflicts, setCheckingConflicts] = useState(false)

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
    loadTenants()
  }, [])

  useEffect(() => {
    if (startDate) {
      loadAvailableUnits(startDate, endDate)
    }
  }, [startDate, endDate])

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

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          full_name,
          phone,
          email,
          tenancy_agreements!left(
            id,
            status,
            units(id, unit_label, properties(name))
          )
        `)
        .order('full_name')

      if (error) throw error

      const tenantsWithCurrentUnit = data?.map(tenant => ({
        ...tenant,
        current_unit: tenant.tenancy_agreements?.find((agreement: any) =>
          agreement.status === 'ACTIVE'
        )?.units || null
      })) || []

      setTenants(tenantsWithCurrentUnit)
    } catch (error) {
      console.error('Error loading tenants:', error)
      setError('Failed to load tenants')
    }
  }

  const loadAvailableUnits = async (startDate: string, endDate?: string) => {
    try {
      setLoadingAvailability(true)

      const { data: units, error } = await supabase
        .from('units')
        .select(`
          id,
          unit_label,
          monthly_rent_kes,
          is_active,
          property_id,
          properties!inner(id, name),
          tenancy_agreements!left(
            id,
            status,
            start_date,
            end_date,
            tenant_id,
            tenants(full_name)
          )
        `)
        .eq('is_active', true)
        .order('unit_label')

      if (error) throw error

      // Check availability for each unit
      const unitsWithAvailability = await Promise.all(
        (units || []).map(async (unit) => {
          const availability = await checkUnitAvailability(unit.id, startDate, endDate)
          return {
            ...unit,
            availability
          }
        })
      )

      setAvailableUnits(unitsWithAvailability)
    } catch (error) {
      console.error('Error loading available units:', error)
      setError('Failed to load available units')
    } finally {
      setLoadingAvailability(false)
    }
  }

  const checkUnitAvailability = async (unitId: string, startDate: string, endDate?: string) => {
    try {
      const availability = await UnitAllocationService.checkUnitAvailability(unitId, startDate, endDate)

      const result = {
        available: availability.available,
        conflictingLeases: availability.conflictingLeases || [],
        availableFrom: availability.availableFrom,
        conflictingTenant: availability.conflictingTenant
      }

      setUnitAvailability(prev => ({ ...prev, [unitId]: result }))
      return result
    } catch (error) {
      console.error('Error checking unit availability:', error)
      return { available: false, conflictingLeases: [] }
    }
  }

  const checkForConflicts = async (data: LeaseFormData) => {
    try {
      setCheckingConflicts(true)

      const conflictResult = await ConflictPreventionService.checkAllocationConflicts({
        tenantId: data.tenant_id,
        unitId: data.unit_id,
        startDate: data.start_date,
        endDate: data.end_date,
        monthlyRent: data.monthly_rent_kes,
        notes: data.notes
      })

      setConflictCheck(conflictResult)

      if (conflictResult.hasConflicts) {
        setShowConflictModal(true)
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking conflicts:', error)
      setError('Failed to check for conflicts')
      return false
    } finally {
      setCheckingConflicts(false)
    }
  }

  const handleAddLease = async (data: LeaseFormData) => {
    try {
      setSubmitting(true)

      // First check for conflicts
      const canProceed = await checkForConflicts(data)
      if (!canProceed) {
        setSubmitting(false)
        return
      }

      // Use atomic allocation service
      const result = await UnitAllocationService.allocateUnitToTenant(
        data.tenant_id,
        data.unit_id,
        data
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to create lease agreement')
      }

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        alert(`Lease created successfully!\n\nWarnings:\n${result.warnings.join('\n')}`)
      }

      await loadLeases()
      setShowAddLeaseModal(false)
      reset()
      resetForm()
      onDataChange?.()
    } catch (err: any) {
      console.error('Error creating lease:', err)
      setError(err.message || 'Failed to create lease agreement')
    } finally {
      setSubmitting(false)
    }
  }

  const proceedWithConflicts = async () => {
    if (!conflictCheck) return

    try {
      setSubmitting(true)
      setShowConflictModal(false)

      // Get form data
      const formData = getValues()

      // Use atomic allocation service with override
      const result = await UnitAllocationService.allocateUnitToTenant(
        formData.tenant_id,
        formData.unit_id,
        formData
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to create lease agreement')
      }

      alert('Lease created successfully despite conflicts!')

      await loadLeases()
      setShowAddLeaseModal(false)
      reset()
      resetForm()
      onDataChange?.()
    } catch (err: any) {
      console.error('Error creating lease with conflicts:', err)
      setError(err.message || 'Failed to create lease agreement')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedTenant('')
    setSelectedUnit('')
    setStartDate('')
    setEndDate('')
    setUnitAvailability({})
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
          resetForm()
        }}
        title="Create New Lease Agreement"
      >
        <form onSubmit={handleSubmit(handleAddLease)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
              <select
                {...register('tenant_id')}
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Tenant</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                    {tenant.current_unit && ` (Currently in ${tenant.current_unit.unit_label})`}
                  </option>
                ))}
              </select>
              {errors.tenant_id && (
                <p className="text-xs text-red-600 mt-1">{errors.tenant_id.message}</p>
              )}
              {selectedTenant && tenants.find(t => t.id === selectedTenant)?.current_unit && (
                <p className="text-xs text-yellow-600 mt-1">
                  ⚠️ This tenant currently has an active lease. Creating a new lease will require handling the existing one.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                {...register('start_date')}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.start_date && (
                <p className="text-xs text-red-600 mt-1">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
              <input
                type="date"
                {...register('end_date')}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.end_date && (
                <p className="text-xs text-red-600 mt-1">{errors.end_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Available Units *
                {loadingAvailability && <span className="text-blue-600">(Checking availability...)</span>}
              </label>
              <select
                {...register('unit_id')}
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                disabled={!startDate || loadingAvailability}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {!startDate ? 'Select start date first' : 'Select Available Unit'}
                </option>
                {availableUnits.map(unit => {
                  const availability = unitAvailability[unit.id]
                  const isAvailable = availability?.available !== false

                  return (
                    <option
                      key={unit.id}
                      value={unit.id}
                      disabled={!isAvailable}
                    >
                      {unit.properties.name} - {unit.unit_label}
                      (KES {unit.monthly_rent_kes?.toLocaleString()}/month)
                      {!isAvailable && ' - ⚠️ Not Available'}
                      {availability?.availableFrom && ` - Available from ${availability.availableFrom}`}
                    </option>
                  )
                })}
              </select>
              {errors.unit_id && (
                <p className="text-xs text-red-600 mt-1">{errors.unit_id.message}</p>
              )}
            </div>

            {/* Unit Conflict Warning */}
            {selectedUnit && unitAvailability[selectedUnit] && !unitAvailability[selectedUnit].available && (
              <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Unit Availability Conflict</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>This unit is not available for the selected dates.</p>
                      {unitAvailability[selectedUnit].conflictingLeases?.map((lease, index) => (
                        <p key={index} className="mt-1">
                          • Occupied by {lease.tenants?.full_name}
                          {lease.end_date ? ` until ${new Date(lease.end_date).toLocaleDateString()}` : ' (ongoing lease)'}
                        </p>
                      ))}
                      {unitAvailability[selectedUnit].availableFrom && (
                        <p className="mt-2 font-medium">
                          Available from: {new Date(unitAvailability[selectedUnit].availableFrom!).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Unit Details */}
            {selectedUnit && unitAvailability[selectedUnit]?.available && (
              <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Selected Unit Details</h4>
                {(() => {
                  const unit = availableUnits.find(u => u.id === selectedUnit)
                  if (!unit) return null
                  return (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-green-700"><strong>Property:</strong> {unit.properties.name}</p>
                        <p className="text-green-700"><strong>Unit:</strong> {unit.unit_label}</p>
                      </div>
                      <div>
                        <p className="text-green-700"><strong>Monthly Rent:</strong> KES {unit.monthly_rent_kes?.toLocaleString()}</p>
                        <p className="text-green-700"><strong>Status:</strong> Available ✅</p>
                      </div>
                      <div>
                        <p className="text-green-700"><strong>Lease Period:</strong></p>
                        <p className="text-green-700">
                          {startDate && new Date(startDate).toLocaleDateString()} - {endDate ? new Date(endDate).toLocaleDateString() : 'Ongoing'}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

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
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting || checkingConflicts}
              disabled={
                submitting ||
                checkingConflicts ||
                !selectedUnit ||
                !selectedTenant ||
                !startDate ||
                (selectedUnit && unitAvailability[selectedUnit] && !unitAvailability[selectedUnit].available)
              }
            >
              {checkingConflicts ? 'Checking Conflicts...' : submitting ? 'Creating...' : 'Create Lease'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Conflict Resolution Modal */}
      <Modal
        isOpen={showConflictModal}
        onClose={() => {
          setShowConflictModal(false)
          setConflictCheck(null)
        }}
        title="Allocation Conflicts Detected"
      >
        {conflictCheck && (
          <div className="space-y-6">
            {/* Conflict Summary */}
            <div className={`p-4 rounded-lg border ${
              conflictCheck.canProceed ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">
                  {conflictCheck.canProceed ? '⚠️' : '🚫'}
                </span>
                <h3 className={`font-medium ${
                  conflictCheck.canProceed ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {conflictCheck.conflicts.length} Conflict{conflictCheck.conflicts.length !== 1 ? 's' : ''} Found
                </h3>
              </div>
              <p className={`text-sm ${
                conflictCheck.canProceed ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {conflictCheck.recommendedAction}
              </p>
            </div>

            {/* Conflict Details */}
            <div className="space-y-4">
              {conflictCheck.conflicts.map((conflict, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{conflict.message}</h4>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        conflict.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        conflict.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {conflict.severity}
                      </span>
                    </div>
                  </div>

                  {/* Suggested Resolutions */}
                  {conflict.suggestedResolutions.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Suggested Resolutions:</h5>
                      <div className="space-y-2">
                        {conflict.suggestedResolutions.map((resolution, resIndex) => (
                          <div key={resIndex} className="bg-gray-50 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h6 className="font-medium text-gray-900 text-sm">{resolution.title}</h6>
                                <p className="text-xs text-gray-600 mt-1">{resolution.description}</p>
                              </div>
                              <div className="flex items-center space-x-2 ml-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  resolution.risk === 'LOW' ? 'bg-green-100 text-green-700' :
                                  resolution.risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {resolution.risk} Risk
                                </span>
                                {resolution.automated && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      // Handle automated resolution
                                      alert('Automated resolution not yet implemented')
                                    }}
                                    className="text-xs"
                                  >
                                    Auto-Fix
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConflictModal(false)
                  setConflictCheck(null)
                }}
              >
                Cancel
              </Button>

              {conflictCheck.canProceed && (
                <Button
                  variant="primary"
                  onClick={proceedWithConflicts}
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Proceed Anyway'}
                </Button>
              )}

              {!conflictCheck.canProceed && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConflictModal(false)
                    setConflictCheck(null)
                  }}
                >
                  Resolve Conflicts First
                </Button>
              )}
            </div>
          </div>
        )}
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
