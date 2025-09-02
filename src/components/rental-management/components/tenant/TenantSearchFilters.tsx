/**
 * Tenant Search and Filters Component
 * 
 * Extracted from TenantManagement.tsx to improve maintainability.
 * Handles search functionality and filtering options for tenants.
 */

'use client'

import { Button } from '../../../ui'

interface TenantSearchFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedProperty: string
  onPropertyChange: (propertyId: string) => void
  selectedUnit: string
  onUnitChange: (unitId: string) => void
  properties: Array<{ id: string; name: string }>
  units: Array<{ id: string; unit_label: string; property_name?: string }>
  onAddTenant: () => void
  tenantCount: number
  filteredCount: number
}

export default function TenantSearchFilters({
  searchQuery,
  onSearchChange,
  selectedProperty,
  onPropertyChange,
  selectedUnit,
  onUnitChange,
  properties,
  units,
  onAddTenant,
  tenantCount,
  filteredCount,
}: TenantSearchFiltersProps) {
  const hasFilters = searchQuery || selectedProperty || selectedUnit
  const isFiltered = filteredCount !== tenantCount

  const clearFilters = () => {
    onSearchChange('')
    onPropertyChange('')
    onUnitChange('')
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tenant Management</h2>
          <p className="text-gray-600 mt-1">
            Manage tenants, leases, and unit allocations
          </p>
        </div>
        <Button onClick={onAddTenant}>
          Add New Tenant
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search tenants by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Property Filter */}
          <div className="min-w-48">
            <select
              value={selectedProperty}
              onChange={(e) => onPropertyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div className="min-w-48">
            <select
              value={selectedUnit}
              onChange={(e) => onUnitChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={!selectedProperty}
            >
              <option value="">All Units</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_label}
                  {unit.property_name && ` - ${unit.property_name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results Summary */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <div>
            {isFiltered ? (
              <span>
                Showing {filteredCount} of {tenantCount} tenants
              </span>
            ) : (
              <span>
                {tenantCount} tenant{tenantCount !== 1 ? 's' : ''} total
              </span>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasFilters && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchQuery}"
                </span>
              )}
              {selectedProperty && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Property: {properties.find(p => p.id === selectedProperty)?.name}
                </span>
              )}
              {selectedUnit && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Unit: {units.find(u => u.id === selectedUnit)?.unit_label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
