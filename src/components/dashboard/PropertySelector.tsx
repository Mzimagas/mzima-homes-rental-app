'use client'

import React, { useState, useEffect } from 'react'
import { useDashboardActions } from '../../hooks/useDashboardActions'
import { Property } from '../../lib/types/database'
import { RentalManagementService } from '../rental-management/services/rental-management.service'
import { Select } from '../ui'

interface PropertySelectorProps {
  className?: string
  placeholder?: string
  showClearOption?: boolean
  onPropertyChange?: (property: Property | null) => void
}

/**
 * Reusable property selector that integrates with dashboard context
 */
export default function PropertySelector({ 
  className = '',
  placeholder = 'Select a property...',
  showClearOption = true,
  onPropertyChange
}: PropertySelectorProps) {
  const { 
    state, 
    selectProperty, 
    updatePropertiesCache, 
    getCachedData, 
    isCacheExpired 
  } = useDashboardActions()
  
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])

  // Load properties from cache or API
  useEffect(() => {
    const loadProperties = async () => {
      // Try to use cached data first
      const cachedProperties = getCachedData('properties')
      if (cachedProperties.length > 0 && !isCacheExpired()) {
        setProperties(cachedProperties)
        return
      }

      // Load from API if cache is empty or expired
      setLoading(true)
      try {
        const propertiesData = await RentalManagementService.getRentalProperties()
        setProperties(propertiesData)
        updatePropertiesCache(propertiesData)
      } catch (error) {
        console.error('Error loading properties:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProperties()
  }, [getCachedData, isCacheExpired, updatePropertiesCache])

  const handlePropertyChange = (propertyId: string) => {
    if (propertyId === '') {
      selectProperty(null)
      onPropertyChange?.(null)
      return
    }

    const property = properties.find(p => p.id === propertyId)
    if (property) {
      selectProperty(property)
      onPropertyChange?.(property)
    }
  }

  const options = [
    ...(showClearOption ? [{ value: '', label: 'All Properties' }] : []),
    ...properties.map(property => ({
      value: property.id,
      label: property.name
    }))
  ]

  return (
    <div className={className}>
      <Select
        value={state.selectedProperty?.id || ''}
        onChange={(e) => handlePropertyChange(e.target.value)}
        options={options}
        disabled={loading}
        className="w-full"
        placeholder={loading ? 'Loading properties...' : placeholder}
      />
    </div>
  )
}
