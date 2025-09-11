'use client'

import { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useTabPrefetch } from '../../hooks/useTabPrefetch'
import WorkflowNavigation from './components/WorkflowNavigation'
import PropertiesTab from './components/PropertiesTab'
import { LoadingSpinner } from '../ui/loading'
import {
  PurchasePipelineSkeleton,
  SubdivisionPipelineSkeleton,
  HandoverPipelineSkeleton,
  TabSwitchSkeleton,
} from './components/PipelineSkeletonLoader'
import PerformanceMonitor from './components/PerformanceMonitor'

// Lazy load pipeline managers for better performance
const PurchasePipelineManager = lazy(() => import('./PurchasePipelineManager'))
const SubdivisionPipelineManager = lazy(() => import('./SubdivisionPipelineManager'))
const HandoverPipelineManager = lazy(() => import('./components/HandoverPipelineManager'))

import { RoleManagementService } from '../../lib/auth/role-management.service'

import { PropertyStatusUpdateService } from '../../services/propertyStatusUpdateService'
import { PropertyManagementService } from './services/property-management.service'
import {
  PropertyManagementTabsProps,
  PropertyWithLifecycle,
  ActiveTab,
} from './types/property-management.types'

export default function PropertyManagementTabs({
  onPropertyCreated,
  onRefreshProperties,
}: PropertyManagementTabsProps) {
  useAuth() // Keep auth context active

  // State management
  const [activeTab, setActiveTab] = useState<ActiveTab>('properties')
  const [properties, setProperties] = useState<PropertyWithLifecycle[]>([])
  const [loading, setLoading] = useState(true)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')

  // Saving state retained for UI disable/feedback
  const [savingChanges, setSavingChanges] = useState<{ [propertyId: string]: boolean }>({})

  // User role for security features
  const [userRole, setUserRole] = useState<string>('property_manager')

  // Guard against StrictMode double-invocation
  const didInitialize = useRef(false)

  // Tab prefetching for better performance
  const { handleTabHover, cancelPrefetch, prefetchAdjacentTabs } = useTabPrefetch({
    enabled: true,
    prefetchDelay: 300,
    prefetchOnHover: true,
  })

  // Load properties and user role on component mount
  useEffect(() => {
    if (didInitialize.current) return
    didInitialize.current = true

    loadProperties()
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    try {
      const role = await RoleManagementService.getCurrentUserRole()
      setUserRole(role)
    } catch (error) {
      console.error('Error loading user role:', error)

      // Check if it's a server error
      if (error instanceof Error && error.message.includes('Server error:')) {
        console.warn('Server error detected, showing limited access mode')
        // Could show a toast notification here
        setUserRole('viewer') // Limited access mode
      } else {
        setUserRole('property_manager') // Default fallback
      }
    }
  }

  const loadProperties = async () => {
    try {
      setLoading(true)
      const data = await PropertyManagementService.loadProperties()
      setProperties(data)
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyCreated = (propertyId: string) => {
    loadProperties()
    onPropertyCreated?.(propertyId)
    onRefreshProperties?.()
  }

  const handlePropertyTransferred = (propertyId: string) => {
    loadProperties()
    onPropertyCreated?.(propertyId)
    onRefreshProperties?.()
  }

  // Status change handlers (immediate persistence)
  const handleSubdivisionChange = async (propertyId: string, value: string) => {
    try {
      setSavingChanges((s) => ({ ...s, [propertyId]: true }))
      await PropertyStatusUpdateService.updatePropertyStatusFromUI(propertyId, value, undefined)
      await loadProperties()
    } catch (e) {
      console.error('Immediate subdivision update failed', e)
    } finally {
      setSavingChanges((s) => ({ ...s, [propertyId]: false }))
    }
  }

  const handleHandoverChange = async (propertyId: string, value: string) => {
    try {
      setSavingChanges((s) => ({ ...s, [propertyId]: true }))
      await PropertyStatusUpdateService.updatePropertyStatusFromUI(propertyId, undefined, value)
      await loadProperties()
    } catch (e) {
      console.error('Immediate handover update failed', e)
    } finally {
      setSavingChanges((s) => ({ ...s, [propertyId]: false }))
    }
  }

  const handleNavigateToTabs = useCallback(
    (tab: string) => {
      const activeTabValue = tab as ActiveTab
      setActiveTab(activeTabValue)
      // Prefetch adjacent tabs for smoother navigation
      prefetchAdjacentTabs(activeTabValue)
    },
    [prefetchAdjacentTabs]
  )

  // Enhanced tab change handler with prefetching
  const handleTabChange = useCallback(
    (tab: ActiveTab) => {
      setActiveTab(tab)
      prefetchAdjacentTabs(tab)
    },
    [prefetchAdjacentTabs]
  )

  return (
    <div className="space-y-6">
      {/* Interactive Workflow Cards - Primary Navigation */}
      <WorkflowNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onTabHover={handleTabHover}
        onTabLeave={cancelPrefetch}
      />

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'properties' && (
          <PropertiesTab
            properties={properties}
            loading={loading}
            savingChanges={savingChanges}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onPropertyCreated={handlePropertyCreated}
            onSubdivisionChange={handleSubdivisionChange}
            onHandoverChange={handleHandoverChange}
            onNavigateToTabs={handleNavigateToTabs}
            onRefresh={loadProperties}
          />
        )}

        {activeTab === 'purchase' && (
          <Suspense fallback={<PurchasePipelineSkeleton itemCount={3} />}>
            <PurchasePipelineManager
              onPropertyTransferred={handlePropertyTransferred}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              userRole={userRole}
            />
          </Suspense>
        )}

        {activeTab === 'subdivision' && (
          <Suspense fallback={<SubdivisionPipelineSkeleton itemCount={3} />}>
            <SubdivisionPipelineManager
              properties={properties}
              onPropertyCreated={handlePropertyCreated}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </Suspense>
        )}

        {activeTab === 'handover' && (
          <Suspense fallback={<HandoverPipelineSkeleton itemCount={3} />}>
            <HandoverPipelineManager
              onHandoverCreated={loadProperties}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </Suspense>
        )}
      </div>

      {/* Performance Monitor (development only) */}
      <PerformanceMonitor
        activeTab={activeTab}
        enabled={false} // Disabled for production
        showMetrics={false}
      />
    </div>
  )
}
