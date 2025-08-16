'use client'

import { useState } from 'react'
import supabase from '../../lib/supabase-client'
import { performConnectivityTest, checkSupabaseHealth } from '../../lib/supabase-health'

export default function TestAuthPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testDirectLogin = async () => {
    setLoading(true)
    setResult('Testing direct Supabase login...')

    try {
      console.log('🧪 Testing direct Supabase client login')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@voirental.com',
        password: 'password123'
      })

      console.log('🧪 Direct login result:', { data: data?.user?.email, error })

      if (error) {
        setResult(`❌ Login failed: ${error.message}`)
        console.error('❌ Direct login error:', error)
      } else {
        setResult(`✅ Login successful! User: ${data.user?.email}\n\nRedirecting to dashboard in 3 seconds...`)
        console.log('✅ Direct login successful')

        // Redirect to dashboard after successful login
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 3000)
      }
    } catch (err) {
      console.error('❌ Direct login exception:', err)
      setResult(`❌ Exception: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testEnvironmentVars = () => {
    console.log('🧪 Environment variables check:')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')

    setResult(`
Environment Check:
- URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'Missing'}
- Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
    `)
  }

  const testHealthCheck = async () => {
    setLoading(true)
    setResult('Running Supabase health check...')

    try {
      const health = await checkSupabaseHealth()

      if (health.isHealthy) {
        setResult(`✅ Supabase Health Check Passed!

Latency: ${health.latency}ms
Timestamp: ${health.timestamp.toLocaleString()}`)
      } else {
        setResult(`❌ Supabase Health Check Failed!

Error: ${health.error}
Latency: ${health.latency}ms
Timestamp: ${health.timestamp.toLocaleString()}`)
      }
    } catch (err) {
      setResult(`❌ Health check exception: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testConnectivity = async () => {
    setLoading(true)
    setResult('Running comprehensive connectivity test...')

    try {
      const test = await performConnectivityTest()

      let resultText = `🔍 Comprehensive Connectivity Test Results:

📋 Configuration:
${test.config.isValid ? '✅ Valid' : '❌ Invalid'}
${test.config.errors.length > 0 ? `Errors: ${test.config.errors.join(', ')}` : ''}

🏥 Health Check:
${test.health.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}
${test.health.error ? `Error: ${test.health.error}` : ''}
Latency: ${test.health.latency}ms

💡 Recommendations:
${test.recommendations.length > 0 ? test.recommendations.map(r => `• ${r}`).join('\n') : '• No issues found'}
`

      setResult(resultText)
    } catch (err) {
      setResult(`❌ Connectivity test exception: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Authentication Test</h1>
          <p className="text-gray-600">Debug authentication issues</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={testEnvironmentVars}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Check Environment Variables
          </button>

          <button
            onClick={testHealthCheck}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Health Check'}
          </button>

          <button
            onClick={testConnectivity}
            disabled={loading}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Connectivity Test'}
          </button>

          <button
            onClick={testDirectLogin}
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Direct Login'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">Result:</h3>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <div className="text-center">
          <a href="/auth/login" className="text-blue-600 hover:underline">
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}
