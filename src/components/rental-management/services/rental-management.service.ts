import getSupabaseClient from '../../../lib/supabase-client'

const supabase = getSupabaseClient()
import {
  RentalProperty,
  RentalUnit,
  RentalTenant,
  LeaseAgreement,
  MaintenanceRequest,
  PropertyInspection,
  PaymentRecord,
  RentRoll,
  FinancialReport,
} from '../types/rental-management.types'

export class RentalManagementService {
  // Dashboard Statistics
  static async getDashboardStats() {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Use the database function to get dashboard stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_rental_dashboard_stats', { user_id: user.id })
        .single()

      if (statsError) throw statsError

      const stats = statsData || {}
      const totalUnits = stats.total_units || 0
      const occupiedUnits = stats.occupied_units || 0
      const vacantUnits = totalUnits - occupiedUnits
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

      // Get outstanding rent
      const { data: outstandingRentData } = await supabase
        .rpc('get_total_outstanding_rent')
        .single()

      const outstandingRent = outstandingRentData || 0

      return {
        totalProperties: stats.total_properties || 0,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        monthlyIncome: stats.monthly_income || 0,
        outstandingRent,
        maintenanceRequests: stats.maintenance_requests || 0,
        upcomingInspections: 0, // TODO: Implement when inspections table is ready
      }
    } catch (error) {
            throw new Error('Failed to load dashboard statistics')
    }
  }

  // Recent Activity
  static async getRecentActivity() {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Use the database function to get recent activity
      const { data: activities, error } = await supabase.rpc('get_recent_activity', {
        user_id: user.id,
        limit_count: 10,
      })

      if (error) throw error

      return (
        activities?.map((activity: any) => ({
          icon: activity.icon,
          title: activity.title,
          description: activity.description,
          timestamp: new Date(activity.created_at).toLocaleDateString(),
          property_name: activity.property_name,
        })) || []
      )
    } catch (error) {
            return []
    }
  }

  // Rental Properties
  static async getRentalProperties(): Promise<RentalProperty[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
          *,
          units(
            id,
            unit_label,
            monthly_rent_kes,
            is_active,
            tenancy_agreements(
              id,
              status,
              tenant_id,
              tenants(full_name)
            )
          )
        `
        )
        .eq('lifecycle_status', 'ACTIVE')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (
        data?.map((property) => ({
          ...property,
          total_units: property.units?.length || 0,
          occupied_units:
            property.units?.filter((unit: any) =>
              unit.tenancy_agreements?.some((agreement: any) => agreement.status === 'ACTIVE')
            ).length || 0,
          vacancy_rate:
            property.units?.length > 0
              ? ((property.units.length -
                  property.units.filter((unit: any) =>
                    unit.tenancy_agreements?.some((agreement: any) => agreement.status === 'ACTIVE')
                  ).length) /
                  property.units.length) *
                100
              : 0,
          monthly_income:
            property.units?.reduce((total: number, unit: any) => {
              const hasActiveTenant = unit.tenancy_agreements?.some(
                (agreement: any) => agreement.status === 'ACTIVE'
              )
              return total + (hasActiveTenant ? unit.monthly_rent_kes || 0 : 0)
            }, 0) || 0,
        })) || []
      )
    } catch (error) {
            throw new Error('Failed to load rental properties')
    }
  }

  // Tenants
  static async getTenants(): Promise<RentalTenant[]> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(
          `
          *,
          tenancy_agreements(
            id,
            status,
            start_date,
            end_date,
            monthly_rent_kes,
            unit_id,
            units(
              unit_label,
              property_id,
              properties(name)
            )
          )
        `
        )
        .neq('status', 'DELETED')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (
        data?.map((tenant) => ({
          ...tenant,
          current_unit:
            tenant.tenancy_agreements?.find((agreement: any) => agreement.status === 'ACTIVE')
              ?.units || null,
          rent_balance: 0, // TODO: Calculate from payments
          last_payment_date: null, // TODO: Get from payments
        })) || []
      )
    } catch (error) {
            throw new Error('Failed to load tenants')
    }
  }

  // Maintenance Requests
  static async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(
          `
          *,
          properties(name),
          units(unit_label),
          tenants(full_name)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
            throw new Error('Failed to load maintenance requests')
    }
  }

  // Create new tenant
  static async createTenant(tenantData: any): Promise<RentalTenant> {
    try {
      const { data, error } = await supabase.from('tenants').insert(tenantData).select().single()

      if (error) throw error

      return data
    } catch (error) {
            throw new Error('Failed to create tenant')
    }
  }

  // Create new lease agreement
  static async createLeaseAgreement(leaseData: any): Promise<LeaseAgreement> {
    try {
      const { data, error } = await supabase
        .from('tenancy_agreements')
        .insert(leaseData)
        .select(
          `
          *,
          tenants(full_name),
          units(unit_label, properties(name))
        `
        )
        .single()

      if (error) throw error

      return data
    } catch (error) {
            throw new Error('Failed to create lease agreement')
    }
  }

  // Create maintenance request
  static async createMaintenanceRequest(requestData: any): Promise<MaintenanceRequest> {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert(requestData)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
            throw new Error('Failed to create maintenance request')
    }
  }

  // Get rent roll for a property
  static async getRentRoll(propertyId: string): Promise<RentRoll> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
          id,
          name,
          units(
            id,
            unit_label,
            monthly_rent_kes,
            tenancy_agreements(
              id,
              status,
              start_date,
              end_date,
              tenants(full_name)
            )
          )
        `
        )
        .eq('id', propertyId)
        .single()

      if (error) throw error

      const property = data
      const units = property.units || []
      const totalUnits = units.length
      const occupiedUnits = units.filter((unit: any) =>
        unit.tenancy_agreements?.some((agreement: any) => agreement.status === 'ACTIVE')
      ).length

      const rentRollUnits = units.map((unit: any) => {
        const activeAgreement = unit.tenancy_agreements?.find(
          (agreement: any) => agreement.status === 'ACTIVE'
        )
        const tenant = activeAgreement?.tenants

        return {
          unit_id: unit.id,
          unit_label: unit.unit_label,
          tenant_name: tenant?.full_name || null,
          monthly_rent: unit.monthly_rent_kes || 0,
          rent_status: tenant ? 'CURRENT' : 'VACANT', // Simplified
          balance: 0, // TODO: Calculate from payments
          lease_start: activeAgreement?.start_date || null,
          lease_end: activeAgreement?.end_date || null,
        }
      })

      const totalMonthlyRent = rentRollUnits.reduce((total, unit) => total + unit.monthly_rent, 0)
      const collectedRent = totalMonthlyRent // Simplified - assume all collected
      const outstandingRent = 0 // Simplified

      return {
        property_id: property.id,
        property_name: property.name,
        units: rentRollUnits,
        total_units: totalUnits,
        occupied_units: occupiedUnits,
        vacancy_rate: totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits) * 100 : 0,
        total_monthly_rent: totalMonthlyRent,
        collected_rent: collectedRent,
        outstanding_rent: outstandingRent,
        collection_rate: totalMonthlyRent > 0 ? (collectedRent / totalMonthlyRent) * 100 : 0,
      }
    } catch (error) {
            throw new Error('Failed to load rent roll')
    }
  }

  // Payment methods
  static async getPayments(): Promise<PaymentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('rental_payments')
        .select(`
          *,
          tenants(full_name),
          units(unit_label, properties(name))
        `)
        .order('payment_date', { ascending: false })

      if (error) throw error

      return data?.map(payment => ({
        id: payment.id,
        tenant_id: payment.tenant_id,
        amount: payment.amount_kes,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method as any,
        reference_number: payment.transaction_reference,
        status: 'COMPLETED' as any,
        notes: payment.notes
      })) || []
    } catch (error) {
      throw new Error('Failed to load payments')
    }
  }

  static async createPayment(paymentData: any): Promise<PaymentRecord> {
    try {
      const { data, error } = await supabase
        .from('rental_payments')
        .insert({
          tenant_id: paymentData.tenant_id,
          unit_id: paymentData.unit_id,
          amount_kes: paymentData.amount,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          transaction_reference: paymentData.reference_number,
          notes: paymentData.notes
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: data.id,
        tenant_id: data.tenant_id,
        amount: data.amount_kes,
        payment_date: data.payment_date,
        payment_method: data.payment_method as any,
        reference_number: data.transaction_reference,
        status: 'COMPLETED' as any,
        notes: data.notes
      }
    } catch (error) {
      throw new Error('Failed to create payment')
    }
  }

  // Inspection methods (placeholder implementations)
  static async getInspections(): Promise<any[]> {
    // TODO: Implement when inspections table is ready
    return []
  }

  static async createInspection(inspectionData: any): Promise<any> {
    try {
      // TODO: Implement when inspections table is ready
            return { id: 'temp-id', ...inspectionData }
    } catch (error) {
            throw new Error('Failed to create inspection')
    }
  }

  // Document methods (placeholder implementations)
  static async getDocuments(): Promise<any[]> {
    // TODO: Implement when documents table and Supabase Storage are ready
    return []
  }

  static async uploadDocument(file: File, metadata: any): Promise<any> {
    try {
      // TODO: Implement Supabase Storage upload
            return { id: 'temp-id', name: file.name, ...metadata }
    } catch (error) {
            throw new Error('Failed to upload document')
    }
  }

  // Report generation methods (placeholder implementations)
  static async generateIncomeStatement(propertyId?: string, dateRange?: string): Promise<any> {
    try {
      // TODO: Implement income statement generation
            return { type: 'income_statement', data: {} }
    } catch (error) {
            throw new Error('Failed to generate income statement')
    }
  }

  static async generateCashFlowReport(propertyId?: string, dateRange?: string): Promise<any> {
    try {
      // TODO: Implement cash flow report generation
            return { type: 'cash_flow', data: {} }
    } catch (error) {
            throw new Error('Failed to generate cash flow report')
    }
  }

  static async generateVacancyReport(propertyId?: string, dateRange?: string): Promise<any> {
    try {
      // TODO: Implement vacancy report generation
            return { type: 'vacancy_report', data: {} }
    } catch (error) {
            throw new Error('Failed to generate vacancy report')
    }
  }
}
