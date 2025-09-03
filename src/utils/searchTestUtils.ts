/**
 * Simple search test utilities for debugging
 * Use these in the browser console to test search functionality
 */

export async function testSearchService() {
  try {
    console.log('🔍 Testing Universal Search Service...')

    // Dynamic import to avoid build issues
    const { universalSearchService } = await import('../services/UniversalSearchService')

    // Check index stats
    const stats = universalSearchService.getIndexStats()
    console.log('📊 Index Stats:', stats)

    if (stats.totalEntries === 0) {
      console.log('🔄 Index is empty, building...')
      await (universalSearchService as any).forceRebuildIndex()

      const newStats = universalSearchService.getIndexStats()
      console.log('📊 New Index Stats:', newStats)
    }

    // Test searches
    const testQueries = ['test', 'property', 'tenant', 'john', 'payment']

    for (const query of testQueries) {
      try {
        console.log(`\n🔍 Testing query: "${query}"`)
        const results = await universalSearchService.search(query, {
          maxResults: 5,
          qualityThreshold: 'lenient',
        })

        console.log(`✅ Found ${results.length} results:`)
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.title} (${result.type}) - Score: ${result.score}`)
        })
      } catch (error) {
        console.error(`❌ Query "${query}" failed:`, error)
      }
    }

    console.log('\n✅ Search test completed!')
    return true
  } catch (error) {
    console.error('❌ Search test failed:', error)
    return false
  }
}

export async function rebuildSearchIndex() {
  try {
    console.log('🔄 Rebuilding search index...')
    const { universalSearchService } = await import('../services/UniversalSearchService')

    await (universalSearchService as any).forceRebuildIndex()

    const stats = universalSearchService.getIndexStats()
    console.log('✅ Index rebuilt successfully:', stats)

    return stats
  } catch (error) {
    console.error('❌ Index rebuild failed:', error)
    throw error
  }
}

export async function quickSearch(query: string) {
  try {
    // Validate query with detailed logging
    if (!query) {
      console.error('❌ No query provided to quickSearch')
      console.log('💡 Usage: quickSearch("your search term")')
      return []
    }

    if (typeof query !== 'string') {
      console.error('❌ Invalid query type provided to quickSearch:', {
        query,
        type: typeof query,
        expected: 'string',
      })
      console.log('💡 Usage: quickSearch("your search term")')
      return []
    }

    const { universalSearchService } = await import('../services/UniversalSearchService')

    const results = await universalSearchService.search(query, {
      maxResults: 10,
      qualityThreshold: 'lenient',
    })

    console.log(`🔍 Search "${query}": ${results.length} results`)
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} (${result.type}) - Score: ${result.score}`)
    })

    return results
  } catch (error) {
    console.error(`❌ Search "${query}" failed:`, error)
    return []
  }
}

export async function debugQuery(query: string) {
  try {
    // Validate query
    if (!query || typeof query !== 'string') {
      console.error('❌ Invalid query provided:', query)
      return
    }

    const { universalSearchService } = await import('../services/UniversalSearchService')
    await (universalSearchService as any).debugQuery(query)
  } catch (error) {
    console.error(`❌ Debug query "${query}" failed:`, error)
  }
}

// Make functions available globally only when debug is enabled
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_SEARCH_DEBUG === '1') {
  // Add a small delay to ensure everything is loaded
  setTimeout(() => {
    try {
      // Wrap functions to prevent accidental calls with wrong parameters
      ;(window as any).testSearchService = () => {
        console.log('🔍 Starting search service test...')
        return testSearchService()
      }

      ;(window as any).rebuildSearchIndex = () => {
        console.log('🔄 Starting index rebuild...')
        return rebuildSearchIndex()
      }

      ;(window as any).quickSearch = (query?: string) => {
        if (!query || typeof query !== 'string') {
          console.log('🔍 Usage: quickSearch("your search term")')
          console.log('🔍 Example: quickSearch("test")')
          return Promise.resolve([])
        }
        return quickSearch(query)
      }

      ;(window as any).debugQuery = (query?: string) => {
        if (!query || typeof query !== 'string') {
          console.log('🔍 Usage: debugQuery("your search term")')
          console.log('🔍 Example: debugQuery("test")')
          return Promise.resolve()
        }
        return debugQuery(query)
      }

      console.log('🔍 Search test utilities loaded!')
      console.log('🔍 Available functions:')
      console.log('  - testSearchService() - Run full search test')
      console.log('  - rebuildSearchIndex() - Rebuild search index')
      console.log('  - quickSearch("query") - Quick search test')
      console.log('  - debugQuery("query") - Debug specific query with all thresholds')
    } catch (error) {
      console.warn('⚠️ Failed to load search test utilities:', error)
    }
  }, 1000)
}
