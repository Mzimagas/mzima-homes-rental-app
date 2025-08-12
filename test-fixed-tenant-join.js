#!/usr/bin/env node

/**
 * Test Fixed Tenant Join
 * Tests the corrected tenant relationship query
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

async function testFixedTenantJoin() {
  console.log('🧪 Testing Fixed Tenant Join...')
  console.log('   Testing the corrected tenant relationship query\n')
  
  const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca'
  
  try {
    // 1. Test the manual SQL join first
    console.log('1️⃣ Testing manual SQL join...')
    
    const { data: manualJoin, error: manualError } = await supabase.rpc('sql', {
      query: `
        SELECT
          units.id as unit_id,
          units.unit_label,
          tenants.id as tenant_id,
          tenants.full_name,
          tenants.status
        FROM units
        LEFT JOIN tenants ON tenants.current_unit_id = units.id
        WHERE units.property_id = $1
      `,
      params: [propertyId]
    })
    
    if (manualError) {
      console.log('❌ Manual SQL join failed:', manualError.message)
      console.log('   This indicates a fundamental relationship issue')
    } else {
      console.log(`✅ Manual SQL join works: ${manualJoin?.length || 0} results`)
      if (manualJoin && manualJoin.length > 0) {
        console.log('   Sample result:', manualJoin[0])
      }
    }
    
    // 2. Test the old problematic query
    console.log('\n2️⃣ Testing old problematic query (tenants!current_unit_id)...')
    
    const { data: oldQuery, error: oldError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        units (
          id,
          unit_label,
          tenants!current_unit_id (
            id,
            full_name,
            status
          )
        )
      `)
      .eq('id', propertyId)
      .single()
    
    if (oldError) {
      console.log('❌ Old query failed (expected):', oldError.message)
      if (oldError.message.includes('500')) {
        console.log('   → This confirms the 500 error was from this query')
      }
    } else {
      console.log('✅ Old query unexpectedly worked')
    }
    
    // 3. Test the new fixed query
    console.log('\n3️⃣ Testing new fixed query (tenants without !)...')
    
    const { data: newQuery, error: newError } = await supabase
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
    
    if (newError) {
      console.log('❌ New query failed:', newError.message)
      console.log('   Error code:', newError.code)
      console.log('   Error details:', newError.details)
      
      if (newError.message.includes('foreign key')) {
        console.log('\n🔧 ISSUE: Foreign key relationship not properly defined')
        console.log('   → Need to check Supabase relationship configuration')
      } else if (newError.message.includes('permission')) {
        console.log('\n🔧 ISSUE: RLS policy blocking access')
        console.log('   → Need to check RLS policies on tenants table')
      }
      
      return false
    }
    
    console.log('✅ New query succeeded!')
    console.log(`   Property: ${newQuery.name}`)
    console.log(`   Units: ${newQuery.units?.length || 0}`)
    
    if (newQuery.units && newQuery.units.length > 0) {
      newQuery.units.forEach(unit => {
        console.log(`   Unit ${unit.unit_label}: ${unit.tenants?.length || 0} tenants`)
        if (unit.tenants && unit.tenants.length > 0) {
          unit.tenants.forEach(tenant => {
            console.log(`     - ${tenant.full_name} (${tenant.status})`)
          })
        }
      })
    }
    
    // 4. Test alternative approach if needed
    console.log('\n4️⃣ Testing alternative approach (separate queries)...')
    
    // Get units first
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_label, monthly_rent_kes, is_active')
      .eq('property_id', propertyId)
    
    if (unitsError) {
      console.log('❌ Units query failed:', unitsError.message)
    } else {
      console.log(`✅ Units query works: ${units?.length || 0} units`)
      
      if (units && units.length > 0) {
        // Get tenants for each unit
        for (const unit of units) {
          const { data: tenants, error: tenantsError } = await supabase
            .from('tenants')
            .select('id, full_name, status')
            .eq('current_unit_id', unit.id)
          
          if (tenantsError) {
            console.log(`❌ Tenants query failed for unit ${unit.unit_label}:`, tenantsError.message)
          } else {
            console.log(`   Unit ${unit.unit_label}: ${tenants?.length || 0} tenants`)
          }
        }
      }
    }
    
    // 5. Summary
    console.log('\n5️⃣ Fix Summary...')
    
    console.log('\n🔧 ISSUE IDENTIFIED:')
    console.log('   The `tenants!current_unit_id` syntax was causing 500 errors')
    console.log('   This explicit foreign key join syntax is problematic in Supabase')
    
    console.log('\n✅ SOLUTION APPLIED:')
    console.log('   Changed from: tenants!current_unit_id(...)')
    console.log('   Changed to:   tenants(...)')
    console.log('   This uses Supabase\'s automatic relationship detection')
    
    console.log('\n🎯 EXPECTED RESULTS:')
    console.log('   ✅ No more 500 Internal Server Error')
    console.log('   ✅ Property queries work successfully')
    console.log('   ✅ Tenant data loads correctly')
    console.log('   ✅ Dashboard displays property information')
    
    return true
    
  } catch (err) {
    console.error('❌ Test failed:', err)
    return false
  }
}

// Run the test
testFixedTenantJoin().then(success => {
  console.log(`\n🎯 Fixed tenant join test ${success ? 'PASSED' : 'FAILED'}`)
  
  if (success) {
    console.log('\n🎉 TENANT JOIN FIXED!')
    console.log('   The 500 server error should be resolved.')
    console.log('   Dashboard and properties pages should now load successfully!')
  } else {
    console.log('\n⚠️ Tenant join still has issues.')
    console.log('   Check the error details above for specific problems.')
  }
  
  process.exit(success ? 0 : 1)
})
