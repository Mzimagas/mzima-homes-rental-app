'use client'

import React, { useState, useEffect, Suspense, lazy } from 'react'
import { useAuth } from '../../components/auth/AuthProvider'
import { withAuth } from '../../lib/withAuth'
import { useRouter } from 'next/navigation'

// Lazy load heavy dashboard components
const DashboardStats = lazy(() => import('../../components/dashboard/DashboardStats'))
const DashboardCharts = lazy(() => import('../../components/dashboard/DashboardCharts'))
const QuickActions = lazy(() => import('../../components/dashboard/QuickActions'))

interface DashboardStats {
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

function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Initializing dashboard...')

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now()
    console.log('🚀 Dashboard page component mounted')

    return () => {
      const endTime = performance.now()
      console.log(`📊 Dashboard page component unmounted after ${endTime - startTime}ms`)
    }
  }, [])

  // Monitor auth loading state
  useEffect(() => {
    console.log(`🔐 Auth state: loading=${authLoading}, user=${user ? 'present' : 'null'}`)
  }, [authLoading, user])

  // Fetch dashboard overview data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setLoadingMessage('Fetching dashboard data...')

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Dashboard data fetch timeout')), 10000) // 10 second timeout
        })

        // Fetch optimized dashboard stats from dedicated endpoint
        const statsResponse = await Promise.race([
          fetch('/api/dashboard/stats', {
            signal: AbortSignal.timeout(5000), // 5 second timeout for optimized endpoint
            headers: {
              'Cache-Control': 'max-age=60', // Cache for 1 minute
            }
          }),
          timeoutPromise
        ]) as Response

        setLoadingMessage('Processing dashboard data...')

        if (statsResponse.ok) {
          const dashboardStats = await statsResponse.json()
          setStats(dashboardStats)
        } else {
          throw new Error(`Dashboard stats API returned ${statsResponse.status}`)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)

        // Provide more specific error handling
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            console.warn('Dashboard data fetch timed out - using fallback data')
          } else if (error.name === 'AbortError') {
            console.warn('Dashboard data fetch was aborted - using fallback data')
          }
        }

        // Set default stats on error
        setStats({
          totalProperties: 0,
          totalUnits: 0,
          activeTenants: 0,
          occupancyRate: 0,
          monthlyRevenue: 0,
          recentActivity: [],
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    } else if (!authLoading) {
      // If auth is complete but no user, still stop loading to show login redirect
      setLoading(false)
    }
  }, [user, authLoading])

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Dashboard loading timeout - forcing completion')
        setLoading(false)
        if (!stats) {
          setStats({
            totalProperties: 0,
            totalUnits: 0,
            activeTenants: 0,
            occupancyRate: 0,
            monthlyRevenue: 0,
            recentActivity: [],
          })
        }
      }
    }, 15000) // 15 second absolute timeout

    return () => clearTimeout(fallbackTimeout)
  }, [loading, stats])

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Welcome back, {user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        {loading ? (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">{loadingMessage}</p>
              <p className="text-gray-400 text-sm mt-2">This may take a few moments...</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ) : stats && (stats.totalProperties > 0 || stats.activeTenants > 0) ? (
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          }>
            <DashboardStats stats={stats} />
            <DashboardCharts stats={stats} />
          </Suspense>
        ) : (
          <Suspense fallback={
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          }>
            <QuickActions hasData={false} />
          </Suspense>
        )}

        {/* Show QuickActions for users with data too */}
        {stats && (stats.totalProperties > 0 || stats.activeTenants > 0) && (
          <Suspense fallback={
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          }>
            <QuickActions hasData={true} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export default withAuth(DashboardPage)
