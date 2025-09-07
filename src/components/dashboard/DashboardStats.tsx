'use client'

import React from 'react'

interface DashboardStatsProps {
  stats: {
    totalProperties: number
    totalUnits: number
    activeTenants: number
    occupancyRate: number
    monthlyRevenue: number
    recentActivity: Array<{
      id: string
      type: string
      description: string
      timestamp: string
    }>
  }
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Total Properties */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Properties</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
          </div>
        </div>
      </div>

      {/* Total Units */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Units</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUnits}</p>
          </div>
        </div>
      </div>

      {/* Active Tenants */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
            <svg
              className="h-5 w-5 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Active Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeTenants}</p>
          </div>
        </div>
      </div>

      {/* Occupancy Rate */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
            <svg
              className="h-5 w-5 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
            <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
