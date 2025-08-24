'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { useRealTimeOccupancy } from './hooks/useRealTimeOccupancy'
import RentalPropertyList from './components/RentalPropertyList'
import TenantManagement from './components/TenantManagement'
import LeaseManagement from './components/LeaseManagement'
import PaymentTracking from './components/PaymentTracking'
import MaintenanceManagement from './components/MaintenanceManagement'
import PropertyInspections from './components/PropertyInspections'
import { RentalManagementTab } from './types/rental-management.types'

interface RentalManagementTabsProps {
  onDataRefresh?: () => void
}

export default function RentalManagementTabs({ onDataRefresh }: RentalManagementTabsProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<RentalManagementTab>('properties')
  const [loading, setLoading] = useState(false)

  // Real-time occupancy data
  const {
    isConnected,
    lastUpdate,
    getOccupancyStats,
    recentEvents
  } = useRealTimeOccupancy()

  const tabs = [
    { id: 'properties', name: 'Properties', icon: '🏠' },
    { id: 'tenants', name: 'Tenants', icon: '👥' },
    { id: 'leases', name: 'Leases', icon: '📋' },
    { id: 'payments', name: 'Payments', icon: '💳' },
    { id: 'maintenance', name: 'Maintenance', icon: '🔧' },
    { id: 'inspections', name: 'Inspections', icon: '🔍' },
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
          <div className="flex justify-between items-center px-6 py-2">
            <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
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

            {/* Real-time Status Indicator */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>

              {lastUpdate && (
                <div className="text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              )}

              {recentEvents.length > 0 && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <span className="text-xs">🔄</span>
                  <span>{recentEvents.length} recent changes</span>
                </div>
              )}
            </div>
          </div>
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
            <MaintenanceManagement onDataChange={handleDataChange} />
          )}
          
          {activeTab === 'inspections' && (
            <PropertyInspections onDataChange={handleDataChange} />
          )}
        </div>
      </div>
    </div>
  )
}
