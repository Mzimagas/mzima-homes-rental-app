'use client'

import { useState, useEffect } from 'react'

export default function DebugPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        // Test current user
        const userResponse = await fetch('/api/debug/current-user', {
          credentials: 'include'
        })
        const userData = await userResponse.json()

        // Test dashboard
        const dashboardResponse = await fetch('/api/clients/dashboard', {
          credentials: 'include'
        })
        const dashboardData = await dashboardResponse.json()

        // Test interests
        const interestsResponse = await fetch('/api/debug/interests', {
          credentials: 'include'
        })
        const interestsData = await interestsResponse.json()

        setDebugData({
          user: userData,
          dashboard: dashboardData,
          interests: interestsData
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDebugData()
  }, [])

  if (loading) return <div className="p-8">Loading debug data...</div>
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
      
      <div className="space-y-8">
        {/* Current User */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugData?.user, null, 2)}
          </pre>
        </div>

        {/* Dashboard Data */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugData?.dashboard, null, 2)}
          </pre>
        </div>

        {/* All Interests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">All Interests (Recent 20)</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugData?.interests, null, 2)}
          </pre>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/client-portal'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Client Portal
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 ml-2"
            >
              Refresh Debug Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
