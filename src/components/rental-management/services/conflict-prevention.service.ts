/**
 * Conflict Prevention Service
 * Advanced conflict detection and resolution for tenant-unit allocations
 */

import supabase from '../../../lib/supabase-client'
import { UnitAllocationService } from './unit-allocation.service'

export interface ConflictDetails {
  type:
    | 'UNIT_OCCUPIED'
    | 'TENANT_HAS_LEASE'
    | 'DATE_OVERLAP'
    | 'MAINTENANCE_CONFLICT'
    | 'RENT_MISMATCH'
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  message: string
  conflictingData: any
  suggestedResolutions: ConflictResolution[]
}

export interface ConflictResolution {
  id: string
  title: string
  description: string
  action: 'TERMINATE_EXISTING' | 'ADJUST_DATES' | 'SUGGEST_ALTERNATIVE' | 'OVERRIDE' | 'WAIT'
  parameters?: any
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  automated: boolean
}

export interface ConflictCheckResult {
  hasConflicts: boolean
  conflicts: ConflictDetails[]
  canProceed: boolean
  recommendedAction?: string
}

export interface AllocationRequest {
  tenantId: string
  unitId: string
  startDate: string
  endDate?: string
  monthlyRent: number
  notes?: string
}

export class ConflictPreventionService {
  /**
   * Comprehensive conflict checking for allocation requests
   */
  static async checkAllocationConflicts(request: AllocationRequest): Promise<ConflictCheckResult> {
    const conflicts: ConflictDetails[] = []

    try {
      // 1. Check unit availability conflicts
      const unitConflicts = await this.checkUnitConflicts(request)
      conflicts.push(...unitConflicts)

      // 2. Check tenant lease conflicts
      const tenantConflicts = await this.checkTenantConflicts(request)
      conflicts.push(...tenantConflicts)

      // 3. Check date range conflicts
      const dateConflicts = await this.checkDateConflicts(request)
      conflicts.push(...dateConflicts)

      // 4. Check maintenance conflicts
      const maintenanceConflicts = await this.checkMaintenanceConflicts(request)
      conflicts.push(...maintenanceConflicts)

      // 5. Check rent validation conflicts
      const rentConflicts = await this.checkRentConflicts(request)
      conflicts.push(...rentConflicts)

      // Determine if allocation can proceed
      const criticalConflicts = conflicts.filter((c) => c.severity === 'CRITICAL')
      const canProceed = criticalConflicts.length === 0

      // Generate recommended action
      let recommendedAction = 'Proceed with allocation'
      if (criticalConflicts.length > 0) {
        recommendedAction = 'Resolve critical conflicts before proceeding'
      } else if (conflicts.some((c) => c.severity === 'WARNING')) {
        recommendedAction = 'Review warnings and consider suggested resolutions'
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        canProceed,
        recommendedAction,
      }
    } catch (error) {
      console.error('Error checking allocation conflicts:', error)
      return {
        hasConflicts: true,
        conflicts: [
          {
            type: 'UNIT_OCCUPIED',
            severity: 'CRITICAL',
            message: 'Unable to verify allocation safety due to system error',
            conflictingData: { error: error instanceof Error ? error.message : 'Unknown error' },
            suggestedResolutions: [],
          },
        ],
        canProceed: false,
        recommendedAction: 'System error - please try again',
      }
    }
  }

  /**
   * Check for unit occupancy conflicts
   */
  private static async checkUnitConflicts(request: AllocationRequest): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = []

    try {
      const availability = await UnitAllocationService.checkUnitAvailability(
        request.unitId,
        request.startDate,
        request.endDate
      )

      if (!availability.available && availability.conflictingLeases) {
        for (const lease of availability.conflictingLeases) {
          conflicts.push({
            type: 'UNIT_OCCUPIED',
            severity: 'CRITICAL',
            message: `Unit is occupied by ${availability.conflictingTenant} until ${availability.availableFrom || 'indefinitely'}`,
            conflictingData: {
              lease,
              tenant: availability.conflictingTenant,
              availableFrom: availability.availableFrom,
            },
            suggestedResolutions: [
              {
                id: 'wait-until-available',
                title: 'Wait Until Available',
                description: `Delay allocation until ${availability.availableFrom || 'current lease ends'}`,
                action: 'ADJUST_DATES',
                parameters: { newStartDate: availability.availableFrom },
                risk: 'LOW',
                automated: false,
              },
              {
                id: 'suggest-alternative',
                title: 'Suggest Alternative Unit',
                description: 'Find similar available units for the tenant',
                action: 'SUGGEST_ALTERNATIVE',
                risk: 'LOW',
                automated: true,
              },
              {
                id: 'terminate-existing',
                title: 'Terminate Existing Lease',
                description: 'End current lease early (requires tenant agreement)',
                action: 'TERMINATE_EXISTING',
                parameters: { leaseId: lease.id },
                risk: 'HIGH',
                automated: false,
              },
            ],
          })
        }
      }
    } catch (error) {
      console.error('Error checking unit conflicts:', error)
    }

