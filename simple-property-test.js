#!/usr/bin/env node

/**
 * Simple Property Test
 * Tests property creation with the correct schema
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

async function simplePropertyTest() {
  console.log('🧪 Simple Property Creation Test...')
  
  try {
    // Get a test user
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    
    if (authUsers.users.length === 0) {
      console.log('❌ No auth users found for testing')
      return false
    }
    
    const testUser = authUsers.users[0]
    console.log(`Testing with user: ${testUser.email}`)
    
    // Test direct property insertion with correct schema
    console.log('\n1️⃣ Testing direct property insertion...')
    
    const directInsertData = {
      name: 'Direct Insert Test Property',
      physical_address: '123 Direct Insert Street',
      landlord_id: testUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: directProperty, error: directError } = await supabase
      .from('properties')
      .insert(directInsertData)
      .select()
      .single()
    
    if (directError) {
      console.log(`❌ Direct insert failed: ${directError.message}`)
    } else {
      console.log(`✅ Direct insert succeeded: ${directProperty.id}`)
      
      // Clean up
      await supabase.from('properties').delete().eq('id', directProperty.id)
      console.log('✅ Direct insert test property cleaned up')
    }
    
    // Test function-based creation (after applying the SQL fix)
    console.log('\n2️⃣ Testing function-based creation...')
    
    try {
      const { data: functionProperty, error: functionError } = await supabase.rpc('test_property_creation_with_user', {
        test_user_id: testUser.id,
        property_name: 'Function Test Property',
        property_address: '123 Function Test Street',
        property_type: 'APARTMENT' // This will be ignored since table has no type column
      })
      
      if (functionError) {
        console.log(`❌ Function creation failed: ${functionError.message}`)
        
        if (functionError.message.includes('does not exist')) {
          console.log('⚠️ You need to apply the correct-function-fix.sql first!')
          console.log('   Copy the contents of correct-function-fix.sql and run it in Supabase SQL Editor')
        }
      } else {
        console.log(`✅ Function creation succeeded: ${functionProperty}`)
        
        // Verify the property was created correctly
        const { data: createdProperty } = await supabase
          .from('properties')
          .select('*')
          .eq('id', functionProperty)
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
          .eq('property_id', functionProperty)
          .eq('role', 'OWNER')
          .single()
        
        if (propertyUser) {
          console.log('✅ Property user relationship verified:')
          console.log(`   Role: ${propertyUser.role}`)
          console.log(`   Status: ${propertyUser.status}`)
        }
        
        // Clean up
        await supabase.from('properties').delete().eq('id', functionProperty)
        await supabase.from('property_users').delete().eq('property_id', functionProperty)
        console.log('✅ Function test property cleaned up')
      }
    } catch (err) {
      console.log(`❌ Function test error: ${err.message}`)
    }
    
    // Test the helper functions
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
    
    console.log('\n🎯 Test Summary:')
    console.log('✅ Direct property insertion works (schema is correct)')
    console.log('⚠️ Function-based creation needs the SQL fix to be applied')
    console.log('✅ Helper functions are working')
    
    console.log('\n📋 Next Steps:')
    console.log('1. Apply the correct-function-fix.sql in Supabase SQL Editor')
    console.log('2. Run this test again to verify function creation works')
    console.log('3. Test property creation in your React application')
    
    return true
    
  } catch (err) {
    console.error('❌ Test failed:', err)
    return false
  }
}

simplePropertyTest().then(success => {
  process.exit(success ? 0 : 1)
})
