/**
 * Tenant Domain Entity
 * Core business entity representing a tenant
 */

import { Money } from '../value-objects/Money'
import { DateRange } from '../value-objects/DateRange'
import { DomainEvent } from '../events/DomainEvent'
import { TenantCreatedEvent } from '../events/TenantCreatedEvent'
import { TenantMovedEvent } from '../events/TenantMovedEvent'

export type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EVICTED'

export interface ContactInfo {
  phone: string
  email?: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
}

export interface TenantProps {
  id: string
  fullName: string
  nationalId: string
  contactInfo: ContactInfo
  status: TenantStatus
  currentUnitId?: string
  leaseStartDate?: Date
  leaseEndDate?: Date
  monthlyRent?: Money
  securityDeposit?: Money
  createdAt: Date
  updatedAt: Date
}

export class Tenant {
  private _id: string
  private _fullName: string
  private _nationalId: string
  private _contactInfo: ContactInfo
  private _status: TenantStatus
  private _currentUnitId?: string
  private _leaseStartDate?: Date
  private _leaseEndDate?: Date
  private _monthlyRent?: Money
  private _securityDeposit?: Money
  private _createdAt: Date
  private _updatedAt: Date
  private _domainEvents: DomainEvent[] = []

  constructor(props: TenantProps) {
    this.validateProps(props)
    
    this._id = props.id
    this._fullName = props.fullName
    this._nationalId = props.nationalId
    this._contactInfo = props.contactInfo
    this._status = props.status
    this._currentUnitId = props.currentUnitId
    this._leaseStartDate = props.leaseStartDate
    this._leaseEndDate = props.leaseEndDate
    this._monthlyRent = props.monthlyRent
    this._securityDeposit = props.securityDeposit
    this._createdAt = props.createdAt
    this._updatedAt = props.updatedAt

    // Raise domain event for new tenants
    if (this.isNewTenant()) {
      this.addDomainEvent(new TenantCreatedEvent(this._id, this._fullName, this._nationalId))
    }
  }

  // Getters
  get id(): string { return this._id }
  get fullName(): string { return this._fullName }
  get nationalId(): string { return this._nationalId }
  get contactInfo(): ContactInfo { return { ...this._contactInfo } }
  get status(): TenantStatus { return this._status }
  get currentUnitId(): string | undefined { return this._currentUnitId }
  get leaseStartDate(): Date | undefined { 
    return this._leaseStartDate ? new Date(this._leaseStartDate) : undefined 
  }
  get leaseEndDate(): Date | undefined { 
    return this._leaseEndDate ? new Date(this._leaseEndDate) : undefined 
  }
  get monthlyRent(): Money | undefined { return this._monthlyRent }
  get securityDeposit(): Money | undefined { return this._securityDeposit }
  get createdAt(): Date { return new Date(this._createdAt) }
  get updatedAt(): Date { return new Date(this._updatedAt) }

  // Business methods
  updateContactInfo(contactInfo: ContactInfo): void {
    this.validateContactInfo(contactInfo)
    this._contactInfo = { ...contactInfo }
    this.touch()
  }

  updateStatus(newStatus: TenantStatus, reason?: string): void {
    if (this._status === newStatus) {
      return
    }

    this.validateStatusTransition(this._status, newStatus)
    this._status = newStatus
    this.touch()
  }

  moveToUnit(unitId: string, leaseStartDate: Date, leaseEndDate: Date, monthlyRent: Money, securityDeposit?: Money): void {
    if (leaseStartDate >= leaseEndDate) {
      throw new Error('Lease start date must be before end date')
    }

    const oldUnitId = this._currentUnitId
    
    this._currentUnitId = unitId
    this._leaseStartDate = leaseStartDate
    this._leaseEndDate = leaseEndDate
    this._monthlyRent = monthlyRent
    this._securityDeposit = securityDeposit
    this._status = 'ACTIVE'
    this.touch()

    this.addDomainEvent(new TenantMovedEvent(
      this._id,
      oldUnitId,
      unitId,
      leaseStartDate,
      leaseEndDate
    ))
  }

