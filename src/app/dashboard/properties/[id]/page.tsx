'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import supabase, { clientBusinessFunctions } from '../../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../../components/ui/loading'
import { ErrorCard } from '../../../../components/ui/error'
import { Property, Unit } from '../../../../lib/types/database'
// UnitForm and PropertyForm removed - using workflow-based management
import ReservationsTab from './ReservationsTab'
import PhotosTab from './PhotosTab'

import UserManagement from '../../../../components/property/UserManagement'
import { usePropertyAccess } from '../../../../hooks/usePropertyAccess'
// UnitActions, PropertyActions, PropertyBillingSettings, and LandDetailsForm removed - using workflow-based management
import ViewOnGoogleMapsButton from '../../../../components/location/ViewOnGoogleMapsButton'

import { isLandProperty, getPropertyTypeLabel } from '../../../../lib/validation/property'
import { PropertyStateDetailed } from '../../../../components/properties/components/PropertyStateIndicator'

interface PropertyWithUnits extends Property {
  units: Unit[]
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
  const { properties, loading: propertiesLoading } = usePropertyAccess()

  const [property, setProperty] = useState<PropertyWithUnits | null>(null)
  const [stats, setStats] = useState<PropertyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Unit and property forms removed - using workflow-based management

  const [activeTab, setActiveTab] = useState<
    'overview' | 'units' | 'photos' | 'reservations' | 'users'
  >('overview')

  // Check if current user can manage users for this property
  const currentPropertyAccess = properties.find((p) => p.property_id === propertyId)
  const canManageUsers = currentPropertyAccess?.can_manage_users || false

  // Reset tab to overview if user doesn't have permission for users tab
  useEffect(() => {
    if (activeTab === 'users' && !canManageUsers) {
      setActiveTab('overview')
    }
  }, [activeTab, canManageUsers])

  // Ensure 'units' tab is not active for land properties
  useEffect(() => {
    if (
      property &&
      isLandProperty((property.property_type as any) || 'HOME') &&
      activeTab === 'units'
    ) {
      setActiveTab('overview')
    }
  }, [property?.property_type, activeTab])

  const loadPropertyDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // First check if user has access to this property
      const hasAccess = properties.some((p) => p.property_id === propertyId)
      if (!hasAccess) {
        setError('You do not have access to this property')
        return
      }

      // Load property with units
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(
          `
          *,
          units (
            *
          )
        `
        )
        .eq('id', propertyId)
        .single()

      if (propertyError) {
        setError('Failed to load property details')
        return
      }

