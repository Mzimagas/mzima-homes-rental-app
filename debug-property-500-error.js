#!/usr/bin/env node

/**
 * Debug Property 500 Error
 * Tests the exact property query that's causing the 500 error
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

async function debugProperty500Error() {
  console.log('🔍 Debugging Property 500 Error...')
  console.log('   Testing the exact property query that\'s failing\n')
  
  const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca'
  
  try {
    // 1. Test basic property query
    console.log('1️⃣ Testing basic property query...')
    
    const { data: basicProperty, error: basicError } = await supabase
      .from('properties')
      .select('id, name, physical_address')
      .eq('id', propertyId)
      .single()
    
    if (basicError) {
      console.log('❌ Basic property query failed:', basicError.message)
      return false
    }
    
    console.log('✅ Basic property query works:', basicProperty)
    
    // 2. Test units query separately
    console.log('\n2️⃣ Testing units query...')
    
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_label, monthly_rent_kes, is_active')
      .eq('property_id', propertyId)
    
    if (unitsError) {
      console.log('❌ Units query failed:', unitsError.message)
      console.log('   This might be the source of the 500 error')
      return false
    }
    
    console.log(`✅ Units query works: ${units?.length || 0} units found`)
    if (units && units.length > 0) {
      console.log('   Sample unit:', units[0])
    }
    
    // 3. Test tenants query for each unit
    console.log('\n3️⃣ Testing tenants query...')
    
    if (units && units.length > 0) {
      for (const unit of units) {
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, full_name, status')
          .eq('unit_id', unit.id)
        
        if (tenantsError) {
          console.log(`❌ Tenants query failed for unit ${unit.unit_label}:`, tenantsError.message)
          console.log('   This is likely the source of the 500 error')
          return false
        }
        
        console.log(`✅ Tenants query works for unit ${unit.unit_label}: ${tenants?.length || 0} tenants`)
      }
    } else {
      console.log('⚠️ No units found, skipping tenants test')
    }
    
    // 4. Test the full nested query (the one that's failing)
    console.log('\n4️⃣ Testing full nested query...')
    
    const { data: fullProperty, error: fullError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        units(
          id,
          unit_label,
          monthly_rent_kes,
          is_active,
          tenants(
            id,
            full_name,
            status
          )
        )
      `)
      .eq('id', propertyId)
      .single()
    
    if (fullError) {
      console.log('❌ Full nested query failed:', fullError.message)
      console.log('   Error code:', fullError.code)
      console.log('   Error details:', fullError.details)
      console.log('   Error hint:', fullError.hint)
      
      // Analyze the error
      if (fullError.message.includes('permission denied')) {
        console.log('\n🔧 LIKELY CAUSE: RLS Policy Issue')
        console.log('   → Check that RLS policies allow reading units and tenants')
        console.log('   → Verify that the authenticated user has access to this data')
      } else if (fullError.message.includes('column') && fullError.message.includes('does not exist')) {
        console.log('\n🔧 LIKELY CAUSE: Column Name Issue')
        console.log('   → Check that all column names in the query exist in the tables')
        console.log('   → Verify table schema matches the query')
      } else if (fullError.message.includes('relation') && fullError.message.includes('does not exist')) {
        console.log('\n🔧 LIKELY CAUSE: Table/Relation Issue')
        console.log('   → Check that units and tenants tables exist')
        console.log('   → Verify foreign key relationships are set up correctly')
      } else {
        console.log('\n🔧 UNKNOWN ERROR TYPE')
        console.log('   → Check Supabase logs for more details')
        console.log('   → Verify database schema and permissions')
      }
      
      return false
    }
    
    console.log('✅ Full nested query works!')
    console.log('   Property:', fullProperty.name)
    console.log('   Units:', fullProperty.units?.length || 0)
    
    if (fullProperty.units) {
      fullProperty.units.forEach(unit => {
        console.log(`   Unit ${unit.unit_label}: ${unit.tenants?.length || 0} tenants`)
      })
    }
    
    // 5. Test RLS policies
    console.log('\n5️⃣ Testing RLS policies...')
    
    // Test with anon key (should fail if RLS is working)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    const { data: anonProperty, error: anonError } = await anonClient
      .from('properties')
      .select('id, name')
      .eq('id', propertyId)
      .single()
    
    if (anonError) {
      console.log('✅ RLS is working - anon access denied:', anonError.message)
    } else {
      console.log('⚠️ RLS might not be working - anon access allowed')
    }
    
    // 6. Recommendations
    console.log('\n6️⃣ Recommendations...')
    
    console.log('\n🔧 TO FIX THE 500 ERROR:')
    console.log('   1. Check RLS policies on units and tenants tables')
    console.log('   2. Verify foreign key relationships exist')
    console.log('   3. Test the query in Supabase SQL Editor')
    console.log('   4. Check Supabase logs for detailed error information')
    
    console.log('\n🎯 LIKELY SOLUTIONS:')
    console.log('   ✅ Add RLS policies for units table')
    console.log('   ✅ Add RLS policies for tenants table')
    console.log('   ✅ Verify foreign key constraints')
    console.log('   ✅ Check column names and data types')
    
    return true
    
  } catch (err) {
    console.error('❌ Debug test failed:', err)
    console.log('\n🔧 This error indicates a fundamental issue with the database setup')
    return false
  }
}

// Run the debug test
debugProperty500Error().then(success => {
  console.log(`\n🎯 Property 500 error debug ${success ? 'completed' : 'found the issue'}`)
  
  console.log('\n🚀 NEXT STEPS:')
  console.log('   1. Check the specific error details above')
  console.log('   2. Apply the recommended solution')
  console.log('   3. Test the query in Supabase SQL Editor')
  console.log('   4. Verify RLS policies are correctly configured')
  
  process.exit(success ? 0 : 1)
})
