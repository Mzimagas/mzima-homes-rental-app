import { RentalManagementService } from '../components/rental-management/services/rental-management.service'

// Public types preserved for compatibility
export interface BaseSearchItem {
  id: string
  type: 'property' | 'tenant' | 'payment' | string
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
  types?: Array<'property' | 'tenant' | 'payment' | string>
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'recency' | 'type'
  filters?: Record<string, any>
  minRelevanceScore?: number
  maxResults?: number
  qualityThreshold?: 'strict' | 'moderate' | 'lenient'
}

export interface SearchSuggestion {
  text: string
  type: 'query' | 'entity' | 'filter'
  count?: number
}

// A simple, reliable search engine with substring + fuzzy matching and clear scoring
class SimpleSearchEngine {
  private items: Map<string, BaseSearchItem> = new Map()

  clear() {
    this.items.clear()
  }

  upsert(item: BaseSearchItem) {
    this.items.set(`${item.type}:${item.id}`, item)
  }

  remove(type: string, id: string) {
    this.items.delete(`${type}:${id}`)
  }

  size(): number {
    return this.items.size
  }

  search(
    query: string,
    opts: { types?: string[]; limit?: number; offset?: number; minScore?: number } = {}
  ) {
    const { types, limit = 50, offset = 0, minScore = 0 } = opts
    const q = query.toLowerCase().trim()
    if (!q) return [] as Array<SearchResult>

    const results: Array<SearchResult> = []

    for (const item of this.items.values()) {
      if (types && types.length > 0 && !types.includes(item.type)) continue

      // Basic filter by metadata if needed in future
      const score = this.score(q, item)
      if (score >= minScore) {
        results.push({ ...item, score, matchedFields: this.getMatchedFields(q, item) })
      }
    }

    results.sort((a, b) => b.score - a.score || b.lastUpdated.getTime() - a.lastUpdated.getTime())

    return results.slice(offset, offset + limit)
  }

  private getMatchedFields(q: string, item: BaseSearchItem): string[] {
    const fields: string[] = []
    if (item.title.toLowerCase().includes(q)) fields.push('title')
    if (item.subtitle.toLowerCase().includes(q)) fields.push('subtitle')
    if (item.description?.toLowerCase().includes(q)) fields.push('description')
    if (item.tags.some((t) => t.toLowerCase().includes(q))) fields.push('tags')
    if (item.searchableText.toLowerCase().includes(q)) fields.push('searchableText')
    return fields
  }

  // Deterministic, unit-scaled scoring that works for short queries and partial tokens
  private score(q: string, item: BaseSearchItem): number {
    const lt = item.title.toLowerCase()
    const ls = item.subtitle.toLowerCase()
    const ld = (item.description || '').toLowerCase()
    const ltext = item.searchableText.toLowerCase()

    let s = 0

    // Exact term in title gets a strong boost
    if (lt.includes(q)) s += 8
    if (ls.includes(q)) s += 4
    if (ld.includes(q)) s += 2
    if (ltext.includes(q)) s += 3

    // Whole word and prefix boosts
    const wordBoundary = new RegExp(`(^|\\b)${escapeRegExp(q)}`, 'i')
    if (wordBoundary.test(lt)) s += 6
    if (wordBoundary.test(ls)) s += 3

    // Very short queries should still surface decent matches
    if (q.length <= 3) {
      if (lt.includes(q)) s += 3
      if (ls.includes(q)) s += 2
      if (ltext.includes(q)) s += 1
    }

    // Recency and priority
    const days = (Date.now() - item.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    if (days < 7) s += 1
    if (days < 1) s += 1

    // Priority multiplier (cap to avoid skew)
    s *= Math.min(Math.max(item.priority, 0.5), 2)

    return s
  }
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Lightweight in-memory recent searches
class RecentSearchesStore {
  private arr: string[] = []
  getAll() {
    return [...this.arr]
  }
  add(q: string) {
    const v = q.trim()
    if (!v) return
    this.arr = [v, ...this.arr.filter((x) => x !== v)].slice(0, 10)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('recentSearches', JSON.stringify(this.arr))
      } catch {}
    }
  }
  load() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('recentSearches')
        if (raw) this.arr = JSON.parse(raw)
      } catch {}
    }
  }
  clear() {
    this.arr = []
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('recentSearches')
      } catch {}
    }
  }
}

