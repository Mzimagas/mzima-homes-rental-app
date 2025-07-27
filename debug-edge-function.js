#!/usr/bin/env node

/**
 * Debug script to test the process-notifications Edge Function
 * This will help identify why the FunctionsFetchError is occurring
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function testEdgeFunctionDirectly() {
  console.log('🔍 Testing Edge Function directly...')
  
  try {
    // Test 1: Direct HTTP request to the Edge Function
    const functionUrl = `${supabaseUrl}/functions/v1/process-notifications`
    console.log(`📡 Function URL: ${functionUrl}`)
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({})
    })
    
    console.log(`📊 Response status: ${response.status}`)
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Direct HTTP request succeeded!')
      console.log('📄 Response data:', JSON.stringify(data, null, 2))
      return true
    } else {
      const errorText = await response.text()
      console.log('❌ Direct HTTP request failed!')
      console.log('📄 Error response:', errorText)
      return false
    }
    
  } catch (err) {
    console.error('❌ Direct HTTP request error:', err.message)
    return false
  }
}

async function testEdgeFunctionViaSupabase() {
  console.log('\n🔍 Testing Edge Function via Supabase client...')
  
  try {
    const { data, error } = await supabase.functions.invoke('process-notifications', {
      body: {}
    })
    
    if (error) {
      console.error('❌ Supabase client error:', error)
      console.error('📄 Error details:', JSON.stringify(error, null, 2))
      return false
    }
    
    console.log('✅ Supabase client request succeeded!')
    console.log('📄 Response data:', JSON.stringify(data, null, 2))
    return true
    
  } catch (err) {
    console.error('❌ Supabase client exception:', err.message)
    console.error('📄 Exception details:', err)
    return false
  }
}

async function testWithAuthentication() {
  console.log('\n🔍 Testing with authenticated user...')
  
  try {
    // Create a test user and sign in
    const testEmail = `edge-test-${Date.now()}@test.com`
    const testPassword = 'password123'
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })

    if (createError) {
      console.error('❌ Failed to create test user:', createError)
      return false
    }

    console.log(`✅ Created test user: ${testEmail}`)

    // Sign in with the test user
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signInError) {
      console.error('❌ Failed to sign in:', signInError)
      return false
    }

    console.log('✅ Signed in successfully')

    // Test the Edge Function with authenticated user
    const { data, error } = await supabase.functions.invoke('process-notifications', {
      body: {}
    })

    if (error) {
      console.error('❌ Authenticated request failed:', error)
      console.error('📄 Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Authenticated request succeeded!')
      console.log('📄 Response data:', JSON.stringify(data, null, 2))
    }

    // Clean up
    await supabase.auth.signOut()
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    console.log('✅ Test user cleaned up')
    
    return !error
    
  } catch (err) {
    console.error('❌ Authentication test error:', err.message)
    return false
  }
}

async function checkEdgeFunctionDeployment() {
  console.log('\n🔍 Checking Edge Function deployment status...')
  
  try {
    // Try to list functions (this might not work with anon key)
    const response = await fetch(`${supabaseUrl}/functions/v1/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    })
    
    if (response.ok) {
      const functions = await response.json()
      console.log('📋 Available functions:', functions)
      
      const processNotificationsExists = functions.some(f => f.name === 'process-notifications')
      if (processNotificationsExists) {
        console.log('✅ process-notifications function is deployed')
      } else {
        console.log('❌ process-notifications function is NOT deployed')
      }
    } else {
      console.log('⚠️ Could not list functions (this is normal with some Supabase configurations)')
    }
    
  } catch (err) {
    console.log('⚠️ Could not check function deployment:', err.message)
  }
}

async function testNetworkConnectivity() {
  console.log('\n🔍 Testing network connectivity...')
  
  try {
    // Test basic connectivity to Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey
      }
    })
    
    if (response.ok) {
      console.log('✅ Basic Supabase connectivity works')
    } else {
      console.log('❌ Basic Supabase connectivity failed:', response.status)
    }
    
    // Test functions endpoint specifically
    const functionsResponse = await fetch(`${supabaseUrl}/functions/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey
      }
    })
    
    console.log(`📊 Functions endpoint status: ${functionsResponse.status}`)
    
  } catch (err) {
    console.error('❌ Network connectivity test failed:', err.message)
  }
}

async function main() {
  console.log('🚀 Debugging Edge Function FunctionsFetchError...')
  console.log(`📡 Supabase URL: ${supabaseUrl}`)
  console.log(`🔑 Using anon key: ${supabaseAnonKey.substring(0, 20)}...`)
  
  // Run all tests
  const results = {
    networkConnectivity: false,
    directHttp: false,
    supabaseClient: false,
    authenticated: false
  }
  
  await testNetworkConnectivity()
  await checkEdgeFunctionDeployment()
  
  results.directHttp = await testEdgeFunctionDirectly()
  results.supabaseClient = await testEdgeFunctionViaSupabase()
  results.authenticated = await testWithAuthentication()
  
  // Summary
  console.log('\n📊 Test Results Summary:')
  console.log(`   Network Connectivity: ${results.networkConnectivity ? '✅' : '❓'}`)
  console.log(`   Direct HTTP Request: ${results.directHttp ? '✅' : '❌'}`)
  console.log(`   Supabase Client: ${results.supabaseClient ? '✅' : '❌'}`)
  console.log(`   Authenticated Request: ${results.authenticated ? '✅' : '❌'}`)
  
  // Diagnosis
  console.log('\n🔍 Diagnosis:')
  if (!results.directHttp && !results.supabaseClient) {
    console.log('❌ Edge Function is likely not deployed or not accessible')
    console.log('💡 Solution: Deploy the Edge Function using `supabase functions deploy process-notifications`')
  } else if (!results.supabaseClient && results.directHttp) {
    console.log('❌ Supabase client configuration issue')
    console.log('💡 Solution: Check Supabase client setup and authentication')
  } else if (results.supabaseClient) {
    console.log('✅ Edge Function is working correctly')
    console.log('💡 The FunctionsFetchError might be intermittent or authentication-related')
  }
}

main().catch(console.error)
