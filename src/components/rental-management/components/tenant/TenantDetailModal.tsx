/**
 * Tenant Detail Modal Component
 * 
 * Extracted from TenantManagement.tsx to improve maintainability.
 * Displays comprehensive tenant information in a read-only modal.
 */

'use client'

import { Button } from '../../../ui'
import Modal from '../../../ui/Modal'
import { RentalTenant } from '../../types/rental-management.types'
import { formatUnitAllocation, extractUnitPropertyData } from '../../utils/unit-display.utils'

interface TenantDetailModalProps {
  isOpen: boolean
  onClose: () => void
  tenant: RentalTenant | null
  onEdit?: (tenant: RentalTenant) => void
  onCreateLease?: (tenant: RentalTenant) => void
  onViewLeaseHistory?: (tenant: RentalTenant) => void
  onViewPaymentHistory?: (tenant: RentalTenant) => void
}

export default function TenantDetailModal({
  isOpen,
  onClose,
  tenant,
  onEdit,
  onCreateLease,
  onViewLeaseHistory,
  onViewPaymentHistory,
}: TenantDetailModalProps) {
  if (!tenant) return null

  const hasActiveLease = tenant.current_unit && tenant.current_lease_id
  const unitData = tenant.current_unit ? extractUnitPropertyData(tenant.current_unit) : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tenant Details"
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Header with Status */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{tenant.full_name}</h2>
            <p className="text-gray-600">Tenant ID: {tenant.id}</p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              hasActiveLease
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {hasActiveLease ? 'Active Lease' : 'No Active Lease'}
          </span>
        </div>

        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <p className="mt-1 text-sm text-gray-900">{tenant.full_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <p className="mt-1 text-sm text-gray-900">{tenant.phone}</p>
            </div>
            {tenant.alternate_phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Alternate Phone</label>
                <p className="mt-1 text-sm text-gray-900">{tenant.alternate_phone}</p>
              </div>
            )}
            {tenant.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{tenant.email}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">National ID</label>
              <p className="mt-1 text-sm text-gray-900">{tenant.national_id}</p>
            </div>
            {tenant.employer && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Employer</label>
                <p className="mt-1 text-sm text-gray-900">{tenant.employer}</p>
              </div>
            )}
          </div>
        </div>

        {/* Current Lease Information */}
        {hasActiveLease && unitData && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Lease</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatUnitAllocation(tenant.current_unit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Property</label>
                <p className="mt-1 text-sm text-gray-900">
                  {unitData.property_name || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Monthly Rent</label>
                <p className="mt-1 text-sm text-gray-900">
                  KES {unitData.monthly_rent_kes?.toLocaleString() || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="mt-1 text-sm text-gray-900">
                  {unitData.property_address || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contact Information */}
        {(tenant.emergency_contact_name || tenant.emergency_contact_phone) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenant.emergency_contact_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{tenant.emergency_contact_name}</p>
                </div>
              )}
              {tenant.emergency_contact_phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{tenant.emergency_contact_phone}</p>
                </div>
              )}
              {tenant.emergency_contact_relationship && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Relationship</label>
                  <p className="mt-1 text-sm text-gray-900">{tenant.emergency_contact_relationship}</p>
                </div>
              )}
              {tenant.emergency_contact_email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{tenant.emergency_contact_email}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {tenant.notes && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{tenant.notes}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Record Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(tenant.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Updated</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(tenant.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="flex space-x-3">
            {onViewLeaseHistory && (
              <Button
                variant="outline"
                onClick={() => onViewLeaseHistory(tenant)}
              >
                Lease History
              </Button>
            )}
            {onViewPaymentHistory && (
              <Button
                variant="outline"
                onClick={() => onViewPaymentHistory(tenant)}
              >
                Payment History
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            {!hasActiveLease && onCreateLease && (
              <Button
                variant="primary"
                onClick={() => onCreateLease(tenant)}
              >
                Create Lease
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit(tenant)}
              >
                Edit Tenant
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
