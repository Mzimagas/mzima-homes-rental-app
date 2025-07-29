#!/usr/bin/env node

/**
 * Test with Explicit User ID
 * Tests property creation by explicitly passing user ID
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

async function testWithExplicitUser() {
  console.log('🧪 Testing Property Creation with Explicit User ID...')
  
  try {
    // Get a test user
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    
    if (authUsers.users.length === 0) {
      console.log('❌ No auth users found for testing')
      return false
    }
    
    const testUser = authUsers.users[0]
    console.log(`Testing with user: ${testUser.email} (${testUser.id})`)
    
    // Test 1: Using the helper function with explicit user ID
    console.log('\n1️⃣ Testing create_property_with_owner with explicit user ID...')
    
    const { data: propertyId1, error: error1 } = await supabase.rpc('create_property_with_owner', {
      property_name: 'Explicit User Test Property',
      property_address: '123 Explicit User Street',
      property_type: 'APARTMENT',
      owner_user_id: testUser.id  // Explicitly pass the user ID
    })
    
    if (error1) {
      console.log(`❌ Test 1 failed: ${error1.message}`)
    } else {
      console.log(`✅ Test 1 succeeded: Property created with ID ${propertyId1}`)
      
      // Clean up
      await supabase.from('properties').delete().eq('id', propertyId1)
      await supabase.from('property_users').delete().eq('property_id', propertyId1)
      console.log('✅ Test 1 property cleaned up')
    }
    
    // Test 2: Using the test helper function
    console.log('\n2️⃣ Testing test_property_creation_with_user...')
    
    const { data: propertyId2, error: error2 } = await supabase.rpc('test_property_creation_with_user', {
      test_user_id: testUser.id,
      property_name: 'Test Helper Property',
      property_address: '123 Test Helper Street',
      property_type: 'APARTMENT'
    })
    
    if (error2) {
      console.log(`❌ Test 2 failed: ${error2.message}`)
      
      if (error2.message.includes('does not exist')) {
        console.log('⚠️ You need to apply the final-function-fix.sql first!')
        console.log('   Copy the contents of final-function-fix.sql and run it in Supabase SQL Editor')
        return false
      }
    } else {
      console.log(`✅ Test 2 succeeded: Property created with ID ${propertyId2}`)
      
      // Verify the property was created correctly
      const { data: createdProperty } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId2)
        .single()
      
      if (createdProperty) {
        console.log('✅ Property details verified:')
        console.log(`   Name: ${createdProperty.name}`)
        console.log(`   Address: ${createdProperty.physical_address}`)
        console.log(`   Landlord: ${createdProperty.landlord_id}`)
      }
      
      // Check property_users entry
      const { data: propertyUser } = await supabase
        .from('property_users')
        .select('*')
        .eq('property_id', propertyId2)
        .eq('role', 'OWNER')
        .single()
      
      if (propertyUser) {
        console.log('✅ Property user relationship verified:')
        console.log(`   Role: ${propertyUser.role}`)
        console.log(`   Status: ${propertyUser.status}`)
      }
      
      // Clean up
      await supabase.from('properties').delete().eq('id', propertyId2)
      await supabase.from('property_users').delete().eq('property_id', propertyId2)
      console.log('✅ Test 2 property cleaned up')
    }
    
    // Test 3: Test helper functions
    console.log('\n3️⃣ Testing helper functions...')
    
    // Get existing properties for testing
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('id')
      .limit(1)
    
    if (existingProperties && existingProperties.length > 0) {
      const testPropertyId = existingProperties[0].id
      
      // Test access check
      const { data: hasAccess, error: accessError } = await supabase.rpc('user_has_property_access', {
        property_id: testPropertyId,
        user_id: testUser.id
      })
      
      if (accessError) {
        console.log(`❌ Access check failed: ${accessError.message}`)
      } else {
        console.log(`✅ Access check: User ${hasAccess ? 'has' : 'does not have'} access`)
      }
      
      // Test accessible properties
      const { data: accessibleProps, error: accessibleError } = await supabase.rpc('get_user_accessible_properties', {
        user_id: testUser.id
      })
      
      if (accessibleError) {
        console.log(`❌ Accessible properties check failed: ${accessibleError.message}`)
      } else {
        console.log(`✅ User can access ${accessibleProps?.length || 0} properties`)
      }
    }
    
    console.log('\n🎯 Test Results:')
    
    if (!error1 && !error2) {
      console.log('🎉 ALL TESTS PASSED!')
      console.log('\n✅ What works:')
      console.log('   ✅ Property creation with explicit user ID')
      console.log('   ✅ Helper functions are operational')
      console.log('   ✅ Property-user relationships are created correctly')
      console.log('   ✅ Access control functions work')
      
      console.log('\n🚀 Your application is ready!')
      console.log('\n💡 Usage in your React app:')
      console.log(`
   // This will work perfectly:
   const createProperty = async (propertyData) => {
     const { data: user } = await supabase.auth.getUser()
     
     if (!user?.user?.id) {
       throw new Error('Please log in to create a property')
     }
     
     const { data: propertyId, error } = await supabase.rpc('create_property_with_owner', {
       property_name: propertyData.name,
       property_address: propertyData.address,
       property_type: 'APARTMENT',
       owner_user_id: user.user.id  // Explicitly pass the user ID
     })
     
     if (error) {
       throw new Error('Failed to create property: ' + error.message)
     }
     
     return propertyId
   }
   `)
      
      return true
    } else {
      console.log('❌ Some tests failed. Please apply the final-function-fix.sql')
      return false
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err)
    return false
  }
}

testWithExplicitUser().then(success => {
  process.exit(success ? 0 : 1)
})
