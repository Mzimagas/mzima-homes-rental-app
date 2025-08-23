'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import PurchasePipelineManager from './PurchasePipelineManager'
import SubdivisionProcessManager from './SubdivisionProcessManager'
import WorkflowNavigation from './components/WorkflowNavigation'
import PropertiesTab from './components/PropertiesTab'
import HandoverPipelineManager from './components/HandoverPipelineManager'
import AuditTrailDashboard from './components/AuditTrailDashboard'
import SecurityTestPanel from './components/SecurityTestPanel'

import { RoleManagementService } from '../../lib/auth/role-management.service'

import { PropertyManagementService } from './services/property-management.service'
import { 
  PropertyManagementTabsProps,
  PropertyWithLifecycle,
  PendingChanges,
  ActiveTab
} from './types/property-management.types'

export default function PropertyManagementTabs({
  onPropertyCreated,
  onRefreshProperties
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
      console.error('Error loading user role:', error)
      setUserRole('viewer') // Fallback to viewer role
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

  // Pending changes management
  const handleSubdivisionChange = (propertyId: string, value: string) => {
    setPendingChanges(prev => ({ 
      ...prev, 
      [propertyId]: { ...prev[propertyId], subdivision: value } 
    }))
  }

  const handleHandoverChange = (propertyId: string, value: string) => {
    setPendingChanges(prev => ({ 
      ...prev, 
      [propertyId]: { ...prev[propertyId], handover: value } 
    }))
  }

  const cancelChanges = (propertyId: string) => {
    setPendingChanges(prev => {
      const copy = { ...prev }
      delete copy[propertyId]
      return copy
    })
  }

  const saveChanges = async (propertyId: string) => {
    const changes = pendingChanges[propertyId]
    if (!changes) return

    setSavingChanges(prev => ({ ...prev, [propertyId]: true }))

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
      console.error('Error saving changes:', error)
    } finally {
      setSavingChanges(prev => ({ ...prev, [propertyId]: false }))
    }
  }

  const handleNavigateToTabs = (tab: string) => {
    setActiveTab(tab as ActiveTab)
  }

  return (
    <div className="space-y-6">
      {/* Interactive Workflow Cards - Primary Navigation */}
      <WorkflowNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

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

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                <p className="text-gray-600">User management has been moved to the dedicated Users dashboard</p>
              </div>
            </div>

            {/* Redirect Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    User Management Moved
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      User permission management is now available in the dedicated{' '}
                      <a href="/dashboard/users" className="font-medium underline hover:text-blue-600">
                        Users dashboard
                      </a>
                      . This provides a better experience for managing user permissions across all your properties.
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="-mx-2 -my-1.5 flex">
                      <a
                        href="/dashboard/users"
                        className="bg-blue-50 px-2 py-1.5 rounded-md text-sm font-medium text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-50 focus:ring-blue-600"
                      >
                        Go to Users Dashboard
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Security & Audit Trail</h2>
                <p className="text-gray-600">Monitor changes, manage approvals, and ensure data integrity</p>
              </div>
            </div>

            {/* Security Test Panel */}
            <SecurityTestPanel />

            {/* Audit Trail Dashboard */}
            <AuditTrailDashboard userRole={userRole} />
          </div>
        )}


      </div>
    </div>
  )
}
