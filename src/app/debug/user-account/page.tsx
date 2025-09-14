'use client'

import { useState } from 'react'

interface DebugData {
  userInfo?: any
  duplicates?: any
  fixResult?: any
}

export default function UserAccountDebugPage() {
  const [debugData, setDebugData] = useState<DebugData>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/debug/user-info', {
        credentials: 'include'
      })
      const data = await response.json()
      setDebugData(prev => ({ ...prev, userInfo: data }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user info')
    } finally {
      setLoading(false)
    }
  }

  const fetchDuplicates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/debug/user-duplicates', {
        credentials: 'include'
      })
      const data = await response.json()
      setDebugData(prev => ({ ...prev, duplicates: data }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch duplicates')
    } finally {
      setLoading(false)
    }
  }

  const fixUserAccount = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/debug/fix-user-account', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()
      setDebugData(prev => ({ ...prev, fixResult: data }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fix account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">User Account Debug</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid gap-6">
          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Actions</h2>
            <div className="flex gap-4">
              <button
                onClick={fetchUserInfo}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Fetch User Info'}
              </button>
              <button
                onClick={fetchDuplicates}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Check Duplicates'}
              </button>
              <button
                onClick={fixUserAccount}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Fix Account'}
              </button>
            </div>
          </div>

          {/* User Info */}
          {debugData.userInfo && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">User Info</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugData.userInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Duplicates */}
          {debugData.duplicates && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Duplicate Analysis</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugData.duplicates, null, 2)}
              </pre>
            </div>
          )}

          {/* Fix Result */}
          {debugData.fixResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Fix Result</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugData.fixResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
