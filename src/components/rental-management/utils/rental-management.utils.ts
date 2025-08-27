import {
  RentalProperty,
  RentalTenant,
  LeaseAgreement,
  MaintenanceRequest,
} from '../types/rental-management.types'

// Utility functions for rental management

export const formatCurrency = (amount: number, currency: string = 'KES'): string => {
  return `${currency} ${amount.toLocaleString()}`
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString()
}

export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export const getOccupancyRate = (totalUnits: number, occupiedUnits: number): number => {
  if (totalUnits === 0) return 0
  return (occupiedUnits / totalUnits) * 100
}

export const getVacancyRate = (totalUnits: number, occupiedUnits: number): number => {
  if (totalUnits === 0) return 0
  return ((totalUnits - occupiedUnits) / totalUnits) * 100
}

export const getCollectionRate = (totalRent: number, collectedRent: number): number => {
  if (totalRent === 0) return 0
  return (collectedRent / totalRent) * 100
}

// Status and priority utilities
export const getLeaseStatus = (
  lease: LeaseAgreement
): {
  label: string
  color: string
  status: 'active' | 'expired' | 'future' | 'terminated'
} => {
  const now = new Date()
  const startDate = new Date(lease.start_date)
  const endDate = lease.end_date ? new Date(lease.end_date) : null

  if (lease.status === 'TERMINATED') {
    return { label: 'Terminated', color: 'bg-red-100 text-red-800', status: 'terminated' }
  }

  if (endDate && now > endDate) {
    return { label: 'Expired', color: 'bg-gray-100 text-gray-800', status: 'expired' }
  }

  if (now >= startDate) {
    return { label: 'Active', color: 'bg-green-100 text-green-800', status: 'active' }
  }

  return { label: 'Future', color: 'bg-blue-100 text-blue-800', status: 'future' }
}

export const getTenantStatus = (
  tenant: RentalTenant
): {
  label: string
  color: string
  status: 'active' | 'inactive'
} => {
  if (tenant.current_unit) {
    return { label: 'Active', color: 'bg-green-100 text-green-800', status: 'active' }
  }
  return { label: 'Inactive', color: 'bg-gray-100 text-gray-800', status: 'inactive' }
}

