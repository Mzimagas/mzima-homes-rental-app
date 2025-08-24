/**
 * Unit Allocation Service
 * Handles atomic transactions and complex operations for tenant-unit allocation
 */

import supabase from '../../../lib/supabase-client'
import { TenancyAgreement, Tenant, Unit } from '../../../lib/types/database'
import { LeaseFormData } from '../types/rental-management.types'

export interface UnitAvailability {
  available: boolean
  conflictingLeases?: TenancyAgreement[]
  availableFrom?: string
  conflictingTenant?: string
}

export interface AllocationResult {
  success: boolean
  leaseId?: string
  error?: string
  warnings?: string[]
}

export interface ReallocationOptions {
  effectiveDate: string
  terminateCurrentLease: boolean
  notes?: string
  proratePreviousRent?: boolean
}

export class UnitAllocationService {
  
  /**
   * Check unit availability for a specific date range
   */
  static async checkUnitAvailability(
    unitId: string, 
    startDate: string, 
    endDate?: string
  ): Promise<UnitAvailability> {
    try {
      const { data, error } = await supabase
        .rpc('check_unit_availability', {
          unit_id_param: unitId,
          start_date_param: startDate,
          end_date_param: endDate || null
        })

      if (error) throw error

      const result = data?.[0]
      
      return {
        available: result?.available || false,
        conflictingLeases: result?.conflicting_lease_id ? [{
          id: result.conflicting_lease_id,
          tenant_id: '',
          unit_id: unitId,
          start_date: result.conflict_start,
          end_date: result.conflict_end,
          status: 'ACTIVE'
        }] : [],
        availableFrom: result?.available_from,
        conflictingTenant: result?.conflicting_tenant
      }
    } catch (error) {
      console.error('Error checking unit availability:', error)
      return { available: false }
    }
  }

