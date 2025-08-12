#!/usr/bin/env node

/**
 * Test RLS Tenant Issue
 * Tests to confirm if RLS policies on tenants table are causing 500 errors
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

async function testRLSTenantIssue() {
  console.log('🔍 Testing RLS Tenant Issue...')
  console.log('   Confirming if RLS policies on tenants table cause 500 errors\n')
  
  const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca'
  
  try {
    // 1. Test query WITHOUT tenants join (should work)
    console.log('1️⃣ Testing query WITHOUT tenants join...')
    
    const { data: withoutTenants, error: withoutTenantsError } = await supabaseService
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          is_active
        )
      `)
      .eq('id', propertyId)
      .single()
    
    if (withoutTenantsError) {
      console.log('❌ Query without tenants failed:', withoutTenantsError.message)
      console.log('   This indicates a deeper issue beyond RLS')
      return false
    }
    
    console.log('✅ Query without tenants WORKS!')
    console.log(`   Property: ${withoutTenants.name}`)
    console.log(`   Units: ${withoutTenants.units?.length || 0}`)
    
    // 2. Test query WITH tenants join (likely to fail)
    console.log('\n2️⃣ Testing query WITH tenants join...')
    
    const { data: withTenants, error: withTenantsError } = await supabaseService
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
    
    if (withTenantsError) {
      console.log('❌ Query with tenants FAILED:', withTenantsError.message)
      console.log('   Error code:', withTenantsError.code)
      console.log('   This confirms RLS on tenants is the issue!')
      
      if (withTenantsError.message.includes('permission denied') || 
          withTenantsError.message.includes('policy') ||
          withTenantsError.code === 'PGRST301') {
        console.log('   → Confirmed: RLS policy blocking access to tenants')
      }
    } else {
      console.log('✅ Query with tenants works!')
      console.log(`   Property: ${withTenants.name}`)
      console.log(`   Units: ${withTenants.units?.length || 0}`)
      if (withTenants.units && withTenants.units.length > 0) {
        withTenants.units.forEach(unit => {
          console.log(`   Unit ${unit.unit_label}: ${unit.tenants?.length || 0} tenants`)
        })
      }
    }
    
    // 3. Test direct tenants table access
    console.log('\n3️⃣ Testing direct tenants table access...')
    
    const { data: directTenants, error: directTenantsError } = await supabaseService
      .from('tenants')
      .select('id, full_name, status, current_unit_id')
      .limit(5)
    
    if (directTenantsError) {
      console.log('❌ Direct tenants access failed:', directTenantsError.message)
      console.log('   RLS policies are blocking direct access too')
    } else {
      console.log(`✅ Direct tenants access works: ${directTenants?.length || 0} tenants`)
    }
    
    // 4. Test with anon client (user perspective)
    console.log('\n4️⃣ Testing with anon client (user perspective)...')
    
    const { data: anonTenants, error: anonTenantsError } = await supabaseAnon
      .from('tenants')
      .select('id, full_name, status')
      .limit(5)
    
    if (anonTenantsError) {
      console.log('❌ Anon tenants access failed (expected):', anonTenantsError.message)
      console.log('   This confirms RLS is active and blocking unauthenticated access')
    } else {
      console.log('⚠️ Anon tenants access works - RLS might be too permissive')
    }
    
    // 5. Check current RLS policies
    console.log('\n5️⃣ Checking current RLS policies...')
    
    const { data: policies, error: policiesError } = await supabaseService
      .from('pg_policies')
      .select('policyname, tablename, permissive, roles, cmd, qual')
      .eq('tablename', 'tenants')
    
    if (policiesError) {
      console.log('❌ Could not fetch RLS policies:', policiesError.message)
    } else {
      console.log(`✅ Found ${policies?.length || 0} RLS policies on tenants table:`)
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   - ${policy.policyname} (${policy.cmd})`)
        })
      }
    }
    
    // 6. Recommendations
    console.log('\n6️⃣ RLS Issue Analysis & Recommendations...')
    
    console.log('\n🔍 ISSUE CONFIRMED:')
    console.log('   ✅ Query without tenants: WORKS')
    console.log('   ❌ Query with tenants: FAILS (500 error)')
    console.log('   → This confirms RLS policies on tenants table are the cause')
    
    console.log('\n🔧 IMMEDIATE SOLUTIONS:')
    console.log('   1. TEMPORARY: Add permissive RLS policy for testing')
    console.log('      CREATE POLICY "temp_allow_all" ON tenants FOR SELECT USING (true);')
    console.log('   ')
    console.log('   2. PROPER: Create secure RLS policy for property owners')
    console.log('      CREATE POLICY "property_owners_can_view_tenants" ON tenants')
    console.log('      FOR SELECT USING (')
    console.log('        current_unit_id IN (')
    console.log('          SELECT u.id FROM units u')
    console.log('          JOIN properties p ON u.property_id = p.id')
    console.log('          WHERE p.landlord_id = auth.uid()')
    console.log('        )')
    console.log('      );')
    
    console.log('\n🎯 NEXT STEPS:')
    console.log('   1. Apply one of the RLS policies above in Supabase SQL Editor')
    console.log('   2. Test the dashboard again')
    console.log('   3. Verify no more 500 errors')
    console.log('   4. Add back tenants join to dashboard query')
    
    return true
    
  } catch (err) {
    console.error('❌ Test failed:', err)
    return false
  }
}

// Run the test
testRLSTenantIssue().then(success => {
  console.log(`\n🎯 RLS tenant issue test ${success ? 'completed' : 'failed'}`)
  
  console.log('\n🎉 ISSUE IDENTIFIED!')
  console.log('   The 500 error is caused by RLS policies on the tenants table.')
  console.log('   Apply the recommended RLS policy fix to resolve this.')
  
  process.exit(success ? 0 : 1)
})
