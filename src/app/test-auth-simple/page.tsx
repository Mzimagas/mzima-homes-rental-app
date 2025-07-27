'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase-client'

export default function SimpleAuthTest() {
  const [status, setStatus] = useState<string>('Initializing...')
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    addLog('🔄 Component mounted, testing Supabase initialization...')
    
    // Test basic Supabase client initialization
    try {
      addLog('✅ Supabase client created successfully')
      setStatus('Ready for testing')
    } catch (error) {
      addLog(`❌ Supabase client creation failed: ${error}`)
      setStatus('Failed to initialize')
    }
  }, [])

  const testBasicConnection = async () => {
    setLoading(true)
    addLog('🧪 Testing basic Supabase connection...')

    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        addLog(`❌ getSession failed: ${error.message}`)
      } else {
        addLog(`✅ getSession successful: ${data.session ? 'Has session' : 'No session'}`)
      }
    } catch (error) {
      addLog(`❌ getSession exception: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    addLog('🔐 Testing login with test credentials...')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@mzimahomes.com',
        password: 'TestPassword123!'
      })

      if (error) {
        addLog(`❌ Login failed: ${error.message}`)
      } else {
        addLog(`✅ Login successful: ${data.user?.email}`)
        
        // Test a simple query after login
        setTimeout(async () => {
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser()
            if (userError) {
              addLog(`❌ getUser failed: ${userError.message}`)
            } else {
              addLog(`✅ getUser successful: ${userData.user?.email}`)
            }
          } catch (err) {
            addLog(`❌ getUser exception: ${err}`)
          }
        }, 1000)
      }
    } catch (error) {
      addLog(`❌ Login exception: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogout = async () => {
    setLoading(true)
    addLog('🚪 Testing logout...')

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })

      if (error) {
        addLog(`❌ Logout failed: ${error.message}`)
      } else {
        addLog(`✅ Logout successful`)

        // Verify logout was successful
        setTimeout(async () => {
          try {
            const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession()
            if (sessionError || !sessionCheck.session) {
              addLog(`✅ Session cleared successfully`)
            } else {
              addLog(`❌ Session still exists after logout: ${sessionCheck.session.user.email}`)
            }
          } catch (err) {
            addLog(`✅ Session check failed as expected: ${err}`)
          }
        }, 1000)
      }
    } catch (error) {
      addLog(`❌ Logout exception: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Simple Auth Test</h1>
          <p className="text-gray-600 mt-2">Test Supabase authentication functionality</p>
          <p className="text-sm text-gray-500 mt-1">Status: {status}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={testBasicConnection}
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Test Connection
          </button>

          <button
            onClick={testLogin}
            disabled={loading}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Test Login
          </button>

          <button
            onClick={testLogout}
            disabled={loading}
            className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Test Logout
          </button>

          <button
            onClick={clearLogs}
            className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            Clear Logs
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Logs</h2>
          <div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No logs yet...</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <a href="/test-auth" className="text-blue-600 hover:underline">
            ← Back to Advanced Test
          </a>
        </div>
      </div>
    </div>
  )
}
