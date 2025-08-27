/**
 * Tenant Repository Interface
 * Defines the contract for tenant data access
 */

import { Tenant, TenantStatus } from '../entities/Tenant'

export interface TenantSearchCriteria {
  fullName?: string
  nationalId?: string
  phone?: string
  email?: string
  status?: TenantStatus
  unitId?: string
  propertyId?: string
}

export interface TenantRepository {
  // Basic CRUD operations
  findById(id: string): Promise<Tenant | null>
  findByIds(ids: string[]): Promise<Tenant[]>
  save(tenant: Tenant): Promise<void>
  delete(id: string): Promise<void>

  // Query operations
  findAll(): Promise<Tenant[]>
  findByStatus(status: TenantStatus): Promise<Tenant[]>
  findByUnitId(unitId: string): Promise<Tenant[]>
  findByPropertyId(propertyId: string): Promise<Tenant[]>
  search(criteria: TenantSearchCriteria): Promise<Tenant[]>

  // Unique identifier queries
  findByNationalId(nationalId: string): Promise<Tenant | null>
  findByPhone(phone: string): Promise<Tenant | null>
  findByEmail(email: string): Promise<Tenant | null>

  // Business-specific queries
  findActiveTenantsWithExpiredLeases(): Promise<Tenant[]>
  findTenantsWithExpiringSoonLeases(daysThreshold: number): Promise<Tenant[]>
  findTenantsWithoutActiveLeases(): Promise<Tenant[]>
  findTenantsByRentRange(minRent: number, maxRent: number): Promise<Tenant[]>

  // Aggregation queries
  countByStatus(): Promise<Record<TenantStatus, number>>
  countByProperty(propertyId: string): Promise<number>
  getTotalMonthlyRentByProperty(propertyId: string): Promise<number>

  // Existence checks
  existsByNationalId(nationalId: string): Promise<boolean>
  existsByPhone(phone: string): Promise<boolean>
  existsByEmail(email: string): Promise<boolean>
}
