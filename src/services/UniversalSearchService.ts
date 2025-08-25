import { RentalManagementService } from '../components/rental-management/services/rental-management.service'

// Search item interfaces
export interface BaseSearchItem {
  id: string
  type: 'property' | 'tenant' | 'payment' | 'unit' | 'document' | 'maintenance'
  title: string
  subtitle: string
  description?: string
  tags: string[]
  searchableText: string
  priority: number
  lastUpdated: Date
  metadata: Record<string, any>
  url?: string
}

export interface SearchResult extends BaseSearchItem {
  score: number
  matchedFields: string[]
  highlightedText?: string
}

export interface SearchOptions {
  types?: string[]
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'date' | 'alphabetical'
  filters?: Record<string, any>
}

export interface SearchSuggestion {
  text: string
  type: 'query' | 'entity' | 'filter'
  count?: number
}

/**
 * Universal Search Service for comprehensive dashboard search
 */
export class UniversalSearchService {
  private static instance: UniversalSearchService
  private searchIndex: Map<string, BaseSearchItem> = new Map()
  private lastIndexUpdate: Date = new Date(0)
  private indexingInProgress = false
  private recentSearches: string[] = []
  private savedSearches: Map<string, string> = new Map()
  private searchCache: Map<string, { results: SearchResult[], timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds cache

  private constructor() {
    this.loadRecentSearches()
    this.loadSavedSearches()
  }

  static getInstance(): UniversalSearchService {
    if (!UniversalSearchService.instance) {
      UniversalSearchService.instance = new UniversalSearchService()
    }
    return UniversalSearchService.instance
  }

  /**
   * Perform universal search across all data types
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!query.trim()) return []

    // Check cache first
    const cacheKey = `${query}-${JSON.stringify(options)}`
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.results
    }

    // Ensure index is up to date
    await this.ensureIndexFreshness()

    // Save search query
    this.saveRecentSearch(query)

    const {
      types = ['property', 'tenant', 'payment', 'unit'],
      limit = 50,
      offset = 0,
      sortBy = 'relevance',
      filters = {}
    } = options

    // Get all items from index
    const allItems = Array.from(this.searchIndex.values())

    // Filter by types
    const filteredItems = allItems.filter(item => types.includes(item.type))

    // Perform search
    const results = this.performSearch(query, filteredItems)

    // Apply additional filters
    const filteredResults = this.applyFilters(results, filters)

    // Sort results
    const sortedResults = this.sortResults(filteredResults, sortBy)

    // Apply pagination
    const paginatedResults = sortedResults.slice(offset, offset + limit)

    // Cache results
    this.searchCache.set(cacheKey, {
      results: paginatedResults,
      timestamp: Date.now()
    })

    // Clean old cache entries (keep cache size manageable)
    if (this.searchCache.size > 100) {
      const oldestEntries = Array.from(this.searchCache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)
        .slice(0, 50)

      oldestEntries.forEach(([key]) => this.searchCache.delete(key))
    }

    return paginatedResults
  }

  /**
   * Get search suggestions based on query
   */
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query.trim()) return this.getDefaultSuggestions()

    await this.ensureIndexFreshness()

    const suggestions: SearchSuggestion[] = []
    const lowerQuery = query.toLowerCase()

