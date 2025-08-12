#!/usr/bin/env node

/**
 * Test Current Error
 * Tests the exact current error to understand what's happening
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testCurrentError() {
  console.log('🔍 Testing Current Error State...')
  console.log('   Reproducing the exact error scenario\n')
  
  try {
    // Simulate exactly what the dashboard does
    console.log('1️⃣ Simulating Dashboard Authentication Check...')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ User error:', userError)
      console.log('   This should trigger authentication error handling')
      return false
    }
    
    if (!user) {
      console.log('❌ No user found')
      console.log('   Dashboard should show: "Please log in to view your dashboard"')
      console.log('   This is the expected behavior for unauthenticated users')
      return true
    }
    
    console.log(`✅ User found: ${user.email}`)
    
    // 2. Test the exact function call
    console.log('\n2️⃣ Testing get_user_accessible_properties...')
    
    console.log('Making function call...')
    const startTime = Date.now()
    
    const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')
    
    const endTime = Date.now()
    console.log(`Function call completed in ${endTime - startTime}ms`)
    
    console.log('\nFunction Response Analysis:')
    console.log('  data:', accessibleProperties)
    console.log('  data type:', typeof accessibleProperties)
    console.log('  data length:', accessibleProperties?.length)
    console.log('  error:', accessError)
    console.log('  error type:', typeof accessError)
    console.log('  error constructor:', accessError?.constructor?.name)
    console.log('  error keys:', accessError ? Object.keys(accessError) : 'null')
    console.log('  error JSON:', JSON.stringify(accessError))
    console.log('  error === {}:', JSON.stringify(accessError) === '{}')
    
    if (accessError) {
      console.log('\n❌ ERROR DETECTED - Analyzing...')
      
      // Test each property individually
      console.log('Error Property Analysis:')
      console.log('  .message:', accessError.message)
      console.log('  .details:', accessError.details)
      console.log('  .code:', accessError.code)
      console.log('  .hint:', accessError.hint)
      console.log('  .status:', accessError.status)
      console.log('  .__isAuthError:', accessError.__isAuthError)
      
      // Test our error handling logic step by step
      console.log('\nError Handling Logic Test:')
      
      let errorMessage = 'Unknown error occurred'
      
      if (accessError?.message?.includes('Auth session missing') || 
          accessError?.message?.includes('session_missing') ||
          accessError?.code === 'PGRST301' ||
          accessError?.__isAuthError) {
        errorMessage = 'Authentication session expired. Please log in again.'
        console.log('  → Categorized as: Authentication Error')
      } else if (accessError?.message?.includes('does not exist') ||
                 accessError?.message?.includes('function') ||
                 accessError?.code === '42883') {
        errorMessage = 'Database function not found. Please contact support.'
        console.log('  → Categorized as: Function Not Found')
      } else if (accessError?.code === 'PGRST116') {
        errorMessage = 'No data found (normal for new users)'
        console.log('  → Categorized as: No Data (Normal)')
      } else if (accessError?.message) {
        errorMessage = accessError.message
        console.log('  → Categorized as: Has Message')
      } else if (accessError?.details) {
        errorMessage = accessError.details
        console.log('  → Categorized as: Has Details')
      } else if (typeof accessError === 'string') {
        errorMessage = accessError
        console.log('  → Categorized as: String Error')
      } else if (accessError && typeof accessError === 'object') {
        errorMessage = JSON.stringify(accessError)
        if (errorMessage === '{}') {
          errorMessage = 'Empty error object from database - please check your authentication'
        }
        console.log('  → Categorized as: Object Error')
      }
      
      console.log(`  Final error message: "${errorMessage}"`)
      
      // Test what the enhanced console.error would show
      const consoleMessage = `DASHBOARD ERROR - Accessible properties loading failed: ${errorMessage}`
      const consoleDetails = {
        message: errorMessage,
        originalError: accessError,
        timestamp: new Date().toISOString(),
        version: '2.1-enhanced'
      }
      
      console.log('\nEnhanced Console Output Would Be:')
      console.log('  Message:', consoleMessage)
      console.log('  Details:', consoleDetails)
      
      return false
    }
    
    console.log(`✅ Function succeeded: ${accessibleProperties?.length || 0} properties`)
    return true
    
  } catch (err) {
    console.error('❌ Test failed:', err)
    console.log('\nThis error would be caught by the dashboard\'s try-catch block')
    return false
  }
}

// Run the test
testCurrentError().then(success => {
  console.log(`\n🎯 Current error test ${success ? 'completed' : 'found the issue'}`)
  
  console.log('\n🚀 NEXT STEPS:')
  console.log('   1. Check the error analysis above')
  console.log('   2. Hard refresh browser with Ctrl+Shift+R or Cmd+Shift+R')
  console.log('   3. Look for "🚀 Dashboard loadDashboardStats - Version 2.1-enhanced" in console')
  console.log('   4. The enhanced error handling should now show meaningful messages')
  
  process.exit(success ? 0 : 1)
})
