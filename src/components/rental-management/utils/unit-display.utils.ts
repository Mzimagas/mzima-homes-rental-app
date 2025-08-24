/**
 * Utility functions for displaying unit allocation information
 * Provides consistent formatting across the rental management system
 */

export interface UnitDisplayData {
  id: string
  unit_label: string
  property_id: string
  monthly_rent_kes?: number | null
}

export interface PropertyDisplayData {
  id: string
  name: string
}

export interface TenantDisplayData {
  id: string
  full_name: string
  phone?: string
  email?: string
}

/**
 * Formats unit allocation display following the pattern: "Unit Label - Property Name"
 * This matches the format used in the main tenant dashboard
 */
export function formatUnitAllocation(
  unit: UnitDisplayData | null | undefined,
  property: PropertyDisplayData | null | undefined,
  options: {
    includeRent?: boolean
    fallbackText?: string
    showNotFound?: boolean
  } = {}
): string {
  const {
    includeRent = false,
    fallbackText = '-',
    showNotFound = true
  } = options

  if (!unit) {
    return fallbackText
  }

  // Unit part
  const unitPart = unit.unit_label || (showNotFound ? `${unit.id} (not found)` : fallbackText)
  
  // Property part
  const propPart = property?.name ? ` - ${property.name}` : ''
  
  // Rent part (optional)
  const rentPart = includeRent && unit.monthly_rent_kes 
    ? ` (KES ${unit.monthly_rent_kes.toLocaleString()}/month)`
    : ''

  return `${unitPart}${propPart}${rentPart}`
}

/**
 * Formats unit allocation for dropdown/select options
 * Includes rent information for better context
 */
export function formatUnitOption(
  unit: UnitDisplayData,
  property: PropertyDisplayData,
  options: {
    showAvailability?: boolean
    isCurrentUnit?: boolean
    isAvailable?: boolean
  } = {}
): string {
  const {
    showAvailability = false,
    isCurrentUnit = false,
    isAvailable = true
  } = options

  const baseFormat = formatUnitAllocation(unit, property, { includeRent: true })
  
  let suffix = ''
  if (isCurrentUnit) {
    suffix = ' (Current Unit)'
  } else if (showAvailability && !isAvailable) {
    suffix = ' - ⚠️ Not Available'
  }

  return `${baseFormat}${suffix}`
}

/**
 * Formats tenant allocation display for showing current assignments
 */
export function formatTenantAllocation(
  tenant: TenantDisplayData,
  unit: UnitDisplayData | null | undefined,
  property: PropertyDisplayData | null | undefined
): {
  tenantInfo: string
  unitInfo: string
  hasAllocation: boolean
} {
  const tenantInfo = `${tenant.full_name}${tenant.phone ? ` (${tenant.phone})` : ''}`
  const unitInfo = formatUnitAllocation(unit, property, { fallbackText: 'No unit assigned' })
  const hasAllocation = !!(unit && property)

  return {
    tenantInfo,
    unitInfo,
    hasAllocation
  }
}

/**
 * Creates a comprehensive unit allocation summary
 * Useful for detailed views and reports
 */
export function createUnitAllocationSummary(
  unit: UnitDisplayData,
  property: PropertyDisplayData,
  tenant?: TenantDisplayData | null,
  options: {
    includeFinancials?: boolean
    includeStatus?: boolean
  } = {}
): {
  title: string
  details: Array<{ label: string; value: string }>
  hasOccupant: boolean
} {
  const { includeFinancials = true, includeStatus = false } = options

  const title = formatUnitAllocation(unit, property)
  const details: Array<{ label: string; value: string }> = []

  // Basic unit information
  details.push(
    { label: 'Unit', value: unit.unit_label },
    { label: 'Property', value: property.name }
  )

  // Financial information
  if (includeFinancials && unit.monthly_rent_kes) {
    details.push({
      label: 'Monthly Rent',
      value: `KES ${unit.monthly_rent_kes.toLocaleString()}`
    })
  }

  // Tenant information
  if (tenant) {
    details.push(
      { label: 'Current Tenant', value: tenant.full_name },
      { label: 'Contact', value: tenant.phone || tenant.email || 'No contact info' }
    )
  }

  return {
    title,
    details,
    hasOccupant: !!tenant
  }
}

/**
 * Utility to extract unit and property data from various data structures
 * Handles different API response formats consistently
 */
export function extractUnitPropertyData(
  data: any,
  unitsById?: Record<string, any>,
  propertiesById?: Record<string, any>
): {
  unit: UnitDisplayData | null
  property: PropertyDisplayData | null
} {
  let unit: UnitDisplayData | null = null
  let property: PropertyDisplayData | null = null

  // Handle direct unit/property objects
  if (data.unit_id && unitsById && propertiesById) {
    const unitData = unitsById[data.unit_id]
    if (unitData) {
      unit = {
        id: unitData.id,
        unit_label: unitData.unit_label,
        property_id: unitData.property_id,
        monthly_rent_kes: unitData.monthly_rent_kes
      }
      
      const propertyData = propertiesById[unitData.property_id]
      if (propertyData) {
        property = {
          id: propertyData.id,
          name: propertyData.name
        }
      }
    }
  }

  // Handle nested structures (e.g., current_unit with properties)
  if (data.current_unit || data.unit) {
    const unitData = data.current_unit || data.unit
    if (unitData) {
      unit = {
        id: unitData.id,
        unit_label: unitData.unit_label,
        property_id: unitData.property_id,
        monthly_rent_kes: unitData.monthly_rent_kes
      }

      if (unitData.properties || unitData.property) {
        const propertyData = unitData.properties || unitData.property
        property = {
          id: propertyData.id,
          name: propertyData.name
        }
      }
    }
  }

  // Handle direct unit/property data
  if (data.unit_label && data.property_name) {
    unit = {
      id: data.unit_id || data.id,
      unit_label: data.unit_label,
      property_id: data.property_id,
      monthly_rent_kes: data.monthly_rent_kes
    }
    property = {
      id: data.property_id,
      name: data.property_name
    }
  }

  return { unit, property }
}
