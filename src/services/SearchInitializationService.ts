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

  private constructor() {}

  static getInstance(): SearchInitializationService {
    if (!SearchInitializationService.instance) {
      SearchInitializationService.instance = new SearchInitializationService()
    }
    return SearchInitializationService.instance
  }

  /**
   * Initialize the search service and build the index
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.isInitializing) {
      return this.initializationPromise!
    }

    this.isInitializing = true
    this.initializationPromise = this.performInitialization()

    try {
      await this.initializationPromise
      this.isInitialized = true
      console.log('✅ Search service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize search service:', error)
      // Don't throw error - allow app to continue working
      console.log('⚠️ App will continue, search will build index on first use')
    } finally {
      this.isInitializing = false
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
   * Perform the actual initialization
   */
  private async performInitialization(): Promise<void> {
    console.log('🔍 Initializing search service...')

    try {
      // Check if index needs to be built
      const stats = universalSearchService.getIndexStats()

      if (stats.totalEntries === 0) {
        console.log('📊 Building initial search index...')
        await universalSearchService.buildIndex()
      } else {
        console.log(`📊 Search index already exists with ${stats.totalEntries} entries`)

        // Check if index is stale (older than 1 hour)
        const indexAge = Date.now() - stats.lastUpdate.getTime()
        const oneHour = 60 * 60 * 1000

        if (indexAge > oneHour) {
          console.log('🔄 Search index is stale, rebuilding...')
          await universalSearchService.buildIndex()
        }
      }

      // Verify the index is working
      await this.verifySearchFunctionality()
    } catch (error) {
      console.error('❌ Search initialization failed:', error)

      // Try to build a minimal index as fallback
      try {
        console.log('🔄 Attempting fallback initialization...')
        await this.fallbackInitialization()
      } catch (fallbackError) {
        console.error('❌ Fallback initialization also failed:', fallbackError)
        throw new Error('Search service initialization failed completely')
      }
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