export class UniversalSearchService {
  private static instance: UniversalSearchService
  private engine = new SimpleSearchEngine()
  private recent = new RecentSearchesStore()
  private lastIndexUpdate: Date = new Date(0)

  private constructor() {
    this.recent.load()
  }

  static getInstance(): UniversalSearchService {
    if (!UniversalSearchService.instance)
      UniversalSearchService.instance = new UniversalSearchService()
    return UniversalSearchService.instance
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!query || typeof query !== 'string') return []
    const q = query.trim()
    if (!q) return []

    // Default behavior consistent with callers
    const {
      types = ['property', 'tenant', 'payment', 'unit'],
      limit = 50,
      offset = 0,
      minRelevanceScore,
      maxResults,
      qualityThreshold = 'moderate',
    } = options

    await this.ensureIndex()

    this.recent.add(q)

    const minScore = this.mapQualityToMinScore(qualityThreshold, q, minRelevanceScore)

    const results = this.engine.search(q, {
      types: types.length > 0 ? types : undefined,
      limit: maxResults || limit,
      offset,
      minScore,
    })

    return results
  }

  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query || typeof query !== 'string') return this.getDefaultSuggestions()
    const q = query.trim()
    if (!q) return this.getDefaultSuggestions()

    await this.ensureIndex()

    const lower = q.toLowerCase()
    const all = Array.from((this as any).engine['items'].values()) as BaseSearchItem[]

    const entity = all
      .filter(
        (i) => i.title.toLowerCase().includes(lower) || i.subtitle.toLowerCase().includes(lower)
      )
      .slice(0, 5)
      .map((i) => ({ text: i.title, type: 'entity' as const, count: 1 }))

    const queries = this.recent
      .getAll()
      .filter((s) => s.toLowerCase().includes(lower))
      .slice(0, 3)
      .map((s) => ({ text: s, type: 'query' as const }))

    return [...entity, ...queries].slice(0, 8)
  }

  async buildIndex(): Promise<void> {
    await this.buildIndexSync()
  }

  getIndexStats() {
    return {
      totalEntries: this.engine.size(),
      lastUpdate: this.lastIndexUpdate,
      dirtyEntities: 0,
      queuedUpdates: 0,
      indexVersion: 1,
    }
  }

  // Compatibility no-ops for initialization service
  invalidateSearchCache(): void {}
  markEntityDirty(_type: string, _id: string): void {}
  queueIncrementalUpdate(_type: string, _id: string, _action: 'update' | 'delete'): void {}
  invalidateEntityCache(_type: string, _id?: string): void {}

  // Debug helpers preserved
  async forceRebuildIndex(): Promise<void> {
    await this.buildIndexSync()
  }
  async testSearch(): Promise<void> {
    await this.search('test', { maxResults: 5, qualityThreshold: 'lenient' })
  }
  async debugQuery(query: string): Promise<void> {
    await this.search(query, { maxResults: 5, qualityThreshold: 'lenient' })
  }

  getRecentSearches(): string[] {
    return this.recent.getAll()
  }
  clearRecentSearches(): void {
    this.recent.clear()
  }

  // Private
  private async ensureIndex() {
    if (this.engine.size() === 0) {
      await this.buildIndexSync()
    }
  }

  private async buildIndexSync() {
    this.engine.clear()

    // Properties
    try {
      const properties = await RentalManagementService.getRentalProperties()
      for (const p of properties) {
        this.engine.upsert({
          id: p.id,
          type: 'property',
          title: p.name || 'Unnamed Property',
          subtitle: (p as any).address || (p as any).physical_address || 'No address',
          description: `${(p as any).property_type || 'Property'} with ${(p as any).total_units || 0} units`,
          tags: [
            ((p as any).property_type || 'property').toString().toLowerCase(),
            ((p as any).lifecycle_status || 'active').toString().toLowerCase(),
            `${(p as any).total_units || 0}-units`,
          ].filter(Boolean),
          searchableText: [
            p.name,
            (p as any).address,
            (p as any).physical_address,
            (p as any).property_type,
            (p as any).landlord_name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          priority: 1.2,
          lastUpdated: new Date((p as any).updated_at || (p as any).created_at || Date.now()),
          metadata: {
            address: (p as any).address || (p as any).physical_address,
            propertyType: (p as any).property_type,
            units: (p as any).total_units || 0,
            status: (p as any).lifecycle_status,
            landlord: (p as any).landlord_name,
          },
          url: `/dashboard/properties/${p.id}`,
        })
      }
    } catch (e) {
      // swallow; empty index is acceptable
    }

    // Tenants
    try {
      const tenants = await RentalManagementService.getTenants()
      for (const t of tenants) {
        this.engine.upsert({
          id: t.id,
          type: 'tenant',
          title: (t as any).full_name || 'Unnamed Tenant',
          subtitle: (t as any).email || (t as any).phone || 'No contact info',
          description: `Tenant at ${(t as any).current_unit?.properties?.name || 'Unknown Property'}`,
          tags: [
            ((t as any).status || 'active').toString().toLowerCase(),
            'tenant',
            ((t as any).current_unit?.properties?.property_type || '').toString().toLowerCase(),
          ].filter(Boolean),
          searchableText: [
            (t as any).full_name,
            (t as any).email,
            (t as any).phone,
            (t as any).current_unit?.properties?.name,
            (t as any).current_unit?.unit_label,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          priority: 1.1,
          lastUpdated: new Date((t as any).updated_at || (t as any).created_at || Date.now()),
          metadata: {
            email: (t as any).email,
            phone: (t as any).phone,
            propertyName: (t as any).current_unit?.properties?.name,
            unitNumber: (t as any).current_unit?.unit_label,
            status: (t as any).status,
            rentBalance: (t as any).rent_balance || 0,
          },
          url: `/dashboard/rental-management?tenant=${t.id}`,
        })
      }
    } catch (e) {}

    // Payments (placeholder)
    try {
      const payments = await RentalManagementService.getPayments()
      for (const pay of payments) {
        this.engine.upsert({
          id: pay.id,
          type: 'payment',
          title: `Payment - KES ${(pay.amount ?? 0).toLocaleString()}`,
          subtitle: `${pay.payment_method || 'Unknown'} - ${new Date(pay.payment_date).toLocaleDateString()}`,
          description: `Payment by ${pay.tenant_name || 'Unknown Tenant'}`,
          tags: [
            (pay.status || 'completed').toString().toLowerCase(),
            (pay.payment_method || 'unknown').toString().toLowerCase(),
            'payment',
          ].filter(Boolean),
          searchableText: [pay.reference_number, pay.tenant_name, pay.payment_method, pay.notes]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          priority: 1.0,
          lastUpdated: new Date(pay.payment_date || Date.now()),
          metadata: {
            amount: pay.amount,
            method: pay.payment_method,
            tenantName: pay.tenant_name,
            reference: pay.reference_number,
            status: pay.status,
          },
          url: `/dashboard/rental-management?payment=${pay.id}`,
        })
      }
    } catch (e) {}

    this.lastIndexUpdate = new Date()
  }

  private mapQualityToMinScore(
    qt: SearchOptions['qualityThreshold'],
    query: string,
    explicit?: number
  ): number {
    if (typeof explicit === 'number') return explicit
    const short = (query || '').length <= 3
    switch (qt) {
      case 'strict':
        return short ? 5 : 8
      case 'lenient':
        return short ? 1 : 2
      case 'moderate':
      default:
        return short ? 2 : 4
    }
  }

  private getDefaultSuggestions(): SearchSuggestion[] {
    const recents = this.recent
      .getAll()
      .slice(0, 5)
      .map((text) => ({ text, type: 'query' as const }))
    return recents
  }
}

// Export singleton instance
export const universalSearchService = UniversalSearchService.getInstance()
