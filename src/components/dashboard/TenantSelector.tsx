'use client'

import React, { useState, useEffect } from 'react'
import { useDashboardActions } from '../../hooks/useDashboardActions'
import { Tenant } from '../../lib/types/database'
import { RentalManagementService } from '../rental-management/services/rental-management.service'
import { Select } from '../ui'

interface TenantSelectorProps {
  className?: string
  placeholder?: string
  showClearOption?: boolean
  propertyFilter?: boolean // Filter tenants by selected property
  onTenantChange?: (tenant: Tenant | null) => void
}

/**
 * Reusable tenant selector that integrates with dashboard context
 */
export default function TenantSelector({ 
  className = '',
  placeholder = 'Select a tenant...',
  showClearOption = true,
  propertyFilter = false,
  onTenantChange
}: TenantSelectorProps) {
  const { 
    state, 
    selectTenant, 
    updateTenantsCache, 
    getCachedData, 
    isCacheExpired 
  } = useDashboardActions()
  
  const [loading, setLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])

  // Load tenants from cache or API
  useEffect(() => {
    const loadTenants = async () => {
      // Try to use cached data first
      const cachedTenants = getCachedData('tenants')
      if (cachedTenants.length > 0 && !isCacheExpired()) {
        setTenants(cachedTenants)
        return
      }

      // Load from API if cache is empty or expired
      setLoading(true)
      try {
        const tenantsData = await RentalManagementService.getTenants()
        setTenants(tenantsData)
        updateTenantsCache(tenantsData)
      } catch (error) {
        console.error('Error loading tenants:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTenants()
  }, [getCachedData, isCacheExpired, updateTenantsCache])

  // Filter tenants by selected property if enabled
  const filteredTenants = propertyFilter && state.selectedProperty
    ? tenants.filter(tenant => tenant.property_id === state.selectedProperty?.id)
    : tenants

  const handleTenantChange = (tenantId: string) => {
    if (tenantId === '') {
      selectTenant(null)
      onTenantChange?.(null)
      return
    }

    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant) {
      selectTenant(tenant)
      onTenantChange?.(tenant)
    }
  }

  const options = [
    ...(showClearOption ? [{ value: '', label: 'All Tenants' }] : []),
    ...filteredTenants.map(tenant => ({
      value: tenant.id,
      label: tenant.full_name
    }))
  ]

  // Show property filter message if no tenants for selected property
  const showPropertyFilterMessage = propertyFilter && 
    state.selectedProperty && 
    filteredTenants.length === 0 && 
    tenants.length > 0

  return (
    <div className={className}>
      <Select
        value={state.selectedTenant?.id || ''}
        onChange={(e) => handleTenantChange(e.target.value)}
        options={options}
        disabled={loading || (propertyFilter && !state.selectedProperty)}
        className="w-full"
        placeholder={
          loading 
            ? 'Loading tenants...' 
            : propertyFilter && !state.selectedProperty
            ? 'Select a property first'
            : showPropertyFilterMessage
            ? 'No tenants for selected property'
            : placeholder
        }
      />
      
      {showPropertyFilterMessage && (
        <p className="text-sm text-gray-500 mt-1">
          No tenants found for {state.selectedProperty?.name}
        </p>
      )}
    </div>
  )
}