  /**
   * Get all available units for a date range
   */
  static async getAvailableUnits(
    startDate: string, 
    endDate?: string,
    propertyId?: string
  ): Promise<Unit[]> {
    try {
      let query = supabase
        .from('units')
        .select(`
          id,
          unit_label,
          monthly_rent_kes,
          property_id,
          status,
          properties!inner(id, name),
          tenancy_agreements!left(
            id,
            status,
            start_date,
            end_date,
            tenant_id,
            tenants(full_name)
          )
        `)
        .eq('is_active', true)
        .neq('status', 'MAINTENANCE')

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data: units, error } = await query.order('unit_label')

      if (error) throw error

      // Filter units that are available for the date range
      const availableUnits = await Promise.all(
        (units || []).map(async (unit) => {
          const availability = await this.checkUnitAvailability(unit.id, startDate, endDate)
          return availability.available ? unit : null
        })
      )

      return availableUnits.filter(Boolean) as Unit[]
    } catch (error) {
      console.error('Error getting available units:', error)
      throw new Error('Failed to load available units')
    }
  }

  /**
   * Allocate unit to tenant with atomic transaction
   */
  static async allocateUnitToTenant(
    tenantId: string,
    unitId: string,
    leaseData: LeaseFormData
  ): Promise<AllocationResult> {
    try {
      // 1. Final availability check
      const availability = await this.checkUnitAvailability(
        unitId, 
        leaseData.start_date, 
        leaseData.end_date
      )

      if (!availability.available) {
        return {
          success: false,
          error: `Unit not available. ${availability.availableFrom ? `Available from: ${availability.availableFrom}` : 'Currently occupied.'}`
        }
      }

      // 2. Check if tenant already has an active lease
      const { data: existingLeases, error: checkError } = await supabase
        .from('tenancy_agreements')
        .select('id, units(unit_label, properties(name))')
        .eq('tenant_id', tenantId)
        .eq('status', 'ACTIVE')

      if (checkError) throw checkError

      const warnings: string[] = []
      if (existingLeases && existingLeases.length > 0) {
        const currentUnit = existingLeases[0].units as any
        warnings.push(
          `Tenant already has an active lease in ${currentUnit?.properties?.name} - ${currentUnit?.unit_label}. This will create a second active lease.`
        )
      }

      // 3. Create lease agreement
      const { data: newLease, error: createError } = await supabase
        .from('tenancy_agreements')
        .insert({
          tenant_id: tenantId,
          unit_id: unitId,
          start_date: leaseData.start_date,
          end_date: leaseData.end_date || null,
          monthly_rent_kes: leaseData.monthly_rent_kes,
          security_deposit_kes: leaseData.security_deposit || 0,
          pet_deposit_kes: leaseData.pet_deposit || 0,
          status: 'ACTIVE',
          lease_type: 'FIXED_TERM',
          notes: leaseData.notes
        })
        .select()
        .single()

      if (createError) throw createError

      return {
        success: true,
        leaseId: newLease.id,
        warnings: warnings.length > 0 ? warnings : undefined
      }

    } catch (error) {
      console.error('Error allocating unit to tenant:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to allocate unit'
      }
    }
  }

  /**
   * Reallocate tenant to new unit with atomic transaction
   */
  static async reallocateTenant(
    tenantId: string,
    newUnitId: string,
    options: ReallocationOptions
  ): Promise<AllocationResult> {
    try {
      // 1. Check new unit availability
      const availability = await this.checkUnitAvailability(
        newUnitId,
        options.effectiveDate
      )

      if (!availability.available) {
        return {
          success: false,
          error: `New unit not available. ${availability.availableFrom ? `Available from: ${availability.availableFrom}` : ''}`
        }
      }

      // 2. Get current active lease
      const { data: currentLeases, error: fetchError } = await supabase
        .from('tenancy_agreements')
        .select(`
          id,
          unit_id,
          start_date,
          monthly_rent_kes,
          notes,
          units(unit_label, monthly_rent_kes, properties(name))
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'ACTIVE')

      if (fetchError) throw fetchError

      const currentLease = currentLeases?.[0]
      if (!currentLease) {
        return {
          success: false,
          error: 'No active lease found for tenant'
        }
      }

      // 3. Get new unit details
      const { data: newUnit, error: unitError } = await supabase
        .from('units')
        .select('monthly_rent_kes, unit_label, properties(name)')
        .eq('id', newUnitId)
        .single()

      if (unitError) throw unitError

      // 4. Use database transaction for atomic operation
      const { error: transactionError } = await supabase.rpc('reallocate_tenant_atomic', {
        p_tenant_id: tenantId,
        p_current_lease_id: currentLease.id,
        p_new_unit_id: newUnitId,
        p_effective_date: options.effectiveDate,
        p_new_rent: newUnit.monthly_rent_kes,
        p_notes: options.notes || `Reallocated from ${(currentLease.units as any)?.properties?.name} - ${(currentLease.units as any)?.unit_label} to ${(newUnit as any).properties?.name} - ${(newUnit as any).unit_label}`,
        p_terminate_current: options.terminateCurrentLease
      })

      if (transactionError) throw transactionError

      return {
        success: true,
        warnings: [`Tenant reallocated from ${(currentLease.units as any)?.unit_label} to ${(newUnit as any).unit_label}`]
      }

    } catch (error) {
      console.error('Error reallocating tenant:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reallocate tenant'
      }
    }
  }

  /**
   * Get tenant allocation history
   */
  static async getTenantAllocationHistory(tenantId: string): Promise<TenancyAgreement[]> {
    try {
      const { data, error } = await supabase
        .from('tenancy_agreements')
        .select(`
          *,
          units(
            unit_label,
            properties(name)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('start_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting tenant allocation history:', error)
      throw new Error('Failed to load allocation history')
    }
  }

  /**
   * Get unit allocation history
   */
  static async getUnitAllocationHistory(unitId: string): Promise<TenancyAgreement[]> {
    try {
      const { data, error } = await supabase
        .from('tenancy_agreements')
        .select(`
          *,
          tenants(full_name, phone, email)
        `)
        .eq('unit_id', unitId)
        .order('start_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting unit allocation history:', error)
      throw new Error('Failed to load allocation history')
    }
  }

  /**
   * Get allocation statistics
   */
  static async getAllocationStats(): Promise<{
    totalUnits: number
    occupiedUnits: number
    vacantUnits: number
    occupancyRate: number
    averageLeaseLength: number
    totalActiveLeases: number
  }> {
    try {
      const { data, error } = await supabase
        .from('unit_occupancy_summary')
        .select('*')

      if (error) throw error

      const totalUnits = data?.length || 0
      const occupiedUnits = data?.filter(unit => unit.occupancy_status === 'OCCUPIED').length || 0
      const vacantUnits = totalUnits - occupiedUnits
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

      // Get average lease length
      const { data: leaseData, error: leaseError } = await supabase
        .from('tenancy_agreements')
        .select('start_date, end_date')
        .eq('status', 'ACTIVE')
        .not('end_date', 'is', null)

      if (leaseError) throw leaseError

      const averageLeaseLength = leaseData?.reduce((acc, lease) => {
        const start = new Date(lease.start_date)
        const end = new Date(lease.end_date!)
        const lengthInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        return acc + lengthInDays
      }, 0) / (leaseData?.length || 1) || 0

      return {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        averageLeaseLength: Math.round(averageLeaseLength),
        totalActiveLeases: occupiedUnits
      }
    } catch (error) {
      console.error('Error getting allocation stats:', error)
      throw new Error('Failed to load allocation statistics')
    }
  }
}
