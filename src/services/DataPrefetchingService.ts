/**
 * Data Prefetching Service - Optimizes API calls by prefetching related data
 */

import supabase from '../lib/supabase-client'
import { dataCache } from './CachingService'

interface PrefetchOptions {
  includeRelated?: boolean
  cacheKey?: string
  maxAge?: number // in milliseconds
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  maxAge: number
}

class DataPrefetchingService {
  private pendingRequests = new Map<string, Promise<any>>()

  /**
   * Prefetch properties with related data (tenants, payments, etc.)
   */
  async prefetchProperties(propertyIds?: string[], options: PrefetchOptions = {}): Promise<any[]> {
    const cacheKey = options.cacheKey || `properties_${propertyIds?.join(',') || 'all'}`

    // Check cache first
    const cached = dataCache.get<any[]>(cacheKey)
    if (cached) return cached

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    const request = this.fetchPropertiesWithRelated(propertyIds, options)
    this.pendingRequests.set(cacheKey, request)

    try {
      const result = await request
      dataCache.set(cacheKey, result, {
        ttl: options.maxAge || 300000, // 5 minutes default
        tags: ['properties', 'data'],
        maxSize: 5 * 1024 * 1024, // 5MB max per entry
      })
      return result
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  /**
   * Prefetch tenants with property and payment data
   */
  async prefetchTenants(tenantIds?: string[], options: PrefetchOptions = {}): Promise<any[]> {
    const cacheKey = options.cacheKey || `tenants_${tenantIds?.join(',') || 'all'}`

    const cached = dataCache.get<any[]>(cacheKey)
    if (cached) return cached

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    const request = this.fetchTenantsWithRelated(tenantIds, options)
    this.pendingRequests.set(cacheKey, request)

    try {
      const result = await request
      dataCache.set(cacheKey, result, {
        ttl: options.maxAge || 300000,
        tags: ['tenants', 'data'],
        maxSize: 5 * 1024 * 1024,
      })
      return result
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  /**
   * Prefetch payments with tenant and property data
   */
  async prefetchPayments(paymentIds?: string[], options: PrefetchOptions = {}): Promise<any[]> {
    const cacheKey = options.cacheKey || `payments_${paymentIds?.join(',') || 'all'}`

    const cached = dataCache.get<any[]>(cacheKey)
    if (cached) return cached

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    const request = this.fetchPaymentsWithRelated(paymentIds, options)
    this.pendingRequests.set(cacheKey, request)

    try {
      const result = await request
      dataCache.set(cacheKey, result, {
        ttl: options.maxAge || 300000,
        tags: ['payments', 'data'],
        maxSize: 5 * 1024 * 1024,
      })
      return result
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  /**
   * Prefetch dashboard data in a single optimized query
   */
  async prefetchDashboardData(options: PrefetchOptions = {}): Promise<{
    properties: any[]
    tenants: any[]
    payments: any[]
    stats: any
  }> {
    const cacheKey = options.cacheKey || 'dashboard_data'

    const cached = dataCache.get<any>(cacheKey)
    if (cached) return cached

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    const request = this.fetchDashboardDataOptimized(options)
    this.pendingRequests.set(cacheKey, request)

    try {
      const result = await request
      dataCache.set(cacheKey, result, {
        ttl: options.maxAge || 180000, // 3 minutes for dashboard
        tags: ['dashboard', 'data'],
        maxSize: 10 * 1024 * 1024, // 10MB for dashboard data
      })
      return result
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  private async fetchPropertiesWithRelated(propertyIds?: string[], options: PrefetchOptions = {}) {
    let query = supabase.from('properties').select(`
        *,
        lat,
        lng,
        physical_address,
        tenants:tenants(
          id,
          full_name,
          email,
          phone,
          lease_start_date,
          lease_end_date,
          monthly_rent,
          status
        ),
        units:units(
          id,
          unit_number,
          unit_type,
          monthly_rent,
          is_occupied
        )
      `)

    if (propertyIds && propertyIds.length > 0) {
      query = query.in('id', propertyIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error prefetching properties:', error)
      throw error
    }

    return data || []
  }

  private async fetchTenantsWithRelated(tenantIds?: string[], options: PrefetchOptions = {}) {
    let query = supabase.from('tenants').select(`
        *,
        property:properties(
          id,
          name,
          address,
          property_type
        ),
        payments:payments(
          id,
          amount,
          payment_date,
          payment_method,
          status,
          payment_type
        )
      `)

    if (tenantIds && tenantIds.length > 0) {
      query = query.in('id', tenantIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error prefetching tenants:', error)
      throw error
    }

    return data || []
  }

  private async fetchPaymentsWithRelated(paymentIds?: string[], options: PrefetchOptions = {}) {
    let query = supabase.from('payments').select(`
        *,
        tenant:tenants(
          id,
          full_name,
          email,
          property_id
        ),
        property:properties(
          id,
          name,
          address
        )
      `)

    if (paymentIds && paymentIds.length > 0) {
      query = query.in('id', paymentIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error prefetching payments:', error)
      throw error
    }

    return data || []
  }

  private async fetchDashboardDataOptimized(options: PrefetchOptions = {}) {
    // Use Promise.all to fetch all data in parallel
    const [propertiesResult, tenantsResult, paymentsResult] = await Promise.all([
      supabase.from('properties').select(`
          id,
          name,
          address,
          property_type,
          total_units,
          tenants:tenants(count)
        `),

      supabase.from('tenants').select(`
          id,
          full_name,
          monthly_rent,
          status,
          property_id
        `),

      supabase
        .from('payments')
        .select(
          `
          id,
          amount,
          payment_date,
          status,
          tenant_id
        `
        )
        .gte('payment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), // Last 30 days
    ])

    if (propertiesResult.error) throw propertiesResult.error
    if (tenantsResult.error) throw tenantsResult.error
    if (paymentsResult.error) throw paymentsResult.error

    const properties = propertiesResult.data || []
    const tenants = tenantsResult.data || []
    const payments = paymentsResult.data || []

    // Calculate stats
    const stats = this.calculateDashboardStats(properties, tenants, payments)

    return {
      properties,
      tenants,
      payments,
      stats,
    }
  }

  private calculateDashboardStats(properties: any[], tenants: any[], payments: any[]) {
    const totalProperties = properties.length
    const totalTenants = tenants.filter((t) => t.status === 'active').length
    const totalUnits = properties.reduce((sum, p) => sum + (p.total_units || 1), 0)
    const occupiedUnits = tenants.filter((t) => t.status === 'active').length
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

    const monthlyRentPotential = tenants.reduce((sum, t) => sum + (t.monthly_rent || 0), 0)
    const monthlyRentActual = tenants
      .filter((t) => t.status === 'active')
      .reduce((sum, t) => sum + (t.monthly_rent || 0), 0)

    const thisMonthPayments = payments.filter((p) => {
      const paymentDate = new Date(p.payment_date)
      const now = new Date()
      return (
        paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear()
      )
    })

    const overdueAmount = payments
      .filter((p) => p.status === 'overdue')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    return {
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      occupancyRate,
      monthlyRentPotential,
      monthlyRentActual,
      overdueAmount,
      thisMonthRevenue: thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    }
  }

  /**
   * Clear cache entries
   */
  clearCache(pattern?: string) {
    if (pattern) {
      const keys = dataCache.getKeys(new RegExp(pattern))
      keys.forEach((key) => dataCache.delete(key))
    } else {
      dataCache.clear()
    }
  }

  /**
   * Invalidate cache when data changes
   */
  invalidateCache(entityType: 'properties' | 'tenants' | 'payments' | 'dashboard') {
    const tags = [entityType, 'data']
    dataCache.clearByTags(tags)

    // Also clear dashboard cache when any entity changes
    if (entityType !== 'dashboard') {
      dataCache.clearByTags(['dashboard'])
    }
  }
}

export const dataPrefetchingService = new DataPrefetchingService()
export default DataPrefetchingService
