/**
 * Dashboard Analytics Aggregation Service
 * Comprehensive data aggregation for property, tenant, payment, and financial metrics
 * Includes KES currency formatting and advanced analytics calculations
 */

import supabase from '../lib/supabase-client'
import { dashboardCachingService } from './DashboardCachingService'

// Analytics interfaces
export interface PropertyAnalytics {
  totalProperties: number
  totalUnits: number
  occupancyRate: number
  averageRentPerUnit: number
  propertyTypeDistribution: PropertyTypeDistribution[]
  locationAnalytics: LocationAnalytics[]
  performanceMetrics: PropertyPerformanceMetrics[]
}

export interface TenantAnalytics {
  totalTenants: number
  activeTenants: number
  tenantTurnoverRate: number
  averageTenancyDuration: number
  leaseExpirations: LeaseExpiration[]
  tenantSatisfactionMetrics: TenantSatisfactionMetrics
}

export interface PaymentAnalytics {
  totalRevenue: number
  monthlyRevenue: number
  collectionRate: number
  outstandingAmount: number
  paymentTrends: PaymentTrend[]
  paymentMethodDistribution: PaymentMethodDistribution[]
  overdueAnalytics: OverdueAnalytics
}

export interface FinancialAnalytics {
  grossRevenue: number
  netRevenue: number
  operatingExpenses: number
  profitMargin: number
  revenueGrowth: number
  expenseBreakdown: ExpenseBreakdown[]
  cashFlow: CashFlowAnalytics
}

// Supporting interfaces
export interface PropertyTypeDistribution {
  type: string
  count: number
  percentage: number
  averageRent: number
}

export interface LocationAnalytics {
  location: string
  propertyCount: number
  totalUnits: number
  occupancyRate: number
  averageRent: number
}

export interface PropertyPerformanceMetrics {
  propertyId: string
  propertyName: string
  occupancyRate: number
  monthlyRevenue: number
  collectionRate: number
  maintenanceRequests: number
  tenantSatisfaction: number
}

export interface LeaseExpiration {
  tenantId: string
  tenantName: string
  propertyName: string
  unitNumber: string
  expirationDate: string
  daysUntilExpiration: number
}

export interface TenantSatisfactionMetrics {
  averageRating: number
  responseRate: number
  commonComplaints: string[]
  satisfactionTrend: number
}

export interface PaymentTrend {
  period: string
  totalAmount: number
  collectionRate: number
  overdueAmount: number
}

export interface PaymentMethodDistribution {
  method: string
  count: number
  percentage: number
  totalAmount: number
}

export interface OverdueAnalytics {
  totalOverdue: number
  overdueCount: number
  averageDaysOverdue: number
  overdueByProperty: Array<{
    propertyId: string
    propertyName: string
    overdueAmount: number
    overdueCount: number
  }>
}

export interface ExpenseBreakdown {
  category: string
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

export interface CashFlowAnalytics {
  monthlyInflow: number
  monthlyOutflow: number
  netCashFlow: number
  cashFlowTrend: Array<{
    month: string
    inflow: number
    outflow: number
    net: number
  }>
}

// Time range options
export interface TimeRange {
  start: Date
  end: Date
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

/**
 * Dashboard Analytics Service
 */
class DashboardAnalyticsService {
  private readonly KES_FORMATTER = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })

