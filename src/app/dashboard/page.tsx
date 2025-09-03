'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { withAuth } from '../../lib/withAuth'
import { useRouter } from 'next/navigation'
import getSupabaseClient, { clientBusinessFunctions } from '../../lib/supabase-client'

const supabase = getSupabaseClient()
import { LoadingStats, LoadingCard } from '../../components/ui/loading'
import { ErrorCard } from '../../components/ui/error'
// PropertyForm removed - using workflow-based property creation
import { isLandProperty } from '../../lib/validation/property'

import PaymentForm from '../../components/payments/payment-form'
import ResponsiveDashboardGrid from '../../components/dashboard/ResponsiveDashboardGrid'
import { useOptimizedDashboard } from '../../hooks/useOptimizedDashboard'

interface DashboardStats {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  occupancyRate: number
  monthlyRentPotential: number
  monthlyRentActual: number
  overdueAmount: number
}

function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Use optimized dashboard data loading
  const {
    data: optimizedData,
    loading: optimizedLoading,
    error: optimizedError,
    refresh: refreshOptimized,
  } = useOptimizedDashboard({
    autoRefresh: false, // Start with auto-refresh disabled
    refreshInterval: 300000, // 5 minutes
    enableCaching: true,
  })
  const [error, setError] = useState<string | null>(null)

  // Modal states for quick actions
  // Property form removed - using workflow-based creation
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [generatingInvoices, setGeneratingInvoices] = useState(false)

  const loadDashboardStats = async () => {
    console.warn('🚀 Dashboard loadDashboardStats - Version 2.1-enhanced starting...')
    try {
      setLoading(true)
      setError(null)

      // Ensure user is authenticated
      if (!user?.id) {
        console.warn('Dashboard: No authenticated user found')
        setError('Please log in to view your dashboard')
        return
      }

      console.warn(
        'Loading dashboard for user:',
        user.email,
        '- Version 2.1 with authentication fix'
      )

      // Double-check authentication with Supabase
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !currentUser) {
        console.warn(
          'Dashboard: Authentication verification failed:',
          authError?.message || 'No current user'
        )
        setError('Authentication expired. Please log in again.')
        return
      }

      if (currentUser.id !== user.id) {
        console.warn('Dashboard: User ID mismatch - session may be stale')
        setError('Session expired. Please refresh and log in again.')
        return
      }

      // Use the new helper function to get accessible properties (avoiding RLS recursion and type mismatch)
      const { data: accessibleProperties, error: accessError } = await supabase.rpc(
        'get_user_properties_simple'
      )

      if (accessError) {
        // Enhanced error handling to prevent empty error objects
        let errorMessage = 'Unknown error occurred'
        let errorDetails = {}

        // Log the raw error first for debugging
        console.warn('🔍 Raw accessError detected:', {
          error: accessError,
          type: typeof accessError,
          keys: Object.keys(accessError || {}),
          isAuthError: accessError?.__isAuthError,
          message: accessError?.message,
          code: accessError?.code,
        })

        try {
          // Check for authentication-related errors first
          if (
            accessError?.message?.includes('Auth session missing') ||
            accessError?.message?.includes('session_missing') ||
            accessError?.code === 'PGRST301' ||
            accessError?.__isAuthError
          ) {
            errorMessage = 'Authentication session expired. Please log in again.'
            console.warn('✅ Detected authentication error, showing login prompt')
            setError(errorMessage)
            return
          }

          // Check for function not found errors
          if (
            accessError?.message?.includes('does not exist') ||
            accessError?.message?.includes('function') ||
            accessError?.code === '42883'
          ) {
            errorMessage = 'Database function not found. Please contact support.'
          }
          // Check for no data errors (this is actually OK)
          else if (accessError?.code === 'PGRST116') {
            console.warn(
              'Dashboard: No accessible properties found for user (this is normal for new users)'
            )
            // Set empty stats for users with no properties
            setStats({
              totalProperties: 0,
              totalUnits: 0,
              occupiedUnits: 0,
              vacantUnits: 0,
              occupancyRate: 0,
              monthlyRentPotential: 0,
              monthlyRentActual: 0,
              overdueAmount: 0,
            })
            return
          }
          // Handle other errors
          else if (accessError?.message) {
            errorMessage = accessError.message
          } else if (accessError?.details) {
            errorMessage = accessError.details
          } else if (typeof accessError === 'string') {
            errorMessage = accessError
          } else if (accessError && typeof accessError === 'object') {
            errorMessage = JSON.stringify(accessError)
            if (errorMessage === '{}') {
              errorMessage = 'Empty error object from database - please check your authentication'
            }
          }

          errorDetails = {
            errorType: typeof accessError,
            hasMessage: !!accessError?.message,
            hasDetails: !!accessError?.details,
            errorKeys: accessError ? Object.keys(accessError) : [],
            errorCode: accessError?.code,
            isAuthError: !!accessError?.__isAuthError,
            userEmail: currentUser.email,
            timestamp: new Date().toISOString(),
          }
        } catch (parseError) {
          errorMessage = 'Error parsing database error'
          if (parseError && typeof parseError === 'object' && 'message' in parseError) {
            errorDetails = { ...errorDetails, parseMessage: (parseError as any).message }
          }
        }

        // Use console.warn instead of console.error to avoid Next.js interception
        console.warn('🚨 DASHBOARD ERROR - Accessible properties loading failed:', {
          message: errorMessage,
          details: errorDetails,
          originalError: accessError,
          timestamp: new Date().toISOString(),
          version: '2.1-enhanced',
        })

        // Also log a clear message
        console.warn(`❌ Dashboard Error: ${errorMessage}`)
        console.warn('📋 Error Details:', errorDetails)

        setError(`Failed to load your properties: ${errorMessage}`)
        return
      }

      if (!accessibleProperties || accessibleProperties.length === 0) {
        console.warn('No accessible properties found for user')
        // Set empty stats for users with no properties
        setStats({
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          occupancyRate: 0,
          monthlyRentPotential: 0,
          monthlyRentActual: 0,
          overdueAmount: 0,
        })
        return
      }

      console.warn(`Found ${accessibleProperties.length} accessible properties`)

      // Get property IDs and validate them
      const propertyIds = accessibleProperties
        .map((p: { property_id?: string | null }) => p.property_id)
        .filter((id: string | null | undefined): id is string => !!id && typeof id === 'string')

      if (propertyIds.length === 0) {
        console.warn('No valid property IDs found in accessible properties')
        setStats({
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          occupancyRate: 0,
          monthlyRentPotential: 0,
          monthlyRentActual: 0,
          overdueAmount: 0,
        })
        return
      }

      // Get full property details (with tenants join - enhanced error logging active)
      // Exclude soft-deleted properties from dashboard statistics
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(
          `
          id,
          name,
          physical_address,
          property_type,
          disabled_at,
          property_type,
          units (
            id,
            unit_label,
            monthly_rent_kes,
            is_active,
            tenancy_agreements!left (
              id,
              status,
              tenants!inner (
                id,
                full_name,
                status
              )
            )
          )
        `
        )
        .in('id', propertyIds)
        .is('disabled_at', null)

      if (propertiesError) {
        console.error('❌ Supabase query failed:')
        console.dir(propertiesError, { depth: null })

        console.error('❌ Supabase error (stringified):', JSON.stringify(propertiesError, null, 2))

        // If it's a fetch error or generic JS error
        if (propertiesError instanceof Error) {
          console.error('❌ JS Error:', propertiesError.message)
        }

        // If it's a Supabase error structure
        if ('message' in propertiesError || 'code' in propertiesError) {
          console.error('🔎 Supabase Error Details:', {
            message: propertiesError.message,
            code: propertiesError.code,
            hint: propertiesError.hint,
            details: propertiesError.details,
          })
        }

        // Additional context for debugging
        console.error('❌ Error context:', {
          propertyIds: propertyIds,
          userEmail: user.email,
          timestamp: new Date().toISOString(),
          errorType: typeof propertiesError,
          errorKeys: propertiesError ? Object.keys(propertiesError) : [],
        })

        // Additional debugging for empty error objects
        let errorMessage = 'Unknown error occurred'
        let errorDetails = {}

        try {
          if (propertiesError?.message) {
            errorMessage = propertiesError.message
          } else if (propertiesError?.details) {
            errorMessage = propertiesError.details
          } else if (typeof propertiesError === 'string') {
            errorMessage = propertiesError
          } else if (propertiesError && typeof propertiesError === 'object') {
            errorMessage = JSON.stringify(propertiesError)
            if (errorMessage === '{}') {
              errorMessage = 'Empty error object from database - check RLS policies'
            }
          }

          errorDetails = {
            errorType: typeof propertiesError,
            hasMessage: !!propertiesError?.message,
            hasDetails: !!propertiesError?.details,
            errorKeys: propertiesError ? Object.keys(propertiesError) : [],
            propertyIds: propertyIds,
            userEmail: user.email,
            timestamp: new Date().toISOString(),
          }
        } catch (parseError) {
          errorMessage = 'Error parsing database error'
          if (parseError && typeof parseError === 'object' && 'message' in parseError) {
            errorDetails = { ...errorDetails, parseMessage: (parseError as any).message }
          }
        }

        // Use our quiet logger to prevent console spam
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Dashboard stats error:', {
            message: errorMessage,
            details: errorDetails,
            originalError: propertiesError,
          })
        }

        setError(`Failed to load property details: ${errorMessage}`)
        return
      }

      // Calculate stats with safety checks
      let totalUnits = 0
      let occupiedUnits = 0
      let totalRentPotential = 0
      let totalRentActual = 0

      if (properties && Array.isArray(properties)) {
        for (const property of properties) {
          try {
            // Skip land properties for occupancy/rent stats
            if (isLandProperty(((property as any).property_type as any) || 'HOME')) {
              continue
            }

            const units = property.units || []
            const activeUnits = units.filter((unit: any) => unit && unit.is_active === true)

            totalUnits += activeUnits.length

            for (const unit of activeUnits as any[]) {
              const rentAmount = Number((unit as any).monthly_rent_kes) || 0
              totalRentPotential += rentAmount

              const activeTenants =
                (unit as any).tenancy_agreements?.filter(
                  (agreement: any) => agreement && agreement.status === 'ACTIVE' && agreement.tenants
                ) || []
              if (activeTenants.length > 0) {
                occupiedUnits++
                totalRentActual += rentAmount
              }
            }
          } catch (unitError) {
            console.warn(`Error processing property ${property.id}:`, unitError)
            // Continue processing other properties
          }
        }
      }

      // Get overdue rental amounts using the optimized view
      // Only include amounts from active properties (exclude soft-deleted properties)
      const { data: overdueInvoices, error: overdueError } = await supabase
        .from('v_overdue_rental_summary')
        .select('amount_due, property_id, property_disabled_at')
        .in('property_id', propertyIds)
        .is('property_disabled_at', null)

      let overdueAmount = 0
      if (overdueError) {
        console.warn('Could not load overdue invoices:', overdueError?.message || overdueError)
        // Don't fail the entire dashboard for overdue invoice errors
      } else {
        overdueAmount =
          overdueInvoices?.reduce(
            (sum: number, invoice: any) => sum + (invoice.amount_due || 0),
            0
          ) || 0
      }

      setStats({
        totalProperties: properties?.length || 0,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        monthlyRentPotential: totalRentPotential,
        monthlyRentActual: totalRentActual,
        overdueAmount,
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)

      // Use quiet logging to prevent console spam
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Dashboard stats error:', {
          error: err,
          message: errorMessage,
          user: user?.email,
          stack: err instanceof Error ? err.stack : undefined,
        })
      }
      setError(`Failed to load dashboard statistics: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardStats()
    } else if (!authLoading && !user) {
      setError('Please log in to view your dashboard')
      setLoading(false)
    }
  }, [user, authLoading])

  // Quick action handlers
  const handleAddProperty = () => {
    // Property creation is handled through workflows
    router.push('/dashboard/properties')
  }

  const handleAddTenant = () => {
    // Navigate to the tenants list
    router.push('/dashboard/tenants')
  }

  const handleRecordPayment = () => {
    setShowPaymentForm(true)
  }

  const handleGenerateInvoices = async () => {
    setGeneratingInvoices(true)
    try {
      const currentDate = new Date()
      const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        .toISOString()
        .split('T')[0]

      console.warn('Generating invoices for period:', periodStart)

      const { data, error } = await clientBusinessFunctions.runMonthlyRent(periodStart)

      console.warn('Invoice generation result:', { data, error })

      if (error) {
        console.error('Invoice generation error:', error)
        alert(`Error generating invoices: ${error}`)
      } else if (data && data.length > 0) {
        const result = data[0]
        if (result.invoices_created > 0) {
          alert(
            `✅ Successfully generated ${result.invoices_created} invoices totaling KES ${result.total_amount_kes.toLocaleString()}`
          )
          // Reload dashboard stats to reflect new invoices
          loadDashboardStats()
        } else {
          alert(
            'ℹ️ No new invoices were generated. All current invoices may already exist for this period.'
          )
        }
      } else {
        alert(
          'ℹ️ No invoices were generated. This may be because:\n• All current invoices already exist for this period\n• No active tenancy agreements found\n• No properties or tenants configured'
        )
      }
    } catch (err) {
      console.error('Error generating invoices:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      alert(
        `❌ Failed to generate invoices: ${errorMessage}\n\nPlease check:\n• You have active tenancy agreements\n• Properties and tenants are properly configured\n• Database connection is working`
      )
    } finally {
      setGeneratingInvoices(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Loading...</p>
        </div>
        <LoadingStats />
      </div>
    )
  }

  // Show authentication error
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <ErrorCard
          title="Authentication Required"
          message="Please log in to view your dashboard"
          onRetry={() => (window.location.href = '/auth/login')}
        />
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <LoadingStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingCard title="Loading recent activity..." />
          <LoadingCard title="Loading property overview..." />
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <ErrorCard title="Failed to load dashboard" message={error} onRetry={loadDashboardStats} />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Responsive Dashboard Grid */}
      <ResponsiveDashboardGrid
        stats={{
          totalProperties: optimizedData?.stats?.properties?.total || stats?.totalProperties || 0,
          totalTenants: optimizedData?.stats?.tenants?.active || stats?.occupiedUnits || 0,
          monthlyRevenue:
            optimizedData?.stats?.revenue?.monthlyActual || stats?.monthlyRentActual || 0,
          occupancyRate:
            optimizedData?.stats?.properties?.occupancyRate || stats?.occupancyRate || 0,
          pendingPayments: optimizedData?.stats?.payments?.pending || 0,
          maintenanceRequests: 0, // This would come from maintenance system
        }}
      />

      {/* Show optimized loading state */}
      {optimizedLoading && !optimizedData && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading optimized dashboard data...</p>
        </div>
      )}

      {/* Show alerts from optimized data */}
      {optimizedData?.alerts && optimizedData.alerts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alerts & Notifications</h3>
          <div className="space-y-3">
            {optimizedData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'high'
                    ? 'border-red-500 bg-red-50'
                    : alert.severity === 'medium'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                  </div>
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                    {alert.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy Stats Grid - Hidden on mobile, shown on larger screens for comparison */}
      <div className="hidden xl:block">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Detailed Statistics</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-blue-600"
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
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Properties</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalProperties || 0}
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
                  <svg
                    className="h-8 w-8 text-green-600"
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
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Occupied Units</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.occupiedUnits || 0} / {stats?.totalUnits || 0}
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
                  <svg
                    className="h-8 w-8 text-purple-600"
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
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Occupancy Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatPercentage(stats?.occupancyRate || 0)}
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
                  <svg
                    className="h-8 w-8 text-yellow-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(stats?.monthlyRentActual || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Revenue Overview</h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Potential Monthly Revenue</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(stats?.monthlyRentPotential || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Actual Monthly Revenue</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(stats?.monthlyRentActual || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Revenue Efficiency</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats?.monthlyRentPotential
                      ? formatPercentage(
                          (stats.monthlyRentActual / stats.monthlyRentPotential) * 100
                        )
                      : '0%'}
                  </span>
                </div>
                {stats?.overdueAmount && stats.overdueAmount > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span className="text-sm">Overdue Amount</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(stats.overdueAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <button
                  onClick={handleAddProperty}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Property
                </button>
                <button
                  onClick={handleAddTenant}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Add Tenant
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Record Payment
                </button>
                <button
                  onClick={handleGenerateInvoices}
                  disabled={generatingInvoices}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate monthly rent invoices for all active tenants"
                >
                  {generatingInvoices ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating Invoices...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Generate Invoices
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State for No Properties */}
      {stats?.totalProperties === 0 && (
        <div className="text-center py-12">
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first property.</p>
          <div className="mt-6">
            <button
              onClick={handleAddProperty}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Property
            </button>
          </div>
        </div>
      )}

      {/* Recent Activity Placeholder */}
      {(stats?.totalProperties || 0) > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Latest payments, tenant updates, and property changes
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <p className="text-sm text-gray-500 text-center py-8">
              Recent activity will appear here once you start managing properties and tenants.
            </p>
          </div>
        </div>
      )}

      {/* Property form removed - using workflow-based creation */}

      <PaymentForm
        isOpen={showPaymentForm}
        onSuccess={() => {
          setShowPaymentForm(false)
          loadDashboardStats() // Reload stats to reflect new payment
        }}
        onCancel={() => setShowPaymentForm(false)}
      />
    </div>
  )
}

export default withAuth(DashboardPage)
