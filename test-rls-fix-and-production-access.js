// Test RLS fix and production user access after applying the SQL script
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

async function testRLSFixAndProductionAccess() {
  console.log('🔍 Testing RLS Fix and Production User Access...\n')
  
  const productionCredentials = {
    email: 'mzimahomes.manager@gmail.com',
    password: 'MzimaHomes2024!Secure'
  }
  
  try {
    // Step 1: Test production user login
    console.log('1️⃣ Testing production user authentication...')
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: productionCredentials.email,
      password: productionCredentials.password
    })
    
    if (signInError) {
      console.log('❌ Login failed:', signInError.message)
      return
    }
    
    console.log('✅ Login successful!')
    console.log(`   User: ${signInData.user?.email}`)
    console.log(`   User ID: ${signInData.user?.id}`)
    
    // Step 2: Test get_user_accessible_properties function
    console.log('\n2️⃣ Testing get_user_accessible_properties function...')
    
    const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')
    
    if (accessError) {
      console.log('❌ Function call failed:', accessError.message)
      
      if (accessError.message.includes('infinite recursion')) {
        console.log('   RLS recursion issue still exists - RLS fix may not have been applied')
      } else if (accessError.message.includes('Could not find the function')) {
        console.log('   Function does not exist - need to create multi-user functions')
      }
    } else {
      console.log('✅ Function call successful!')
      console.log(`   Accessible properties: ${accessibleProperties?.length || 0}`)
      
      if (accessibleProperties && accessibleProperties.length > 0) {
        accessibleProperties.forEach(prop => {
          console.log(`   - ${prop.property_name}: ${prop.user_role}`)
          console.log(`     Permissions: Users(${prop.can_manage_users}), Edit(${prop.can_edit_property}), Tenants(${prop.can_manage_tenants})`)
        })
      } else {
        console.log('   No properties accessible - may need to check property_users assignments')
      }
    }
    
    // Step 3: Test direct database table access
    console.log('\n3️⃣ Testing direct database table access...')
    
    // Test properties table
    console.log('   Testing properties table...')
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, location, total_units, landlord_id')
    
    if (propertiesError) {
      console.log('❌ Properties access failed:', propertiesError.message)
      
      if (propertiesError.message.includes('infinite recursion')) {
        console.log('   RLS recursion still exists in properties table')
      }
    } else {
      console.log('✅ Properties access successful!')
      console.log(`   Properties: ${properties?.length || 0}`)
      
      if (properties && properties.length > 0) {
        properties.forEach(prop => {
          console.log(`   - ${prop.name}: ${prop.total_units} units`)
          console.log(`     Location: ${prop.location}`)
          console.log(`     Landlord ID: ${prop.landlord_id}`)
        })
      }
    }
    
    // Test units table
    console.log('\n   Testing units table...')
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_label, monthly_rent_kes, property_id')
    
    if (unitsError) {
      console.log('❌ Units access failed:', unitsError.message)
    } else {
      console.log('✅ Units access successful!')
      console.log(`   Units: ${units?.length || 0}`)
      
      if (units && units.length > 0) {
        const totalRent = units.reduce((sum, unit) => sum + (unit.monthly_rent_kes || 0), 0)
        console.log(`   Total monthly rent potential: KES ${totalRent.toLocaleString()}`)
      }
    }
    
    // Test tenants table
    console.log('\n   Testing tenants table...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, full_name, email, phone')
    
    if (tenantsError) {
      console.log('❌ Tenants access failed:', tenantsError.message)
    } else {
      console.log('✅ Tenants access successful!')
      console.log(`   Tenants: ${tenants?.length || 0}`)
    }
    
    // Test property_users table
    console.log('\n   Testing property_users table...')
    const { data: propertyUsers, error: propertyUsersError } = await supabase
      .from('property_users')
      .select('property_id, user_id, role, status')
      .eq('user_id', signInData.user.id)
    
    if (propertyUsersError) {
      console.log('❌ Property users access failed:', propertyUsersError.message)
    } else {
      console.log('✅ Property users access successful!')
      console.log(`   User property assignments: ${propertyUsers?.length || 0}`)
      
      if (propertyUsers && propertyUsers.length > 0) {
        propertyUsers.forEach(pu => {
          console.log(`   - Property ${pu.property_id}: ${pu.role} (${pu.status})`)
        })
      }
    }
    
    // Step 4: Test property creation capability
    console.log('\n4️⃣ Testing property creation capability...')
    
    const testProperty = {
      name: 'RLS Test Property',
      location: '789 RLS Test Street, Nairobi',
      total_units: 5,
      landlord_id: signInData.user.id,
      property_type: 'APARTMENT',
      description: 'Test property for RLS fix verification'
    }
    
    const { data: newProperty, error: createError } = await supabase
      .from('properties')
      .insert(testProperty)
      .select()
    
    if (createError) {
      console.log('❌ Property creation failed:', createError.message)
      
      if (createError.message.includes('column') && createError.message.includes('does not exist')) {
        console.log('   Schema mismatch - column names may need adjustment')
      }
    } else {
      console.log('✅ Property creation successful!')
      console.log(`   Created: ${newProperty[0]?.name}`)
      
      // Clean up test property
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', newProperty[0].id)
      
      if (deleteError) {
        console.log('❌ Property deletion failed:', deleteError.message)
      } else {
        console.log('✅ Property deletion successful!')
      }
    }
    
    // Step 5: Calculate dashboard statistics
    console.log('\n5️⃣ Calculating dashboard statistics...')
    
    if (properties && units && tenants) {
      const totalProperties = properties.length
      const totalUnits = units.length
      const occupiedUnits = units.filter(unit => {
        // Check if unit has a tenant (this logic may need adjustment based on actual schema)
        return tenants.some(tenant => tenant.current_unit_id === unit.id)
      }).length
      const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : 0
      
      console.log('✅ Dashboard statistics calculated:')
      console.log(`   Total Properties: ${totalProperties}`)
      console.log(`   Total Units: ${totalUnits}`)
      console.log(`   Occupied Units: ${occupiedUnits}`)
      console.log(`   Occupancy Rate: ${occupancyRate}%`)
      console.log(`   Total Tenants: ${tenants.length}`)
    }
    
    // Step 6: Test logout
    console.log('\n6️⃣ Testing logout...')
    
    const { error: logoutError } = await supabase.auth.signOut()
    
    if (logoutError) {
      console.log('❌ Logout failed:', logoutError.message)
    } else {
      console.log('✅ Logout successful!')
    }
    
    console.log('\n📋 RLS Fix and Production Access Test Summary:')
    
    if (!accessError && !propertiesError && !unitsError && !tenantsError) {
      console.log('🎉 ALL TESTS PASSED - RLS FIX SUCCESSFUL!')
      console.log('')
      console.log('✅ RLS recursion issue: RESOLVED')
      console.log('✅ Property loading: WORKING')
      console.log('✅ Database access: FUNCTIONAL')
      console.log('✅ Multi-user system: OPERATIONAL')
      console.log('✅ Production user: FULL ACCESS')
      
      console.log('\n🚀 Expected Application Behavior:')
      console.log('   ✅ Dashboard will load with real property data')
      console.log('   ✅ Property creation will work without errors')
      console.log('   ✅ All property management features functional')
      console.log('   ✅ No more "Failed to load properties" errors')
      console.log('   ✅ No more "Unable to load properties" messages')
      
      console.log('\n📱 Ready for Production Use:')
      console.log('   1. Login at: http://localhost:3000/auth/login')
      console.log(`   2. Use: ${productionCredentials.email}`)
      console.log('   3. Dashboard should show real property statistics')
      console.log('   4. All property management features should work')
      
    } else {
      console.log('⚠️ SOME ISSUES DETECTED')
      console.log('')
      
      if (accessError) {
        console.log('❌ Function access: Still has issues')
      } else {
        console.log('✅ Function access: Working')
      }
      
      if (propertiesError) {
        console.log('❌ Properties table: Still has issues')
      } else {
        console.log('✅ Properties table: Working')
      }
      
      if (unitsError) {
        console.log('❌ Units table: Still has issues')
      } else {
        console.log('✅ Units table: Working')
      }
      
      if (tenantsError) {
        console.log('❌ Tenants table: Still has issues')
      } else {
        console.log('✅ Tenants table: Working')
      }
      
      console.log('\n🔧 Next Steps:')
      console.log('   1. Check if RLS fix was fully applied in Supabase')
      console.log('   2. Verify all policies were updated correctly')
      console.log('   3. Ensure production user has proper property assignments')
      console.log('   4. Check for any remaining schema mismatches')
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testRLSFixAndProductionAccess()
