// Test with correct schema column names to identify exact issues
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseAnonKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

async function testWithCorrectSchema() {
  console.log('🔍 Testing with Correct Schema Column Names...\n')
  
  const productionCredentials = {
    email: 'mzimahomes.manager@gmail.com',
    password: 'MzimaHomes2024!Secure'
  }
  
  try {
    // Login
    console.log('1️⃣ Testing login...')
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: productionCredentials.email,
      password: productionCredentials.password
    })
    
    if (signInError) {
      console.log('❌ Login failed:', signInError.message)
      return
    }
    
    console.log('✅ Login successful!')
    
    // Test function (this works)
    console.log('\n2️⃣ Testing get_user_accessible_properties function...')
    
    const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')
    
    if (accessError) {
      console.log('❌ Function failed:', accessError.message)
    } else {
      console.log('✅ Function working!')
      console.log(`   Properties: ${accessibleProperties?.length || 0}`)
    }
    
    // Test tables with minimal column selection to find correct schema
    console.log('\n3️⃣ Testing tables with minimal columns...')
    
    // Test properties with basic columns
    console.log('   Testing properties (basic columns)...')
    const { data: properties1, error: properties1Error } = await supabase
      .from('properties')
      .select('id, name')
      .limit(1)
    
    if (properties1Error) {
      console.log('❌ Properties (basic) failed:', properties1Error.message)
    } else {
      console.log('✅ Properties (basic) working!')
      console.log(`   Sample: ${properties1[0]?.name}`)
    }
    
    // Test properties with more columns to find correct names
    console.log('   Testing properties (extended columns)...')
    const { data: properties2, error: properties2Error } = await supabase
      .from('properties')
      .select('id, name, total_units, landlord_id, property_type')
      .limit(1)
    
    if (properties2Error) {
      console.log('❌ Properties (extended) failed:', properties2Error.message)
    } else {
      console.log('✅ Properties (extended) working!')
      if (properties2[0]) {
        console.log(`   Sample: ${properties2[0].name} - ${properties2[0].total_units} units`)
      }
    }
    
    // Test units with basic columns
    console.log('\n   Testing units (basic columns)...')
    const { data: units1, error: units1Error } = await supabase
      .from('units')
      .select('id, unit_label')
      .limit(1)
    
    if (units1Error) {
      console.log('❌ Units (basic) failed:', units1Error.message)
    } else {
      console.log('✅ Units (basic) working!')
      console.log(`   Sample: ${units1[0]?.unit_label}`)
    }
    
    // Test units with more columns
    console.log('   Testing units (extended columns)...')
    const { data: units2, error: units2Error } = await supabase
      .from('units')
      .select('id, unit_label, monthly_rent_kes, property_id')
      .limit(1)
    
    if (units2Error) {
      console.log('❌ Units (extended) failed:', units2Error.message)
    } else {
      console.log('✅ Units (extended) working!')
      if (units2[0]) {
        console.log(`   Sample: ${units2[0].unit_label} - KES ${units2[0].monthly_rent_kes}`)
      }
    }
    
    // Test tenants with basic columns
    console.log('\n   Testing tenants (basic columns)...')
    const { data: tenants1, error: tenants1Error } = await supabase
      .from('tenants')
      .select('id, full_name')
      .limit(1)
    
    if (tenants1Error) {
      console.log('❌ Tenants (basic) failed:', tenants1Error.message)
      
      if (tenants1Error.message.includes('infinite recursion')) {
        console.log('   🚨 RLS RECURSION DETECTED - Need to apply COMPLETE_RLS_AND_SCHEMA_FIX.sql')
      }
    } else {
      console.log('✅ Tenants (basic) working!')
      console.log(`   Sample: ${tenants1[0]?.full_name || 'No tenants'}`)
    }
    
    // Test property_users
    console.log('\n   Testing property_users...')
    const { data: propertyUsers, error: propertyUsersError } = await supabase
      .from('property_users')
      .select('property_id, user_id, role')
      .eq('user_id', signInData.user.id)
      .limit(1)
    
    if (propertyUsersError) {
      console.log('❌ Property users failed:', propertyUsersError.message)
      
      if (propertyUsersError.message.includes('infinite recursion')) {
        console.log('   🚨 RLS RECURSION DETECTED - Need to apply COMPLETE_RLS_AND_SCHEMA_FIX.sql')
      }
    } else {
      console.log('✅ Property users working!')
      console.log(`   User assignments: ${propertyUsers?.length || 0}`)
    }
    
    // Logout
    await supabase.auth.signOut()
    
    console.log('\n📋 Schema and RLS Test Results:')
    
    const hasRecursion = (tenants1Error && tenants1Error.message.includes('infinite recursion')) ||
                        (propertyUsersError && propertyUsersError.message.includes('infinite recursion'))
    
    if (hasRecursion) {
      console.log('🚨 CRITICAL: RLS INFINITE RECURSION DETECTED')
      console.log('')
      console.log('❌ Issue: property_users table policies cause infinite recursion')
      console.log('❌ Impact: Blocks access to tenants and property_users tables')
      console.log('❌ Result: Dashboard cannot load property data')
      console.log('')
      console.log('🔧 SOLUTION REQUIRED:')
      console.log('   1. Execute COMPLETE_RLS_AND_SCHEMA_FIX.sql in Supabase SQL Editor')
      console.log('   2. This will replace recursive policies with simple ones')
      console.log('   3. After applying, test again to verify fix')
      console.log('')
      console.log('📁 File to execute: COMPLETE_RLS_AND_SCHEMA_FIX.sql')
      console.log('🎯 Expected result: All tables accessible, dashboard functional')
      
    } else {
      console.log('✅ No RLS recursion detected')
      console.log('✅ Basic table access working')
      console.log('✅ Ready for full functionality testing')
    }
    
    console.log('\n📊 Working Components:')
    console.log(`✅ Authentication: ${!signInError ? 'Working' : 'Issues'}`)
    console.log(`✅ Functions: ${!accessError ? 'Working' : 'Issues'}`)
    console.log(`✅ Properties (basic): ${!properties1Error ? 'Working' : 'Issues'}`)
    console.log(`✅ Units (basic): ${!units1Error ? 'Working' : 'Issues'}`)
    console.log(`❌ Tenants: ${!tenants1Error ? 'Working' : 'RLS Recursion'}`)
    console.log(`❌ Property Users: ${!propertyUsersError ? 'Working' : 'RLS Recursion'}`)
    
    console.log('\n🎯 Next Steps:')
    if (hasRecursion) {
      console.log('   1. 🚨 URGENT: Apply COMPLETE_RLS_AND_SCHEMA_FIX.sql')
      console.log('   2. Test again after applying the fix')
      console.log('   3. Verify dashboard loads with real data')
    } else {
      console.log('   1. ✅ RLS is working correctly')
      console.log('   2. Test full application functionality')
      console.log('   3. Verify dashboard displays real property data')
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testWithCorrectSchema()
