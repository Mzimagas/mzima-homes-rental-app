#!/usr/bin/env node

/**
 * Diagnose Properties RLS Policy Violation
 * Comprehensive analysis of RLS policies and permissions for properties table
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

async function diagnosePropertiesRlsIssue() {
  console.log('🔍 Diagnosing Properties RLS Policy Violation...')
  console.log('   Analyzing row-level security policies and permissions\n')
  
  try {
    // 1. Check current RLS policies on properties table
    console.log('1️⃣ Current RLS Policies on Properties Table...')
    
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'properties'
          ORDER BY policyname;
        `
      })
    
    if (rlsError) {
      console.log('❌ Error fetching RLS policies:', rlsError.message)
    } else if (rlsPolicies && rlsPolicies.length > 0) {
      console.log(`   Found ${rlsPolicies.length} RLS policies:`)
      rlsPolicies.forEach((policy, index) => {
        console.log(`   [${index + 1}] Policy: ${policy.policyname}`)
        console.log(`       Command: ${policy.cmd}`)
        console.log(`       Roles: ${policy.roles}`)
        console.log(`       Condition: ${policy.qual || 'N/A'}`)
        console.log(`       With Check: ${policy.with_check || 'N/A'}`)
        console.log()
      })
    } else {
      console.log('   ⚠️ No RLS policies found on properties table')
    }
    
    // 2. Check if RLS is enabled on properties table
    console.log('2️⃣ RLS Status Check...')
    
    const { data: rlsStatus, error: statusError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE tablename = 'properties';
        `
      })
    
    if (statusError) {
      console.log('❌ Error checking RLS status:', statusError.message)
    } else if (rlsStatus && rlsStatus.length > 0) {
      const isEnabled = rlsStatus[0].rowsecurity
      console.log(`   RLS Enabled: ${isEnabled ? '✅ YES' : '❌ NO'}`)
    }
    
    // 3. Check properties table structure
    console.log('\n3️⃣ Properties Table Structure...')
    
    const { data: tableStructure, error: structureError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'properties'
          ORDER BY ordinal_position;
        `
      })
    
    if (structureError) {
      console.log('❌ Error fetching table structure:', structureError.message)
    } else if (tableStructure && tableStructure.length > 0) {
      console.log('   Table columns:')
      tableStructure.forEach(column => {
        console.log(`   - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`)
      })
    }
    
    // 4. Check current authenticated users
    console.log('\n4️⃣ Current Authentication Context...')
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message)
    } else {
      console.log(`   Total authenticated users: ${authUsers.users.length}`)
      if (authUsers.users.length > 0) {
        console.log('   Sample users:')
        authUsers.users.slice(0, 3).forEach((user, index) => {
          console.log(`   [${index + 1}] ID: ${user.id}`)
          console.log(`       Email: ${user.email}`)
          console.log(`       Created: ${user.created_at}`)
          console.log(`       Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
        })
      }
    }
    
    // 5. Check property_users table (if exists)
    console.log('\n5️⃣ Property Users System Check...')
    
    const { data: propertyUsers, error: puError } = await supabase
      .from('property_users')
      .select('*')
      .limit(5)
    
    if (puError) {
      console.log('⚠️ Property users table not accessible or doesn\'t exist:', puError.message)
    } else {
      console.log(`   Property users found: ${propertyUsers.length}`)
      if (propertyUsers.length > 0) {
        console.log('   Sample property user relationships:')
        propertyUsers.forEach((pu, index) => {
          console.log(`   [${index + 1}] User: ${pu.user_id}`)
          console.log(`       Property: ${pu.property_id}`)
          console.log(`       Role: ${pu.role}`)
          console.log(`       Status: ${pu.status}`)
        })
      }
    }
    
    // 6. Check existing properties
    console.log('\n6️⃣ Existing Properties Check...')
    
    const { data: existingProperties, error: propError } = await supabase
      .from('properties')
      .select('id, name, landlord_id, created_at')
      .limit(5)
    
    if (propError) {
      console.log('❌ Error fetching existing properties:', propError.message)
      console.log('   This might indicate RLS is blocking SELECT operations too')
    } else {
      console.log(`   Existing properties: ${existingProperties.length}`)
      if (existingProperties.length > 0) {
        console.log('   Sample properties:')
        existingProperties.forEach((prop, index) => {
          console.log(`   [${index + 1}] ID: ${prop.id}`)
          console.log(`       Name: ${prop.name}`)
          console.log(`       Landlord: ${prop.landlord_id}`)
          console.log(`       Created: ${prop.created_at}`)
        })
      }
    }
    
    // 7. Test RLS policy functions
    console.log('\n7️⃣ RLS Policy Functions Check...')
    
    // Check if get_user_landlord_ids function exists
    const { data: functionExists, error: funcError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT 
            routine_name,
            routine_type,
            routine_definition
          FROM information_schema.routines 
          WHERE routine_name IN ('get_user_landlord_ids', 'user_has_property_access', 'can_user_access_property')
          AND routine_schema = 'public';
        `
      })
    
    if (funcError) {
      console.log('❌ Error checking functions:', funcError.message)
    } else if (functionExists && functionExists.length > 0) {
      console.log('   RLS helper functions found:')
      functionExists.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`)
      })
    } else {
      console.log('   ⚠️ No RLS helper functions found')
    }
    
    // 8. Simulate INSERT operation analysis
    console.log('\n8️⃣ INSERT Operation Analysis...')
    
    console.log('   Common INSERT scenarios and RLS requirements:')
    console.log(`
    Scenario 1: Direct landlord insert
    - Requires: landlord_id = auth.uid()
    - Policy: "Property owners can insert properties"

    Scenario 2: Property manager insert
    - Requires: User in property_users with OWNER role
    - Policy: Multi-user system policies

    Scenario 3: New user first property
    - Requires: auth.uid() IS NOT NULL
    - May need: Automatic property_users entry creation
    `)
    
    // 9. Check for common RLS violation causes
    console.log('9️⃣ Common RLS Violation Causes...')
    
    const commonIssues = [
      {
        issue: 'User not authenticated',
        check: 'auth.uid() returns NULL',
        solution: 'Ensure user is logged in before insert'
      },
      {
        issue: 'Missing landlord_id in INSERT data',
        check: 'landlord_id field not provided or NULL',
        solution: 'Set landlord_id = auth.uid() in INSERT'
      },
      {
        issue: 'Property_users relationship missing',
        check: 'No entry in property_users table',
        solution: 'Create property_users entry with OWNER role'
      },
      {
        issue: 'RLS policy too restrictive',
        check: 'Policy WITH CHECK condition fails',
        solution: 'Modify policy or ensure data meets requirements'
      },
      {
        issue: 'Function dependencies missing',
        check: 'get_user_landlord_ids() or similar functions missing',
        solution: 'Create required helper functions'
      }
    ]
    
    console.log('   Potential causes of RLS violation:')
    commonIssues.forEach((issue, index) => {
      console.log(`   [${index + 1}] ${issue.issue}`)
      console.log(`       Check: ${issue.check}`)
      console.log(`       Solution: ${issue.solution}`)
      console.log()
    })
    
    // 10. Recommended diagnostic steps
    console.log('🔟 Recommended Diagnostic Steps...')
    
    console.log('   To identify the specific RLS violation:')
    console.log(`
    1. Check authentication context:
       - Verify auth.uid() is not NULL
       - Confirm user is properly authenticated

    2. Examine INSERT data:
       - Ensure landlord_id is provided
       - Verify landlord_id matches auth.uid()

    3. Test RLS policies:
       - Try INSERT with service role key (bypasses RLS)
       - Compare with authenticated user INSERT

    4. Check property_users setup:
       - Verify table exists and has proper data
       - Ensure user has OWNER role for new properties

    5. Review policy conditions:
       - Test each WITH CHECK condition manually
       - Verify helper functions work correctly
    `)
    
    console.log('\n📋 Summary of Findings:')
    console.log(`   - RLS Policies Found: ${rlsPolicies ? rlsPolicies.length : 0}`)
    console.log(`   - Auth Users: ${authUsers ? authUsers.users.length : 0}`)
    console.log(`   - Property Users: ${propertyUsers ? propertyUsers.length : 'N/A'}`)
    console.log(`   - Existing Properties: ${existingProperties ? existingProperties.length : 'N/A'}`)
    console.log(`   - Helper Functions: ${functionExists ? functionExists.length : 0}`)
    
    console.log('\n💡 Next Steps:')
    console.log('   1. Run this diagnostic with the actual user context causing the error')
    console.log('   2. Test INSERT operation with service role to confirm data validity')
    console.log('   3. Check specific RLS policy that\'s failing')
    console.log('   4. Verify authentication and user permissions')
    console.log('   5. Consider temporarily disabling RLS for testing')
    
  } catch (err) {
    console.error('❌ Error during RLS diagnosis:', err)
    process.exit(1)
  }
}

// Run the diagnosis
diagnosePropertiesRlsIssue()