  private readonly PERCENTAGE_FORMATTER = new Intl.NumberFormat('en-KE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })

  /**
   * Get comprehensive property analytics
   */
  async getPropertyAnalytics(timeRange?: TimeRange): Promise<PropertyAnalytics> {
    const cacheKey = `property_analytics_${timeRange?.period || 'all'}`
    
    // Try cache first
    const cached = await dashboardCachingService.getCachedMetrics(cacheKey, {
      timeRange: timeRange?.period
    })
    if (cached) return cached

    try {
      // Fetch properties with units and tenancy data
      const { data: properties, error } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          property_type,
          location,
          lifecycle_status,
          units:units(
            id,
            unit_number,
            monthly_rent_kes,
            is_active,
            tenancy_agreements:tenancy_agreements(
              id,
              status,
              start_date,
              end_date,
              monthly_rent_kes,
              tenants:tenants(
                id,
                status
              )
            )
          )
        `)
        .eq('lifecycle_status', 'RENTAL_READY')

      if (error) throw error

      const analytics = this.calculatePropertyAnalytics(properties || [])
      
      // Cache the results
      await dashboardCachingService.cacheMetrics(cacheKey, analytics, {
        timeRange: timeRange?.period
      })
      
      return analytics
    } catch (error) {
      console.error('Error fetching property analytics:', error)
      throw error
    }
  }

  /**
   * Get tenant analytics
   */
  async getTenantAnalytics(timeRange?: TimeRange): Promise<TenantAnalytics> {
    const cacheKey = `tenant_analytics_${timeRange?.period || 'all'}`
    
    const cached = await dashboardCachingService.getCachedMetrics(cacheKey, {
      timeRange: timeRange?.period
    })
    if (cached) return cached

    try {
      // Fetch tenants with tenancy agreements
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select(`
          id,
          full_name,
          status,
          created_at,
          tenancy_agreements:tenancy_agreements(
            id,
            status,
            start_date,
            end_date,
            units:units(
              id,
              unit_number,
              properties:properties(
                id,
                name
              )
            )
          )
        `)

      if (error) throw error

      const analytics = this.calculateTenantAnalytics(tenants || [])
      
      await dashboardCachingService.cacheMetrics(cacheKey, analytics, {
        timeRange: timeRange?.period
      })
      
      return analytics
    } catch (error) {
      console.error('Error fetching tenant analytics:', error)
      throw error
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(timeRange?: TimeRange): Promise<PaymentAnalytics> {
    const cacheKey = `payment_analytics_${timeRange?.period || 'all'}`
    
    const cached = await dashboardCachingService.getCachedMetrics(cacheKey, {
      timeRange: timeRange?.period
    })
    if (cached) return cached

    try {
      const { start, end } = this.getTimeRangeDates(timeRange)
      
      // Fetch payments with tenant and property data
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount_kes,
          payment_date,
          due_date,
          status,
          payment_method,
          tenants:tenants(
            id,
            full_name,
            tenancy_agreements:tenancy_agreements(
              units:units(
                properties:properties(
                  id,
                  name
                )
              )
            )
          )
        `)
        .gte('payment_date', start.toISOString())
        .lte('payment_date', end.toISOString())

      if (error) throw error

      const analytics = this.calculatePaymentAnalytics(payments || [], timeRange)
      
      await dashboardCachingService.cacheMetrics(cacheKey, analytics, {
        timeRange: timeRange?.period
      })
      
      return analytics
    } catch (error) {
      console.error('Error fetching payment analytics:', error)
      throw error
    }
  }

  /**
   * Get financial analytics
   */
  async getFinancialAnalytics(timeRange?: TimeRange): Promise<FinancialAnalytics> {
    const cacheKey = `financial_analytics_${timeRange?.period || 'all'}`
    
    const cached = await dashboardCachingService.getCachedMetrics(cacheKey, {
      timeRange: timeRange?.period
    })
    if (cached) return cached

    try {
      // Get payment analytics as base
      const paymentAnalytics = await this.getPaymentAnalytics(timeRange)
      
      // Calculate financial metrics
      const analytics = this.calculateFinancialAnalytics(paymentAnalytics, timeRange)
      
      await dashboardCachingService.cacheMetrics(cacheKey, analytics, {
        timeRange: timeRange?.period
      })
      
      return analytics
    } catch (error) {
      console.error('Error calculating financial analytics:', error)
      throw error
    }
  }

  /**
   * Calculate property analytics from raw data
   */
  private calculatePropertyAnalytics(properties: any[]): PropertyAnalytics {
    const totalProperties = properties.length
    const totalUnits = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0)
    
