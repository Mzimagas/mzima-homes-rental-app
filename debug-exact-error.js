#!/usr/bin/env node

/**
 * Debug Exact Error
 * Reproduces the exact error scenario to identify the root cause
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

async function debugExactError() {
  console.log('🔍 Debugging Exact Dashboard Error...')
  console.log('   Reproducing the exact scenario that causes the error\n')
  
  try {
    // 1. Check authentication (this might be the issue)
    console.log('1️⃣ Authentication Check...')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ User authentication error:', userError)
      console.log('   This might be causing the dashboard to fail')
      return false
    }
    
    if (!user) {
      console.log('❌ No authenticated user')
      console.log('   Dashboard should show authentication required message')
      console.log('   If it\'s trying to load data anyway, that\'s the bug')
      return true
    }
    
    console.log(`✅ User authenticated: ${user.email}`)
    
    // 2. Test get_user_accessible_properties with detailed error analysis
    console.log('\n2️⃣ Testing get_user_accessible_properties...')
    
    const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')
    
    if (accessError) {
      console.log('❌ FOUND THE ERROR! get_user_accessible_properties failed:')
      console.log('   Raw error object:', accessError)
      console.log('   Error type:', typeof accessError)
      console.log('   Error constructor:', accessError.constructor.name)
      console.log('   Error keys:', Object.keys(accessError))
      console.log('   Error JSON:', JSON.stringify(accessError))
      console.log('   Error message property:', accessError.message)
      console.log('   Error details property:', accessError.details)
      console.log('   Error code property:', accessError.code)
      
      // Test if this is an empty object
      if (JSON.stringify(accessError) === '{}') {
        console.log('   ⚠️ This is the empty error object causing the issue!')
      }
      
      // Test our error handling logic
      let errorMessage = 'Unknown error occurred'
      
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
      
      console.log('   ✅ Our error handling would show:', errorMessage)
      return false
    }
    
    console.log(`✅ get_user_accessible_properties succeeded: ${accessibleProperties?.length || 0} properties`)
    
    if (!accessibleProperties || accessibleProperties.length === 0) {
      console.log('   ✅ No properties found - dashboard should show empty state')
      return true
    }
    
    // 3. Test property details loading
    console.log('\n3️⃣ Testing Property Details Loading...')
    
    const propertyIds = accessibleProperties
      .map(p => p.property_id)
      .filter(id => id && typeof id === 'string')
    
    console.log(`   Property IDs: ${propertyIds}`)
    
    if (propertyIds.length === 0) {
      console.log('   ⚠️ No valid property IDs found')
      return true
    }
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          is_active,
          tenants (
            id,
            full_name,
            status
          )
        )
      `)
      .in('id', propertyIds)
    
    if (propertiesError) {
      console.log('❌ FOUND THE ERROR! Property details loading failed:')
      console.log('   Raw error object:', propertiesError)
      console.log('   Error type:', typeof propertiesError)
      console.log('   Error constructor:', propertiesError.constructor.name)
      console.log('   Error keys:', Object.keys(propertiesError))
      console.log('   Error JSON:', JSON.stringify(propertiesError))
      console.log('   Error message property:', propertiesError.message)
      console.log('   Error details property:', propertiesError.details)
      console.log('   Error code property:', propertiesError.code)
      
      // Test if this is an empty object
      if (JSON.stringify(propertiesError) === '{}') {
        console.log('   ⚠️ This is the empty error object causing the issue!')
      }
      
      // Test our error handling logic
      let errorMessage = 'Unknown error occurred'
      
      if (propertiesError?.message) {
        errorMessage = propertiesError.message
      } else if (propertiesError?.details) {
        errorMessage = propertiesError.details
      } else if (typeof propertiesError === 'string') {
        errorMessage = propertiesError
      } else if (propertiesError && typeof propertiesError === 'object') {
        errorMessage = JSON.stringify(propertiesError)
        if (errorMessage === '{}') {
          errorMessage = 'Empty error object from database'
        }
      }
      
      console.log('   ✅ Our error handling would show:', errorMessage)
      return false
    }
    
    console.log(`✅ Property details loaded successfully: ${properties?.length || 0} properties`)
    
    // 4. Check if the error might be in the React component itself
    console.log('\n4️⃣ Component Analysis...')
    
    console.log('✅ All database operations succeeded')
    console.log('   The error might be:')
    console.log('   1. Browser cache showing old error messages')
    console.log('   2. React component not using the updated code')
    console.log('   3. Build/compilation issue')
    console.log('   4. Error happening in a different code path')
    
    console.log('\n🔧 SOLUTIONS:')
    console.log('   1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)')
    console.log('   2. Clear browser cache and reload')
    console.log('   3. Check browser console for the new error messages')
    console.log('   4. Look for "Version 2.0 with enhanced error handling" in console')
    
    return true
    
  } catch (err) {
    console.error('❌ Debug test failed:', err)
    console.log('   This error would be caught by our improved error handling')
    return false
  }
}

// Run the debug test
debugExactError().then(success => {
  console.log(`\n🎯 Debug test ${success ? 'completed' : 'found the error source'}`)
  
  console.log('\n🚀 NEXT STEPS:')
  console.log('   1. Hard refresh your browser to clear cache')
  console.log('   2. Look for "Version 2.0 with enhanced error handling" in console')
  console.log('   3. Check if error messages are now more detailed')
  console.log('   4. The empty error object issue should be resolved')
  
  process.exit(success ? 0 : 1)
})
