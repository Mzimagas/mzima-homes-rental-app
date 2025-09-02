/**
 * Tenant List Display Component
 * 
 * Extracted from TenantManagement.tsx to improve maintainability.
 * Handles the display of tenant cards with lease information and actions.
 */

'use client'

import { useState } from 'react'
import { Button } from '../../../ui'
import { RentalTenant } from '../../types/rental-management.types'
import { formatUnitAllocation, extractUnitPropertyData } from '../../utils/unit-display.utils'

interface TenantListDisplayProps {
  tenants: RentalTenant[]
  onViewTenant: (tenant: RentalTenant) => void
  onEditTenant: (tenant: RentalTenant) => void
  onDeleteTenant: (tenant: RentalTenant) => void
  onReallocateTenant: (tenant: RentalTenant) => void
  onCreateLease: (tenant: RentalTenant) => void
  onViewLeaseHistory: (tenant: RentalTenant) => void
  onViewPaymentHistory: (tenant: RentalTenant) => void
  onManageLeases: (tenant: RentalTenant) => void
}

export default function TenantListDisplay({
  tenants,
  onViewTenant,
  onEditTenant,
  onDeleteTenant,
  onReallocateTenant,
  onCreateLease,
  onViewLeaseHistory,
  onViewPaymentHistory,
  onManageLeases,
}: TenantListDisplayProps) {
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set())

  const toggleTenantExpansion = (tenantId: string) => {
    setExpandedTenants(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId)
      } else {
        newSet.add(tenantId)
      }
      return newSet
    })
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No tenants found</div>
        <p className="text-gray-400 mt-2">Add your first tenant to get started</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Tenants ({tenants.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-200">
        {tenants.map((tenant) => {
          const isExpanded = expandedTenants.has(tenant.id)
          const hasActiveLease = tenant.current_unit && tenant.current_lease_id
          const unitData = tenant.current_unit ? extractUnitPropertyData(tenant.current_unit) : null

          return (
            <div key={tenant.id} className="bg-white border-b border-gray-200">
              {/* Tenant Header */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {tenant.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {tenant.full_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {tenant.phone}
                        </p>
                        {tenant.email && (
                          <p className="text-sm text-gray-500 truncate">
                            {tenant.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hasActiveLease
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {hasActiveLease ? 'Active Lease' : 'No Active Lease'}
                    </span>

                    {/* Expand/Collapse Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTenantExpansion(tenant.id)}
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </div>

                {/* Quick Info */}
                {unitData && (
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">Current Unit:</span>{' '}
                    {formatUnitAllocation(tenant.current_unit)}
                  </div>
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <>
                  {/* Lease Information Section */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    {hasActiveLease ? (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Current Lease</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Unit:</span>{' '}
                            {formatUnitAllocation(tenant.current_unit)}
                          </div>
                          {unitData && (
                            <>
                              <div>
                                <span className="font-medium text-gray-700">Monthly Rent:</span>{' '}
                                KES {unitData.monthly_rent_kes?.toLocaleString() || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Property:</span>{' '}
                                {unitData.property_name || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Location:</span>{' '}
                                {unitData.property_address || 'N/A'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No active lease</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Create a lease to assign this tenant to a unit
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="px-6 py-4 bg-white border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewTenant(tenant)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditTenant(tenant)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewLeaseHistory(tenant)}
                        >
                          Lease History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewPaymentHistory(tenant)}
                        >
                          Payment History
                        </Button>
                      </div>

                      <div className="flex space-x-2">
                        {hasActiveLease ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onReallocateTenant(tenant)}
                            >
                              Reallocate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onManageLeases(tenant)}
                            >
                              Manage Leases
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onCreateLease(tenant)}
                          >
                            Create Lease
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onDeleteTenant(tenant)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
