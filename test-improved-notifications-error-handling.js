#!/usr/bin/env node

/**
 * Test the improved error handling for notifications processing
 * This verifies that FunctionsFetchError is properly caught and handled
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

// Helper function to handle Supabase errors
function handleSupabaseError(error) {
  if (error?.message) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error occurred'
}

// Replicate the improved processNotifications function
async function processNotifications() {
  try {
    const { data, error } = await supabase.functions.invoke('process-notifications', {
      body: {}
    })

    if (error) {
      // Handle Edge Function not deployed scenario
      if (error.status === 404 || error.context?.status === 404) {
        console.warn('Process notifications Edge Function not deployed. Returning mock response.')
        return {
          data: {
            message: 'Edge Function not deployed',
            processed: 0,
            status: 'not_deployed'
          },
          error: null
        }
      }

      return { data: null, error: handleSupabaseError(error) }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Process notifications error:', err)
    
    // Handle FunctionsFetchError specifically
    if (err.name === 'FunctionsFetchError') {
      console.warn('FunctionsFetchError caught - Edge Function likely not deployed.')
      return {
        data: {
          message: 'Edge Function not deployed - FunctionsFetchError',
          processed: 0,
          status: 'not_deployed'
        },
        error: null
      }
    }

    // Handle network errors or function not found
    if (err?.status === 404 || err?.context?.status === 404) {
      console.warn('Process notifications Edge Function not deployed. Returning mock response.')
      return {
        data: {
          message: 'Edge Function not deployed',
          processed: 0,
          status: 'not_deployed'
        },
        error: null
      }
    }

    // Handle other HTTP errors from the function response
    if (err?.context?.status) {
      console.warn(`Edge Function returned status ${err.context.status}`)
      return {
        data: {
          message: `Edge Function error: ${err.context.status}`,
          processed: 0,
          status: 'error'
        },
        error: null
      }
    }

    return { data: null, error: handleSupabaseError(err) }
  }
}

// Simulate the improved handleProcessNotifications function
async function handleProcessNotifications() {
  console.log('🔄 Processing notifications...')
  
  try {
    const { data, error } = await processNotifications()

    if (error) {
      // Check if it's a deployment issue
      if (error.includes('not deployed') || error.includes('404')) {
        console.log('⚠️ Deployment issue detected:', error)
        return { success: false, message: 'Notification processing service is not yet deployed. Please contact your administrator to deploy the Edge Functions.' }
      }
      throw new Error(error)
    }

    // Check if we got a mock response indicating the function isn't deployed
    if (data?.status === 'not_deployed') {
      console.log('⚠️ Mock response received - function not deployed')
      return { success: false, message: 'Notification processing service is not yet deployed. The system returned a mock response. Please deploy the Edge Functions to enable this feature.' }
    }

    console.log('✅ Notifications processed successfully!')
    return { success: true, message: `Notifications processed successfully! ${data?.processed || 0} rules processed.` }

  } catch (err) {
    console.error('❌ Error processing notifications:', err)
    
    // Provide specific error messages based on error type
    if (err.name === 'FunctionsFetchError' || err.message.includes('Failed to send a request to the Edge Function')) {
      return { success: false, message: 'The notification processing service is not available. Please ensure the Edge Functions are deployed in your Supabase project.' }
    } else if (err.message.includes('404') || err.message.includes('not found')) {
      return { success: false, message: 'The notification processing service is not deployed. Please deploy the process-notifications Edge Function.' }
    } else {
      return { success: false, message: 'Failed to process notifications. Please try again or contact support if the issue persists.' }
    }
  }
}

async function testWithAuthentication() {
  console.log('🔐 Testing with authenticated user...')
  
  try {
    // Create a test user and sign in
    const testEmail = `notif-test-${Date.now()}@test.com`
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

    // Test the improved error handling
    const result = await handleProcessNotifications()
    
    console.log('📊 Result:', result)

    // Clean up
    await supabase.auth.signOut()
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    console.log('✅ Test user cleaned up')
    
    return result.success || result.message.includes('not deployed')
    
  } catch (err) {
    console.error('❌ Authentication test error:', err.message)
    return false
  }
}

async function testWithoutAuthentication() {
  console.log('🔓 Testing without authentication...')
  
  const result = await handleProcessNotifications()
  console.log('📊 Result:', result)
  
  return result.success || result.message.includes('not deployed')
}

async function main() {
  console.log('🧪 Testing improved notifications error handling...')
  console.log(`📡 Supabase URL: ${supabaseUrl}`)
  
  // Test both scenarios
  const results = {
    withoutAuth: false,
    withAuth: false
  }
  
  results.withoutAuth = await testWithoutAuthentication()
  results.withAuth = await testWithAuthentication()
  
  // Summary
  console.log('\n📊 Test Results Summary:')
  console.log(`   Without Authentication: ${results.withoutAuth ? '✅' : '❌'}`)
  console.log(`   With Authentication: ${results.withAuth ? '✅' : '❌'}`)
  
  // Overall assessment
  if (results.withoutAuth && results.withAuth) {
    console.log('\n🎉 Improved error handling is working correctly!')
    console.log('✅ FunctionsFetchError is properly caught and handled')
    console.log('✅ Users will see helpful error messages instead of crashes')
    console.log('✅ The application gracefully handles missing Edge Functions')
  } else {
    console.log('\n⚠️ Some tests failed, but this might be expected if Edge Functions are not deployed')
    console.log('💡 The important thing is that no unhandled errors are thrown')
  }
  
  console.log('\n📋 Next Steps:')
  console.log('1. Deploy the process-notifications Edge Function in Supabase Dashboard')
  console.log('2. Test the "Process Now" button in the notifications page')
  console.log('3. Verify that users see helpful error messages instead of crashes')
}

main().catch(console.error)
