'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import PurchasePipelineManager from './PurchasePipelineManager'
import SubdivisionProcessManager from './SubdivisionProcessManager'
import WorkflowNavigation from './components/WorkflowNavigation'
import PropertiesTab from './components/PropertiesTab'
import HandoverPipelineManager from './components/HandoverPipelineManager'
// Audit moved to standalone dashboard route
// import AuditTrailDashboard from './components/AuditTrailDashboard'

import { RoleManagementService } from '../../lib/auth/role-management.service'

import { PropertyManagementService } from './services/property-management.service'
import {
  PropertyManagementTabsProps,
  PropertyWithLifecycle,
  PendingChanges,
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

  // State for managing pending changes
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({})
  const [savingChanges, setSavingChanges] = useState<{ [propertyId: string]: boolean }>({})

  // User role for security features
  const [userRole, setUserRole] = useState<string>('property_manager')

  // Load properties and user role on component mount
  useEffect(() => {
    loadProperties()
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    try {
      const role = await RoleManagementService.getCurrentUserRole()
      setUserRole(role)
    } catch (error) {
            setUserRole('viewer')     }
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

  // Pending changes management
  const handleSubdivisionChange = (propertyId: string, value: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [propertyId]: { ...prev[propertyId], subdivision: value },
    }))
  }

  const handleHandoverChange = (propertyId: string, value: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [propertyId]: { ...prev[propertyId], handover: value },
    }))
  }

  const cancelChanges = (propertyId: string) => {
    setPendingChanges((prev) => {
      const copy = { ...prev }
      delete copy[propertyId]
      return copy
    })
  }

  const saveChanges = async (propertyId: string) => {
    const changes = pendingChanges[propertyId]
    if (!changes) return

    setSavingChanges((prev) => ({ ...prev, [propertyId]: true }))

    try {
      const success = await PropertyManagementService.savePropertyChanges(
        propertyId,
        changes,
        properties
      )

      if (success) {
        cancelChanges(propertyId)
        await loadProperties()
      }
    } catch (error) {
          } finally {
      setSavingChanges((prev) => ({ ...prev, [propertyId]: false }))
    }
  }

  const handleNavigateToTabs = (tab: string) => {
    setActiveTab(tab as ActiveTab)
  }

  return (
    <div className="space-y-6">
      {/* Interactive Workflow Cards - Primary Navigation */}
      <WorkflowNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'properties' && (
          <PropertiesTab
            properties={properties}
            loading={loading}
            pendingChanges={pendingChanges}
            savingChanges={savingChanges}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onPropertyCreated={handlePropertyCreated}
            onSubdivisionChange={handleSubdivisionChange}
            onHandoverChange={handleHandoverChange}
            onSaveChanges={saveChanges}
            onCancelChanges={cancelChanges}
            onNavigateToTabs={handleNavigateToTabs}
            onRefresh={loadProperties}
          />
        )}

        {activeTab === 'purchase' && (
          <PurchasePipelineManager
            onPropertyTransferred={handlePropertyTransferred}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            userRole={userRole}
          />
        )}

        {activeTab === 'subdivision' && (
          <SubdivisionProcessManager
            onPropertyCreated={handlePropertyCreated}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        {activeTab === 'handover' && (
          <HandoverPipelineManager
            onHandoverCreated={loadProperties}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}
      </div>
    </div>
  )
}