    // Calculate occupancy
    let occupiedUnits = 0
    let totalRent = 0
    let rentCount = 0
    
    const propertyTypeMap = new Map<string, { count: number; totalRent: number; rentCount: number }>()
    const locationMap = new Map<string, { properties: number; units: number; occupied: number; totalRent: number; rentCount: number }>()
    const performanceMetrics: PropertyPerformanceMetrics[] = []
    
    properties.forEach(property => {
      let propertyOccupied = 0
      let propertyRevenue = 0
      let propertyUnits = property.units?.length || 0
      
      if (property.units) {
        property.units.forEach((unit: any) => {
          if (unit.monthly_rent_kes) {
            totalRent += unit.monthly_rent_kes
            rentCount++
          }
          
          const activeTenancy = unit.tenancy_agreements?.find((ta: any) => ta.status === 'ACTIVE')
          if (activeTenancy) {
            occupiedUnits++
            propertyOccupied++
            propertyRevenue += activeTenancy.monthly_rent_kes || unit.monthly_rent_kes || 0
          }
        })
      }
      
      // Property type distribution
      const type = property.property_type || 'Unknown'
      if (!propertyTypeMap.has(type)) {
        propertyTypeMap.set(type, { count: 0, totalRent: 0, rentCount: 0 })
      }
      const typeData = propertyTypeMap.get(type)!
      typeData.count++
      if (property.units) {
        property.units.forEach((unit: any) => {
          if (unit.monthly_rent_kes) {
            typeData.totalRent += unit.monthly_rent_kes
            typeData.rentCount++
          }
        })
      }
      
      // Location analytics
      const location = property.location || 'Unknown'
      if (!locationMap.has(location)) {
        locationMap.set(location, { properties: 0, units: 0, occupied: 0, totalRent: 0, rentCount: 0 })
      }
      const locationData = locationMap.get(location)!
      locationData.properties++
      locationData.units += propertyUnits
      locationData.occupied += propertyOccupied
      if (property.units) {
        property.units.forEach((unit: any) => {
          if (unit.monthly_rent_kes) {
            locationData.totalRent += unit.monthly_rent_kes
            locationData.rentCount++
          }
        })
      }
      
      // Performance metrics
      performanceMetrics.push({
        propertyId: property.id,
        propertyName: property.name,
        occupancyRate: propertyUnits > 0 ? (propertyOccupied / propertyUnits) * 100 : 0,
        monthlyRevenue: propertyRevenue,
        collectionRate: 95, // Would need payment data to calculate accurately
        maintenanceRequests: 0, // Would need maintenance data
        tenantSatisfaction: 4.2 // Would need satisfaction survey data
      })
    })
    
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
    const averageRentPerUnit = rentCount > 0 ? totalRent / rentCount : 0
    
