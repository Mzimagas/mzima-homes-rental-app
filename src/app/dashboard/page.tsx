'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { supabase, clientBusinessFunctions, clientQueries } from '../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../components/ui/loading'
import { ErrorCard } from '../../components/ui/error'
import PropertyForm from '../../components/properties/property-form'
import TenantForm from '../../components/tenants/tenant-form'
import PaymentForm from '../../components/payments/payment-form'

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

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states for quick actions
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [generatingInvoices, setGeneratingInvoices] = useState(false)

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // For now, we'll use a mock landlord ID since we haven't implemented landlord creation yet
      // In a real app, this would come from the user's profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'

      // Get all properties for landlord
      const { data: properties, error: propertiesError } = await clientQueries.getPropertiesByLandlord(mockLandlordId)

      if (propertiesError) {
        setError('Failed to load properties')
        return
      }

      let totalUnits = 0
      let occupiedUnits = 0
      let totalRentPotential = 0
      let totalRentActual = 0

      // Calculate stats from properties
      if (properties) {
        for (const property of properties) {
          const { data: propertyStats } = await clientBusinessFunctions.getPropertyStats((property as any).id)
          if (propertyStats && propertyStats.length > 0) {
            const stat = propertyStats[0]
            totalUnits += stat.total_units
            occupiedUnits += stat.occupied_units
            totalRentPotential += stat.monthly_rent_potential
            totalRentActual += stat.monthly_rent_actual
          }
        }
      }

      // Get overdue amount
      const { data: overdueInvoices } = await supabase
        .from('rent_invoices')
        .select('amount_due_kes, amount_paid_kes')
        .eq('status', 'OVERDUE' as any)

      const overdueAmount = overdueInvoices?.reduce(
        (sum, invoice) => sum + ((invoice as any).amount_due_kes - (invoice as any).amount_paid_kes),
        0
      ) || 0

      setStats({
        totalProperties: properties?.length || 0,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        monthlyRentPotential: totalRentPotential,
        monthlyRentActual: totalRentActual,
        overdueAmount
      })

    } catch (err) {
      setError('Failed to load dashboard statistics')
      console.error('Dashboard stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardStats()
  }, [])

  // Quick action handlers
  const handleAddProperty = () => {
    setShowPropertyForm(true)
  }

  const handleAddTenant = () => {
    setShowTenantForm(true)
  }

  const handleRecordPayment = () => {
    setShowPaymentForm(true)
  }

  const handleGenerateInvoices = async () => {
    setGeneratingInvoices(true)
    try {
      const currentDate = new Date()
      const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        .toISOString().split('T')[0]

      console.log('Generating invoices for period:', periodStart)

      const { data, error } = await clientBusinessFunctions.runMonthlyRent(periodStart)

      console.log('Invoice generation result:', { data, error })

      if (error) {
        console.error('Invoice generation error:', error)
        alert(`Error generating invoices: ${error}`)
      } else if (data && data.length > 0) {
        const result = data[0]
        if (result.invoices_created > 0) {
          alert(`✅ Successfully generated ${result.invoices_created} invoices totaling KES ${result.total_amount_kes.toLocaleString()}`)
          // Reload dashboard stats to reflect new invoices
          loadDashboardStats()
        } else {
          alert('ℹ️ No new invoices were generated. All current invoices may already exist for this period.')
        }
      } else {
        alert('ℹ️ No invoices were generated. This may be because:\n• All current invoices already exist for this period\n• No active tenancy agreements found\n• No properties or tenants configured')
      }
    } catch (err) {
      console.error('Error generating invoices:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      alert(`❌ Failed to generate invoices: ${errorMessage}\n\nPlease check:\n• You have active tenancy agreements\n• Properties and tenants are properly configured\n• Database connection is working`)
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

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <ErrorCard 
          title="Failed to load dashboard"
          message={error}
          onRetry={loadDashboardStats}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.user_metadata?.full_name || user?.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Properties</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalProperties || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
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
                  {stats?.monthlyRentPotential ? 
                    formatPercentage((stats.monthlyRentActual / stats.monthlyRentPotential) * 100) : 
                    '0%'
                  }
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
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Property
              </button>
              <button
                onClick={handleAddTenant}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Add Tenant
              </button>
              <button
                onClick={handleRecordPayment}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
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
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Invoices...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Invoices
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
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

      {/* Modal Forms */}
      <PropertyForm
        isOpen={showPropertyForm}
        onSuccess={(propertyId) => {
          setShowPropertyForm(false)
          loadDashboardStats() // Reload stats to reflect new property
        }}
        onCancel={() => setShowPropertyForm(false)}
      />

      <TenantForm
        isOpen={showTenantForm}
        onSuccess={(tenantId) => {
          setShowTenantForm(false)
          loadDashboardStats() // Reload stats to reflect new tenant
        }}
        onCancel={() => setShowTenantForm(false)}
      />

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
