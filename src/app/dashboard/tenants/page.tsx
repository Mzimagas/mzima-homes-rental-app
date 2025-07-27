'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { supabase, clientBusinessFunctions, clientQueries } from '../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../components/ui/loading'
import { ErrorCard, EmptyState } from '../../../components/ui/error'
import { Tenant, Unit, Property } from '../../../../lib/types/database'
import TenantForm from '../../../components/tenants/tenant-form'
import Link from 'next/link'

interface TenantWithDetails extends Tenant {
  units: (Unit & {
    properties: Property
  })[]
  balance?: number
}

export default function TenantsPage() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<TenantWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'overdue'>('all')
  const [showTenantForm, setShowTenantForm] = useState(false)

  const loadTenants = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // For now, using mock landlord ID - in real app, this would come from user profile
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'
      
      // First get all properties for the landlord
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', mockLandlordId)

      if (!properties || properties.length === 0) {
        setTenants([])
        return
      }

      const propertyIds = properties.map(p => p.id)

      // Get units for these properties
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .in('property_id', propertyIds)

      if (!units || units.length === 0) {
        setTenants([])
        return
      }

      const unitIds = units.map(u => u.id)

      // Get all tenants for these units
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          *,
          units (
            *,
            properties (
              id,
              name,
              physical_address,
              landlord_id
            )
          )
        `)
        .in('current_unit_id', unitIds)
        .order('full_name')

      if (tenantsError) {
        setError('Failed to load tenants')
        return
      }

      // Load balances for each tenant
      const tenantsWithBalances: TenantWithDetails[] = []
      
      if (tenantsData) {
        for (const tenant of tenantsData) {
          const { data: balanceData } = await clientBusinessFunctions.getTenantBalance(tenant.id)
          
          tenantsWithBalances.push({
            ...tenant,
            balance: balanceData || 0
          })
        }
      }
      
      setTenants(tenantsWithBalances)
    } catch (err) {
      setError('Failed to load tenants')
      console.error('Tenants loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTenants()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
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

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.units[0]?.unit_label.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (filterStatus === 'all') return true
    if (filterStatus === 'overdue') return (tenant.balance || 0) > 0
    
    return tenant.status.toLowerCase() === filterStatus
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Tenants</h1>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading tenants..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tenants</h1>
        <ErrorCard 
          title="Failed to load tenants"
          message={error}
          onRetry={loadTenants}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Tenants</h1>
        <button
          onClick={() => setShowTenantForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Tenant
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tenants by name, phone, or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Tenants</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="overdue">Overdue Payments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tenants List */}
      {filteredTenants.length === 0 ? (
        <EmptyState
          title="No tenants found"
          description={searchTerm || filterStatus !== 'all' 
            ? "No tenants match your search criteria. Try adjusting your filters."
            : "You haven't added any tenants yet. Create your first tenant to get started."
          }
          actionLabel={!searchTerm && filterStatus === 'all' ? "Add Tenant" : undefined}
          onAction={() => setShowTenantForm(true)}
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTenants.map((tenant) => (
              <li key={tenant.id}>
                <Link href={`/dashboard/tenants/${tenant.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {tenant.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">{tenant.full_name}</p>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                              {tenant.status}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{tenant.phone}</span>
                            {tenant.units[0] && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{tenant.units[0].properties.name} - {tenant.units[0].unit_label}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Balance</p>
                          <p className={`text-sm font-medium ${getBalanceColor(tenant.balance || 0)}`}>
                            {formatCurrency(Math.abs(tenant.balance || 0))}
                            {(tenant.balance || 0) > 0 && <span className="text-xs ml-1">(owes)</span>}
                            {(tenant.balance || 0) < 0 && <span className="text-xs ml-1">(credit)</span>}
                          </p>
                        </div>
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Stats */}
      {tenants.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tenant Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{tenants.length}</div>
              <div className="text-sm text-gray-500">Total Tenants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {tenants.filter(t => t.status === 'ACTIVE').length}
              </div>
              <div className="text-sm text-gray-500">Active Tenants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {tenants.filter(t => (t.balance || 0) > 0).length}
              </div>
              <div className="text-sm text-gray-500">Overdue Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(tenants.reduce((sum, t) => sum + Math.max(0, t.balance || 0), 0))}
              </div>
              <div className="text-sm text-gray-500">Total Outstanding</div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Form Modal */}
      <TenantForm
        isOpen={showTenantForm}
        onSuccess={(tenantId) => {
          setShowTenantForm(false)
          loadTenants() // Reload tenants list
        }}
        onCancel={() => setShowTenantForm(false)}
      />
    </div>
  )
}
