/**
 * Dashboard Overview Section
 * Main overview section with key metrics and summary information
 */

import React from 'react'
import { MetricsGrid } from '../metrics/MetricsGrid'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'

export default function DashboardOverview() {
  const { metrics, loading } = useDashboardStore()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Management Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to your comprehensive property management overview
        </p>
      </div>

      {/* Key Metrics */}
      <MetricsGrid />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Revenue Overview</h3>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Monthly Revenue</span>
                <span className="text-sm font-medium text-gray-900">
                  KES {(metrics?.monthlyRevenue || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Collection Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {(metrics?.collectionRate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Outstanding Amount</span>
                <span className="text-sm font-medium text-red-600">
                  KES {(metrics?.outstandingAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Property Summary</h3>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Properties</span>
                <span className="text-sm font-medium text-gray-900">
                  {metrics?.totalProperties || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Active Tenants</span>
                <span className="text-sm font-medium text-gray-900">
                  {metrics?.activeTenants || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Occupancy Rate</span>
                <span className="text-sm font-medium text-green-600">
                  {(metrics?.occupancyRate || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest updates and activities across your properties
          </p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Activity will appear here as you manage your properties
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
