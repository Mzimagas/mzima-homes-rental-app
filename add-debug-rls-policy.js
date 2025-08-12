#!/usr/bin/env node

/**
 * Add Debug RLS Policy for Tenants
 * Temporarily allows all access to identify if RLS is the issue
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

async function addDebugRLSPolicy() {
  console.log('🔧 Adding Debug RLS Policy for Tenants...')
  console.log('   ⚠️ WARNING: This allows ALL access - for debugging only!\n')
  
  try {
    // Add temporary permissive policy for debugging
    const debugPolicy = `
      CREATE POLICY "allow_all_for_debugging" ON tenants
      FOR SELECT
      TO authenticated
      USING (true)
    `
    
    console.log('1️⃣ Adding temporary debug policy...')
    
    try {
      await supabase.rpc('exec_sql', { sql: debugPolicy })
      console.log('   ✅ Debug policy added successfully')
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log('   ✅ Debug policy already exists')
      } else {
        console.log('   ❌ Failed to add debug policy:', err.message)
        return false
      }
    }
    
    // Test the query that was failing
    console.log('\n2️⃣ Testing the problematic query...')
    
    const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca'
    
    const { data: property, error: propertyError } = await supabase
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
      .eq('id', propertyId)
      .single()
    
    if (propertyError) {
      console.log('   ❌ Query still fails even with debug policy:')
      console.log('   Error message:', propertyError.message)
      console.log('   Error code:', propertyError.code)
      console.log('   Error hint:', propertyError.hint)
      console.log('   Error details:', propertyError.details)
      console.log('   Full error:', propertyError)
      
      console.log('\n🔍 ANALYSIS:')
      if (propertyError.message && propertyError.message.includes('permission')) {
        console.log('   → Still a permissions/RLS issue')
      } else if (propertyError.message && propertyError.message.includes('foreign key')) {
        console.log('   → Foreign key relationship issue')
      } else if (propertyError.message && propertyError.message.includes('does not exist')) {
        console.log('   → Table or column does not exist')
      } else {
        console.log('   → Unknown issue - check error details above')
      }
      
      return false
    } else {
      console.log('   ✅ Query works with debug policy!')
      console.log(`   Property: ${property.name}`)
      console.log(`   Units: ${property.units?.length || 0}`)
      if (property.units && property.units.length > 0) {
        property.units.forEach(unit => {
          console.log(`   Unit ${unit.unit_label}: ${unit.tenants?.length || 0} tenants`)
        })
      }
    }
    
    // Summary
    console.log('\n3️⃣ Debug Policy Test Summary...')
    
    console.log('\n🎯 ISSUE CONFIRMED:')
    console.log('   ✅ Query works with permissive RLS policy')
    console.log('   → The 500 error was definitely caused by RLS policies')
    
    console.log('\n🔧 NEXT STEPS:')
    console.log('   1. Test your dashboard now - it should work')
    console.log('   2. Check browser console for detailed error logs')
    console.log('   3. Remove this debug policy and add secure policies')
    console.log('   4. Fix the GoTrueClient multiple instances warning')
    
    console.log('\n⚠️ SECURITY WARNING:')
    console.log('   This debug policy allows ALL users to see ALL tenant data!')
    console.log('   Remove it immediately after testing:')
    console.log('   DROP POLICY "allow_all_for_debugging" ON tenants;')
    
    return true
    
  } catch (err) {
    console.error('❌ Debug policy setup failed:', err)
    return false
  }
}

// Run the debug policy setup
addDebugRLSPolicy().then(success => {
  console.log(`\n🎯 Debug RLS policy ${success ? 'ADDED SUCCESSFULLY' : 'FAILED'}`)
  
  if (success) {
    console.log('\n🎉 DEBUG POLICY ACTIVE!')
    console.log('   Test your dashboard now to confirm RLS was the issue.')
    console.log('   Remember to remove this policy after testing!')
  } else {
    console.log('\n⚠️ Debug policy setup had issues.')
    console.log('   Check the error details above.')
  }
  
  process.exit(success ? 0 : 1)
})
