'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import { RentalProperty, RentalTenant, MaintenanceRequest } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'

interface RentalDashboardProps {
  onDataChange?: () => void
}

interface DashboardStats {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  occupancyRate: number
  monthlyIncome: number
  outstandingRent: number
  maintenanceRequests: number
  upcomingInspections: number
}

export default function RentalDashboard({ onDataChange }: RentalDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load dashboard statistics
      const dashboardStats = await RentalManagementService.getDashboardStats()
      setStats(dashboardStats)
      
      // Load recent activity
      const activity = await RentalManagementService.getRecentActivity()
      setRecentActivity(activity)
      
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingCard title="Loading dashboard..." />
  }

  if (error) {
    return (
      <ErrorCard
        title="Error Loading Dashboard"
        message={error}
        onRetry={loadDashboardData}
      />
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: '🏠',
      color: 'bg-blue-500',
    },
    {
      title: 'Total Units',
      value: stats.totalUnits,
      icon: '🏢',
      color: 'bg-green-500',
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyRate.toFixed(1)}%`,
      icon: '📊',
      color: 'bg-purple-500',
    },
    {
      title: 'Monthly Income',
      value: `KES ${stats.monthlyIncome.toLocaleString()}`,
      icon: '💰',
      color: 'bg-yellow-500',
    },
    {
      title: 'Outstanding Rent',
      value: `KES ${stats.outstandingRent.toLocaleString()}`,
      icon: '⚠️',
      color: 'bg-red-500',
    },
    {
      title: 'Maintenance Requests',
      value: stats.maintenanceRequests,
      icon: '🔧',
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rental Management Dashboard</h2>
          <p className="text-sm text-gray-500">Overview of your rental portfolio</p>
        </div>
        <Button onClick={loadDashboardData} variant="secondary" size="sm">
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${card.color} rounded-lg p-3 text-white text-2xl mr-4`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="primary" className="flex items-center justify-center space-x-2">
            <span>🏠</span>
            <span>Add Property</span>
          </Button>
          <Button variant="secondary" className="flex items-center justify-center space-x-2">
            <span>👤</span>
            <span>Add Tenant</span>
          </Button>
          <Button variant="secondary" className="flex items-center justify-center space-x-2">
            <span>📋</span>
            <span>Create Lease</span>
          </Button>
          <Button variant="secondary" className="flex items-center justify-center space-x-2">
            <span>🔧</span>
            <span>Log Maintenance</span>
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl">{activity.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.description}</p>
                </div>
                <div className="text-xs text-gray-400">{activity.timestamp}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        )}
      </div>

      {/* Occupancy Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Unit Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Occupied Units</span>
              <span className="font-medium text-green-600">{stats.occupiedUnits}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Vacant Units</span>
              <span className="font-medium text-red-600">{stats.vacantUnits}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Units</span>
              <span className="font-medium text-gray-900">{stats.totalUnits}</span>
            </div>
          </div>
          
          {/* Simple occupancy bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Occupancy Rate</span>
              <span>{stats.occupancyRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${stats.occupancyRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Income</span>
              <span className="font-medium text-green-600">
                KES {stats.monthlyIncome.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Outstanding Rent</span>
              <span className="font-medium text-red-600">
                KES {stats.outstandingRent.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Collection Rate</span>
              <span className="font-medium text-gray-900">
                {((stats.monthlyIncome - stats.outstandingRent) / stats.monthlyIncome * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
