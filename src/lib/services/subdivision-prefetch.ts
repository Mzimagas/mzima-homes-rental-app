/**
 * Subdivision Data Prefetching Service
 * Optimizes subdivision property card loading by prefetching related data
 */

import supabase from '../supabase-client'
import { SubdivisionService } from './subdivision'

interface PrefetchCache {
  [key: string]: {
    data: any
    timestamp: number
    expiry: number
  }
}

class SubdivisionPrefetchService {
  private cache: PrefetchCache = {}
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private prefetchPromises: Map<string, Promise<any>> = new Map()

  /**
   * Check if client is ready for requests
   */
  private isClientReady(): boolean {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') return false

      // Check if supabase client is initialized
      const client = getSupabaseClient()
      return Boolean(client && client.auth)
    } catch (error) {
      return false
    }
  }

  /**
   * Prefetch subdivision data for a property
   */
  async prefetchSubdivisionData(propertyId: string): Promise<void> {
    // Early return if client not ready
    if (!this.isClientReady()) {
      return
    }

    const cacheKey = `subdivision-${propertyId}`

    // Check if already cached and fresh
    if (this.isCached(cacheKey)) {
      return
    }

    // Check if already prefetching
    if (this.prefetchPromises.has(cacheKey)) {
      return this.prefetchPromises.get(cacheKey)
    }

    // Start prefetching with timeout
    const prefetchPromise = Promise.race([
      this.fetchSubdivisionData(propertyId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Prefetch timeout')), 5000)
      )
    ])
      .then(data => {
        this.cache[cacheKey] = {
          data,
          timestamp: Date.now(),
          expiry: Date.now() + this.CACHE_DURATION
        }
        this.prefetchPromises.delete(cacheKey)
        return data
      })
      .catch(error => {
        this.prefetchPromises.delete(cacheKey)
        // Silent fail for prefetching - don't log network errors
        if (!error.message?.includes('Failed to fetch')) {
          console.warn(`Failed to prefetch subdivision data for property ${propertyId}:`, error)
        }
        return null
      })

    this.prefetchPromises.set(cacheKey, prefetchPromise)
    return prefetchPromise
  }

  /**
   * Prefetch plots data for a subdivision
   */
  async prefetchPlotsData(subdivisionId: string): Promise<void> {
    // Early return if client not ready
    if (!this.isClientReady()) {
      return
    }

    const cacheKey = `plots-${subdivisionId}`

    if (this.isCached(cacheKey)) {
      return
    }

    if (this.prefetchPromises.has(cacheKey)) {
      return this.prefetchPromises.get(cacheKey)
    }

    const prefetchPromise = Promise.race([
      this.fetchPlotsData(subdivisionId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Prefetch timeout')), 5000)
      )
    ])
      .then(data => {
        this.cache[cacheKey] = {
          data,
          timestamp: Date.now(),
          expiry: Date.now() + this.CACHE_DURATION
        }
        this.prefetchPromises.delete(cacheKey)
        return data
      })
      .catch(error => {
        this.prefetchPromises.delete(cacheKey)
        // Silent fail for prefetching - don't log network errors
        if (!error.message?.includes('Failed to fetch')) {
          console.warn(`Failed to prefetch plots data for subdivision ${subdivisionId}:`, error)
        }
        return null
      })

    this.prefetchPromises.set(cacheKey, prefetchPromise)
    return prefetchPromise
  }

  /**
   * Get cached subdivision data
   */
  getCachedSubdivisionData(propertyId: string): any | null {
    // Special case for "all" subdivisions
    if (propertyId === 'all') {
      const cacheKey = 'subdivisions-all'
      const cached = this.cache[cacheKey]

      if (cached && Date.now() < cached.expiry) {
        return cached.data
      }

      return null
    }

    const cacheKey = `subdivision-${propertyId}`
    const cached = this.cache[cacheKey]

    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }

    return null
  }

  /**
   * Get cached plots data
   */
  getCachedPlotsData(subdivisionId: string): any | null {
    const cacheKey = `plots-${subdivisionId}`
    const cached = this.cache[cacheKey]
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }
    
    return null
  }

  /**
   * Prefetch all subdivisions list
   */
  async prefetchAllSubdivisions(): Promise<void> {
    // Early return if client not ready
    if (!this.isClientReady()) {
      return
    }

    const cacheKey = 'subdivisions-all'

    if (this.isCached(cacheKey)) {
      return
    }

    if (this.prefetchPromises.has(cacheKey)) {
      return this.prefetchPromises.get(cacheKey)
    }

    const prefetchPromise = Promise.race([
      this.fetchAllSubdivisions(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Prefetch timeout')), 8000)
      )
    ])
      .then(data => {
        this.cache[cacheKey] = {
          data,
          timestamp: Date.now(),
          expiry: Date.now() + this.CACHE_DURATION
        }
        this.prefetchPromises.delete(cacheKey)
        return data
      })
      .catch(error => {
        this.prefetchPromises.delete(cacheKey)
        // Silent fail for prefetching - don't log network errors
        if (!error.message?.includes('Failed to fetch')) {
          console.warn('Failed to prefetch all subdivisions:', error)
        }
        return null
      })

    this.prefetchPromises.set(cacheKey, prefetchPromise)
    return prefetchPromise
  }

  /**
   * Batch prefetch for multiple properties
   */
  async batchPrefetchSubdivisions(propertyIds: string[]): Promise<void> {
    // Also prefetch the full list
    this.prefetchAllSubdivisions().catch(() => {})

    const prefetchPromises = propertyIds.map(id =>
      this.prefetchSubdivisionData(id).catch(() => {}) // Ignore individual failures
    )

    await Promise.allSettled(prefetchPromises)
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now()
    Object.keys(this.cache).forEach(key => {
      if (this.cache[key].expiry < now) {
        delete this.cache[key]
      }
    })
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache = {}
    this.prefetchPromises.clear()
  }

  /**
   * Invalidate cache for specific property
   */
  invalidatePropertyCache(propertyId: string): void {
    const subdivisionKey = `subdivision-${propertyId}`
    delete this.cache[subdivisionKey]
    
    // Also invalidate plots cache if we have subdivision data
    const subdivisionData = this.getCachedSubdivisionData(propertyId)
    if (subdivisionData?.id) {
      const plotsKey = `plots-${subdivisionData.id}`
      delete this.cache[plotsKey]
    }
  }

  private isCached(key: string): boolean {
    const cached = this.cache[key]
    return cached && Date.now() < cached.expiry
  }

  private async fetchSubdivisionData(propertyId: string): Promise<any> {
    const { data, error } = await supabase
      .from('property_subdivisions')
      .select('*')
      .eq('original_property_id', propertyId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data
  }

  private async fetchAllSubdivisions(): Promise<any> {
    // Import dynamically to avoid circular dependency
    const { SubdivisionService } = await import('./subdivision')
    return SubdivisionService.loadSubdivisions()
  }

  private async fetchPlotsData(subdivisionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('subdivision_plots')
      .select('*')
      .eq('subdivision_id', subdivisionId)
      .order('plot_number')

    if (error) {
      throw error
    }

    return data || []
  }
}

// Export singleton instance
export const subdivisionPrefetchService = new SubdivisionPrefetchService()

// Auto-cleanup expired cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    subdivisionPrefetchService.clearExpiredCache()
  }, 5 * 60 * 1000)
}
