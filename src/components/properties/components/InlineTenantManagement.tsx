'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'
import TenantList from '../../tenants/tenant-list'
import TenantForm from '../../tenants/tenant-form'
import TenantDetail from '../../tenants/tenant-detail'
import TenantEditForm from '../../tenants/tenant-edit-form'
import TenantMoveForm from '../../tenants/tenant-move-form'

interface InlineTenantManagementProps {
  isVisible: boolean
  onClose: () => void
  scopedPropertyId?: string // Optional property ID to scope tenant management to a specific property
}

type TenantManagementView = 'list' | 'create' | 'detail' | 'edit' | 'move' | 'deleted'

/**
 * Comprehensive Inline Tenant Management Component
 *
 * This component provides the complete tenant management functionality
 * inline within the Properties dashboard, replacing the need for a
 * separate tenant dashboard.
 *
 * Features:
 * - Full tenant listing with search and filters
 * - Tenant creation and editing
 * - Tenant details and agreement management
 * - Tenant moving between units
 * - Deleted tenant management
 * - Property-scoped tenant operations
 *
 * Data Isolation:
 * - Uses scopedPropertyId to prevent data leakage between workflow contexts
 * - Ensures tenant management is properly scoped to specific properties
 * - Prevents cross-contamination of data between different workflow cards
 */
export default function InlineTenantManagement({
  isVisible,
  onClose,
  scopedPropertyId
}: InlineTenantManagementProps) {
  const { properties: userProperties } = usePropertyAccess()
  const [currentView, setCurrentView] = useState<TenantManagementView>('list')
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined)
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined)
  const [componentKey, setComponentKey] = useState(0)

  // Check if user has admin permissions
  const hasAdminAccess = userProperties.some(p =>
    ['OWNER', 'PROPERTY_MANAGER'].includes(p.user_role)
  )

  // Reset component state when visibility changes
  useEffect(() => {
    if (isVisible) {
      setComponentKey(prev => prev + 1)
      setCurrentView('list')
      setSelectedTenantId(null)
      // Use scopedPropertyId if provided to limit tenant management to specific property
      setSelectedPropertyId(scopedPropertyId || undefined)
      setSelectedUnitId(undefined)
    }
  }, [isVisible, scopedPropertyId])

  // Navigation handlers
  const handleViewTenant = useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId)
    setCurrentView('detail')
  }, [])

  const handleEditTenant = useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId)
    setCurrentView('edit')
  }, [])

  const handleMoveTenant = useCallback((tenantId: string, propertyId?: string) => {
    setSelectedTenantId(tenantId)
    setSelectedPropertyId(propertyId)
    setCurrentView('move')
  }, [])

  const handleCreateTenant = useCallback((propertyId?: string, unitId?: string) => {
    setSelectedPropertyId(propertyId)
    setSelectedUnitId(unitId)
    setCurrentView('create')
  }, [])

  const handleBackToList = useCallback(() => {
    setCurrentView('list')
    setSelectedTenantId(null)
    setSelectedPropertyId(undefined)
    setSelectedUnitId(undefined)
  }, [])

  const handleViewDeleted = useCallback(() => {
    setCurrentView('deleted')
  }, [])

  const handleTenantCreated = useCallback((tenantId: string) => {
    // After creating a tenant, show their details
    setSelectedTenantId(tenantId)
    setCurrentView('detail')
  }, [])

  const handleTenantUpdated = useCallback(() => {
    // After updating a tenant, go back to their details
    if (selectedTenantId) {
      setCurrentView('detail')
    } else {
      handleBackToList()
    }
  }, [selectedTenantId, handleBackToList])

  const handleTenantMoved = useCallback(() => {
    // After moving a tenant, go back to their details
    if (selectedTenantId) {
      setCurrentView('detail')
    } else {
      handleBackToList()
    }
  }, [selectedTenantId, handleBackToList])

  if (!isVisible) {
    return null
  }

  const renderBreadcrumb = () => {
    const breadcrumbs = ['Tenant Management']
    
    if (currentView === 'create') breadcrumbs.push('New Tenant')
    else if (currentView === 'detail') breadcrumbs.push('Tenant Details')
    else if (currentView === 'edit') breadcrumbs.push('Edit Tenant')
    else if (currentView === 'move') breadcrumbs.push('Move Tenant')
    else if (currentView === 'deleted') breadcrumbs.push('Deleted Tenants')

    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center">
            {index > 0 && <span className="mx-2">→</span>}
            <span className={index === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : ''}>
              {crumb}
            </span>
          </span>
        ))}
      </div>
    )
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return (
          <TenantList
            key={`tenant-list-${componentKey}`}
            defaultPropertyId={scopedPropertyId || selectedPropertyId}
            hidePropertyFilters={true}
            onViewTenant={handleViewTenant}
            onEditTenant={handleEditTenant}
            onMoveTenant={handleMoveTenant}
            onCreateTenant={handleCreateTenant}
            onViewDeleted={hasAdminAccess ? handleViewDeleted : undefined}
          />
        )

      case 'create':
        return (
          <TenantForm
            key={`tenant-form-${componentKey}`}
            defaultPropertyId={scopedPropertyId || selectedPropertyId}
            defaultUnitId={selectedUnitId}
            onSuccess={handleTenantCreated}
            onCancel={handleBackToList}
          />
        )

      case 'detail':
        return selectedTenantId ? (
          <TenantDetail
            key={`tenant-detail-${selectedTenantId}-${componentKey}`}
            id={selectedTenantId}
            onEdit={() => handleEditTenant(selectedTenantId)}
            onMove={() => handleMoveTenant(selectedTenantId, selectedPropertyId)}
            onBack={handleBackToList}
          />
        ) : null

      case 'edit':
        return selectedTenantId ? (
          <TenantEditForm
            key={`tenant-edit-${selectedTenantId}-${componentKey}`}
            id={selectedTenantId}
            onSuccess={handleTenantUpdated}
            onCancel={handleBackToList}
          />
        ) : null

      case 'move':
        return selectedTenantId ? (
          <TenantMoveForm
            key={`tenant-move-${selectedTenantId}-${componentKey}`}
            tenantId={selectedTenantId}
            propertyId={scopedPropertyId || selectedPropertyId}
            onSuccess={handleTenantMoved}
            onCancel={handleBackToList}
          />
        ) : null

      case 'deleted':
        return (
          <TenantList
            key={`deleted-tenants-${componentKey}`}
            showDeleted={true}
            hidePropertyFilters={true}
            onViewTenant={handleViewTenant}
            onBack={handleBackToList}
          />
        )

      default:
        return <div>Unknown view: {currentView}</div>
    }
  }

  return (
    <div className="mt-4 border-t border-blue-200 pt-4" key={componentKey}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Tenant Management</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 transition-colors"
          title="Close tenant management"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderBreadcrumb()}
        {renderCurrentView()}
      </div>
    </div>
  )
}
