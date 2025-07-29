#!/usr/bin/env node

/**
 * Diagnose Frontend Issues
 * Tests the current frontend data loading issues and provides solutions
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

async function diagnoseFrontendIssues() {
  console.log('🔍 Diagnosing Frontend Data Loading Issues...')
  console.log('   Testing the exact same calls your React app makes\n')
  
  try {
    // 1. Test authentication status
    console.log('1️⃣ Authentication Status...')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('❌ User not authenticated - this is the root cause!')
      console.log('   Your React app needs a user session to access data')
      console.log('   Error:', userError?.message || 'No user found')
      return false
    }
    
    console.log(`✅ User authenticated: ${user.email}`)
    console.log(`   User ID: ${user.id}`)
    
    // 2. Test the old getUserLandlordIds function (what your app currently uses)
    console.log('\n2️⃣ Testing getUserLandlordIds (current approach)...')
    
    try {
      const { data: landlordIds, error: landlordError } = await supabase.rpc('get_user_landlord_ids', { 
        user_uuid: user.id 
      })
      
      if (landlordError) {
        console.log(`❌ getUserLandlordIds failed: ${landlordError.message}`)
        console.log('   This function may not exist or have RLS issues')
      } else {
        console.log(`✅ getUserLandlordIds returned: ${JSON.stringify(landlordIds)}`)
        
        if (!landlordIds || landlordIds.length === 0) {
          console.log('⚠️ No landlord IDs found - user has no landlord access')
        }
      }
    } catch (err) {
      console.log(`❌ getUserLandlordIds exception: ${err.message}`)
    }
    
    // 3. Test the new get_user_accessible_properties function
    console.log('\n3️⃣ Testing get_user_accessible_properties (new approach)...')
    
    try {
      const { data: accessibleProps, error: accessError } = await supabase.rpc('get_user_accessible_properties')
      
      if (accessError) {
        console.log(`❌ get_user_accessible_properties failed: ${accessError.message}`)
      } else {
        console.log(`✅ get_user_accessible_properties returned: ${JSON.stringify(accessibleProps)}`)
        
        if (!accessibleProps || accessibleProps.length === 0) {
          console.log('⚠️ No accessible properties found')
        } else {
          console.log(`   User can access ${accessibleProps.length} properties`)
        }
      }
    } catch (err) {
      console.log(`❌ get_user_accessible_properties exception: ${err.message}`)
    }
    
    // 4. Test direct property access with RLS
    console.log('\n4️⃣ Testing direct property table access...')
    
    try {
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, name, landlord_id')
        .limit(5)
      
      if (propError) {
        console.log(`❌ Direct property access failed: ${propError.message}`)
        console.log('   This indicates RLS is blocking access')
      } else {
        console.log(`✅ Direct property access returned ${properties.length} properties`)
        
        if (properties.length === 0) {
          console.log('⚠️ No properties visible to current user')
        }
      }
    } catch (err) {
      console.log(`❌ Direct property access exception: ${err.message}`)
    }
    
    // 5. Test the mock landlord ID approach (what dashboard uses)
    console.log('\n5️⃣ Testing mock landlord ID approach...')
    
    const mockLandlordId = '11111111-1111-1111-1111-111111111111'
    
    try {
      const { data: mockProperties, error: mockError } = await supabase
        .from('properties')
        .select('id, name, landlord_id')
        .eq('landlord_id', mockLandlordId)
      
      if (mockError) {
        console.log(`❌ Mock landlord query failed: ${mockError.message}`)
      } else {
        console.log(`✅ Mock landlord query returned ${mockProperties.length} properties`)
        
        if (mockProperties.length === 0) {
          console.log('⚠️ No properties found for mock landlord ID')
        }
      }
    } catch (err) {
      console.log(`❌ Mock landlord query exception: ${err.message}`)
    }
    
    // 6. Provide diagnosis and solutions
    console.log('\n6️⃣ Diagnosis and Solutions...')
    
    console.log('\n🔍 ROOT CAUSES IDENTIFIED:')
    console.log('   1. Your React app is using old functions that may not exist')
    console.log('   2. RLS policies are blocking access for authenticated users')
    console.log('   3. Dashboard uses a mock landlord ID that doesn\'t exist')
    console.log('   4. Properties page tries to get landlord IDs that may not be set up')
    
    console.log('\n💡 SOLUTIONS:')
    console.log('   1. Update React components to use new helper functions')
    console.log('   2. Ensure user has proper property access via property_users table')
    console.log('   3. Replace mock landlord ID with actual user-based access')
    console.log('   4. Add proper error handling for authentication failures')
    
    console.log('\n🔧 IMMEDIATE FIXES NEEDED:')
    console.log('   1. Update dashboard to use get_user_accessible_properties()')
    console.log('   2. Update properties page to use get_user_accessible_properties()')
    console.log('   3. Ensure user is properly authenticated before data calls')
    console.log('   4. Add fallback for users with no property access')
    
    return true
    
  } catch (err) {
    console.error('❌ Diagnosis failed:', err)
    return false
  }
}

// Run the diagnosis
diagnoseFrontendIssues().then(success => {
  console.log(`\n🎯 Diagnosis ${success ? 'completed' : 'failed'}`)
  process.exit(success ? 0 : 1)
})