    // Entity suggestions
    const allItems = Array.from(this.searchIndex.values())
    const entityMatches = allItems
      .filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        item.subtitle.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5)
      .map(item => ({
        text: item.title,
        type: 'entity' as const,
        count: 1
      }))

    suggestions.push(...entityMatches)

    // Query suggestions from recent searches
    const queryMatches = this.recentSearches
      .filter(search => search.toLowerCase().includes(lowerQuery))
      .slice(0, 3)
      .map(search => ({
        text: search,
        type: 'query' as const
      }))

    suggestions.push(...queryMatches)

    // Filter suggestions
    if (query.includes(':')) {
      const filterSuggestions = this.getFilterSuggestions(query)
      suggestions.push(...filterSuggestions)
    }

    return suggestions.slice(0, 8)
  }

  /**
   * Build or rebuild the search index
   */
  async buildIndex(): Promise<void> {
    if (this.indexingInProgress) return

    this.indexingInProgress = true
    console.log('Building search index...')

    try {
      this.searchIndex.clear()

      // Index properties
      await this.indexProperties()

      // Index tenants
      await this.indexTenants()

      // Index payments
      await this.indexPayments()

      this.lastIndexUpdate = new Date()
      console.log(`Search index built with ${this.searchIndex.size} items`)
    } catch (error) {
      console.error('Error building search index:', error)
    } finally {
      this.indexingInProgress = false
    }
  }

  /**
   * Update index for specific data type
   */
  async updateIndex(type: string, items: any[]): Promise<void> {
    // Remove existing items of this type
    for (const [key, item] of this.searchIndex.entries()) {
      if (item.type === type) {
        this.searchIndex.delete(key)
      }
    }

    // Add new items
    switch (type) {
      case 'property':
        this.indexPropertyItems(items)
        break
      case 'tenant':
        this.indexTenantItems(items)
        break
      case 'payment':
        this.indexPaymentItems(items)
        break
    }
  }

  /**
   * Get recent searches
   */
  getRecentSearches(): string[] {
    return [...this.recentSearches]
  }

  /**
   * Save a search query
   */
  saveRecentSearch(query: string): void {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || typeof window === 'undefined') return

    // Remove if already exists
    this.recentSearches = this.recentSearches.filter(q => q !== trimmedQuery)

    // Add to beginning
    this.recentSearches.unshift(trimmedQuery)

    // Keep only last 10
    this.recentSearches = this.recentSearches.slice(0, 10)

    // Save to localStorage
    try {
      localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches))
    } catch (error) {
      console.warn('Failed to save recent search:', error)
    }
  }

  /**
   * Clear recent searches
   */
  clearRecentSearches(): void {
    this.recentSearches = []
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('recentSearches')
      } catch (error) {
        console.warn('Failed to clear recent searches:', error)
      }
    }
  }

  // Private methods

  private async ensureIndexFreshness(): Promise<void> {
    // Only rebuild if index is empty or explicitly requested
    // Remove automatic time-based rebuilding to improve performance
    if (this.searchIndex.size === 0 && !this.indexingInProgress) {
      await this.buildIndex()
    }
  }

  /**
   * Force index rebuild (call this when data actually changes)
   */
  async forceIndexRebuild(): Promise<void> {
    this.lastIndexUpdate = new Date(0) // Reset timestamp
    await this.buildIndex()
  }

  private performSearch(query: string, items: BaseSearchItem[]): SearchResult[] {
    const lowerQuery = query.toLowerCase()
    const results: SearchResult[] = []

    for (const item of items) {
      const score = this.calculateRelevanceScore(lowerQuery, item)
      if (score > 0) {
        results.push({
          ...item,
          score,
          matchedFields: this.getMatchedFields(lowerQuery, item)
        })
      }
    }

    return results
  }

  private calculateRelevanceScore(query: string, item: BaseSearchItem): number {
    let score = 0
    const lowerTitle = item.title.toLowerCase()
    const lowerSubtitle = item.subtitle.toLowerCase()
    const lowerSearchableText = item.searchableText.toLowerCase()

    // Exact title match (highest score)
    if (lowerTitle === query) score += 100

    // Title starts with query
    if (lowerTitle.startsWith(query)) score += 80

    // Title contains query
    if (lowerTitle.includes(query)) score += 60

    // Subtitle contains query
    if (lowerSubtitle.includes(query)) score += 40

    // Searchable text contains query
    if (lowerSearchableText.includes(query)) score += 20

    // Tag matches
    for (const tag of item.tags) {
      if (tag.toLowerCase().includes(query)) score += 30
    }

    // Boost recent items
    const daysSinceUpdate = (Date.now() - item.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate < 7) score += 10
    if (daysSinceUpdate < 1) score += 20

    // Apply priority multiplier
    score *= item.priority

    return score
  }

  private getMatchedFields(query: string, item: BaseSearchItem): string[] {
    const fields: string[] = []
    const lowerQuery = query.toLowerCase()

    if (item.title.toLowerCase().includes(lowerQuery)) fields.push('title')
    if (item.subtitle.toLowerCase().includes(lowerQuery)) fields.push('subtitle')
    if (item.description?.toLowerCase().includes(lowerQuery)) fields.push('description')
    if (item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) fields.push('tags')

    return fields
  }

  private applyFilters(results: SearchResult[], filters: Record<string, any>): SearchResult[] {
    let filtered = results

    for (const [key, value] of Object.entries(filters)) {
      filtered = filtered.filter(item => {
        const metadataValue = item.metadata[key]
        if (Array.isArray(value)) {
          return value.includes(metadataValue)
        }
        return metadataValue === value
      })
    }

    return filtered
  }

  private sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
    switch (sortBy) {
      case 'date':
        return results.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      case 'alphabetical':
        return results.sort((a, b) => a.title.localeCompare(b.title))
      case 'relevance':
      default:
        return results.sort((a, b) => b.score - a.score)
    }
  }

  private async indexProperties(): Promise<void> {
    try {
      const properties = await RentalManagementService.getRentalProperties()
      this.indexPropertyItems(properties)
    } catch (error) {
      console.error('Error indexing properties:', error)
    }
  }

  private indexPropertyItems(properties: any[]): void {
    for (const property of properties) {
      const searchItem: BaseSearchItem = {
        id: property.id,
        type: 'property',
        title: property.name || 'Unnamed Property',
        subtitle: property.address || property.physical_address || 'No address',
        description: `${property.property_type || 'Property'} with ${property.total_units || 0} units`,
        tags: [
          property.property_type?.toLowerCase() || 'property',
          property.lifecycle_status?.toLowerCase() || 'active',
          `${property.total_units || 0}-units`
        ].filter(Boolean),
        searchableText: [
          property.name,
          property.address,
          property.physical_address,
          property.property_type,
          property.landlord_name
        ].filter(Boolean).join(' ').toLowerCase(),
        priority: 1.2,
        lastUpdated: new Date(property.updated_at || property.created_at || Date.now()),
        metadata: {
          address: property.address || property.physical_address,
          propertyType: property.property_type,
          units: property.total_units || 0,
          status: property.lifecycle_status,
          landlord: property.landlord_name
        },
        url: `/dashboard/properties/${property.id}`
      }

      this.searchIndex.set(`property-${property.id}`, searchItem)
    }
  }

  private async indexTenants(): Promise<void> {
    try {
      const tenants = await RentalManagementService.getTenants()
      this.indexTenantItems(tenants)
    } catch (error) {
      console.error('Error indexing tenants:', error)
    }
  }

  private indexTenantItems(tenants: any[]): void {
    for (const tenant of tenants) {
      const searchItem: BaseSearchItem = {
        id: tenant.id,
        type: 'tenant',
        title: tenant.full_name || 'Unnamed Tenant',
        subtitle: tenant.email || tenant.phone || 'No contact info',
        description: `Tenant at ${tenant.current_unit?.properties?.name || 'Unknown Property'}`,
        tags: [
          tenant.status?.toLowerCase() || 'active',
          'tenant',
          tenant.current_unit?.properties?.property_type?.toLowerCase()
        ].filter(Boolean),
        searchableText: [
          tenant.full_name,
          tenant.email,
          tenant.phone,
          tenant.current_unit?.properties?.name,
          tenant.current_unit?.unit_label
        ].filter(Boolean).join(' ').toLowerCase(),
        priority: 1.1,
        lastUpdated: new Date(tenant.updated_at || tenant.created_at || Date.now()),
        metadata: {
          email: tenant.email,
          phone: tenant.phone,
          propertyName: tenant.current_unit?.properties?.name,
          unitNumber: tenant.current_unit?.unit_label,
          status: tenant.status,
          rentBalance: tenant.rent_balance || 0
        },
        url: `/dashboard/rental-management?tenant=${tenant.id}`
      }

      this.searchIndex.set(`tenant-${tenant.id}`, searchItem)
    }
  }

  private async indexPayments(): Promise<void> {
    try {
      const payments = await RentalManagementService.getPayments()
      this.indexPaymentItems(payments)
    } catch (error) {
      console.error('Error indexing payments:', error)
    }
  }

  private indexPaymentItems(payments: any[]): void {
    for (const payment of payments) {
      const searchItem: BaseSearchItem = {
        id: payment.id,
        type: 'payment',
        title: `Payment - KES ${payment.amount?.toLocaleString() || '0'}`,
        subtitle: `${payment.payment_method || 'Unknown'} - ${new Date(payment.payment_date).toLocaleDateString()}`,
        description: `Payment by ${payment.tenant_name || 'Unknown Tenant'}`,
        tags: [
          payment.status?.toLowerCase() || 'completed',
          payment.payment_method?.toLowerCase() || 'unknown',
          'payment'
        ].filter(Boolean),
        searchableText: [
          payment.reference_number,
          payment.tenant_name,
          payment.payment_method,
          payment.notes
        ].filter(Boolean).join(' ').toLowerCase(),
        priority: 1.0,
        lastUpdated: new Date(payment.payment_date || payment.created_at || Date.now()),
        metadata: {
          amount: payment.amount || 0,
          method: payment.payment_method,
          tenantName: payment.tenant_name,
          date: payment.payment_date,
          reference: payment.reference_number,
          status: payment.status
        },
        url: `/dashboard/payments?payment=${payment.id}`
      }

      this.searchIndex.set(`payment-${payment.id}`, searchItem)
    }
  }

  private getDefaultSuggestions(): SearchSuggestion[] {
    return [
      { text: 'Recent searches', type: 'query' },
      ...this.recentSearches.slice(0, 5).map(search => ({
        text: search,
        type: 'query' as const
      }))
    ]
  }

  private getFilterSuggestions(query: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = []
    
    if (query.startsWith('type:')) {
      suggestions.push(
        { text: 'type:property', type: 'filter' },
        { text: 'type:tenant', type: 'filter' },
        { text: 'type:payment', type: 'filter' }
      )
    }

    if (query.startsWith('status:')) {
      suggestions.push(
        { text: 'status:active', type: 'filter' },
        { text: 'status:pending', type: 'filter' },
        { text: 'status:completed', type: 'filter' }
      )
    }

    return suggestions
  }

  private loadRecentSearches(): void {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('recentSearches')
      if (saved) {
        this.recentSearches = JSON.parse(saved)
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error)
    }
  }

  private loadSavedSearches(): void {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('savedSearches')
      if (saved) {
        this.savedSearches = new Map(JSON.parse(saved))
      }
    } catch (error) {
      console.warn('Failed to load saved searches:', error)
    }
  }
}

// Export singleton instance
export const universalSearchService = UniversalSearchService.getInstance()
