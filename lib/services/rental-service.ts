import { supabase, supabaseAdmin, businessFunctions, queries, handleSupabaseError } from '../supabase'
import { Tenant, Property, Unit, RentInvoice, Payment } from '../types/database'

export class RentalService {
  // Property Management
  static async createProperty(data: {
    landlordId: string
    name: string
    physicalAddress: string
    lat?: number
    lng?: number
    notes?: string
  }) {
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        landlord_id: data.landlordId,
        name: data.name,
        physical_address: data.physicalAddress,
        lat: data.lat,
        lng: data.lng,
        notes: data.notes
      })
      .select()
      .single()

    return { property, error }
  }

  static async createUnit(data: {
    propertyId: string
    unitLabel: string
    monthlyRentKes: number
    depositKes?: number
    meterType?: 'TOKEN' | 'POSTPAID' | 'ANALOG' | 'NONE'
    kplcAccount?: string
    waterIncluded?: boolean
  }) {
    const { data: unit, error } = await supabase
      .from('units')
      .insert({
        property_id: data.propertyId,
        unit_label: data.unitLabel,
        monthly_rent_kes: data.monthlyRentKes,
        deposit_kes: data.depositKes || 0,
        meter_type: data.meterType || 'NONE',
        kplc_account: data.kplcAccount,
        water_included: data.waterIncluded || false
      })
      .select()
      .single()

    return { unit, error }
  }

  // Tenant Management
  static async createTenant(data: {
    fullName: string
    phone: string
    nationalId?: string
    email?: string
    unitId?: string
    startDate?: string
  }) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        full_name: data.fullName,
        phone: data.phone,
        national_id: data.nationalId,
        email: data.email,
        current_unit_id: data.unitId,
        start_date: data.startDate,
        status: data.unitId ? 'ACTIVE' : 'INACTIVE'
      })
      .select()
      .single()

    return { tenant, error }
  }

  static async createTenancyAgreement(data: {
    tenantId: string
    unitId: string
    startDate: string
    endDate?: string
    rentKes: number
    billingDay?: number
    documentUrl?: string
  }) {
    const { data: agreement, error } = await supabase
      .from('tenancy_agreements')
      .insert({
        tenant_id: data.tenantId,
        unit_id: data.unitId,
        start_date: data.startDate,
        end_date: data.endDate,
        rent_kes: data.rentKes,
        billing_day: data.billingDay || 10,
        document_url: data.documentUrl,
        status: 'ACTIVE'
      })
      .select()
      .single()

    // Update tenant's current unit
    if (!error) {
      await supabase
        .from('tenants')
        .update({
          current_unit_id: data.unitId,
          status: 'ACTIVE',
          start_date: data.startDate
        })
        .eq('id', data.tenantId)
    }

    return { agreement, error }
  }

  // Invoice and Payment Management
  static async generateMonthlyInvoices(periodStart: string, dueDate?: string) {
    return businessFunctions.runMonthlyRent(periodStart, dueDate)
  }

  static async recordPayment(data: {
    tenantId: string
    amount: number
    paymentDate: string
    method?: 'MPESA' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'
    txRef?: string
    notes?: string
    postedByUserId?: string
  }) {
    return businessFunctions.applyPayment(
      data.tenantId,
      data.amount,
      data.paymentDate,
      data.method,
      data.txRef,
      data.postedByUserId
    )
  }

  // Dashboard and Analytics
  static async getDashboardStats(landlordId: string) {
    // Get all properties for landlord
    const { data: properties, error: propertiesError } = await queries.getPropertiesByLandlord(landlordId)
    
    if (propertiesError || !properties) {
      return { stats: null, error: propertiesError }
    }

    let totalUnits = 0
    let occupiedUnits = 0
    let totalRentPotential = 0
    let totalRentActual = 0

    for (const property of properties) {
      const { data: stats } = await businessFunctions.getPropertyStats(property.id)
      if (stats && stats.length > 0) {
        const stat = stats[0]
        totalUnits += stat.total_units
        occupiedUnits += stat.occupied_units
        totalRentPotential += stat.monthly_rent_potential
        totalRentActual += stat.monthly_rent_actual
      }
    }

    // Get overdue amount
    const { data: overdueInvoices } = await supabase
      .from('rent_invoices')
      .select('amount_due_kes, amount_paid_kes')
      .eq('status', 'OVERDUE')

    const overdueAmount = overdueInvoices?.reduce(
      (sum, invoice) => sum + (invoice.amount_due_kes - invoice.amount_paid_kes),
      0
    ) || 0

    return {
      stats: {
        totalProperties: properties.length,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        monthlyRentPotential: totalRentPotential,
        monthlyRentActual: totalRentActual,
        overdueAmount
      },
      error: null
    }
  }

  static async getPropertyDashboard(propertyId: string) {
    const { data: stats } = await businessFunctions.getPropertyStats(propertyId)
    const { data: recentPayments } = await queries.getRecentPayments(propertyId, 10)
    
    // Get overdue invoices for this property
    const { data: overdueInvoices } = await supabase
      .from('rent_invoices')
      .select(`
        *,
        tenants (full_name),
        units (unit_label)
      `)
      .eq('status', 'OVERDUE')
      .eq('units.property_id', propertyId)

    return {
      stats: stats?.[0] || null,
      recentPayments: recentPayments || [],
      overdueInvoices: overdueInvoices || []
    }
  }

  // Tenant Operations
  static async getTenantDashboard(tenantId: string) {
    const { data: tenant } = await queries.getTenantWithUnit(tenantId)
    const { data: balance } = await businessFunctions.getTenantBalance(tenantId)
    const { data: outstandingInvoices } = await queries.getOutstandingInvoices(tenantId)
    const { data: paymentHistory } = await businessFunctions.getTenantPaymentHistory(tenantId, 10)

    return {
      tenant,
      balance: balance || 0,
      outstandingInvoices: outstandingInvoices || [],
      paymentHistory: paymentHistory || []
    }
  }

  // Maintenance and Utilities
  static async markOverdueInvoices() {
    return businessFunctions.markOverdueInvoices()
  }

  static async terminateTenancy(
    tenancyAgreementId: string,
    terminationDate: string,
    reason?: string
  ) {
    return businessFunctions.terminateTenancy(tenancyAgreementId, terminationDate, reason)
  }

  // Search and Filters
  static async searchTenants(query: string, propertyId?: string) {
    let queryBuilder = supabase
      .from('tenants')
      .select(`
        *,
        units (
          unit_label,
          properties (
            name
          )
        )
      `)
      .ilike('full_name', `%${query}%`)

    if (propertyId) {
      queryBuilder = queryBuilder.eq('units.property_id', propertyId)
    }

    return queryBuilder.order('full_name')
  }

  static async getUnitsAvailableForRent(propertyId?: string) {
    let queryBuilder = supabase
      .from('units')
      .select(`
        *,
        properties (
          name,
          physical_address
        )
      `)
      .eq('is_active', true)
      .is('tenants.id', null)

    if (propertyId) {
      queryBuilder = queryBuilder.eq('property_id', propertyId)
    }

    return queryBuilder.order('unit_label')
  }
}
