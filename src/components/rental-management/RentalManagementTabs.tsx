'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import RentalPropertyList from './components/RentalPropertyList'
import TenantManagement from './components/TenantManagement'
import LeaseManagement from './components/LeaseManagement'
import PaymentTracking from './components/PaymentTracking'
import MaintenanceRequests from './components/MaintenanceRequests'
import PropertyInspections from './components/PropertyInspections'
import FinancialReports from './components/FinancialReports'
import DocumentStorage from './components/DocumentStorage'
import { RentalManagementTab } from './types/rental-management.types'

interface RentalManagementTabsProps {
  onDataRefresh?: () => void
}

export default function RentalManagementTabs({ onDataRefresh }: RentalManagementTabsProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<RentalManagementTab>('properties')
  const [loading, setLoading] = useState(false)

  const tabs = [
    { id: 'properties', name: 'Properties', icon: '🏠' },
    { id: 'tenants', name: 'Tenants', icon: '👥' },
    { id: 'leases', name: 'Leases', icon: '📋' },
    { id: 'payments', name: 'Payments', icon: '💳' },
    { id: 'maintenance', name: 'Maintenance', icon: '🔧' },
    { id: 'inspections', name: 'Inspections', icon: '🔍' },
    { id: 'reports', name: 'Reports', icon: '📈' },
    { id: 'documents', name: 'Documents', icon: '📁' },
  ] as const

  const handleTabChange = (tabId: RentalManagementTab) => {
    setActiveTab(tabId)
  }

  const handleDataChange = () => {
    onDataRefresh?.()
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as RentalManagementTab)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'properties' && (
            <RentalPropertyList onDataChange={handleDataChange} />
          )}
          
          {activeTab === 'tenants' && (
            <TenantManagement onDataChange={handleDataChange} />
          )}
          
          {activeTab === 'leases' && (
            <LeaseManagement onDataChange={handleDataChange} />
          )}
          
          {activeTab === 'payments' && (
            <PaymentTracking onDataChange={handleDataChange} />
          )}
          
          {activeTab === 'maintenance' && (
            <MaintenanceRequests onDataChange={handleDataChange} />
          )}
          
          {activeTab === 'inspections' && (
            <PropertyInspections onDataChange={handleDataChange} />
          )}
          
          {activeTab === 'reports' && (
            <FinancialReports onDataChange={handleDataChange} />
          )}
          
          {activeTab === 'documents' && (
            <DocumentStorage onDataChange={handleDataChange} />
          )}
        </div>
      </div>
    </div>
  )
}
