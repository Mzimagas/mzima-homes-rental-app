'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, clientBusinessFunctions } from '../../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../../components/ui/loading'
import { ErrorCard } from '../../../../components/ui/error'
import { Property, Unit, Tenant } from '../../../../../lib/types/database'
import UnitForm from '../../../../components/properties/unit-form'
import UserManagement from '../../../../components/property/UserManagement'
import { PropertySelectorCompact } from '../../../../components/property/PropertySelector'
import { usePropertyAccess } from '../../../../hooks/usePropertyAccess'

interface PropertyWithUnits extends Property {
  units: (Unit & {
    tenants: Tenant[]
  })[]
}

interface PropertyStats {
  total_units: number
  occupied_units: number
  vacant_units: number
  occupancy_rate: number
  monthly_rent_potential: number
  monthly_rent_actual: number
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string
  const { properties } = usePropertyAccess()

  const [property, setProperty] = useState<PropertyWithUnits | null>(null)
  const [stats, setStats] = useState<PropertyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'users'>('overview')

  // Check if current user can manage users for this property
  const currentPropertyAccess = properties.find(p => p.property_id === propertyId)
  const canManageUsers = currentPropertyAccess?.can_manage_users || false

  // Reset tab to overview if user doesn't have permission for users tab
  useEffect(() => {
    if (activeTab === 'users' && !canManageUsers) {
      setActiveTab('overview')
    }
  }, [activeTab, canManageUsers])

  const loadPropertyDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load property with units
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          units (
            *
          )
        `)
        .eq('id', propertyId)
        .single()

      if (propertyError) {
        setError('Failed to load property details')
        return
      }

      // Load tenants for the units
      if (propertyData.units && propertyData.units.length > 0) {
        const unitIds = propertyData.units.map(unit => unit.id)
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, full_name, phone, status, current_unit_id')
          .in('current_unit_id', unitIds)
          .eq('status', 'ACTIVE')

        // Associate tenants with their units
        const unitsWithTenants = propertyData.units.map(unit => ({
          ...unit,
          tenants: tenantsData?.filter(tenant => tenant.current_unit_id === unit.id) || []
        }))

        setProperty({
          ...propertyData,
          units: unitsWithTenants
        })
      } else {
        setProperty(propertyData)
      }

      // Load property statistics
      const { data: statsData } = await clientBusinessFunctions.getPropertyStats(propertyId)
      if (statsData && statsData.length > 0) {
        setStats(statsData[0])
      }

    } catch (err) {
      setError('Failed to load property details')
      console.error('Property details loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (propertyId) {
      loadPropertyDetails()
    }
  }, [propertyId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getUnitStatusColor = (unit: Unit & { tenants: Tenant[] }) => {
    if (!unit.is_active) return 'bg-gray-100 text-gray-800'
    if (unit.tenants.length > 0) return 'bg-green-100 text-green-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const getUnitStatusText = (unit: Unit & { tenants: Tenant[] }) => {
    if (!unit.is_active) return 'Inactive'
    if (unit.tenants.length > 0) return 'Occupied'
    return 'Vacant'
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
          <h1 className="text-2xl font-semibold text-gray-900">Property Details</h1>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading property details..." />
      </div>
    )
  }

  if (error || !property) {
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
          <h1 className="text-2xl font-semibold text-gray-900">Property Details</h1>
        </div>
        <ErrorCard 
          title="Failed to load property"
          message={error || 'Property not found'}
          onRetry={loadPropertyDetails}
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
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{property.name}</h1>
            <p className="text-gray-600">{property.physical_address}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Edit Property
          </button>
          <button
            onClick={() => {
              setEditingUnit(null)
              setShowUnitForm(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Unit
          </button>
        </div>
      </div>

      {/* Property Statistics */}
      {stats && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Property Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total_units}</div>
              <div className="text-sm text-gray-600">Total Units</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.occupied_units}</div>
              <div className="text-sm text-gray-600">Occupied Units</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{Math.round(stats.occupancy_rate)}%</div>
              <div className="text-sm text-gray-600">Occupancy Rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.monthly_rent_actual)}</div>
              <div className="text-sm text-gray-600">Monthly Revenue</div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Comparison */}
      {stats && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Analysis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Actual Revenue</span>
                <span className="text-sm font-medium">{formatCurrency(stats.monthly_rent_actual)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${stats.monthly_rent_potential > 0 ? (stats.monthly_rent_actual / stats.monthly_rent_potential) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Potential Revenue</span>
                <span className="text-sm font-medium">{formatCurrency(stats.monthly_rent_potential)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Revenue Gap: {formatCurrency(stats.monthly_rent_potential - stats.monthly_rent_actual)}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('units')}
              className={`${
                activeTab === 'units'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Units & Tenants
            </button>
            {canManageUsers && (
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                User Management
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Property Name</label>
                    <p className="mt-1 text-sm text-gray-900">{property.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{property.physical_address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Property Type</label>
                    <p className="mt-1 text-sm text-gray-900">{property.property_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Units</label>
                    <p className="mt-1 text-sm text-gray-900">{property.units?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'units' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Units & Tenants</h3>
              <div className="space-y-4">
                {property.units.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No units found for this property.</p>
                    <button
                      onClick={() => {
                        setEditingUnit(null)
                        setShowUnitForm(true)
                      }}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add Unit
                    </button>
                  </div>
                ) : (
                  property.units.map((unit) => (
                    <div key={unit.id} className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{unit.unit_label}</h4>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(unit.monthly_rent_kes)} / month
                          </p>
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUnitStatusColor(unit)}`}>
                              {getUnitStatusText(unit)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {unit.tenants && unit.tenants.length > 0 && (
                            <div className="text-sm text-gray-600">
                              {unit.tenants[0].full_name}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setEditingUnit(unit)
                              setShowUnitForm(true)
                            }}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && canManageUsers && (
            <div>
              <UserManagement />
            </div>
          )}
        </div>
      </div>

      {/* Property Notes */}
      {property.notes && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-600">{property.notes}</p>
        </div>
      )}

      {/* Unit Form Modal */}
      <UnitForm
        propertyId={propertyId}
        unit={editingUnit}
        isOpen={showUnitForm}
        onSuccess={(unitId) => {
          setShowUnitForm(false)
          setEditingUnit(null)
          loadPropertyDetails() // Reload property details
        }}
        onCancel={() => {
          setShowUnitForm(false)
          setEditingUnit(null)
        }}
      />
    </div>
  )
}