export const getMaintenancePriorityColor = (priority: string): string => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800'
    case 'LOW':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getMaintenanceStatusColor = (status: string): string => {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-blue-100 text-blue-800'
    case 'ACKNOWLEDGED':
      return 'bg-yellow-100 text-yellow-800'
    case 'IN_PROGRESS':
      return 'bg-orange-100 text-orange-800'
    case 'COMPLETED':
      return 'bg-green-100 text-green-800'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getPropertyOccupancyColor = (occupancyRate: number): string => {
  if (occupancyRate >= 90) return 'text-green-600 bg-green-100'
  if (occupancyRate >= 70) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  // Basic phone validation - adjust based on your requirements
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export const validateKenyanID = (id: string): boolean => {
  // Basic Kenyan ID validation - 8 digits
  const idRegex = /^\d{8}$/
  return idRegex.test(id)
}

// Data transformation utilities
export const transformPropertyForRental = (property: any): RentalProperty => {
  const units = property.units || []
  const totalUnits = units.length
  const occupiedUnits = units.filter((unit: any) =>
    unit.tenancy_agreements?.some((agreement: any) => agreement.status === 'ACTIVE')
  ).length

  return {
    ...property,
    total_units: totalUnits,
    occupied_units: occupiedUnits,
    vacancy_rate: getVacancyRate(totalUnits, occupiedUnits),
    monthly_income: units.reduce((total: number, unit: any) => {
      const hasActiveTenant = unit.tenancy_agreements?.some(
        (agreement: any) => agreement.status === 'ACTIVE'
      )
      return total + (hasActiveTenant ? unit.monthly_rent_kes || 0 : 0)
    }, 0),
  }
}

export const transformTenantForRental = (tenant: any): RentalTenant => {
  return {
    ...tenant,
    current_unit:
      tenant.tenancy_agreements?.find((agreement: any) => agreement.status === 'ACTIVE')?.units ||
      null,
    rent_balance: 0, // TODO: Calculate from payments
    last_payment_date: null, // TODO: Get from payments
  }
}

// Sorting utilities
export const sortPropertiesByOccupancy = (
  properties: RentalProperty[],
  ascending: boolean = false
): RentalProperty[] => {
  return [...properties].sort((a, b) => {
    const aRate = getOccupancyRate(a.total_units || 0, a.occupied_units || 0)
    const bRate = getOccupancyRate(b.total_units || 0, b.occupied_units || 0)
    return ascending ? aRate - bRate : bRate - aRate
  })
}

export const sortTenantsByName = (
  tenants: RentalTenant[],
  ascending: boolean = true
): RentalTenant[] => {
  return [...tenants].sort((a, b) => {
    const comparison = a.full_name.localeCompare(b.full_name)
    return ascending ? comparison : -comparison
  })
}

export const sortMaintenanceByPriority = (
  requests: MaintenanceRequest[],
  ascending: boolean = false
): MaintenanceRequest[] => {
  const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
  return [...requests].sort((a, b) => {
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
    return ascending ? aPriority - bPriority : bPriority - aPriority
  })
}

// Filter utilities
export const filterPropertiesByType = (
  properties: RentalProperty[],
  type: string
): RentalProperty[] => {
  if (type === 'all') return properties
  return properties.filter((property) => property.property_type === type)
}

export const filterTenantsByStatus = (tenants: RentalTenant[], status: string): RentalTenant[] => {
  if (status === 'all') return tenants
  return tenants.filter((tenant) => {
    const tenantStatus = getTenantStatus(tenant).status
    return tenantStatus === status
  })
}

export const filterMaintenanceByStatus = (
  requests: MaintenanceRequest[],
  status: string
): MaintenanceRequest[] => {
  if (status === 'all') return requests
  return requests.filter((request) => request.status === status)
}

// Search utilities
export const searchProperties = (
  properties: RentalProperty[],
  searchTerm: string
): RentalProperty[] => {
  if (!searchTerm.trim()) return properties

  const term = searchTerm.toLowerCase()
  return properties.filter(
    (property) =>
      property.name.toLowerCase().includes(term) ||
      property.physical_address?.toLowerCase().includes(term) ||
      property.property_type?.toLowerCase().includes(term)
  )
}

export const searchTenants = (tenants: RentalTenant[], searchTerm: string): RentalTenant[] => {
  if (!searchTerm.trim()) return tenants

  const term = searchTerm.toLowerCase()
  return tenants.filter(
    (tenant) =>
      tenant.full_name.toLowerCase().includes(term) ||
      tenant.phone.includes(term) ||
      tenant.email?.toLowerCase().includes(term) ||
      tenant.national_id.includes(term)
  )
}

export const searchMaintenanceRequests = (
  requests: MaintenanceRequest[],
  searchTerm: string
): MaintenanceRequest[] => {
  if (!searchTerm.trim()) return requests

  const term = searchTerm.toLowerCase()
  return requests.filter(
    (request) =>
      request.title.toLowerCase().includes(term) ||
      request.description.toLowerCase().includes(term) ||
      request.category.toLowerCase().includes(term)
  )
}

// Export utilities
export const exportToCSV = (data: any[], filename: string): void => {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  window.URL.revokeObjectURL(url)
}

// Date utilities
export const getDateRange = (range: string): { start: Date; end: Date } => {
  const now = new Date()
  const start = new Date()
  const end = new Date()

  switch (range) {
    case 'current_month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'last_month':
      start.setMonth(start.getMonth() - 1, 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
      break
    case 'current_quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3)
      start.setMonth(currentQuarter * 3, 1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(currentQuarter * 3 + 3, 0)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'current_year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(11, 31)
      end.setHours(23, 59, 59, 999)
      break
    default:
      // Default to current month
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
  }

  return { start, end }
}