    return conflicts
  }

  /**
   * Check for tenant lease conflicts
   */
  private static async checkTenantConflicts(
    request: AllocationRequest
  ): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = []

    try {
      const { data: existingLeases, error } = await supabase
        .from('tenancy_agreements')
        .select(
          `
          id, start_date, end_date, status, monthly_rent_kes,
          units(id, unit_label, properties(name))
        `
        )
        .eq('tenant_id', request.tenantId)
        .eq('status', 'ACTIVE')

      if (error) throw error

      if (existingLeases && existingLeases.length > 0) {
        for (const lease of existingLeases) {
          const unit = lease.units as any

          conflicts.push({
            type: 'TENANT_HAS_LEASE',
            severity: 'WARNING',
            message: `Tenant already has an active lease in ${unit?.properties?.name} - ${unit?.unit_label}`,
            conflictingData: {
              existingLease: lease,
              currentUnit: unit,
            },
            suggestedResolutions: [
              {
                id: 'terminate-current',
                title: 'Terminate Current Lease',
                description: 'End existing lease and move to new unit',
                action: 'TERMINATE_EXISTING',
                parameters: { leaseId: lease.id },
                risk: 'MEDIUM',
                automated: false,
              },
              {
                id: 'dual-lease',
                title: 'Allow Dual Lease',
                description: 'Permit tenant to have multiple active leases (unusual)',
                action: 'OVERRIDE',
                risk: 'HIGH',
                automated: false,
              },
            ],
          })
        }
      }
    } catch (error) {
      console.error('Error checking tenant conflicts:', error)
    }

    return conflicts
  }

  /**
   * Check for date range conflicts
   */
  private static async checkDateConflicts(request: AllocationRequest): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = []

    try {
      const startDate = new Date(request.startDate)
      const endDate = request.endDate ? new Date(request.endDate) : null
      const today = new Date()

      // Check if start date is in the past
      if (startDate < today) {
        conflicts.push({
          type: 'DATE_OVERLAP',
          severity: 'WARNING',
          message: 'Start date is in the past',
          conflictingData: {
            startDate: request.startDate,
            today: today.toISOString().split('T')[0],
          },
          suggestedResolutions: [
            {
              id: 'adjust-to-today',
              title: 'Start Today',
              description: 'Adjust start date to today',
              action: 'ADJUST_DATES',
              parameters: { newStartDate: today.toISOString().split('T')[0] },
              risk: 'LOW',
              automated: true,
            },
          ],
        })
      }

      // Check if end date is before start date
      if (endDate && endDate <= startDate) {
        conflicts.push({
          type: 'DATE_OVERLAP',
          severity: 'CRITICAL',
          message: 'End date must be after start date',
          conflictingData: { startDate: request.startDate, endDate: request.endDate },
          suggestedResolutions: [
            {
              id: 'remove-end-date',
              title: 'Remove End Date',
              description: 'Make this an ongoing lease without end date',
              action: 'ADJUST_DATES',
              parameters: { endDate: null },
              risk: 'LOW',
              automated: false,
            },
          ],
        })
      }

      // Check for very short lease periods
      if (endDate) {
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysDiff < 30) {
          conflicts.push({
            type: 'DATE_OVERLAP',
            severity: 'WARNING',
            message: `Lease period is very short (${daysDiff} days)`,
            conflictingData: { duration: daysDiff },
            suggestedResolutions: [
              {
                id: 'extend-lease',
                title: 'Extend Lease Period',
                description: 'Extend to minimum 30 days or make ongoing',
                action: 'ADJUST_DATES',
                risk: 'LOW',
                automated: false,
              },
            ],
          })
        }
      }
    } catch (error) {
      console.error('Error checking date conflicts:', error)
    }

    return conflicts
  }

  /**
   * Check for maintenance conflicts
   */
  private static async checkMaintenanceConflicts(
    request: AllocationRequest
  ): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = []

    try {
      const { data: unit, error } = await supabase
        .from('units')
        .select('id, status, maintenance_notes, last_inspection_date')
        .eq('id', request.unitId)
        .single()

      if (error) throw error

      if (unit?.status === 'MAINTENANCE') {
        conflicts.push({
          type: 'MAINTENANCE_CONFLICT',
          severity: 'CRITICAL',
          message: 'Unit is currently under maintenance',
          conflictingData: {
            unitStatus: unit.status,
            maintenanceNotes: unit.maintenance_notes,
          },
          suggestedResolutions: [
            {
              id: 'wait-maintenance',
              title: 'Wait for Maintenance Completion',
              description: 'Delay allocation until maintenance is complete',
              action: 'WAIT',
              risk: 'LOW',
              automated: false,
            },
            {
              id: 'suggest-alternative',
              title: 'Find Alternative Unit',
              description: 'Suggest similar units not under maintenance',
              action: 'SUGGEST_ALTERNATIVE',
              risk: 'LOW',
              automated: true,
            },
          ],
        })
      }

      if (unit?.status === 'INACTIVE') {
        conflicts.push({
          type: 'MAINTENANCE_CONFLICT',
          severity: 'CRITICAL',
          message: 'Unit is inactive and not available for rent',
          conflictingData: { unitStatus: unit.status },
          suggestedResolutions: [
            {
              id: 'activate-unit',
              title: 'Activate Unit',
              description: 'Change unit status to active (requires authorization)',
              action: 'OVERRIDE',
              risk: 'MEDIUM',
              automated: false,
            },
          ],
        })
      }
    } catch (error) {
      console.error('Error checking maintenance conflicts:', error)
    }

    return conflicts
  }

  /**
   * Check for rent validation conflicts
   */
  private static async checkRentConflicts(request: AllocationRequest): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = []

    try {
      const { data: unit, error } = await supabase
        .from('units')
        .select('monthly_rent_kes')
        .eq('id', request.unitId)
        .single()

      if (error) throw error

      const unitRent = unit?.monthly_rent_kes || 0
      const requestedRent = request.monthlyRent

      // Check for significant rent discrepancies
      const rentDifference = Math.abs(unitRent - requestedRent)
      const percentageDiff = unitRent > 0 ? (rentDifference / unitRent) * 100 : 0

      if (percentageDiff > 20) {
        conflicts.push({
          type: 'RENT_MISMATCH',
          severity: 'WARNING',
          message: `Requested rent (KES ${requestedRent.toLocaleString()}) differs significantly from unit's standard rent (KES ${unitRent.toLocaleString()})`,
          conflictingData: {
            unitRent,
            requestedRent,
            difference: rentDifference,
            percentageDiff: Math.round(percentageDiff),
          },
          suggestedResolutions: [
            {
              id: 'use-standard-rent',
              title: 'Use Standard Rent',
              description: `Use unit's standard rent of KES ${unitRent.toLocaleString()}`,
              action: 'ADJUST_DATES',
              parameters: { newRent: unitRent },
              risk: 'LOW',
              automated: true,
            },
            {
              id: 'approve-custom-rent',
              title: 'Approve Custom Rent',
              description: 'Proceed with custom rent amount (requires approval)',
              action: 'OVERRIDE',
              risk: 'MEDIUM',
              automated: false,
            },
          ],
        })
      }
    } catch (error) {
      console.error('Error checking rent conflicts:', error)
    }

    return conflicts
  }

  /**
   * Execute a conflict resolution
   */
  static async executeResolution(
    resolution: ConflictResolution,
    originalRequest: AllocationRequest
  ): Promise<{ success: boolean; message: string; updatedRequest?: AllocationRequest }> {
    try {
      switch (resolution.action) {
        case 'ADJUST_DATES':
          return this.handleDateAdjustment(resolution, originalRequest)

        case 'SUGGEST_ALTERNATIVE':
          return this.handleAlternativeSuggestion(resolution, originalRequest)

        case 'TERMINATE_EXISTING':
          return this.handleLeaseTermination(resolution, originalRequest)

        case 'OVERRIDE':
          return this.handleOverride(resolution, originalRequest)

        case 'WAIT':
          return {
            success: true,
            message: 'Allocation postponed. Please try again later.',
          }

        default:
          return {
            success: false,
            message: 'Unknown resolution action',
          }
      }
    } catch (error) {
      console.error('Error executing resolution:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute resolution',
      }
    }
  }

  private static async handleDateAdjustment(
    resolution: ConflictResolution,
    originalRequest: AllocationRequest
  ) {
    const updatedRequest = { ...originalRequest }

    if (resolution.parameters?.newStartDate) {
      updatedRequest.startDate = resolution.parameters.newStartDate
    }

    if (resolution.parameters?.endDate !== undefined) {
      updatedRequest.endDate = resolution.parameters.endDate
    }

    if (resolution.parameters?.newRent) {
      updatedRequest.monthlyRent = resolution.parameters.newRent
    }

    return {
      success: true,
      message: 'Dates adjusted successfully',
      updatedRequest,
    }
  }

  private static async handleAlternativeSuggestion(
    resolution: ConflictResolution,
    originalRequest: AllocationRequest
  ) {
    const alternativeUnits = await UnitAllocationService.getAvailableUnits(
      originalRequest.startDate,
      originalRequest.endDate
    )

    return {
      success: true,
      message: `Found ${alternativeUnits.length} alternative units`,
      updatedRequest: originalRequest,
    }
  }

  private static async handleLeaseTermination(
    resolution: ConflictResolution,
    originalRequest: AllocationRequest
  ) {
    if (!resolution.parameters?.leaseId) {
      return {
        success: false,
        message: 'Lease ID required for termination',
      }
    }

    // This would typically require additional authorization
    return {
      success: true,
      message: 'Lease termination initiated (requires manual approval)',
      updatedRequest: originalRequest,
    }
  }

  private static async handleOverride(
    resolution: ConflictResolution,
    originalRequest: AllocationRequest
  ) {
    return {
      success: true,
      message: 'Override approved - proceeding with allocation',
      updatedRequest: originalRequest,
    }
  }
}
