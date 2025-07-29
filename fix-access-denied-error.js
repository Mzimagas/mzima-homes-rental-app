#!/usr/bin/env node

/**
 * Fix Access Denied Error
 * Diagnoses and fixes "Access denied: You do not have permission to perform this action" errors
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

async function fixAccessDeniedError() {
  console.log('🔧 Diagnosing "Access Denied" Error...')
  console.log('   Checking authentication, permissions, and RLS policies\n')
  
  try {
    // 1. Check authentication status
    console.log('1️⃣ Authentication Status Check...')
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Cannot access auth users:', authError.message)
    } else {
      console.log(`✅ Found ${authUsers.users.length} users in the system`)
      
      if (authUsers.users.length > 0) {
        console.log('   Recent users:')
        authUsers.users.slice(0, 3).forEach((user, index) => {
          console.log(`   [${index + 1}] ${user.email}`)
          console.log(`       ID: ${user.id}`)
          console.log(`       Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
          console.log(`       Last sign in: ${user.last_sign_in_at || 'Never'}`)
        })
      }
    }
    
    // 2. Check RLS status on key tables
    console.log('\n2️⃣ RLS Status Check...')
    
    const tables = ['properties', 'property_users', 'tenants', 'units']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
          
          // Check if it's an RLS violation
          if (error.message.includes('row-level security') || error.message.includes('policy')) {
            console.log(`   → RLS policy violation on ${table} table`)
          } else if (error.message.includes('permission') || error.message.includes('access denied')) {
            console.log(`   → Permission denied on ${table} table`)
          }
        } else {
          console.log(`✅ ${table}: Accessible (${data.length} records visible)`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }
    
    // 3. Check specific property access
    console.log('\n3️⃣ Property Access Analysis...')
    
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
    
    if (propError) {
      console.log('❌ Cannot access properties:', propError.message)
      console.log('   This confirms the RLS policy violation we identified earlier')
    } else {
      console.log(`✅ Can access ${properties.length} properties`)
      
      if (properties.length > 0) {
        const property = properties[0]
        console.log(`   Sample property: ${property.name}`)
        console.log(`   Landlord ID: ${property.landlord_id}`)
        
        // Check property_users for this property
        const { data: propertyUsers, error: puError } = await supabase
          .from('property_users')
          .select('user_id, role, status')
          .eq('property_id', property.id)
        
        if (puError) {
          console.log('❌ Cannot access property_users:', puError.message)
        } else {
          console.log(`   Property users: ${propertyUsers.length}`)
          propertyUsers.forEach(pu => {
            console.log(`   - User: ${pu.user_id}, Role: ${pu.role}, Status: ${pu.status}`)
          })
        }
      }
    }
    
    // 4. Test with different authentication contexts
    console.log('\n4️⃣ Authentication Context Test...')
    
    // Test with anon key (simulates unauthenticated user)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    const { data: anonTest, error: anonError } = await anonClient
      .from('properties')
      .select('id')
      .limit(1)
    
    if (anonError) {
      console.log('❌ Anonymous access denied:', anonError.message)
      console.log('   This is expected - RLS is working correctly')
    } else {
      console.log('⚠️ Anonymous access allowed - potential security issue')
    }
    
    // 5. Provide specific solutions based on the error
    console.log('\n5️⃣ Solutions for Access Denied Errors...')
    
    console.log('   Common causes and solutions:')
    console.log(`
   Cause 1: User not authenticated
   Solution: Ensure user is logged in before accessing data
   
   const { data: user, error } = await supabase.auth.getUser()
   if (!user?.user?.id) {
     // Redirect to login or show authentication error
     throw new Error('Please log in to access this resource')
   }
   
   Cause 2: RLS policy violation (properties table)
   Solution: Use correct landlord_id in operations
   
   // For property creation
   const propertyData = {
     name: 'Property Name',
     physical_address: 'Address',
     type: 'APARTMENT',
     landlord_id: user.user.id  // CRITICAL: Must match auth.uid()
   }
   
   Cause 3: Missing property_users relationship
   Solution: Ensure user has access via property_users table
   
   // Check if user has access to property
   const { data: access } = await supabase
     .from('property_users')
     .select('role')
     .eq('property_id', propertyId)
     .eq('user_id', user.user.id)
     .eq('status', 'ACTIVE')
     .single()
   
   if (!access) {
     throw new Error('You do not have access to this property')
   }
   
   Cause 4: Incorrect API key usage
   Solution: Use the correct Supabase client configuration
   
   // For authenticated operations, use anon key with user session
   const supabase = createClient(supabaseUrl, anonKey)
   // User must be signed in
   
   // For admin operations, use service role key
   const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
   `)
    
    // 6. Immediate fix for the current issue
    console.log('\n6️⃣ Immediate Fix for Current Issue...')
    
    if (authUsers.users.length > 0) {
      const testUser = authUsers.users[0]
      console.log(`   Testing with user: ${testUser.email}`)
      
      // Check if this user has property access
      const { data: userProperties, error: userPropError } = await supabase
        .from('property_users')
        .select('property_id, role, status')
        .eq('user_id', testUser.id)
        .eq('status', 'ACTIVE')
      
      if (userPropError) {
        console.log('❌ Cannot check user properties:', userPropError.message)
      } else {
        console.log(`   User has access to ${userProperties.length} properties`)
        
        if (userProperties.length === 0) {
          console.log('   ⚠️ User has no property access - this explains the access denied error')
          console.log(`
   To fix this, either:
   1. Create a property with this user as landlord
   2. Add this user to an existing property via property_users
   3. Use a different user who has property access
   `)
        }
      }
    }
    
    // 7. Quick test to verify the fix
    console.log('\n7️⃣ Quick Test Solution...')
    
    console.log('   Run this code in your application to test access:')
    console.log(`
   // Test user authentication and property access
   async function testAccess() {
     try {
       // Check authentication
       const { data: user, error: userError } = await supabase.auth.getUser()

       if (userError || !user?.user?.id) {
         console.log('❌ User not authenticated')
         return false
       }

       console.log('✅ User authenticated:', user.user.email)

       // Check property access
       const { data: properties, error: propError } = await supabase
         .from('properties')
         .select('id, name')
         .limit(5)

       if (propError) {
         console.log('❌ Property access denied:', propError.message)
         return false
       }

       console.log('✅ Property access granted:', properties.length, 'properties visible')
       return true

     } catch (err) {
       console.log('❌ Access test failed:', err.message)
       return false
     }
   }

   testAccess()
   `)
    
    console.log('\n🎯 Summary of Access Denied Issue:')
    
    if (propError) {
      console.log('   Root cause: RLS policy violation on properties table')
      console.log('   Solution: Fix data consistency and use correct authentication')
    } else {
      console.log('   Status: Properties are accessible with service role')
      console.log('   Issue: Likely authentication context in your application')
    }
    
    console.log('\n💡 Next Steps:')
    console.log('   1. Ensure user is properly authenticated in your app')
    console.log('   2. Use the corrected property INSERT code from the solution document')
    console.log('   3. Fix the data consistency issue with the SQL commands provided')
    console.log('   4. Test with the authentication check code above')
    
  } catch (err) {
    console.error('❌ Error diagnosing access denied issue:', err)
    process.exit(1)
  }
}

// Run the diagnosis
fixAccessDeniedError()
