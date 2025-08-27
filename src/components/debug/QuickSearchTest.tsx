'use client'

import React, { useState, useEffect } from 'react'
import { universalSearchService } from '../../services/UniversalSearchService'

export default function QuickSearchTest() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [indexStats, setIndexStats] = useState<any>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = () => {
    try {
      const stats = universalSearchService.getIndexStats()
      setIndexStats(stats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const testSearch = async (query: string) => {
    setLoading(true)
    try {
      console.log(`Testing search with: "${query}"`)
      const searchResults = await universalSearchService.search(query, {
        maxResults: 10,
        qualityThreshold: 'lenient',
      })
      setResults(searchResults)
      console.log(`Search results:`, searchResults)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const rebuildIndex = async () => {
    setLoading(true)
    try {
      console.log('Rebuilding search index...')
      await (universalSearchService as any).forceRebuildIndex()
      loadStats()
      console.log('Index rebuilt successfully')
    } catch (error) {
      console.error('Index rebuild failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const testQueries = ['test', 'property', 'tenant', 'john', 'jane', 'payment', 'building']

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Search Test</h3>

        {/* Index Stats */}
        <div className="text-xs text-gray-600 mb-2">
          Index: {indexStats?.totalEntries || 0} items
          {indexStats && (
            <span className="ml-2">(Updated: {indexStats.lastUpdate.toLocaleTimeString()})</span>
          )}
        </div>

        {/* Rebuild Button */}
        <button
          onClick={rebuildIndex}
          disabled={loading}
          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50 mb-2"
        >
          {loading ? 'Rebuilding...' : 'Rebuild Index'}
        </button>
      </div>

      {/* Test Queries */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">Quick Tests:</div>
        <div className="flex flex-wrap gap-1">
          {testQueries.map((query) => (
            <button
              key={query}
              onClick={() => testSearch(query)}
              disabled={loading}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Custom search..."
          className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              testSearch((e.target as HTMLInputElement).value)
            }
          }}
        />
      </div>

      {/* Results */}
      <div className="max-h-32 overflow-y-auto">
        <div className="text-xs text-gray-600 mb-1">
          Results: {results.length} {loading && '(searching...)'}
        </div>
        {results.length > 0 ? (
          <div className="space-y-1">
            {results.slice(0, 5).map((result, index) => (
              <div key={index} className="text-xs bg-gray-50 p-1 rounded">
                <div className="font-medium">{result.title}</div>
                <div className="text-gray-500">
                  {result.type} | Score: {result.score}
                </div>
              </div>
            ))}
            {results.length > 5 && (
              <div className="text-xs text-gray-500">...and {results.length - 5} more</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500">{loading ? 'Searching...' : 'No results'}</div>
        )}
      </div>
    </div>
  )
}