  vacateUnit(): void {
    if (!this._currentUnitId) {
      throw new Error('Tenant is not currently assigned to any unit')
    }

    const oldUnitId = this._currentUnitId
    
    this._currentUnitId = undefined
    this._leaseStartDate = undefined
    this._leaseEndDate = undefined
    this._monthlyRent = undefined
    this._securityDeposit = undefined
    this._status = 'INACTIVE'
    this.touch()

    this.addDomainEvent(new TenantMovedEvent(
      this._id,
      oldUnitId,
      undefined,
      undefined,
      undefined
    ))
  }

  extendLease(newEndDate: Date): void {
    if (!this._leaseEndDate) {
      throw new Error('Cannot extend lease: no active lease found')
    }

    if (newEndDate <= this._leaseEndDate) {
      throw new Error('New lease end date must be after current end date')
    }

    this._leaseEndDate = newEndDate
    this.touch()
  }

  updateRent(newRent: Money): void {
    if (!this._currentUnitId) {
      throw new Error('Cannot update rent: tenant not assigned to any unit')
    }

    this._monthlyRent = newRent
    this.touch()
  }

  // Business rules
  hasActiveLease(): boolean {
    return this._currentUnitId !== undefined && 
           this._leaseStartDate !== undefined && 
           this._leaseEndDate !== undefined &&
           this._status === 'ACTIVE'
  }

  isLeaseExpired(): boolean {
    if (!this._leaseEndDate) return false
    return new Date() > this._leaseEndDate
  }

  isLeaseExpiringSoon(daysThreshold: number = 30): boolean {
    if (!this._leaseEndDate) return false
    
    const now = new Date()
    const thresholdDate = new Date(now.getTime() + (daysThreshold * 24 * 60 * 60 * 1000))
    
    return this._leaseEndDate <= thresholdDate && this._leaseEndDate > now
  }

  canMoveToNewUnit(): boolean {
    return this._status === 'ACTIVE' || this._status === 'INACTIVE'
  }

  getCurrentLeaseRange(): DateRange | null {
    if (!this._leaseStartDate || !this._leaseEndDate) {
      return null
    }
    return new DateRange(this._leaseStartDate, this._leaseEndDate)
  }

  // Domain events
  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents]
  }

  clearDomainEvents(): void {
    this._domainEvents = []
  }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  private validateProps(props: TenantProps): void {
    if (!props.id) throw new Error('Tenant ID is required')
    if (!props.fullName.trim()) throw new Error('Full name is required')
    if (!props.nationalId.trim()) throw new Error('National ID is required')
    this.validateContactInfo(props.contactInfo)
  }

  private validateContactInfo(contactInfo: ContactInfo): void {
    if (!contactInfo.phone.trim()) {
      throw new Error('Phone number is required')
    }

    // Basic phone validation (Kenya format)
    const phoneRegex = /^(\+254|0)[17]\d{8}$/
    if (!phoneRegex.test(contactInfo.phone.replace(/\s/g, ''))) {
      throw new Error('Invalid phone number format')
    }

    if (contactInfo.email && !this.isValidEmail(contactInfo.email)) {
      throw new Error('Invalid email format')
    }
  }

  private validateStatusTransition(from: TenantStatus, to: TenantStatus): void {
    const validTransitions: Record<TenantStatus, TenantStatus[]> = {
      'ACTIVE': ['INACTIVE', 'SUSPENDED', 'EVICTED'],
      'INACTIVE': ['ACTIVE'],
      'SUSPENDED': ['ACTIVE', 'EVICTED'],
      'EVICTED': []
    }

    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid status transition from ${from} to ${to}`)
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isNewTenant(): boolean {
    const now = new Date()
    const timeDiff = now.getTime() - this._createdAt.getTime()
    return timeDiff < 1000 // Created within the last second
  }

  private touch(): void {
    this._updatedAt = new Date()
  }
}
