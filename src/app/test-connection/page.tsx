'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function TestConnectionPage() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testConnection = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🔍 Starting connection tests...')
      
      // Test 1: Environment variables
      addResult('1️⃣ Checking environment variables...')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        addResult('❌ Missing environment variables')
        return
      }
      addResult('✅ Environment variables present')
      
      // Test 2: Basic fetch
      addResult('2️⃣ Testing basic fetch...')
      try {
        const response = await fetch(supabaseUrl + '/rest/v1/', {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        })
        addResult(`✅ Basic fetch: ${response.status} ${response.statusText}`)
      } catch (err: any) {
        addResult(`❌ Basic fetch failed: ${err.message}`)
      }
      
      // Test 3: Simple Supabase client
      addResult('3️⃣ Testing simple Supabase client...')
      try {
        const simpleClient = createClient(supabaseUrl, supabaseKey)
        addResult('✅ Simple client created')
        
        const { data, error } = await simpleClient
          .from('properties')
          .select('id')
          .limit(1)
          
        if (error) {
          addResult(`❌ Simple query failed: ${error.message}`)
        } else {
          addResult('✅ Simple query successful')
        }
      } catch (err: any) {
        addResult(`❌ Simple client error: ${err.message}`)
      }
      
      // Test 4: Complex Supabase client (current implementation)
      addResult('4️⃣ Testing current Supabase client...')
      try {
        const { supabase } = await import('../../lib/supabase-client')
        addResult('✅ Current client imported')

        const { data, error } = await supabase
          .from('properties')
          .select('id')
          .limit(1)
          
        if (error) {
          addResult(`❌ Current client query failed: ${error.message}`)
        } else {
          addResult('✅ Current client query successful')
        }
      } catch (err: any) {
        addResult(`❌ Current client error: ${err.message}`)
      }
      
      // Test 5: Auth test
      addResult('5️⃣ Testing auth...')
      try {
        const { supabase } = await import('../../lib/supabase-client')
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          addResult(`❌ Auth error: ${error.message}`)
        } else if (user) {
          addResult(`✅ User authenticated: ${user.email}`)
        } else {
          addResult('ℹ️ No user authenticated')
        }
      } catch (err: any) {
        addResult(`❌ Auth test error: ${err.message}`)
      }
      
    } catch (error: any) {
      addResult(`❌ Unexpected error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Connection Test</h1>
          
          <div className="mb-4">
            <button
              onClick={testConnection}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Run Tests'}
            </button>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="font-semibold mb-2">Test Results:</h2>
            <div className="space-y-1 font-mono text-sm">
              {results.map((result, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {result}
                </div>
              ))}
              {loading && (
                <div className="text-blue-600">Running tests...</div>
              )}
            </div>
          </div>
          
          <div className="mt-6 text-sm text-gray-600">
            <h3 className="font-semibold mb-2">Troubleshooting:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Check browser console for additional errors</li>
              <li>Verify network connectivity</li>
              <li>Check if browser is blocking requests</li>
              <li>Try disabling browser extensions</li>
              <li>Check if you're behind a corporate firewall</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
