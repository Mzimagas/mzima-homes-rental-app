'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, clientBusinessFunctions, clientQueries } from '../../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../../components/ui/loading'
import { ErrorCard } from '../../../../components/ui/error'
import { Tenant, Unit, Property, Payment } from '../../../../../lib/types/database'

interface TenantWithDetails extends Tenant {
  units: (Unit & {
    properties: Property
  })[]
}

interface PaymentHistory {
  payment_date: string
  amount_kes: number
  method: string
  tx_ref: string | null
  allocated_to_invoices: any[]
}

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string

  const [tenant, setTenant] = useState<TenantWithDetails | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTenantDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load tenant with unit and property details
      const { data: tenantData, error: tenantError } = await clientQueries.getTenantWithUnit(tenantId)

      if (tenantError) {
        setError('Failed to load tenant details')
        return
      }

      setTenant(tenantData)

      // Load tenant balance
      const { data: balanceData } = await clientBusinessFunctions.getTenantBalance(tenantId)
      setBalance(balanceData || 0)

      // Load payment history
      const { data: historyData } = await clientBusinessFunctions.getTenantPaymentHistory(tenantId, 20)
      setPaymentHistory(historyData || [])

    } catch (err) {
      setError('Failed to load tenant details')
      console.error('Tenant details loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tenantId) {
      loadTenantDetails()
    }
  }, [tenantId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800'
      case 'TERMINATED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600' // Owes money
    if (balance < 0) return 'text-green-600' // Credit balance
    return 'text-gray-600' // Zero balance
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Tenant Details</h1>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading tenant details..." />
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Tenant Details</h1>
        </div>
        <ErrorCard 
          title="Failed to load tenant"
          message={error || 'Tenant not found'}
          onRetry={loadTenantDetails}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-lg font-medium text-gray-700">
                {tenant.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{tenant.full_name}</h1>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                  {tenant.status}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">{tenant.phone}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Edit Tenant
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Record Payment
          </button>
        </div>
      </div>

      {/* Tenant Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Balance</h3>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getBalanceColor(balance)}`}>
              {formatCurrency(Math.abs(balance))}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {balance > 0 && 'Amount Owed'}
              {balance < 0 && 'Credit Balance'}
              {balance === 0 && 'Paid Up'}
            </div>
          </div>
        </div>

        {/* Unit Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Unit</h3>
          {tenant.units[0] ? (
            <div>
              <p className="text-sm text-gray-600">Property</p>
              <p className="font-medium">{tenant.units[0].properties.name}</p>
              <p className="text-sm text-gray-600 mt-2">Unit</p>
              <p className="font-medium">{tenant.units[0].unit_label}</p>
              <p className="text-sm text-gray-600 mt-2">Monthly Rent</p>
              <p className="font-medium">{formatCurrency(tenant.units[0].monthly_rent_kes)}</p>
            </div>
          ) : (
            <p className="text-gray-500">No unit assigned</p>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{tenant.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{tenant.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">ID Number</p>
              <p className="font-medium">{tenant.national_id || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Emergency Contact Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
          {tenant.emergency_contact_name || tenant.emergency_contact_phone ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{tenant.emergency_contact_name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{tenant.emergency_contact_phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Relationship</p>
                <p className="font-medium">{tenant.emergency_contact_relationship || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{tenant.emergency_contact_email || 'Not provided'}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No emergency contact information provided</p>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {paymentHistory.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments</h3>
              <p className="mt-1 text-sm text-gray-500">No payment history found for this tenant.</p>
            </div>
          ) : (
            paymentHistory.map((payment, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount_kes)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(payment.payment_date)} • {payment.method}
                      {payment.tx_ref && ` • Ref: ${payment.tx_ref}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Paid
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Emergency Contact section removed as it's not in the current schema */}
    </div>
  )
}
