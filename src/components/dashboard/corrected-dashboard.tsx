'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { supabase } from '../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../ui/loading'
import { ErrorCard } from '../ui/error'
import PropertyForm from '../properties/property-form'
import TenantForm from '../tenants/tenant-form'
import PaymentForm from '../payments/payment-form'

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

export default function CorrectedDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Ensure user is authenticated
      if (!user?.id) {
        setError('Please log in to view your dashboard')
        return
      }

      console.log('Loading dashboard for user:', user.email)

      // Use the new helper function to get accessible properties
      const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')

      if (accessError) {
        console.error('Error getting accessible properties:', accessError)
        setError('Failed to load your properties. Please check your permissions.')
        return
      }

      if (!accessibleProperties || accessibleProperties.length === 0) {
        console.log('No accessible properties found for user')
        // Set empty stats for users with no properties
        setStats({
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          occupancyRate: 0,
          monthlyRentPotential: 0,
          monthlyRentActual: 0,
          overdueAmount: 0
        })
        return
      }

      console.log(`Found ${accessibleProperties.length} accessible properties`)

      // Get property IDs
      const propertyIds = accessibleProperties.map(p => p.property_id)

      // Get full property details
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          physical_address,
          units (
            id,
            unit_label,
            monthly_rent_kes,
            is_active,
            tenants (
              id,
              full_name,
              status
            )
          )
        `)
        .in('id', propertyIds)

      if (propertiesError) {
        console.error('Error loading property details:', propertiesError)
        setError('Failed to load property details')
        return
      }

      // Calculate stats
      let totalUnits = 0
      let occupiedUnits = 0
      let totalRentPotential = 0
      let totalRentActual = 0

      if (properties) {
        for (const property of properties) {
          const units = property.units || []
          const activeUnits = units.filter(unit => unit.is_active)
          
          totalUnits += activeUnits.length
          
          for (const unit of activeUnits) {
            totalRentPotential += unit.monthly_rent_kes || 0
            
            const activeTenants = unit.tenants?.filter(tenant => tenant.status === 'ACTIVE') || []
            if (activeTenants.length > 0) {
              occupiedUnits++
              totalRentActual += unit.monthly_rent_kes || 0
            }
          }
        }
      }

      // Get overdue invoices (simplified for now)
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('amount_due_kes, amount_paid_kes')
        .in('property_id', propertyIds)
        .eq('status', 'OVERDUE')

      const overdueAmount = overdueInvoices?.reduce(
        (sum, invoice) => sum + ((invoice.amount_due_kes || 0) - (invoice.amount_paid_kes || 0)),
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
      console.error('Dashboard stats error:', err)
      setError('Failed to load dashboard statistics')
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
    setShowPropertyForm(true)
  }

  const handleAddTenant = () => {
    setShowTenantForm(true)
  }

  const handleRecordPayment = () => {
    setShowPaymentForm(true)
  }

  const handleFormSuccess = () => {
    // Refresh dashboard data when forms are successful
    loadDashboardStats()
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
          onRetry={() => window.location.href = '/auth/login'}
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
        <ErrorCard 
          title="Failed to load dashboard"
          message={error}
          onRetry={loadDashboardStats}
        />
      </div>
    )
  }

  // Show dashboard with stats
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
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
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Occupancy Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.occupancyRate.toFixed(1) || 0}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">KES {stats?.monthlyRentActual.toLocaleString() || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={handleAddProperty}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Property
            </button>
            <button
              onClick={handleAddTenant}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Add Tenant
            </button>
            <button
              onClick={handleRecordPayment}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* Empty State for No Properties */}
      {stats?.totalProperties === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

      {/* Forms */}
      {showPropertyForm && (
        <PropertyForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowPropertyForm(false)}
        />
      )}

      {showTenantForm && (
        <TenantForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowTenantForm(false)}
        />
      )}

      {showPaymentForm && (
        <PaymentForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}
    </div>
  )
}
