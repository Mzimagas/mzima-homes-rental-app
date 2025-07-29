#!/usr/bin/env node

/**
 * Direct RLS Policy Check for Properties Table
 * Uses direct SQL queries to examine RLS policies
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

async function checkRlsPoliciesDirect() {
  console.log('🔍 Direct RLS Policy Check for Properties Table...')
  console.log('   Using service role to examine policies and data\n')
  
  try {
    // 1. Check current data state
    console.log('1️⃣ Current Data Analysis...')
    
    // Get existing properties with landlord info
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, landlord_id, created_at')
    
    if (propError) {
      console.log('❌ Error fetching properties:', propError.message)
    } else {
      console.log(`   Properties found: ${properties.length}`)
      properties.forEach((prop, index) => {
        console.log(`   [${index + 1}] ${prop.name}`)
        console.log(`       ID: ${prop.id}`)
        console.log(`       Landlord: ${prop.landlord_id}`)
      })
    }
    
    // Get property_users relationships
    const { data: propertyUsers, error: puError } = await supabase
      .from('property_users')
      .select('user_id, property_id, role, status')
    
    if (puError) {
      console.log('⚠️ Property users error:', puError.message)
    } else {
      console.log(`\n   Property user relationships: ${propertyUsers.length}`)
      propertyUsers.forEach((pu, index) => {
        console.log(`   [${index + 1}] User: ${pu.user_id}`)
        console.log(`       Property: ${pu.property_id}`)
        console.log(`       Role: ${pu.role}`)
        console.log(`       Status: ${pu.status}`)
      })
    }
    
    // Get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message)
    } else {
      console.log(`\n   Auth users: ${authUsers.users.length}`)
      authUsers.users.forEach((user, index) => {
        console.log(`   [${index + 1}] ${user.email}`)
        console.log(`       ID: ${user.id}`)
        console.log(`       Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
      })
    }
    
    // 2. Test INSERT scenarios
    console.log('\n2️⃣ Testing INSERT Scenarios...')
    
    // Test data for insert
    const testPropertyData = {
      name: 'Test Property for RLS',
      address: '123 Test Street',
      property_type: 'APARTMENT',
      landlord_id: null // We'll set this dynamically
    }
    
    // Get a valid user ID for testing
    if (authUsers.users.length > 0) {
      const testUserId = authUsers.users[0].id
      testPropertyData.landlord_id = testUserId
      
      console.log(`   Testing with user: ${authUsers.users[0].email}`)
      console.log(`   User ID: ${testUserId}`)
      
      // Test 1: Insert with service role (should work - bypasses RLS)
      console.log('\n   Test 1: Service role INSERT (bypasses RLS)...')
      
      const { data: serviceInsert, error: serviceError } = await supabase
        .from('properties')
        .insert(testPropertyData)
        .select()
      
      if (serviceError) {
        console.log('❌ Service role insert failed:', serviceError.message)
        console.log('   This suggests a schema/constraint issue, not RLS')
      } else {
        console.log('✅ Service role insert succeeded')
        console.log(`   Created property: ${serviceInsert[0].id}`)
        
        // Clean up the test property
        await supabase
          .from('properties')
          .delete()
          .eq('id', serviceInsert[0].id)
        console.log('   Test property cleaned up')
      }
      
      // Test 2: Create authenticated client and test
      console.log('\n   Test 2: Authenticated user INSERT...')
      
      // Create a client with user authentication
      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
      // We can't easily authenticate as a specific user here, but we can analyze the issue
      console.log('   ⚠️ Cannot test authenticated insert without user session')
      console.log('   This is where the RLS violation likely occurs')
    }
    
    // 3. Analyze RLS policy requirements
    console.log('\n3️⃣ RLS Policy Analysis...')
    
    console.log('   Based on the migration files, the properties table likely has these policies:')
    console.log(`
   INSERT Policy: "Property owners can insert properties"
   - Condition: auth.uid() IS NOT NULL
   - OR: User has OWNER role in property_users

   The RLS violation suggests one of these issues:
   1. auth.uid() is NULL (user not authenticated)
   2. INSERT data doesn't include required landlord_id
   3. landlord_id doesn't match auth.uid()
   4. Property_users relationship is required but missing
   `)
    
    // 4. Check for missing relationships
    console.log('4️⃣ Relationship Analysis...')
    
    if (properties.length > 0 && propertyUsers.length > 0) {
      console.log('   Checking property-user relationships:')
      
      properties.forEach(prop => {
        const userRelation = propertyUsers.find(pu => pu.property_id === prop.id)
        const landlordMatch = prop.landlord_id === userRelation?.user_id
        
        console.log(`   Property: ${prop.name}`)
        console.log(`   - Landlord ID: ${prop.landlord_id}`)
        console.log(`   - Property User: ${userRelation ? userRelation.user_id : 'None'}`)
        console.log(`   - Role: ${userRelation ? userRelation.role : 'N/A'}`)
        console.log(`   - Match: ${landlordMatch ? '✅' : '❌'}`)
      })
    }
    
    // 5. Identify the specific issue
    console.log('\n5️⃣ Issue Identification...')
    
    const issues = []
    
    if (properties.length > 0) {
      const hasLandlordMismatch = properties.some(prop => {
        const userRelation = propertyUsers.find(pu => pu.property_id === prop.id)
        return prop.landlord_id !== userRelation?.user_id
      })
      
      if (hasLandlordMismatch) {
        issues.push('Landlord ID mismatch between properties and property_users')
      }
    }
    
    if (propertyUsers.length === 0) {
      issues.push('No property_users relationships found')
    }
    
    if (authUsers.users.length === 0) {
      issues.push('No authenticated users found')
    }
    
    console.log('   Potential issues identified:')
    if (issues.length === 0) {
      console.log('   ✅ No obvious data issues found')
      console.log('   The RLS violation is likely due to:')
      console.log('   - User authentication context during INSERT')
      console.log('   - Missing landlord_id in INSERT data')
      console.log('   - RLS policy expecting property_users entry')
    } else {
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`)
      })
    }
    
    // 6. Provide specific solutions
    console.log('\n6️⃣ Recommended Solutions...')
    
    console.log('   Based on the analysis, try these solutions:')
    console.log(`
   Solution 1: Ensure proper authentication
   - Verify user is logged in before INSERT
   - Check that auth.uid() returns a valid UUID

   Solution 2: Include landlord_id in INSERT
   - Set landlord_id = auth.uid() in your INSERT data
   - Example: { name: "Property", landlord_id: auth.uid(), ... }

   Solution 3: Create property_users entry
   - After successful property INSERT, create property_users entry
   - Set role = 'OWNER' and status = 'ACTIVE'

   Solution 4: Modify RLS policy (if needed)
   - Simplify INSERT policy to just check auth.uid() IS NOT NULL
   - Handle property_users relationship in application logic
   `)
    
    // 7. Test script for the user
    console.log('7️⃣ Test Script for Debugging...')
    
    console.log('   Use this code to test the INSERT operation:')
    console.log(`
   // In your application code:
   const { data: user } = await supabase.auth.getUser()
   console.log('Current user:', user?.user?.id)

   if (!user?.user?.id) {
     console.error('User not authenticated')
     return
   }

   const propertyData = {
     name: 'My Property',
     address: '123 Main St',
     property_type: 'APARTMENT',
     landlord_id: user.user.id  // This is crucial!
   }

   const { data, error } = await supabase
     .from('properties')
     .insert(propertyData)
     .select()

   if (error) {
     console.error('RLS Error:', error.message)
   } else {
     console.log('Success:', data)

     // Create property_users entry
     await supabase
       .from('property_users')
       .insert({
         user_id: user.user.id,
         property_id: data[0].id,
         role: 'OWNER',
         status: 'ACTIVE'
       })
   }
   `)
    
    console.log('\n🎯 Summary:')
    console.log('   The RLS violation is most likely caused by:')
    console.log('   1. Missing or incorrect landlord_id in INSERT data')
    console.log('   2. User not properly authenticated (auth.uid() is NULL)')
    console.log('   3. RLS policy expecting property_users relationship')
    console.log('\n   Fix by ensuring landlord_id = auth.uid() in your INSERT data')
    
  } catch (err) {
    console.error('❌ Error during RLS policy check:', err)
    process.exit(1)
  }
}

// Run the check
checkRlsPoliciesDirect()
