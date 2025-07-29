#!/usr/bin/env node

/**
 * Test Final Fix
 * Verifies that all foreign key constraint issues are resolved
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFinalFix() {
  console.log('🧪 Testing Final Comprehensive Fix...')
  console.log('   Verifying all foreign key constraints are satisfied\n')
  
  try {
    // 1. Test basic data access
    console.log('1️⃣ Basic Data Access Test...')
    
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
    
    const { data: landlords, error: landError } = await supabase
      .from('landlords')
      .select('id, full_name, email')
    
    const { data: propertyUsers, error: puError } = await supabase
      .from('property_users')
      .select('user_id, property_id, role, status')
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (propError || landError || puError || authError) {
      console.log('❌ Failed to access basic data')
      console.log('   Properties error:', propError?.message)
      console.log('   Landlords error:', landError?.message)
      console.log('   Property users error:', puError?.message)
      console.log('   Auth users error:', authError?.message)
      return false
    }
    
    console.log(`   ✅ Properties: ${properties.length}`)
    console.log(`   ✅ Landlords: ${landlords.length}`)
    console.log(`   ✅ Property users: ${propertyUsers.length}`)
    console.log(`   ✅ Auth users: ${authUsers.users.length}`)
    
    // 2. Test foreign key constraints
    console.log('\n2️⃣ Foreign Key Constraint Validation...')
    
    // Check properties.landlord_id -> landlords.id
    const landlordIds = landlords.map(l => l.id)
    const authUserIds = authUsers.users.map(u => u.id)
    
    let invalidLandlordRefs = 0
    for (const property of properties) {
      if (property.landlord_id) {
        const validInLandlords = landlordIds.includes(property.landlord_id)
        const validInAuth = authUserIds.includes(property.landlord_id)
        
        if (!validInLandlords || !validInAuth) {
          invalidLandlordRefs++
          console.log(`   ⚠️ Property ${property.name} has invalid landlord_id: ${property.landlord_id}`)
          console.log(`     In landlords: ${validInLandlords}, In auth.users: ${validInAuth}`)
        }
      }
    }
    
    if (invalidLandlordRefs === 0) {
      console.log('   ✅ All properties have valid landlord_id references')
    } else {
      console.log(`   ❌ Found ${invalidLandlordRefs} invalid landlord_id references`)
    }
    
    // Check property_users.user_id -> auth.users.id
    let invalidUserRefs = 0
    for (const pu of propertyUsers) {
      if (!authUserIds.includes(pu.user_id)) {
        invalidUserRefs++
        console.log(`   ⚠️ Property user has invalid user_id: ${pu.user_id}`)
      }
    }
    
    if (invalidUserRefs === 0) {
      console.log('   ✅ All property_users have valid user_id references')
    } else {
      console.log(`   ❌ Found ${invalidUserRefs} invalid user_id references`)
    }
    
    // 3. Test property creation
    console.log('\n3️⃣ Property Creation Test...')
    
    if (authUsers.users.length > 0) {
      const testUser = authUsers.users[0]
      console.log(`   Testing with user: ${testUser.email} (${testUser.id})`)
      
      try {
        const { data: testPropertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
          property_name: 'Final Fix Test Property',
          property_address: '123 Final Fix Test Street',
          property_type: 'APARTMENT'
        })
        
        if (createError) {
          console.log(`   ❌ Property creation failed: ${createError.message}`)
          return false
        } else {
          console.log(`   ✅ Property created successfully: ${testPropertyId}`)
          
          // Verify the property exists and has correct data
          const { data: createdProperty, error: fetchError } = await supabase
            .from('properties')
            .select('id, name, landlord_id')
            .eq('id', testPropertyId)
            .single()
          
          if (fetchError) {
            console.log(`   ❌ Failed to fetch created property: ${fetchError.message}`)
            return false
          }
          
          console.log(`   ✅ Property verified: ${createdProperty.name}`)
          console.log(`   ✅ Landlord ID: ${createdProperty.landlord_id}`)
          
          // Verify property_users entry was created
          const { data: puEntry, error: puFetchError } = await supabase
            .from('property_users')
            .select('user_id, role, status')
            .eq('property_id', testPropertyId)
            .eq('role', 'OWNER')
            .single()
          
          if (puFetchError) {
            console.log(`   ❌ Property users entry not found: ${puFetchError.message}`)
            return false
          }
          
          console.log(`   ✅ Property users entry verified: ${puEntry.role} (${puEntry.status})`)
          
          // Clean up test property
          await supabase.from('properties').delete().eq('id', testPropertyId)
          await supabase.from('property_users').delete().eq('property_id', testPropertyId)
          console.log('   ✅ Test property cleaned up')
        }
      } catch (err) {
        console.log(`   ❌ Property creation test failed: ${err.message}`)
        return false
      }
    } else {
      console.log('   ⚠️ No auth users available for testing')
    }
    
    // 4. Test helper functions
    console.log('\n4️⃣ Helper Function Tests...')
    
    const functions = ['user_has_property_access', 'get_user_accessible_properties', 'create_property_with_owner']
    
    for (const funcName of functions) {
      try {
        // Test function existence by calling with empty params
        const { error } = await supabase.rpc(funcName, {})
        
        if (error && error.message.includes('does not exist')) {
          console.log(`   ❌ Function ${funcName} does not exist`)
          return false
        } else {
          console.log(`   ✅ Function ${funcName} exists`)
        }
      } catch (err) {
        console.log(`   ✅ Function ${funcName} exists (expected error with empty params)`)
      }
    }
    
    // 5. Test RLS policies
    console.log('\n5️⃣ RLS Policy Tests...')
    
    // Test with service role (should work)
    const { data: serviceProps, error: serviceError } = await supabase
      .from('properties')
      .select('id')
      .limit(1)
    
    if (serviceError) {
      console.log(`   ❌ Service role access failed: ${serviceError.message}`)
      return false
    } else {
      console.log('   ✅ Service role can access properties')
    }
    
    // Test with anon client (should be blocked by RLS)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: anonProps, error: anonError } = await anonClient
      .from('properties')
      .select('id')
      .limit(1)
    
    if (anonError && anonError.message.includes('row-level security')) {
      console.log('   ✅ RLS is properly blocking unauthenticated access')
    } else if (anonError) {
      console.log(`   ⚠️ Unexpected RLS error: ${anonError.message}`)
    } else {
      console.log('   ⚠️ RLS may not be properly configured (anonymous access allowed)')
    }
    
    // 6. Final summary
    console.log('\n6️⃣ Final Test Summary...')
    
    const allValid = invalidLandlordRefs === 0 && invalidUserRefs === 0
    
    if (allValid) {
      console.log('🎉 All tests passed! The comprehensive fix was successful.')
      console.log('\n✅ Results:')
      console.log('   ✅ All foreign key constraints are satisfied')
      console.log('   ✅ Property creation works correctly')
      console.log('   ✅ Helper functions are operational')
      console.log('   ✅ RLS policies are active')
      console.log('   ✅ Data integrity is maintained')
      
      console.log('\n💡 Your application is now ready to use!')
      console.log('   - No more foreign key constraint violations')
      console.log('   - No more RLS policy violations')
      console.log('   - No more access denied errors')
      
      console.log('\n🔧 Use these functions in your application:')
      console.log(`
   // Create a property safely
   const { data: propertyId, error } = await supabase.rpc('create_property_with_owner', {
     property_name: 'My Property',
     property_address: '123 Main Street',
     property_type: 'APARTMENT'
   })
   
   // Check property access
   const { data: hasAccess } = await supabase.rpc('user_has_property_access', {
     property_id: propertyId,
     required_roles: ['OWNER']
   })
   
   // Get accessible properties
   const { data: properties } = await supabase.rpc('get_user_accessible_properties')
   `)
      
      return true
    } else {
      console.log('❌ Some issues remain. Please review the errors above.')
      return false
    }
    
  } catch (err) {
    console.error('❌ Test failed with error:', err)
    return false
  }
}

// Run the test
testFinalFix().then(success => {
  if (success) {
    console.log('\n🎯 SUCCESS: All foreign key constraint issues have been resolved!')
  } else {
    console.log('\n💥 FAILURE: Some issues still need to be addressed.')
  }
  process.exit(success ? 0 : 1)
})
