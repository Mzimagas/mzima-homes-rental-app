/**
 * Properties Module Integration
 * Seamless integration between dashboard and existing PropertyManagementTabs
 * Provides context sharing, navigation consistency, and data synchronization
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDashboardContext } from '../../../contexts/DashboardContextProvider'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'
import { usePropertyStore } from '../../../presentation/stores/propertyStore'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'
import { useDashboardActions } from '../../../hooks/useDashboardActions'
import PropertyManagementTabs from '../../properties/PropertyManagementTabs'
import { Property } from '../../../lib/types/database'
import { LoadingSpinner } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'

// Integration interfaces
export interface PropertiesIntegrationProps {
  initialTab?: 'properties' | 'purchase' | 'subdivision' | 'handover'
  propertyId?: string
  showDashboardContext?: boolean
  onPropertySelect?: (property: Property) => void
  onNavigateToDashboard?: () => void
  className?: string
}

export interface PropertyDashboardContext {
  selectedProperty: Property | null
  propertyMetrics: any
  recentActivity: any[]
  quickActions: any[]
}

// Property context bridge component
interface PropertyContextBridgeProps {
  children: React.ReactNode
  selectedProperty: Property | null
}

const PropertyContextBridge: React.FC<PropertyContextBridgeProps> = ({
  children,
  selectedProperty
}) => {
  const { actions } = useDashboardContext()
  const dashboardStore = useDashboardStore()

  // Sync selected property with dashboard context
  useEffect(() => {
    if (selectedProperty) {
      actions.setSelectedProperty(selectedProperty)
      
      // Update dashboard store with property-specific data
      dashboardStore.setPropertyContext({
        selectedPropertyId: selectedProperty.id,
        propertyName: selectedProperty.name,
        propertyType: selectedProperty.property_type,
        location: selectedProperty.physical_address
      })
    }
  }, [selectedProperty, actions, dashboardStore])

  return <>{children}</>
}

// Property quick actions component
interface PropertyQuickActionsProps {
  property: Property | null
  onAction: (action: string, data?: any) => void
}

const PropertyQuickActions: React.FC<PropertyQuickActionsProps> = ({
  property,
  onAction
}) => {
  const actions = useMemo(() => {
    if (!property) return []

    const baseActions = [
      {
        id: 'view-details',
        label: 'View Details',
        icon: '👁️',
        description: 'View property details and analytics'
      },
      {
        id: 'view-units',
        label: 'Manage Units',
        icon: '🏠',
        description: 'View and manage property units'
      },
      {
        id: 'view-tenants',
        label: 'View Tenants',
        icon: '👥',
        description: 'View tenants and lease information'
      },
      {
        id: 'view-financials',
        label: 'View Financials',
        icon: '💰',
        description: 'View property financial performance'
      }
    ]

    // Add conditional actions based on property state
    const conditionalActions = []

    if (property.lifecycle_status === 'ACQUISITION') {
      conditionalActions.push({
        id: 'start-subdivision',
        label: 'Start Subdivision',
        icon: '📋',
        description: 'Begin subdivision process'
      })
    }

    if (property.lifecycle_status === 'SUBDIVISION') {
      conditionalActions.push({
        id: 'start-handover',
        label: 'Start Handover',
        icon: '🤝',
        description: 'Begin handover process'
      })
    }

    if (property.lifecycle_status === 'RENTAL_READY') {
      conditionalActions.push({
        id: 'add-tenant',
        label: 'Add Tenant',
        icon: '➕',
        description: 'Add new tenant to property'
      })
    }

    return [...baseActions, ...conditionalActions]
  }, [property])

  if (!property || actions.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.id, { propertyId: property.id })}
            className="flex items-center space-x-2 p-2 text-left rounded-md hover:bg-gray-50 transition-colors"
            title={action.description}
          >
            <span className="text-lg">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Property metrics summary component
interface PropertyMetricsSummaryProps {
  property: Property | null
  metrics: any
  loading: boolean
}

const PropertyMetricsSummary: React.FC<PropertyMetricsSummaryProps> = ({
  property,
  metrics,
  loading
}) => {
  if (!property) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        <p>Select a property to view metrics</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const summaryMetrics = [
    {
      label: 'Total Units',
      value: metrics?.totalUnits || 0,
      format: 'number'
    },
    {
      label: 'Occupancy Rate',
      value: metrics?.occupancyRate || 0,
      format: 'percentage'
    },
    {
      label: 'Monthly Revenue',
      value: metrics?.monthlyRevenue || 0,
      format: 'currency'
    },
    {
      label: 'Collection Rate',
      value: metrics?.collectionRate || 0,
      format: 'percentage'
    }
  ]

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
          minimumFractionDigits: 0
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return value.toString()
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Property Metrics</h3>
        <span className="text-xs text-gray-500">{property.name}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {summaryMetrics.map(metric => (
          <div key={metric.label} className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatValue(metric.value, metric.format)}
            </div>
            <div className="text-xs text-gray-600">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Main Properties Module Integration Component
 */
