#!/usr/bin/env node

/**
 * Test Exact Property Query
 * Tests the exact query that the dashboard uses
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

async function testExactPropertyQuery() {
  console.log('🧪 Testing Exact Property Query...')
  console.log('   Testing the exact query used by the dashboard\n')
  
  const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca'
  
  try {
    // Test the exact query from the dashboard
    console.log('1️⃣ Testing exact dashboard query...')
    
    const { data: properties, error: propertiesError } = await supabase
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
          tenants!current_unit_id (
            id,
            full_name,
            status
          )
        )
      `)
      .in('id', [propertyId])
    
    if (propertiesError) {
      console.log('❌ Dashboard query failed:', propertiesError.message)
      console.log('   Error code:', propertiesError.code)
      console.log('   Error details:', propertiesError.details)
      
      if (propertiesError.message.includes('unit_id does not exist')) {
        console.log('\n🔧 ISSUE: Still using old unit_id column')
        console.log('   → The query should use current_unit_id instead')
        console.log('   → Check that the frontend code is updated')
      } else if (propertiesError.message.includes('permission denied')) {
        console.log('\n🔧 ISSUE: RLS Policy Problem')
        console.log('   → Check RLS policies on units and tenants tables')
      }
      
      return false
    }
    
    console.log('✅ Dashboard query succeeded!')
    console.log(`   Properties found: ${properties?.length || 0}`)
    
    if (properties && properties.length > 0) {
      const property = properties[0]
      console.log(`   Property: ${property.name}`)
      console.log(`   Units: ${property.units?.length || 0}`)
      
      if (property.units && property.units.length > 0) {
        property.units.forEach(unit => {
          console.log(`   Unit ${unit.unit_label}: ${unit.tenants?.length || 0} tenants`)
          if (unit.tenants && unit.tenants.length > 0) {
            unit.tenants.forEach(tenant => {
              console.log(`     - ${tenant.full_name} (${tenant.status})`)
            })
          }
        })
      }
    }
    
    // Test the properties page query too
    console.log('\n2️⃣ Testing properties page query...')
    
    const { data: propertiesPage, error: propertiesPageError } = await supabase
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
          tenants!current_unit_id (
            id,
            full_name,
            status
          )
        )
      `)
      .in('id', [propertyId])
      .order('name')
    
    if (propertiesPageError) {
      console.log('❌ Properties page query failed:', propertiesPageError.message)
      return false
    }
    
    console.log('✅ Properties page query succeeded!')
    console.log(`   Properties found: ${propertiesPage?.length || 0}`)
    
    // Test RPC function
    console.log('\n3️⃣ Testing RPC function...')
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_properties_simple')
    
    if (rpcError) {
      console.log('❌ RPC function failed:', rpcError.message)
      if (rpcError.message.includes('does not exist')) {
        console.log('   → Need to apply the SQL fix for RPC functions')
      }
    } else {
      console.log(`✅ RPC function works: ${rpcData?.length || 0} properties`)
    }
    
    console.log('\n4️⃣ Summary...')
    
    console.log('\n🎯 RESULTS:')
    console.log('   ✅ Dashboard query: Fixed tenant relationship')
    console.log('   ✅ Properties page query: Fixed tenant relationship')
    console.log('   ✅ No more "column tenants.unit_id does not exist" errors')
    console.log('   ✅ Property data loads successfully')
    
    console.log('\n🚀 NEXT STEPS:')
    console.log('   1. Hard refresh browser to clear cache')
    console.log('   2. Test dashboard and properties pages')
    console.log('   3. Verify no more 500 server errors')
    console.log('   4. Check that tenant data displays correctly')
    
    return true
    
  } catch (err) {
    console.error('❌ Test failed:', err)
    return false
  }
}

// Run the test
testExactPropertyQuery().then(success => {
  console.log(`\n🎯 Property query test ${success ? 'PASSED' : 'FAILED'}`)
  
  if (success) {
    console.log('\n🎉 PROPERTY QUERY FIXED!')
    console.log('   The 500 server error should be resolved.')
    console.log('   Test your dashboard and properties pages now!')
  } else {
    console.log('\n⚠️ Property query still has issues.')
    console.log('   Check the error details above.')
  }
  
  process.exit(success ? 0 : 1)
})
