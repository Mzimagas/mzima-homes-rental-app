'use client'

import { useState, useEffect } from 'react'
import { Button, TextField } from '../../ui'
import { LoadingCard } from '../../ui/loading'
import { ErrorCard } from '../../ui/error'
import Modal from '../../ui/Modal'
import PropertyForm from '../../properties/property-form'
import { RentalProperty } from '../types/rental-management.types'
import { RentalManagementService } from '../services/rental-management.service'
import { usePropertyRealTime } from '../hooks/useRealTimeOccupancy'
import MaintenanceManagement from './MaintenanceManagement'
import PropertyInspections from './PropertyInspections'

interface RentalPropertyListProps {
  onDataChange?: () => void
}

export default function RentalPropertyList({ onDataChange }: RentalPropertyListProps) {
  const [properties, setProperties] = useState<RentalProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<RentalProperty | null>(null)
  const [showPropertyModal, setShowPropertyModal] = useState(false)
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<RentalProperty | null>(null)
  const [showUnitsModal, setShowUnitsModal] = useState(false)
  const [unitsProperty, setUnitsProperty] = useState<RentalProperty | null>(null)
  const [showRentRollModal, setShowRentRollModal] = useState(false)
  const [rentRollData, setRentRollData] = useState<any>(null)
  const [loadingRentRoll, setLoadingRentRoll] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const [maintenanceProperty, setMaintenanceProperty] = useState<RentalProperty | null>(null)
  const [inspectionProperty, setInspectionProperty] = useState<RentalProperty | null>(null)

  // Rental-focused filters
  const [occupancyFilter, setOccupancyFilter] = useState('')
  const [incomeFilter, setIncomeFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await RentalManagementService.getRentalProperties()
      setProperties(data)
    } catch (err: any) {
      console.error('Error loading properties:', err)
      setError(err.message || 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter((property) => {
    // Always show only rentable properties (no toggle needed)
    const rentableTypes = ['HOME', 'HOSTEL', 'STALL']
    if (!rentableTypes.includes(property.property_type || '')) return false

    // Search filter
    const matchesSearch =
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.physical_address?.toLowerCase().includes(searchTerm.toLowerCase())

    // Occupancy filter
    const matchesOccupancy =
      !occupancyFilter ||
      (() => {
        const occupancyRate = 100 - (property.vacancy_rate || 0)
        switch (occupancyFilter) {
          case 'fully_occupied':
            return occupancyRate >= 95
          case 'partially_occupied':
            return occupancyRate > 0 && occupancyRate < 95
          case 'vacant':
            return occupancyRate === 0
          default:
            return true
        }
      })()

    // Income filter
    const matchesIncome =
      !incomeFilter ||
      (() => {
        const income = property.monthly_income || 0
        switch (incomeFilter) {
          case 'high':
            return income > 100000
          case 'medium':
            return income >= 50000 && income <= 100000
          case 'low':
            return income > 0 && income < 50000
          case 'none':
            return income === 0
          default:
            return true
        }
      })()

    // Availability filter
    const matchesAvailability =
      !availabilityFilter ||
      (() => {
        const vacancyRate = property.vacancy_rate || 0
        switch (availabilityFilter) {
          case 'has_available':
            return vacancyRate > 0
          case 'fully_occupied':
            return vacancyRate === 0
          default:
            return true
        }
      })()

    // Location filter
    const matchesLocation =
      !locationFilter ||
      property.physical_address?.toLowerCase().includes(locationFilter.toLowerCase())

    return (
      matchesSearch && matchesOccupancy && matchesIncome && matchesAvailability && matchesLocation
    )
  })

  const handlePropertyClick = (property: RentalProperty) => {
    setSelectedProperty(property)
    setShowPropertyModal(true)
  }

  const handleAddProperty = () => {
    setEditingProperty(null)
    setShowPropertyForm(true)
  }

  const handleEditProperty = (property: RentalProperty) => {
    setEditingProperty(property)
    setShowPropertyForm(true)
    setShowPropertyModal(false)
  }

  const handlePropertyFormSuccess = (propertyId: string) => {
    setShowPropertyForm(false)
    setEditingProperty(null)
    loadProperties() // Refresh the list
    onDataChange?.()
  }

  const handleViewUnits = (property: RentalProperty) => {
    setUnitsProperty(property)
    setShowUnitsModal(true)
    setShowPropertyModal(false)
  }

  const handleGenerateRentRoll = async (property: RentalProperty) => {
    setLoadingRentRoll(true)
    try {
      const rentRoll = await RentalManagementService.getRentRoll(property.id)
      setRentRollData(rentRoll)
      setShowRentRollModal(true)
      setShowPropertyModal(false)
    } catch (error) {
      console.error('Error generating rent roll:', error)
      setError('Failed to generate rent roll')
    } finally {
      setLoadingRentRoll(false)
    }
  }

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 bg-green-100'
    if (rate >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case 'HOME':
        return 'bg-blue-100 text-blue-800'
      case 'HOSTEL':
        return 'bg-purple-100 text-purple-800'
      case 'STALL':
        return 'bg-orange-100 text-orange-800'
      case 'RESIDENTIAL_LAND':
        return 'bg-green-100 text-green-800'
      case 'COMMERCIAL_LAND':
        return 'bg-yellow-100 text-yellow-800'
      case 'AGRICULTURAL_LAND':
        return 'bg-emerald-100 text-emerald-800'
      case 'MIXED_USE_LAND':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'HOME':
        return '🏠 Home'
      case 'HOSTEL':
        return '🏨 Hostel'
      case 'STALL':
        return '🏪 Stall'
      case 'RESIDENTIAL_LAND':
        return '🏞️ Residential Land'
      case 'COMMERCIAL_LAND':
        return '🏢 Commercial Land'
      case 'AGRICULTURAL_LAND':
        return '🌾 Agricultural Land'
      case 'MIXED_USE_LAND':
        return '🏗️ Mixed Use Land'
      default:
        return type || 'Unknown'
    }
  }

  const handleMaintenanceClick = (property: RentalProperty) => {
    setMaintenanceProperty(property)
    setShowMaintenanceModal(true)
  }

  const handleInspectionClick = (property: RentalProperty) => {
    setInspectionProperty(property)
    setShowInspectionModal(true)
  }

  const handleMaintenanceClose = () => {
    setShowMaintenanceModal(false)
    setMaintenanceProperty(null)
    onDataChange?.() // Refresh data when maintenance modal closes
  }

  const handleInspectionClose = () => {
    setShowInspectionModal(false)
    setInspectionProperty(null)
    onDataChange?.() // Refresh data when inspection modal closes
  }

  if (loading) {
    return <LoadingCard title="Loading rental properties..." />
  }

  if (error) {
    return <ErrorCard title="Error Loading Properties" message={error} onRetry={loadProperties} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rental Properties</h2>
          <p className="text-sm text-gray-500">
            Manage your rentable properties with advanced filtering
          </p>
        </div>
        <Button onClick={handleAddProperty} variant="primary">
          Add Property
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Primary Search */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TextField
              placeholder="Search properties by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={loadProperties} variant="secondary">
            Refresh
          </Button>
        </div>

        {/* Rental-Focused Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Occupancy Filter */}
          <select
            className="border rounded px-3 py-2 text-sm"
            value={occupancyFilter}
            onChange={(e) => setOccupancyFilter(e.target.value)}
          >
            <option value="">All Occupancy</option>
            <option value="fully_occupied">Fully Occupied (95% or more)</option>
            <option value="partially_occupied">Partially Occupied</option>
            <option value="vacant">Vacant (0%)</option>
          </select>

          {/* Income Range Filter */}
          <select
            className="border rounded px-3 py-2 text-sm"
            value={incomeFilter}
            onChange={(e) => setIncomeFilter(e.target.value)}
          >
            <option value="">All Income Levels</option>
            <option value="high">High Income (Above 100K KES/month)</option>
            <option value="medium">Medium Income (50K-100K KES/month)</option>
            <option value="low">Low Income (Below 50K KES/month)</option>
            <option value="none">No Income (Vacant)</option>
          </select>

          {/* Unit Availability Filter */}
          <select
            className="border rounded px-3 py-2 text-sm"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
          >
            <option value="">All Availability</option>
            <option value="has_available">Has Available Units</option>
            <option value="fully_occupied">Fully Occupied</option>
          </select>

          {/* Geographic Area Filter */}
          <input
            className="border rounded px-3 py-2 text-sm w-48"
            placeholder="Filter by area/location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setSearchTerm('')
              setOccupancyFilter('')
              setIncomeFilter('')
              setAvailabilityFilter('')
              setLocationFilter('')
            }}
            className="px-3 py-2 text-sm bg-gray-100 border rounded hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>

        {/* Active Filters Display */}
        {(occupancyFilter || incomeFilter || availabilityFilter || locationFilter) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <span className="text-sm text-gray-600">Active filters:</span>
            {occupancyFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Occupancy: {occupancyFilter.replace('_', ' ')}
              </span>
            )}
            {incomeFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Income: {incomeFilter}
              </span>
            )}
            {availabilityFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Availability: {availabilityFilter.replace('_', ' ')}
              </span>
            )}
            {locationFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                Location: {locationFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredProperties.length} of {properties.length} rental properties
        </p>
        {filteredProperties.length !== properties.length && (
          <p className="text-xs text-gray-500">
            {properties.length - filteredProperties.length} properties hidden by filters
          </p>
        )}
      </div>

      {/* Properties Grid */}
      {filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handlePropertyClick(property)}
            >
              <div className="p-6">
                {/* Property Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{property.name}</h3>
                    <p className="text-sm text-gray-500">{property.physical_address}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPropertyTypeColor(property.property_type || '')}`}
                    >
                      {getPropertyTypeLabel(property.property_type || '')}
                    </span>
                  </div>
                </div>

                {/* Property Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Units</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {property.total_units || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Occupied</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {property.occupied_units || 0}
                    </p>
                  </div>
                </div>

                {/* Occupancy Rate */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Occupancy Rate</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getOccupancyColor(100 - (property.vacancy_rate || 0))}`}
                    >
                      {(100 - (property.vacancy_rate || 0)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${100 - (property.vacancy_rate || 0)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Monthly Income */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly Income</span>
                  <span className="text-lg font-semibold text-green-600">
                    KES {(property.monthly_income || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Property Actions */}
              <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewUnits(property)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View Units
                    </button>
                    <button
                      onClick={() => console.log('Rent Roll for', property.name)}
                      className="text-xs text-green-600 hover:text-green-800"
                    >
                      Rent Roll
                    </button>
                    <button
                      onClick={() => handleMaintenanceClick(property)}
                      className="inline-flex items-center text-xs text-orange-600 hover:text-orange-800"
                      title="Maintenance"
                    >
                      🔧 Maintenance
                    </button>
                    <button
                      onClick={() => handleInspectionClick(property)}
                      className="inline-flex items-center text-xs text-purple-600 hover:text-purple-800"
                      title="Inspections"
                    >
                      🔍 Inspections
                    </button>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditProperty(property)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Edit Property"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => console.log('Delete property', property.name)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete Property"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? 'No properties match your search criteria.'
              : 'Get started by adding your first rental property.'}
          </p>
          <Button onClick={handleAddProperty} variant="primary">
            Add Property
          </Button>
        </div>
      )}

      {/* Property Detail Modal */}
      <Modal
        isOpen={showPropertyModal}
        onClose={() => {
          setShowPropertyModal(false)
          setSelectedProperty(null)
        }}
        title={selectedProperty ? `${selectedProperty.name} Details` : 'Add New Property'}
      >
        <div className="p-6">
          {selectedProperty ? (
            <div className="space-y-6">
              {/* Property Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900">{selectedProperty.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <p className="text-sm text-gray-900">{selectedProperty.property_type}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <p className="text-sm text-gray-900">{selectedProperty.physical_address}</p>
                  </div>
                </div>
              </div>

              {/* Property Statistics */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Units</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedProperty.total_units || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Occupied Units</p>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedProperty.occupied_units || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Vacancy Rate</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(selectedProperty.vacancy_rate || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Monthly Income</p>
                    <p className="text-2xl font-bold text-blue-600">
                      KES {(selectedProperty.monthly_income || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleViewUnits(selectedProperty)}
                >
                  View Units ({selectedProperty.units?.length || 0})
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => handleGenerateRentRoll(selectedProperty)}
                  disabled={loadingRentRoll}
                >
                  {loadingRentRoll ? 'Generating...' : 'Generate Rent Roll'}
                </Button>
                <Button variant="secondary" onClick={() => handleEditProperty(selectedProperty)}>
                  Edit Property
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Property Form Modal */}
      <PropertyForm
        isOpen={showPropertyForm}
        onClose={() => {
          setShowPropertyForm(false)
          setEditingProperty(null)
        }}
        property={editingProperty}
        onSuccess={handlePropertyFormSuccess}
      />

      {/* Units Modal */}
      <Modal
        isOpen={showUnitsModal}
        onClose={() => {
          setShowUnitsModal(false)
          setUnitsProperty(null)
        }}
        title={unitsProperty ? `Units in ${unitsProperty.name}` : 'Property Units'}
      >
        <div className="p-6">
          {unitsProperty && (
            <div className="space-y-4">
              {/* Property Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Units</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {unitsProperty.units?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Occupied</p>
                    <p className="text-2xl font-bold text-green-600">
                      {unitsProperty.occupied_units || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vacant</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(unitsProperty.units?.length || 0) - (unitsProperty.occupied_units || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Units List */}
              {unitsProperty.units && unitsProperty.units.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">Units</h4>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement unit addition functionality
                        alert('Unit addition functionality will be implemented in the next phase')
                      }}
                    >
                      Add Unit
                    </Button>
                  </div>
                  {unitsProperty.units.map((unit) => (
                    <div key={unit.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900">{unit.unit_label}</h5>
                          <p className="text-sm text-gray-600">
                            Rent: KES {(unit.monthly_rent_kes || 0).toLocaleString()}/month
                          </p>
                          {unit.tenant && (
                            <p className="text-sm text-green-600">
                              Tenant: {unit.tenant.full_name}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            unit.tenant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {unit.tenant ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🏠</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Units Found</h4>
                  <p className="text-gray-500 mb-4">This property doesn't have any units yet.</p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      // TODO: Implement unit addition functionality
                      alert('Unit addition functionality will be implemented in the next phase')
                    }}
                  >
                    Add First Unit
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Rent Roll Modal */}
      <Modal
        isOpen={showRentRollModal}
        onClose={() => {
          setShowRentRollModal(false)
          setRentRollData(null)
        }}
        title={rentRollData ? `Rent Roll - ${rentRollData.property_name}` : 'Rent Roll'}
      >
        <div className="p-6">
          {rentRollData && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-600">Total Units</p>
                  <p className="text-2xl font-bold text-blue-800">{rentRollData.total_units}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600">Occupied</p>
                  <p className="text-2xl font-bold text-green-800">{rentRollData.occupied_units}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-yellow-600">Vacancy Rate</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {rentRollData.vacancy_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-purple-600">Collection Rate</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {rentRollData.collection_rate.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Financial Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Monthly Rent</p>
                    <p className="text-lg font-semibold text-gray-900">
                      KES {rentRollData.total_monthly_rent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collected Rent</p>
                    <p className="text-lg font-semibold text-green-600">
                      KES {rentRollData.collected_rent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Outstanding Rent</p>
                    <p className="text-lg font-semibold text-red-600">
                      KES {rentRollData.outstanding_rent.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Units Table */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Unit Details</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monthly Rent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rentRollData.units.map((unit: any) => (
                        <tr key={unit.unit_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {unit.unit_label}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {unit.tenant_name || 'Vacant'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            KES {unit.monthly_rent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                unit.rent_status === 'CURRENT'
                                  ? 'bg-green-100 text-green-800'
                                  : unit.rent_status === 'OVERDUE'
                                    ? 'bg-red-100 text-red-800'
                                    : unit.rent_status === 'PARTIAL'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {unit.rent_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            KES {unit.balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Maintenance Modal */}
      <Modal
        isOpen={showMaintenanceModal}
        onClose={handleMaintenanceClose}
        title={
          maintenanceProperty
            ? `Maintenance - ${maintenanceProperty.name}`
            : 'Maintenance Management'
        }
      >
        <div className="p-6">
          {maintenanceProperty && (
            <MaintenanceManagement
              propertyId={maintenanceProperty.id}
              onDataChange={handleMaintenanceClose}
            />
          )}
        </div>
      </Modal>

      {/* Inspection Modal */}
      <Modal
        isOpen={showInspectionModal}
        onClose={handleInspectionClose}
        title={
          inspectionProperty ? `Inspections - ${inspectionProperty.name}` : 'Property Inspections'
        }
      >
        <div className="p-6">
          {inspectionProperty && (
            <PropertyInspections
              propertyId={inspectionProperty.id}
              onDataChange={handleInspectionClose}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
