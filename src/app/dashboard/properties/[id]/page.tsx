'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, clientBusinessFunctions } from '../../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../../components/ui/loading'
import { ErrorCard } from '../../../../components/ui/error'
import { Property, Unit, Tenant } from '../../../../../lib/types/database'
import UnitForm from '../../../../components/properties/unit-form'

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

  const [property, setProperty] = useState<PropertyWithUnits | null>(null)
  const [stats, setStats] = useState<PropertyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

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

      {/* Units List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Units ({property.units.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {property.units.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-4a2 2 0 012-2h2a2 2 0 012 2v4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No units</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first unit.</p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setEditingUnit(null)
                    setShowUnitForm(true)
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Unit
                </button>
              </div>
            </div>
          ) : (
            property.units.map((unit) => (
              <div key={unit.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{unit.unit_label}</h4>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(unit.monthly_rent_kes)} / month
                        {unit.deposit_kes && ` • Deposit: ${formatCurrency(unit.deposit_kes)}`}
                      </p>
                      <div className="flex items-center space-x-3 mt-1">
                        {/* KPLC Meter Info */}
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          ⚡ {unit.meter_type === 'PREPAID' ? 'Prepaid' : 'Postpaid (Analogue)'}
                          {unit.kplc_account && ` • ${unit.kplc_account}`}
                        </span>

                        {/* Water Info */}
                        {unit.water_included ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            💧 Water Included
                          </span>
                        ) : unit.water_meter_type ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-cyan-100 text-cyan-800">
                            💧 {unit.water_meter_type === 'DIRECT_TAVEVO' ? 'Direct Tavevo' : 'Internal Submeter'}
                            {unit.water_meter_number && ` • ${unit.water_meter_number}`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                            💧 Water Setup Needed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUnitStatusColor(unit)}`}>
                      {getUnitStatusText(unit)}
                    </span>
                    {unit.tenants.length > 0 && (
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
