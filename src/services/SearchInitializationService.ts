/**
 * Search Initialization Service
 * Ensures the search index is properly built and maintained
 */

import { universalSearchService } from './UniversalSearchService'

export class SearchInitializationService {
  private static instance: SearchInitializationService
  private isInitialized = false
  private isInitializing = false
  private initializationPromise: Promise<void> | null = null
  private hasBuiltIndex = false
  private indexBuildPromise: Promise<void> | null = null

  private constructor() {}

  static getInstance(): SearchInitializationService {
    if (!SearchInitializationService.instance) {
      SearchInitializationService.instance = new SearchInitializationService()
    }
    return SearchInitializationService.instance
  }

  /**
   * Initialize the search service (lightweight initialization)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.isInitializing) {
      return this.initializationPromise!
    }

    this.isInitializing = true
    this.initializationPromise = this.performLightweightInitialization()

    try {
      await this.initializationPromise
      this.isInitialized = true
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Search service initialized successfully (lightweight)')
      }
    } catch (error) {
      console.error('❌ Failed to initialize search service:', error)
      // Don't throw error - allow app to continue working
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ App will continue, search will build index on first use')
      }
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * Lazy build index only when first search is performed
   */
  async ensureIndexBuilt(): Promise<void> {
    if (this.hasBuiltIndex) {
      return
    }

    if (this.indexBuildPromise) {
      return this.indexBuildPromise
    }

    this.indexBuildPromise = this.buildIndexOnDemand()

    try {
      await this.indexBuildPromise
      this.hasBuiltIndex = true
    } catch (error) {
      console.error('❌ Failed to build search index:', error)
      this.indexBuildPromise = null // Allow retry
      throw error
    }
  }

  /**
   * Check if the search service is ready
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Force rebuild the search index
   */
  async rebuildIndex(): Promise<void> {
    console.log('🔄 Rebuilding search index...')
    try {
      await universalSearchService.buildIndex()
      console.log('✅ Search index rebuilt successfully')
    } catch (error) {
      console.error('❌ Failed to rebuild search index:', error)
      throw error
    }
  }

  /**
   * Get search service statistics
   */
  getStats() {
    return universalSearchService.getIndexStats()
  }

  /**
   * Lightweight initialization - just prepare the service without building index
   */
  private async performLightweightInitialization(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Initializing search service (lightweight)...')
    }

    try {
      // Just verify the service is available, don't build index yet
      const stats = universalSearchService.getIndexStats()

      if (stats.totalEntries > 0) {
        this.hasBuiltIndex = true
        if (process.env.NODE_ENV !== 'production') {
          console.log(`📊 Search index already exists with ${stats.totalEntries} entries`)
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Search service not immediately available, will build on demand')
      }
    }
  }

  /**
   * Build index on demand (when first search is performed)
   */
  private async buildIndexOnDemand(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Building search index on demand...')
    }

    try {
      const stats = universalSearchService.getIndexStats()

      if (stats.totalEntries === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📊 Building initial search index...')
        }
        await universalSearchService.buildIndex()
      } else {
        // Check if index is stale (older than 1 hour)
        const indexAge = Date.now() - stats.lastUpdate.getTime()
        const oneHour = 60 * 60 * 1000

        if (indexAge > oneHour) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('🔄 Search index is stale, rebuilding...')
          }
          await universalSearchService.buildIndex()
        }
      }

      // Quick verification
      await this.verifySearchFunctionality()
    } catch (error) {
      console.error('❌ On-demand index build failed:', error)
      throw error
    }
  }

  /**
   * Verify that search functionality is working
   */
  private async verifySearchFunctionality(): Promise<void> {
    try {
      // Perform a simple test search
      const testResults = await universalSearchService.search('test', {
        maxResults: 1,
        qualityThreshold: 'lenient',
      })

      console.log(`🧪 Search verification: ${testResults.length} results for test query`)
    } catch (error) {
      console.warn('⚠️ Search verification failed:', error)
      // Don't throw here as this is just a verification step
    }
  }

  /**
   * Fallback initialization with minimal functionality
   */
  private async fallbackInitialization(): Promise<void> {
    // Clear any corrupted index
    universalSearchService.invalidateSearchCache()

    // Try to build a minimal index with error handling
    try {
      await universalSearchService.buildIndex()
    } catch (error) {
      console.warn('⚠️ Could not build full index, search will have limited functionality')
      // Continue anyway - search will work with empty index and build incrementally
    }
  }

  /**
   * Schedule periodic index updates
   */
  startPeriodicUpdates(): void {
    // Update index every 30 minutes
    setInterval(
      async () => {
        try {
          const stats = universalSearchService.getIndexStats()

          // Only update if there are dirty entities or it's been a while
          if (stats.dirtyEntities > 0 || stats.queuedUpdates > 0) {
            console.log('🔄 Performing periodic search index update...')
            await universalSearchService.buildIndex()
          }
        } catch (error) {
          console.warn('⚠️ Periodic search update failed:', error)
        }
      },
      30 * 60 * 1000
    ) // 30 minutes
  }

  /**
   * Handle data changes that require index updates
   */
  onDataChange(entityType: string, entityId: string, action: 'create' | 'update' | 'delete'): void {
    if (action === 'delete') {
      universalSearchService.queueIncrementalUpdate(entityType, entityId, 'delete')
    } else {
      universalSearchService.markEntityDirty(entityType, entityId)
    }
  }

  /**
   * Invalidate cache for specific entity types
   */
  invalidateCache(entityType?: string, entityId?: string): void {
    if (entityType) {
      universalSearchService.invalidateEntityCache(entityType, entityId)
    } else {
      universalSearchService.invalidateSearchCache()
    }
  }
}

// Export singleton instance
export const searchInitializationService = SearchInitializationService.getInstance()

// Auto-initialize when imported (with error handling)
if (typeof window !== 'undefined') {
  // Initialize after a short delay to avoid blocking app startup
  setTimeout(async () => {
    try {
      await searchInitializationService.initialize()
      searchInitializationService.startPeriodicUpdates()
    } catch (error) {
      console.warn('⚠️ Search service auto-initialization failed:', error)
      // App will continue to work, search just won't be available initially
    }
  }, 1000)
}