      // Load tenants for the units
      if (propertyData.units && propertyData.units.length > 0) {
        const unitIds = propertyData.units.map((unit: any) => unit.id)
        console.info('[PropertyDetails] Loading tenants for units:', unitIds)

        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, full_name, phone, status, current_unit_id')
          .in('current_unit_id', unitIds)
          .eq('status', 'ACTIVE')

        if (tenantsError) {
          console.error('[PropertyDetails] Error loading tenants:', tenantsError)
        } else {
          console.info('[PropertyDetails] Loaded tenants:', tenantsData?.length || 0, tenantsData)
        }

        // Associate tenants with their units
        const unitsWithTenants = propertyData.units.map((unit: any) => {
          const unitTenants =
            tenantsData?.filter((tenant: any) => tenant.current_unit_id === unit.id) || []
          console.info(
            `[PropertyDetails] Unit ${unit.unit_label} has ${unitTenants.length} tenants:`,
            unitTenants
          )
          return {
            ...unit,
            tenants: unitTenants,
          }
        })

        setProperty({
          ...propertyData,
          units: unitsWithTenants,
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
    // Only load property details after properties are loaded from usePropertyAccess
    if (propertyId && !propertiesLoading) {
      loadPropertyDetails()
    }
  }, [propertyId, propertiesLoading, properties])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getUnitStatusColor = (unit: any) => {
    if (!unit.is_active) return 'bg-gray-100 text-gray-800'

    // Check if unit has active tenants
    const hasActiveTenants = unit.tenants && unit.tenants.length > 0
    if (hasActiveTenants) return 'bg-green-100 text-green-800'

    return 'bg-yellow-100 text-yellow-800'
  }

  const getUnitStatusText = (unit: any) => {
    if (!unit.is_active) return 'Inactive'

    // Check if unit has active tenants
    const hasActiveTenants = unit.tenants && unit.tenants.length > 0
    if (hasActiveTenants) return 'Occupied'

    return 'Vacant'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
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
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
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
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{property.name}</h1>
            <p className="text-gray-600">{property.physical_address}</p>
            <div className="mt-3">
              <ViewOnGoogleMapsButton
                lat={(property as any).lat ?? null}
                lng={(property as any).lng ?? null}
                address={property.physical_address ?? property.name}
                propertyName={property.name}
              />
            </div>
          </div>
        </div>
        <div className="flex space-x-3 items-center">
          {/* Property actions (disable/enable/delete) */}
          {/* PropertyActions removed - using workflow-based management */}
          {/* Land details form removed - using workflow-based management */}

          <div className="text-sm text-gray-600">
            Property and unit management is handled through workflows
          </div>
        </div>
      </div>

      {/* Property State Indicator */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Property Status</h3>
        <PropertyStateDetailed propertyId={propertyId} />
      </div>

      {/* Property Statistics */}
      {stats && !isLandProperty((property.property_type as any) || 'HOME') && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Property Statistics</h3>
          <p className="text-xs text-gray-500 mb-3">Not applicable for land properties</p>
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
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round(stats.occupancy_rate)}%
              </div>
              <div className="text-sm text-gray-600">Occupancy Rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.monthly_rent_actual)}
              </div>
              <div className="text-sm text-gray-600">Monthly Revenue</div>
            </div>
          </div>
        </div>
      )}

      {/* Land Overview - only for land properties */}
      {isLandProperty((property.property_type as any) || 'HOME') && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Land Overview</h3>
          <p className="text-xs text-gray-500 mb-4">Relevant details for land properties</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Type and Zoning */}
            <div className="p-4 rounded-lg border">
              <div className="text-xs text-gray-500">Property Type</div>
              <div className="text-sm font-medium text-gray-900">
                {getPropertyTypeLabel((property.property_type as any) || 'RESIDENTIAL_LAND')}
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-xs text-gray-500">Zoning</div>
              <div className="text-sm font-medium text-gray-900">
                {(property as any).zoning_classification || 'Not specified'}
              </div>
            </div>

            {/* Size */}
            <div className="p-4 rounded-lg border">
              <div className="text-xs text-gray-500">Size (Acres)</div>
              <div className="text-sm font-medium text-gray-900">
                {typeof (property as any).total_area_acres === 'number'
                  ? `${(property as any).total_area_acres}`
                  : 'Not specified'}
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-xs text-gray-500">Size (sqm)</div>
              <div className="text-sm font-medium text-gray-900">
                {typeof (property as any).total_area_sqm === 'number'
                  ? `${(property as any).total_area_sqm.toLocaleString()}`
                  : 'Not specified'}
              </div>
            </div>

            {/* Access & Utilities */}
            <div className="p-4 rounded-lg border">
              <div className="text-xs text-gray-500">Road Access</div>
              <div className="text-sm font-medium text-gray-900">
                {(property as any).road_access_type || 'Not specified'}
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-xs text-gray-500">Electricity</div>
              <div className="text-sm font-medium text-gray-900">
                {(property as any).electricity_available === true
                  ? 'Available'
                  : (property as any).electricity_available === false
                    ? 'Not available'
                    : 'Unknown'}
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-xs text-gray-500">Water</div>
              <div className="text-sm font-medium text-gray-900">
                {(property as any).water_available === true
                  ? 'Available'
                  : (property as any).water_available === false
                    ? 'Not available'
                    : 'Unknown'}
              </div>
            </div>

            {/* Development Permit */}
            <div className="p-4 rounded-lg border md:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Development Permit</div>
                  <div className="text-sm font-medium text-gray-900">
                    {(property as any).development_permit_status || 'Unknown'}
                  </div>
                </div>
                {(property as any).development_permit_status && (
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${((status?: string) => {
                      switch (status) {
                        case 'APPROVED':
                          return 'bg-green-100 text-green-700 border border-green-200'
                        case 'PENDING':
                          return 'bg-amber-100 text-amber-700 border border-amber-200'
                        case 'DENIED':
                          return 'bg-red-100 text-red-700 border border-red-200'
                        case 'NOT_REQUIRED':
                          return 'bg-gray-100 text-gray-700 border border-gray-200'
                        default:
                          return 'bg-gray-100 text-gray-700 border border-gray-200'
                      }
                    })((property as any).development_permit_status)}`}
                  >
                    {((status?: string) => {
                      switch (status) {
                        case 'APPROVED':
                          return 'Development Approved'
                        case 'PENDING':
                          return 'Permit Pending'
                        case 'DENIED':
                          return 'Permit Denied'
                        case 'NOT_REQUIRED':
                          return 'No Permit Required'
                        default:
                          return 'Permit Status Unknown'
                      }
                    })((property as any).development_permit_status)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Comparison */}
      {stats && !isLandProperty((property.property_type as any) || 'HOME') && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Revenue Analysis</h3>
          <p className="text-xs text-gray-500 mb-3">
            Revenue metrics apply only to rental properties
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Actual Revenue</span>
                <span className="text-sm font-medium">
                  {formatCurrency(stats.monthly_rent_actual)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${stats.monthly_rent_potential > 0 ? (stats.monthly_rent_actual / stats.monthly_rent_potential) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Potential Revenue</span>
                <span className="text-sm font-medium">
                  {formatCurrency(stats.monthly_rent_potential)}
                </span>
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
              disabled={isLandProperty((property.property_type as any) || 'HOME')}
              className={`${
                activeTab === 'units'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${isLandProperty((property.property_type as any) || 'HOME') ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={
                isLandProperty((property.property_type as any) || 'HOME')
                  ? 'Units are not applicable for land properties'
                  : undefined
              }
            >
              Units & Tenants
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`${
                activeTab === 'photos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Photos
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`${
                activeTab === 'reservations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Reservations
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
              {/* Property Location */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Location</h3>
                <div className="flex justify-center">
                  <ViewOnGoogleMapsButton
                    lat={(property as any).lat ?? null}
                    lng={(property as any).lng ?? null}
                    address={property.physical_address ?? property.name}
                    propertyName={property.name}
                  />
                </div>
              </div>

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
                    <p className="mt-1 text-sm text-gray-900">
                      {property.property_type || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Defaults</h3>
                <div className="text-sm text-gray-600">
                  Billing settings are managed through workflows
                </div>
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Unit Photos</h3>
              <div className="space-y-4">
                <PhotosTab propertyId={propertyId} />
              </div>
            </div>
          )}

          {activeTab === 'reservations' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reservations</h3>
              <div className="space-y-4">
                <ReservationsTab propertyId={propertyId} />
              </div>
            </div>
          )}

          {activeTab === 'units' && !isLandProperty((property.property_type as any) || 'HOME') && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Units & Tenants</h3>
              <div className="space-y-4">
                {property.units.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No units found for this property.</p>
                    <p className="mt-2 text-sm text-gray-400">
                      Use the workflow system to add units
                    </p>
                  </div>
                ) : (
                  property.units.map((unit) => (
                    <div key={unit.id} className="bg-white p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {unit.unit_label || ''}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(unit.monthly_rent_kes || 0)} / month
                          </p>
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUnitStatusColor(unit)}`}
                            >
                              {getUnitStatusText(unit)}
                            </span>
                          </div>

                          {/* Show tenant information if occupied */}
                          {(unit as any).tenants && (unit as any).tenants.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500">Current Tenant:</div>
                              {(unit as any).tenants.map((tenant: any) => (
                                <div key={tenant.id} className="text-sm text-gray-900">
                                  {tenant.full_name}
                                  {tenant.phone && (
                                    <span className="text-gray-500 ml-2">• {tenant.phone}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-center py-4">
                          <ViewOnGoogleMapsButton
                            lat={(property as any).lat ?? null}
                            lng={(property as any).lng ?? null}
                            address={property.physical_address ?? property.name}
                            propertyName={property.name}
                          />
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-xs text-gray-500">
                            Unit management handled through workflows
                          </div>
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

      {/* Unit and property forms removed - using workflow-based management */}

      {/* Land details form removed - using workflow-based management */}
    </div>
  )
}
