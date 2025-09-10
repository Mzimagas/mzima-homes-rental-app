'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useRealTimeOccupancy } from './hooks/useRealTimeOccupancy'
import RentalWorkflowNavigation from './components/RentalWorkflowNavigation'
import RentalPropertyList from './components/RentalPropertyList'
import TenantManagement from './components/TenantManagement'
import PaymentTracking from './components/PaymentTracking'
import { RentalManagementTab } from './types/rental-management.types'

interface RentalManagementTabsProps {
  onDataRefresh?: () => void
}

export default function RentalManagementTabs({ onDataRefresh }: RentalManagementTabsProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<RentalManagementTab>('properties')
  const [loading, setLoading] = useState(false)

  // Real-time occupancy data
  const { isConnected, lastUpdate, getOccupancyStats, recentEvents } = useRealTimeOccupancy()

  const handleTabChange = (tabId: RentalManagementTab) => {
    setActiveTab(tabId)
  }

  const handleDataChange = () => {
    onDataRefresh?.()
  }

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <RentalWorkflowNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Real-time Status Indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              ></div>
              <span className={`${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {lastUpdate && (
              <div className="text-gray-500">Last update: {lastUpdate.toLocaleTimeString()}</div>
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
      <div className="min-h-[600px]">
        {activeTab === 'properties' && <RentalPropertyList onDataChange={handleDataChange} />}

        {activeTab === 'tenants' && <TenantManagement onDataChange={handleDataChange} />}

        {activeTab === 'payments' && <PaymentTracking onDataChange={handleDataChange} />}
      </div>
    </div>
  )
}
