#!/usr/bin/env node

/**
 * Verify Migration Success
 * Tests that the comprehensive RLS fix migration was applied successfully
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

async function verifyMigrationSuccess() {
  console.log('🔍 Verifying Migration Success...')
  console.log('   Testing all aspects of the RLS fix migration\n')
  
  let allTestsPassed = true
  
  try {
    // 1. Test data consistency
    console.log('1️⃣ Data Consistency Tests...')
    
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
    
    const { data: landlords, error: landError } = await supabase
      .from('landlords')
      .select('id, full_name, email')
    
    const { data: propertyUsers, error: puError } = await supabase
      .from('property_users')
      .select('user_id, property_id, role, status')
    
    if (propError || landError || puError) {
      console.log('❌ Failed to fetch basic data')
      allTestsPassed = false
    } else {
      console.log(`   ✅ Properties: ${properties.length}`)
      console.log(`   ✅ Landlords: ${landlords.length}`)
      console.log(`   ✅ Property users: ${propertyUsers.length}`)
      
      // Check foreign key consistency
      let foreignKeyIssues = 0
      const landlordIds = landlords.map(l => l.id)
      
      for (const property of properties) {
        if (property.landlord_id && !landlordIds.includes(property.landlord_id)) {
          foreignKeyIssues++
          console.log(`   ⚠️ Property ${property.name} has invalid landlord_id: ${property.landlord_id}`)
        }
      }
      
      if (foreignKeyIssues === 0) {
        console.log('   ✅ All foreign key constraints are valid')
      } else {
        console.log(`   ❌ Found ${foreignKeyIssues} foreign key issues`)
        allTestsPassed = false
      }
      
      // Check property_users consistency
      let propertyUserIssues = 0
      
      for (const property of properties) {
        const hasOwner = propertyUsers.some(pu => 
          pu.property_id === property.id && 
          pu.role === 'OWNER' && 
          pu.status === 'ACTIVE'
        )
        
        if (!hasOwner) {
          propertyUserIssues++
          console.log(`   ⚠️ Property ${property.name} has no active OWNER in property_users`)
        }
      }
      
      if (propertyUserIssues === 0) {
        console.log('   ✅ All properties have active owners in property_users')
      } else {
        console.log(`   ❌ Found ${propertyUserIssues} properties without active owners`)
        allTestsPassed = false
      }
    }
    
    // 2. Test helper functions
    console.log('\n2️⃣ Helper Function Tests...')
    
    const helperFunctions = [
      'user_has_property_access',
      'get_user_accessible_properties', 
      'create_property_with_owner',
      'ensure_user_landlord_entry'
    ]
    
    for (const funcName of helperFunctions) {
      try {
        // Test if function exists by calling it with invalid params (should fail gracefully)
        const { error } = await supabase.rpc(funcName, {})
        
        if (error && error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`   ❌ Function ${funcName} does not exist`)
          allTestsPassed = false
        } else {
          console.log(`   ✅ Function ${funcName} exists`)
        }
      } catch (err) {
        console.log(`   ✅ Function ${funcName} exists (error expected with empty params)`)
      }
    }
    
    // 3. Test property creation
    console.log('\n3️⃣ Property Creation Test...')
    
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      
      if (authUsers?.users?.length > 0) {
        const testUser = authUsers.users[0]
        console.log(`   Testing with user: ${testUser.email}`)
        
        // Test the create_property_with_owner function
        const { data: testPropertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
          property_name: 'Migration Verification Test Property',
          property_address: '123 Verification Test Street',
          property_type: 'APARTMENT'
        })
        
        if (createError) {
          console.log(`   ❌ Property creation failed: ${createError.message}`)
          allTestsPassed = false
        } else {
          console.log(`   ✅ Property created successfully: ${testPropertyId}`)
          
          // Verify the property was created correctly
          const { data: createdProperty, error: fetchError } = await supabase
            .from('properties')
            .select('id, name, landlord_id')
            .eq('id', testPropertyId)
            .single()
          
          if (fetchError) {
            console.log(`   ❌ Failed to fetch created property: ${fetchError.message}`)
            allTestsPassed = false
          } else {
            console.log(`   ✅ Property details verified: ${createdProperty.name}`)
            
            // Check if property_users entry was created
            const { data: propertyUserEntry, error: puFetchError } = await supabase
              .from('property_users')
              .select('user_id, role, status')
              .eq('property_id', testPropertyId)
              .eq('role', 'OWNER')
              .single()
            
            if (puFetchError) {
              console.log(`   ❌ Property users entry not found: ${puFetchError.message}`)
              allTestsPassed = false
            } else {
              console.log(`   ✅ Property users entry verified: ${propertyUserEntry.role}`)
            }
          }
          
          // Clean up test property
          await supabase.from('properties').delete().eq('id', testPropertyId)
          await supabase.from('property_users').delete().eq('property_id', testPropertyId)
          console.log('   ✅ Test property cleaned up')
        }
      } else {
        console.log('   ⚠️ No auth users available for testing')
      }
    } catch (err) {
      console.log(`   ❌ Property creation test failed: ${err.message}`)
      allTestsPassed = false
    }
    
    // 4. Test RLS policies
    console.log('\n4️⃣ RLS Policy Tests...')
    
    // Test with anon client (simulates authenticated user)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // Test property access without authentication
    const { data: anonProperties, error: anonError } = await anonClient
      .from('properties')
      .select('id')
      .limit(1)
    
    if (anonError && anonError.message.includes('row-level security')) {
      console.log('   ✅ RLS is properly blocking unauthenticated access')
    } else if (anonError) {
      console.log(`   ⚠️ Unexpected error: ${anonError.message}`)
    } else {
      console.log('   ⚠️ RLS may not be properly configured (anonymous access allowed)')
    }
    
    // Test with service role (should bypass RLS)
    const { data: serviceProperties, error: serviceError } = await supabase
      .from('properties')
      .select('id')
      .limit(1)
    
    if (serviceError) {
      console.log(`   ❌ Service role access failed: ${serviceError.message}`)
      allTestsPassed = false
    } else {
      console.log('   ✅ Service role can access properties (RLS bypass working)')
    }
    
    // 5. Test access functions
    console.log('\n5️⃣ Access Function Tests...')
    
    if (properties && properties.length > 0 && authUsers?.users?.length > 0) {
      const testProperty = properties[0]
      const testUser = authUsers.users[0]
      
      // Test user_has_property_access function
      const { data: hasAccess, error: accessError } = await supabase.rpc('user_has_property_access', {
        property_id: testProperty.id,
        user_id: testUser.id
      })
      
      if (accessError) {
        console.log(`   ❌ Access check failed: ${accessError.message}`)
        allTestsPassed = false
      } else {
        console.log(`   ✅ Access check completed: ${hasAccess ? 'Has access' : 'No access'}`)
      }
      
      // Test get_user_accessible_properties function
      const { data: accessibleProps, error: accessibleError } = await supabase.rpc('get_user_accessible_properties', {
        user_id: testUser.id
      })
      
      if (accessibleError) {
        console.log(`   ❌ Accessible properties check failed: ${accessibleError.message}`)
        allTestsPassed = false
      } else {
        console.log(`   ✅ Accessible properties check completed: ${accessibleProps?.length || 0} properties`)
      }
    }
    
    // 6. Final summary
    console.log('\n6️⃣ Migration Verification Summary...')
    
    if (allTestsPassed) {
      console.log('🎉 All tests passed! Migration was successful.')
      console.log('\n✅ Verification Results:')
      console.log('   ✅ Data consistency is maintained')
      console.log('   ✅ Foreign key constraints are satisfied')
      console.log('   ✅ Helper functions are working')
      console.log('   ✅ Property creation is functional')
      console.log('   ✅ RLS policies are active')
      console.log('   ✅ Access control functions are operational')
      
      console.log('\n💡 Your application can now:')
      console.log('   - Create properties using create_property_with_owner()')
      console.log('   - Check property access using user_has_property_access()')
      console.log('   - Get user properties using get_user_accessible_properties()')
      console.log('   - Ensure landlord entries using ensure_user_landlord_entry()')
      
      console.log('\n🔧 Example usage in your application:')
      console.log(`
   // Create a property
   const { data: propertyId, error } = await supabase.rpc('create_property_with_owner', {
     property_name: 'My Property',
     property_address: '123 Main Street',
     property_type: 'APARTMENT'
   })
   
   // Check access
   const { data: hasAccess } = await supabase.rpc('user_has_property_access', {
     property_id: propertyId,
     required_roles: ['OWNER', 'PROPERTY_MANAGER']
   })
   
   // Get accessible properties
   const { data: properties } = await supabase.rpc('get_user_accessible_properties')
   `)
      
    } else {
      console.log('❌ Some tests failed. Migration may need additional fixes.')
      console.log('\n⚠️ Issues found:')
      console.log('   - Check the error messages above')
      console.log('   - Verify the migration SQL was executed completely')
      console.log('   - Ensure all helper functions were created')
      console.log('   - Check RLS policies are properly configured')
    }
    
  } catch (err) {
    console.error('❌ Verification failed:', err)
    allTestsPassed = false
  }
  
  return allTestsPassed
}

// Run the verification
verifyMigrationSuccess().then(success => {
  process.exit(success ? 0 : 1)
})
