'use client'

import React, { useState, useEffect } from 'react'
import { universalSearchService } from '../../services/UniversalSearchService'
import { searchInitializationService } from '../../services/SearchInitializationService'

interface SearchDebugPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchDebugPanel({ isOpen, onClose }: SearchDebugPanelProps) {
  const [stats, setStats] = useState<any>(null)
  const [testQuery, setTestQuery] = useState('test')
  const [testResults, setTestResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      loadStats()
    }
  }, [isOpen])

  const loadStats = () => {
    try {
      const indexStats = universalSearchService.getIndexStats()
      const isReady = searchInitializationService.isReady()
      setStats({
        ...indexStats,
        isReady,
        recentSearches: universalSearchService.getRecentSearches(),
      })
    } catch (error) {
      addLog(`Error loading stats: ${error}`)
    }
  }

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testSearch = async () => {
    setIsLoading(true)
    addLog(`Testing search with query: "${testQuery}"`)

    try {
      const results = await universalSearchService.search(testQuery, {
        maxResults: 10,
        qualityThreshold: 'lenient',
      })
      setTestResults(results)
      addLog(`Search completed: ${results.length} results`)
    } catch (error) {
      addLog(`Search failed: ${error}`)
      setTestResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const rebuildIndex = async () => {
    setIsLoading(true)
    addLog('Starting index rebuild...')

    try {
      await (universalSearchService as any).forceRebuildIndex()
      addLog('Index rebuild completed')
      loadStats()
    } catch (error) {
      addLog(`Index rebuild failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testSearchFunctionality = async () => {
    setIsLoading(true)
    addLog('Testing search functionality...')

    try {
      await (universalSearchService as any).testSearch()
      addLog('Search functionality test completed')
    } catch (error) {
      addLog(`Search test failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = () => {
    try {
      universalSearchService.invalidateSearchCache()
      addLog('Search cache cleared')
    } catch (error) {
      addLog(`Cache clear failed: ${error}`)
    }
  }

  const clearRecentSearches = () => {
    try {
      universalSearchService.clearRecentSearches()
      addLog('Recent searches cleared')
      loadStats()
    } catch (error) {
      addLog(`Clear recent searches failed: ${error}`)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Search Debug Panel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Search Statistics */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Search Statistics</h3>

              {stats ? (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Service Ready:</span>
                    <span
                      className={`text-sm font-medium ${stats.isReady ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {stats.isReady ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Entries:</span>
                    <span className="text-sm font-medium">{stats.totalEntries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Update:</span>
                    <span className="text-sm font-medium">{stats.lastUpdate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Dirty Entities:</span>
                    <span className="text-sm font-medium">{stats.dirtyEntities}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Queued Updates:</span>
                    <span className="text-sm font-medium">{stats.queuedUpdates}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Recent Searches:</span>
                    <span className="text-sm font-medium">{stats.recentSearches.length}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Loading statistics...</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={loadStats}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Refresh Stats
                  </button>
                  <button
                    onClick={rebuildIndex}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
                  >
                    Rebuild Index
                  </button>
                  <button
                    onClick={clearCache}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Clear Cache
                  </button>
                  <button
                    onClick={clearRecentSearches}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear Recent
                  </button>
                  <button
                    onClick={testSearchFunctionality}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                  >
                    Test Search
                  </button>
                </div>
              </div>
            </div>

            {/* Test Search */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Test Search</h3>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Enter test query..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={testSearch}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* Test Results */}
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Results ({testResults.length})
                </h4>
                {testResults.length > 0 ? (
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div key={index} className="bg-white rounded p-2 text-xs">
                        <div className="font-medium">{result.title}</div>
                        <div className="text-gray-600">{result.subtitle}</div>
                        <div className="text-gray-500">
                          Type: {result.type} | Score: {result.score}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No results</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Searches */}
          {stats?.recentSearches?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-medium text-gray-900 mb-2">Recent Searches</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {stats.recentSearches.map((search: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setTestQuery(search)}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Debug Logs */}
          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-900 mb-2">Debug Logs</h3>
            <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-xs max-h-32 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log, index) => <div key={index}>{log}</div>)
              ) : (
                <div className="text-gray-500">No logs yet...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