export const PropertiesModuleIntegration: React.FC<PropertiesIntegrationProps> = ({
  initialTab = 'properties',
  propertyId,
  showDashboardContext = true,
  onPropertySelect,
  onNavigateToDashboard,
  className = ''
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, actions } = useDashboardContext()
  const dashboardStore = useDashboardStore()
  const propertyStore = usePropertyStore()
  const { properties, loading: propertiesLoading } = usePropertyAccess()
  const dashboardActions = useDashboardActions()

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [propertyMetrics, setPropertyMetrics] = useState<any>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize selected property from URL or prop
  useEffect(() => {
    if (propertyId && properties.length > 0) {
      const property = properties.find(p => p.id === propertyId)
      if (property) {
        setSelectedProperty(property)
        onPropertySelect?.(property)
      }
    }
  }, [propertyId, properties, onPropertySelect])

  // Load property metrics when property is selected
  useEffect(() => {
    const loadPropertyMetrics = async () => {
      if (!selectedProperty) return

      try {
        setMetricsLoading(true)
        setError(null)

        // Fetch property-specific metrics
        const metrics = await dashboardActions.getPropertyMetrics(selectedProperty.id)
        setPropertyMetrics(metrics)

        // Update dashboard store with property metrics
        dashboardStore.updatePropertyMetrics(selectedProperty.id, metrics)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property metrics')
      } finally {
        setMetricsLoading(false)
      }
    }

    loadPropertyMetrics()
  }, [selectedProperty, dashboardActions, dashboardStore])

  // Handle property selection from PropertyManagementTabs
  const handlePropertyCreated = useCallback((property: Property) => {
    setSelectedProperty(property)
    onPropertySelect?.(property)
    
    // Update URL to reflect selected property
    const params = new URLSearchParams(searchParams.toString())
    params.set('propertyId', property.id)
    router.push(`?${params.toString()}`)
  }, [onPropertySelect, router, searchParams])

  // Handle quick actions
  const handleQuickAction = useCallback((action: string, data?: any) => {
    switch (action) {
      case 'view-details':
        router.push(`/dashboard/properties/${data.propertyId}`)
        break
      case 'view-units':
        router.push(`/dashboard/properties/${data.propertyId}?tab=units`)
        break
      case 'view-tenants':
        router.push(`/dashboard/properties/${data.propertyId}?tab=tenants`)
        break
      case 'view-financials':
        router.push(`/dashboard/properties/${data.propertyId}?tab=financials`)
        break
      case 'start-subdivision':
        // Navigate to subdivision tab with property pre-selected
        router.push(`/dashboard/properties?tab=subdivision&propertyId=${data.propertyId}`)
        break
      case 'start-handover':
        // Navigate to handover tab with property pre-selected
        router.push(`/dashboard/properties?tab=handover&propertyId=${data.propertyId}`)
        break
      case 'add-tenant':
        router.push(`/dashboard/tenants/add?propertyId=${data.propertyId}`)
        break
      default:
        console.log('Unknown action:', action, data)
    }
  }, [router])

  // Handle navigation to dashboard
  const handleNavigateToDashboard = useCallback(() => {
    if (onNavigateToDashboard) {
      onNavigateToDashboard()
    } else {
      router.push('/dashboard')
    }
  }, [onNavigateToDashboard, router])

  if (error) {
    return (
      <div className={className}>
        <ErrorCard
          title="Properties Integration Error"
          message={error}
          onRetry={() => setError(null)}
        />
      </div>
    )
  }

  return (
    <PropertyContextBridge selectedProperty={selectedProperty}>
      <div className={`properties-module-integration ${className}`}>
        {/* Dashboard Context Panel */}
        {showDashboardContext && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Property Metrics Summary */}
            <div className="lg:col-span-2">
              <PropertyMetricsSummary
                property={selectedProperty}
                metrics={propertyMetrics}
                loading={metricsLoading}
              />
            </div>

            {/* Quick Actions */}
            <div>
              <PropertyQuickActions
                property={selectedProperty}
                onAction={handleQuickAction}
              />
            </div>
          </div>
        )}

        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={handleNavigateToDashboard}
            className="hover:text-gray-900 transition-colors"
          >
            Dashboard
          </button>
          <span>›</span>
          <span className="text-gray-900">Properties</span>
          {selectedProperty && (
            <>
              <span>›</span>
              <span className="text-gray-900">{selectedProperty.name}</span>
            </>
          )}
        </div>

        {/* Property Management Tabs */}
        <PropertyManagementTabs
          initialTab={initialTab}
          onPropertyCreated={handlePropertyCreated}
          onRefreshProperties={handlePropertyCreated}
        />
      </div>
    </PropertyContextBridge>
  )
}

export default PropertiesModuleIntegration
