#!/usr/bin/env node

/**
 * Debug Exact Function Error
 * Tests the exact function call that's failing in the dashboard
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create client exactly like the frontend does
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugExactFunctionError() {
  console.log('🔍 Debugging Exact Function Error...')
  console.log('   Testing the exact get_user_accessible_properties call that\'s failing\n')
  
  try {
    // 1. Check authentication first
    console.log('1️⃣ Authentication Check...')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ User authentication error:', userError)
      console.log('   This might be causing the function to fail')
      return false
    }
    
    if (!user) {
      console.log('❌ No authenticated user')
      console.log('   The function requires authentication - this is the likely cause')
      console.log('   Dashboard should show authentication required message')
      return true
    }
    
    console.log(`✅ User authenticated: ${user.email}`)
    
    // 2. Test the exact function call from the dashboard
    console.log('\n2️⃣ Testing get_user_accessible_properties...')
    
    const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')
    
    console.log('Raw function response:')
    console.log('  data:', accessibleProperties)
    console.log('  error:', accessError)
    console.log('  error type:', typeof accessError)
    console.log('  error constructor:', accessError?.constructor?.name)
    console.log('  error keys:', accessError ? Object.keys(accessError) : 'null')
    console.log('  error JSON:', JSON.stringify(accessError))
    
    if (accessError) {
      console.log('\n❌ FUNCTION ERROR DETECTED!')
      
      // Test our enhanced error handling logic
      let errorMessage = 'Unknown error occurred'
      let errorDetails = {}
      
      try {
        if (accessError?.message) {
          errorMessage = accessError.message
        } else if (accessError?.details) {
          errorMessage = accessError.details
        } else if (typeof accessError === 'string') {
          errorMessage = accessError
        } else if (accessError && typeof accessError === 'object') {
          errorMessage = JSON.stringify(accessError)
          if (errorMessage === '{}') {
            errorMessage = 'Empty error object from database'
          }
        }
        
        errorDetails = {
          errorType: typeof accessError,
          hasMessage: !!accessError?.message,
          hasDetails: !!accessError?.details,
          errorKeys: accessError ? Object.keys(accessError) : [],
          userEmail: user.email,
          timestamp: new Date().toISOString()
        }
      } catch (parseError) {
        errorMessage = 'Error parsing database error'
        errorDetails.parseError = parseError.message
      }
      
      console.log('\n🔧 Enhanced Error Handling Result:')
      console.log('  Processed message:', errorMessage)
      console.log('  Error details:', errorDetails)
      
      // Check for specific error types
      if (accessError?.code) {
        console.log('\n📋 Error Analysis:')
        console.log('  Error code:', accessError.code)
        
        if (accessError.code === 'PGRST116') {
          console.log('  → This is a "no rows returned" error')
          console.log('  → User has no accessible properties')
          console.log('  → Dashboard should show empty state')
        } else if (accessError.code === 'PGRST301') {
          console.log('  → This is a "function not found" error')
          console.log('  → The function may not exist or have wrong parameters')
        } else if (accessError.code === '42883') {
          console.log('  → This is a "function does not exist" error')
          console.log('  → Need to check function creation in database')
        }
      }
      
      return false
    }
    
    console.log(`✅ Function succeeded: ${accessibleProperties?.length || 0} properties`)
    
    if (!accessibleProperties || accessibleProperties.length === 0) {
      console.log('   → User has no accessible properties')
      console.log('   → Dashboard should show empty state')
    } else {
      console.log('   → Properties found:', accessibleProperties)
    }
    
    // 3. Test if the function exists and has correct signature
    console.log('\n3️⃣ Function Verification...')
    
    // Check if function exists by trying to call it with service role
    const serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: functionTest, error: functionError } = await serviceClient.rpc('get_user_accessible_properties')
    
    if (functionError) {
      console.log('❌ Function verification failed:', functionError)
      
      if (functionError.message?.includes('does not exist')) {
        console.log('   → Function was not created properly')
        console.log('   → Need to re-run the SQL fix')
      }
    } else {
      console.log('✅ Function exists and is callable')
    }
    
    // 4. Recommendations
    console.log('\n4️⃣ Recommendations...')
    
    if (!user) {
      console.log('🔧 SOLUTION: Authentication Issue')
      console.log('   1. User needs to log in to access dashboard')
      console.log('   2. Dashboard should show authentication required message')
      console.log('   3. Redirect to login page')
    } else if (accessError) {
      console.log('🔧 SOLUTION: Function Error')
      console.log('   1. Check that SQL fix was applied completely')
      console.log('   2. Verify function exists in Supabase')
      console.log('   3. Check function permissions')
      console.log('   4. Enhanced error handling will show better messages')
    } else {
      console.log('🔧 SOLUTION: Working Correctly')
      console.log('   1. Function is working as expected')
      console.log('   2. Dashboard should display properties or empty state')
      console.log('   3. Check browser cache if still seeing errors')
    }
    
    return true
    
  } catch (err) {
    console.error('❌ Debug test failed:', err)
    console.log('\n🔧 This error would be caught by enhanced error handling')
    return false
  }
}

// Run the debug test
debugExactFunctionError().then(success => {
  console.log(`\n🎯 Debug test ${success ? 'completed' : 'found the issue'}`)
  
  console.log('\n🚀 NEXT STEPS:')
  console.log('   1. Check the specific error details above')
  console.log('   2. Apply the recommended solution')
  console.log('   3. Hard refresh browser to clear cache')
  console.log('   4. Test dashboard again')
  
  process.exit(success ? 0 : 1)
})