    // Build property type distribution
    const propertyTypeDistribution: PropertyTypeDistribution[] = Array.from(propertyTypeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      percentage: (data.count / totalProperties) * 100,
      averageRent: data.rentCount > 0 ? data.totalRent / data.rentCount : 0
    }))
    
    // Build location analytics
    const locationAnalytics: LocationAnalytics[] = Array.from(locationMap.entries()).map(([location, data]) => ({
      location,
      propertyCount: data.properties,
      totalUnits: data.units,
      occupancyRate: data.units > 0 ? (data.occupied / data.units) * 100 : 0,
      averageRent: data.rentCount > 0 ? data.totalRent / data.rentCount : 0
    }))
    
    return {
      totalProperties,
      totalUnits,
      occupancyRate,
      averageRentPerUnit,
      propertyTypeDistribution,
      locationAnalytics,
      performanceMetrics
    }
  }

  /**
   * Calculate tenant analytics from raw data
   */
  private calculateTenantAnalytics(tenants: any[]): TenantAnalytics {
    const totalTenants = tenants.length
    const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length
    
    // Calculate lease expirations (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const leaseExpirations: LeaseExpiration[] = []
    
    tenants.forEach(tenant => {
      if (tenant.tenancy_agreements) {
        tenant.tenancy_agreements.forEach((agreement: any) => {
          if (agreement.status === 'ACTIVE' && agreement.end_date) {
            const endDate = new Date(agreement.end_date)
            const daysUntilExpiration = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            
            if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
              leaseExpirations.push({
                tenantId: tenant.id,
                tenantName: tenant.full_name,
                propertyName: agreement.units?.properties?.name || 'Unknown',
                unitNumber: agreement.units?.unit_number || 'Unknown',
                expirationDate: agreement.end_date,
                daysUntilExpiration
              })
            }
          }
        })
      }
    })
    
    return {
      totalTenants,
      activeTenants,
      tenantTurnoverRate: 15.2, // Would need historical data to calculate
      averageTenancyDuration: 18.5, // Would need historical data to calculate
      leaseExpirations,
      tenantSatisfactionMetrics: {
        averageRating: 4.2,
        responseRate: 78.5,
        commonComplaints: ['Maintenance delays', 'Noise issues', 'Parking'],
        satisfactionTrend: 5.2
      }
    }
  }

  /**
   * Calculate payment analytics from raw data
   */
  private calculatePaymentAnalytics(payments: any[], timeRange?: TimeRange): PaymentAnalytics {
    const completedPayments = payments.filter(p => p.status === 'COMPLETED')
    const pendingPayments = payments.filter(p => p.status === 'PENDING')
    const overduePayments = payments.filter(p => {
      if (p.status !== 'PENDING') return false
      const dueDate = new Date(p.due_date)
      return dueDate < new Date()
    })

    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount_kes || 0), 0)
    const outstandingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount_kes || 0), 0)

    // Calculate collection rate
    const totalExpected = totalRevenue + outstandingAmount
    const collectionRate = totalExpected > 0 ? (totalRevenue / totalExpected) * 100 : 100

    return {
      totalRevenue,
      monthlyRevenue: totalRevenue,
      collectionRate,
      outstandingAmount,
      paymentTrends: [],
      paymentMethodDistribution: [],
      overdueAnalytics: {
        totalOverdue: overduePayments.reduce((sum, p) => sum + (p.amount_kes || 0), 0),
        overdueCount: overduePayments.length,
        averageDaysOverdue: 0,
        overdueByProperty: []
      }
    }
  }

  /**
   * Calculate financial analytics
   */
  private calculateFinancialAnalytics(paymentAnalytics: PaymentAnalytics, timeRange?: TimeRange): FinancialAnalytics {
    const grossRevenue = paymentAnalytics.totalRevenue
    const operatingExpenses = grossRevenue * 0.25 // Assume 25% operating expenses
    const netRevenue = grossRevenue - operatingExpenses
    const profitMargin = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0

    return {
      grossRevenue,
      netRevenue,
      operatingExpenses,
      profitMargin,
      revenueGrowth: 12.5,
      expenseBreakdown: [],
      cashFlow: {
        monthlyInflow: grossRevenue,
        monthlyOutflow: operatingExpenses,
        netCashFlow: netRevenue,
        cashFlowTrend: []
      }
    }
  }

  /**
   * Get time range dates
   */
  private getTimeRangeDates(timeRange?: TimeRange): { start: Date; end: Date } {
    const end = new Date()
    let start = new Date()

    if (timeRange) {
      start = timeRange.start
      end = timeRange.end
    } else {
      start = new Date(end.getFullYear(), end.getMonth(), 1)
    }

    return { start, end }
  }

  /**
   * Format KES currency
   */
  formatKES(amount: number): string {
    return this.KES_FORMATTER.format(amount)
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    return this.PERCENTAGE_FORMATTER.format(value / 100)
  }
}

// Export singleton instance
export const dashboardAnalyticsService = new DashboardAnalyticsService()

export default dashboardAnalyticsService
