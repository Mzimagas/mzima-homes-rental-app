'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { withAuth } from '../../lib/withAuth'
import { useRouter } from 'next/navigation'



interface DashboardStats {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  activeTenants: number
  monthlyRevenue: number
  collectionRate: number
  overdueAmount: number
  occupancyRate: number
}

interface RecentActivity {
  id: string
  type: 'payment' | 'tenant_added' | 'maintenance' | 'lease_renewal'
  title: string
  description: string
  timestamp: string
  amount?: number
  status?: string
}

function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch dashboard batch data
        const response = await fetch('/api/batch/dashboard?include=properties,tenants,payments,stats')
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
        }

        const data = await response.json()

        // Process the data and calculate stats
        const properties = data.properties || []
        const tenants = data.tenants || []
        const payments = data.payments || []

        // Calculate dashboard statistics
        const totalProperties = properties.length
        const activeTenants = tenants.filter((t: any) => t.status === 'ACTIVE').length
        const totalUnits = properties.reduce((sum: number, p: any) => sum + (p.total_units || 0), 0)
        const occupiedUnits = tenants.length
        const vacantUnits = totalUnits - occupiedUnits
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

        // Calculate financial metrics
        const monthlyRevenue = tenants.reduce((sum: number, t: any) => sum + (t.monthly_rent || 0), 0)
        const recentPayments = payments.filter((p: any) => {
          const paymentDate = new Date(p.payment_date)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          return paymentDate >= thirtyDaysAgo
        })
        const totalPaid = recentPayments.reduce((sum: number, p: any) => sum + (p.amount_kes || 0), 0)
        const collectionRate = monthlyRevenue > 0 ? (totalPaid / monthlyRevenue) * 100 : 0
        const overdueAmount = Math.max(0, monthlyRevenue - totalPaid)

        setStats({
          totalProperties,
          totalUnits,
          occupiedUnits,
          vacantUnits,
          activeTenants,
          monthlyRevenue,
          collectionRate,
          overdueAmount,
          occupancyRate
        })

        // Generate recent activity
        const activities: RecentActivity[] = []

        // Add recent payments
        recentPayments.slice(0, 3).forEach((payment: any) => {
          activities.push({
            id: payment.id,
            type: 'payment',
            title: 'Payment Received',
            description: `Payment of KES ${payment.amount_kes?.toLocaleString()} received`,
            timestamp: payment.payment_date,
            amount: payment.amount_kes,
            status: payment.status
          })
        })

        // Add recent tenant additions
        const recentTenants = tenants
          .filter((t: any) => {
            const createdDate = new Date(t.created_at)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            return createdDate >= sevenDaysAgo
          })
          .slice(0, 2)

        recentTenants.forEach((tenant: any) => {
          activities.push({
            id: tenant.id,
            type: 'tenant_added',
            title: 'New Tenant Added',
            description: `${tenant.full_name} moved into the property`,
            timestamp: tenant.created_at,
            status: tenant.status
          })
        })

        // Sort activities by timestamp
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setRecentActivity(activities.slice(0, 5))

      } catch (err) {
        console.error('Dashboard data fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')

        // Set fallback data
        setStats({
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          activeTenants: 0,
          monthlyRevenue: 0,
          collectionRate: 0,
          overdueAmount: 0,
          occupancyRate: 0
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user])

  // Handler functions for quick actions
  const handleAddProperty = () => {
    router.push('/dashboard/properties?action=add')
  }

  const handleAddTenant = () => {
    router.push('/dashboard/rental-management?action=add-tenant')
  }

  const handleRecordPayment = () => {
    router.push('/dashboard/payments?action=record')
  }

  const handleGenerateReports = () => {
    router.push('/dashboard/reports')
  }

  // Show loading state while auth or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Authenticating...' : 'Loading dashboard data...'}
          </p>
        </div>
      </div>
    )
  }

  // Show authentication error
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to view your dashboard</p>
          <button
            onClick={() => (window.location.href = '/auth/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Show error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-900">Dashboard Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Property Management Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Welcome back, {user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ● Live Data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-blue-900">
                📊 Portfolio Overview - {stats?.totalProperties || 0} Properties
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-3">
                  {!stats || stats.totalProperties === 0
                    ? "Welcome to your Property Management Dashboard! Get started by adding your first property."
                    : `Managing ${stats.totalProperties} properties with ${stats.activeTenants} active tenants across ${stats.totalUnits} units.`
                  }
                </p>

                {stats && stats.totalProperties > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-2"></span>
                      <span>Occupancy: {stats.occupancyRate.toFixed(1)}% ({stats.occupiedUnits}/{stats.totalUnits} units)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-2"></span>
                      <span>Monthly Revenue: KES {stats.monthlyRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-2"></span>
                      <span>Collection Rate: {stats.collectionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center">
                      <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-2"></span>
                      <span>
                        {stats.overdueAmount > 0
                          ? `Overdue: KES ${stats.overdueAmount.toLocaleString()}`
                          : "All payments up to date!"
                        }
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <p className="font-medium text-blue-800">
                    {stats?.totalProperties === 0
                      ? "Add your first property to get started!"
                      : recentActivity.length > 0
                        ? `${recentActivity.length} recent activities to review`
                        : "All caught up! No recent activities."
                    }
                  </p>
                  <div className="flex items-center text-xs text-blue-600">
                    <div className="h-2 w-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    Live data
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Units</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.totalUnits || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Collection Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {(stats?.collectionRate || 0).toFixed(1)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Overdue Amount</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      KES {(stats?.overdueAmount || 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts and Notifications */}
        {stats && (stats.overdueAmount > 0 || stats.vacantUnits > 0 || stats.collectionRate < 80) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-900">⚠️ Attention Required</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {stats.overdueAmount > 0 && (
                      <li>
                        <strong>KES {stats.overdueAmount.toLocaleString()}</strong> in overdue payments needs collection
                      </li>
                    )}
                    {stats.vacantUnits > 0 && (
                      <li>
                        <strong>{stats.vacantUnits} vacant units</strong> available for new tenants
                      </li>
                    )}
                    {stats.collectionRate < 80 && (
                      <li>
                        <strong>Collection rate at {stats.collectionRate.toFixed(1)}%</strong> - consider follow-up actions
                      </li>
                    )}
                  </ul>
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={() => router.push('/dashboard/accounting')}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700"
                    >
                      Review Finances
                    </button>
                    <button
                      onClick={() => router.push('/dashboard/properties')}
                      className="bg-white text-yellow-700 border border-yellow-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-50"
                    >
                      Manage Properties
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Latest updates and activities across your properties
              </p>
            </div>
            <div className="border-t border-gray-200">
              {recentActivity.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentActivity.map((activity) => (
                    <li key={activity.id} className="px-4 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            activity.type === 'payment' ? 'bg-green-100' :
                            activity.type === 'tenant_added' ? 'bg-blue-100' :
                            activity.type === 'maintenance' ? 'bg-yellow-100' :
                            'bg-purple-100'
                          }`}>
                            {activity.type === 'payment' && (
                              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            )}
                            {activity.type === 'tenant_added' && (
                              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {activity.amount && (
                          <div className="text-sm font-medium text-green-600">
                            +KES {activity.amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 sm:px-6">
                  <p className="text-sm text-gray-500 text-center py-8">
                    No recent activity to display. Activity will appear here as you manage your properties.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Property Performance</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Key performance indicators for your portfolio
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Occupied Units</dt>
                  <dd className="text-sm text-gray-900">{stats?.occupiedUnits || 0} / {stats?.totalUnits || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Vacant Units</dt>
                  <dd className="text-sm text-gray-900">{stats?.vacantUnits || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Average Occupancy</dt>
                  <dd className="text-sm text-gray-900">{(stats?.occupancyRate || 0).toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Monthly Target</dt>
                  <dd className="text-sm text-gray-900">KES {(stats?.monthlyRevenue || 0).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Quick Actions & Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Common tasks and shortcuts
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddProperty}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Property
                </button>
                <button
                  onClick={handleAddTenant}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Add Tenant
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Record Payment
                </button>
                <button
                  onClick={handleGenerateReports}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Reports
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Financial Summary</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Current month financial overview
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Expected Revenue</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    KES {(stats?.monthlyRevenue || 0).toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Collection Rate</dt>
                  <dd className={`text-sm font-medium ${
                    (stats?.collectionRate || 0) >= 90 ? 'text-green-600' :
                    (stats?.collectionRate || 0) >= 75 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(stats?.collectionRate || 0).toFixed(1)}%
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Outstanding</dt>
                  <dd className={`text-sm font-medium ${
                    (stats?.overdueAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    KES {(stats?.overdueAmount || 0).toLocaleString()}
                  </dd>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={() => router.push('/dashboard/accounting')}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    View Full Financial Report
                  </button>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAuth(DashboardPage)