#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: './voi-rental-app/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuthenticationHandling() {
  console.log('🔍 Testing Authentication Handling...\n')

  // Test 1: Check current authentication status
  console.log('1️⃣ Checking current authentication status...')
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('❌ Auth error:', authError.message)
    } else if (user) {
      console.log('✅ User is authenticated:', user.email)
    } else {
      console.log('⚠️  No authenticated user (anonymous access)')
    }
  } catch (err) {
    console.log('❌ Exception checking auth:', err.message)
  }

  // Test 2: Test session refresh
  console.log('\n2️⃣ Testing session refresh...')
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.log('❌ Session refresh error:', error.message)
    } else {
      console.log('✅ Session refresh successful')
      if (data.user) {
        console.log('   User after refresh:', data.user.email)
      }
    }
  } catch (err) {
    console.log('❌ Exception during session refresh:', err.message)
  }

  // Test 3: Test API endpoint that was failing
  console.log('\n3️⃣ Testing property finances API endpoint...')
  try {
    const response = await fetch(`${supabaseUrl.replace('/supabase', '')}/api/properties/finances/summary`)
    
    console.log('   Response status:', response.status)
    console.log('   Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.status === 401) {
      console.log('⚠️  API returned 401 - Authentication required')
      console.log('   This is expected if no user is logged in')
    } else if (response.status === 404) {
      console.log('⚠️  API returned 404 - Endpoint not found or database setup required')
    } else if (response.ok) {
      console.log('✅ API call successful')
      const data = await response.json()
      console.log('   Response data:', data)
    } else {
      console.log('❌ API call failed with status:', response.status)
      const errorText = await response.text()
      console.log('   Error response:', errorText)
    }
  } catch (err) {
    console.log('❌ Exception calling API:', err.message)
  }

  // Test 4: Test properties query directly
  console.log('\n4️⃣ Testing direct properties query...')
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .in('lifecycle_status', ['ACTIVE', 'UNDER_DEVELOPMENT'])
      .limit(5)

    if (error) {
      console.log('❌ Properties query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      if (error.message?.includes('Auth session missing') || error.code === 'PGRST301') {
        console.log('🎯 This is an authentication error - session refresh would be attempted')
      }
    } else {
      console.log('✅ Properties query successful')
      console.log(`   Found ${data?.length || 0} properties`)
    }
  } catch (err) {
    console.log('❌ Exception in properties query:', err.message)
  }

  console.log('\n📋 Summary:')
  console.log('The authentication handling improvements should:')
  console.log('1. ✅ Check user authentication before API calls')
  console.log('2. ✅ Attempt session refresh on auth failures')
  console.log('3. ✅ Provide clear error messages to users')
  console.log('4. ✅ Handle both API and Supabase query auth errors')
  console.log('5. ✅ Show login prompt when authentication is required')
}

testAuthenticationHandling().catch(console.error)
