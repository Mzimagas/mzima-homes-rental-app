'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { supabase } from '../../lib/supabase-client'

export default function SignOutTest() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { user, session, signIn, signOut, loading: authLoading } = useAuth()

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    addLog('🔄 SignOut test page loaded')
    addLog(`   Auth loading: ${authLoading}`)
    addLog(`   User: ${user?.email || 'None'}`)
    addLog(`   Session: ${session ? 'Exists' : 'None'}`)
  }, [user, session, authLoading])

  const testAuthContextSignIn = async () => {
    setLoading(true)
    addLog('🔐 Testing auth context signIn...')

    try {
      const { error } = await signIn('test@mzimahomes.com', 'TestPassword123!')
      
      if (error) {
        addLog(`❌ Auth context signIn failed: ${error}`)
      } else {
        addLog(`✅ Auth context signIn successful`)
      }
    } catch (err) {
      addLog(`❌ Auth context signIn exception: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testAuthContextSignOut = async () => {
    setLoading(true)
    addLog('🚪 Testing auth context signOut...')

    try {
      const { error } = await signOut()
      
      if (error) {
        addLog(`❌ Auth context signOut failed: ${error}`)
      } else {
        addLog(`✅ Auth context signOut successful`)
      }
    } catch (err) {
      addLog(`❌ Auth context signOut exception: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testDirectSignOut = async () => {
    setLoading(true)
    addLog('🚪 Testing direct Supabase signOut...')

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      
      if (error) {
        addLog(`❌ Direct signOut failed: ${error.message}`)
      } else {
        addLog(`✅ Direct signOut successful`)
      }
    } catch (err) {
      addLog(`❌ Direct signOut exception: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const checkCurrentState = async () => {
    addLog('🔍 Checking current authentication state...')
    
    try {
      // Check auth context state
      addLog(`   Auth Context - User: ${user?.email || 'None'}`)
      addLog(`   Auth Context - Session: ${session ? 'Exists' : 'None'}`)
      addLog(`   Auth Context - Loading: ${authLoading}`)
      
      // Check Supabase session directly
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        addLog(`   Supabase Session Error: ${sessionError.message}`)
      } else {
        addLog(`   Supabase Session: ${sessionData.session ? sessionData.session.user.email : 'None'}`)
      }
      
      // Check Supabase user directly
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        addLog(`   Supabase User Error: ${userError.message}`)
      } else {
        addLog(`   Supabase User: ${userData.user ? userData.user.email : 'None'}`)
      }
    } catch (err) {
      addLog(`❌ State check exception: ${err}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const isSignedIn = user && session

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">SignOut Test</h1>
          <p className="text-gray-600 mt-2">Test authentication context signOut functionality</p>
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <p className="text-sm">
              <strong>Current Status:</strong> {isSignedIn ? `Signed in as ${user.email}` : 'Not signed in'}
            </p>
            <p className="text-sm text-gray-500">
              Auth Loading: {authLoading ? 'Yes' : 'No'} | 
              User: {user ? 'Present' : 'None'} | 
              Session: {session ? 'Present' : 'None'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={testAuthContextSignIn}
            disabled={loading || authLoading || isSignedIn}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Auth SignIn'}
          </button>

          <button
            onClick={testAuthContextSignOut}
            disabled={loading || authLoading || !isSignedIn}
            className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Auth SignOut'}
          </button>

          <button
            onClick={testDirectSignOut}
            disabled={loading || !isSignedIn}
            className="bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Direct SignOut'}
          </button>

          <button
            onClick={checkCurrentState}
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Check State
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

        <div className="text-center space-x-4">
          <a href="/test-auth-simple" className="text-blue-600 hover:underline">
            ← Simple Test
          </a>
          <a href="/dashboard" className="text-blue-600 hover:underline">
            Dashboard →
          </a>
        </div>
      </div>
    </div>
  )
}
