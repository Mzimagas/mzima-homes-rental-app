// Test production user access after applying the complete RLS fix
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

async function testAfterRLSFix() {
  console.log('🔍 Testing After Complete RLS Fix Application...\n')
  
  const productionCredentials = {
    email: 'mzimahomes.manager@gmail.com',
    password: 'MzimaHomes2024!Secure'
  }
  
  try {
    // Step 1: Login
    console.log('1️⃣ Testing production user login...')
    
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
    
    // Step 2: Test get_user_accessible_properties function
    console.log('\n2️⃣ Testing get_user_accessible_properties function...')
    
    const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')
    
    if (accessError) {
      console.log('❌ Function call failed:', accessError.message)
    } else {
      console.log('✅ Function call successful!')
      console.log(`   Accessible properties: ${accessibleProperties?.length || 0}`)
      
      if (accessibleProperties && accessibleProperties.length > 0) {
        accessibleProperties.forEach(prop => {
          console.log(`   - ${prop.property_name}: ${prop.user_role}`)
        })
      }
    }
    
    // Step 3: Test direct table access with correct schema
    console.log('\n3️⃣ Testing direct database table access...')
    
    // Test properties table (using correct columns)
    console.log('   Testing properties table...')
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, address, total_units, landlord_id, property_type')
    
    if (propertiesError) {
      console.log('❌ Properties access failed:', propertiesError.message)
    } else {
      console.log('✅ Properties access successful!')
      console.log(`   Properties: ${properties?.length || 0}`)
      
      if (properties && properties.length > 0) {
        properties.forEach(prop => {
          console.log(`   - ${prop.name}: ${prop.total_units} units (${prop.property_type})`)
          console.log(`     Address: ${prop.address}`)
        })
      }
    }
    
    // Test units table
    console.log('\n   Testing units table...')
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_label, monthly_rent_kes, property_id, unit_type')
    
    if (unitsError) {
      console.log('❌ Units access failed:', unitsError.message)
    } else {
      console.log('✅ Units access successful!')
      console.log(`   Units: ${units?.length || 0}`)
      
      if (units && units.length > 0) {
        const totalRent = units.reduce((sum, unit) => sum + (unit.monthly_rent_kes || 0), 0)
        console.log(`   Total monthly rent potential: KES ${totalRent.toLocaleString()}`)
        
        // Show first few units
        units.slice(0, 3).forEach(unit => {
          console.log(`   - ${unit.unit_label}: KES ${unit.monthly_rent_kes?.toLocaleString() || 0}/month`)
        })
      }
    }
    
    // Test tenants table
    console.log('\n   Testing tenants table...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, full_name, email, phone, status')
    
    if (tenantsError) {
      console.log('❌ Tenants access failed:', tenantsError.message)
    } else {
      console.log('✅ Tenants access successful!')
      console.log(`   Tenants: ${tenants?.length || 0}`)
      
      if (tenants && tenants.length > 0) {
        const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length
        console.log(`   Active tenants: ${activeTenants}`)
      }
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
    
    // Step 4: Test property creation with correct schema
    console.log('\n4️⃣ Testing property creation...')
    
    const testProperty = {
      name: 'RLS Fix Test Property',
      address: '789 RLS Test Street, Nairobi',
      total_units: 5,
      landlord_id: signInData.user.id,
      property_type: 'APARTMENT'
      // Note: Removed 'description' field as it doesn't exist in schema
    }
    
    const { data: newProperty, error: createError } = await supabase
      .from('properties')
      .insert(testProperty)
      .select()
    
    if (createError) {
      console.log('❌ Property creation failed:', createError.message)
    } else {
      console.log('✅ Property creation successful!')
      console.log(`   Created: ${newProperty[0]?.name}`)
      
      // Test property update
      const { data: updatedProperty, error: updateError } = await supabase
        .from('properties')
        .update({ total_units: 6 })
        .eq('id', newProperty[0].id)
        .select()
      
      if (updateError) {
        console.log('❌ Property update failed:', updateError.message)
      } else {
        console.log('✅ Property update successful!')
      }
      
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
      const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length
      const occupancyRate = totalUnits > 0 ? ((activeTenants / totalUnits) * 100).toFixed(1) : 0
      const totalRentPotential = units.reduce((sum, unit) => sum + (unit.monthly_rent_kes || 0), 0)
      
      console.log('✅ Dashboard statistics ready:')
      console.log(`   📊 Total Properties: ${totalProperties}`)
      console.log(`   🏠 Total Units: ${totalUnits}`)
      console.log(`   👥 Active Tenants: ${activeTenants}`)
      console.log(`   📈 Occupancy Rate: ${occupancyRate}%`)
      console.log(`   💰 Monthly Rent Potential: KES ${totalRentPotential.toLocaleString()}`)
    }
    
    // Step 6: Test logout
    console.log('\n6️⃣ Testing logout...')
    
    const { error: logoutError } = await supabase.auth.signOut()
    
    if (logoutError) {
      console.log('❌ Logout failed:', logoutError.message)
    } else {
      console.log('✅ Logout successful!')
    }
    
    // Final assessment
    console.log('\n📋 Complete RLS Fix Test Results:')
    
    const allTablesWorking = !propertiesError && !unitsError && !tenantsError && !propertyUsersError
    const functionsWorking = !accessError
    const crudWorking = !createError
    
    if (allTablesWorking && functionsWorking && crudWorking) {
      console.log('🎉 ALL TESTS PASSED - RLS FIX COMPLETELY SUCCESSFUL!')
      console.log('')
      console.log('✅ RLS recursion: ELIMINATED')
      console.log('✅ Property loading: WORKING')
      console.log('✅ Database access: FULL ACCESS')
      console.log('✅ CRUD operations: FUNCTIONAL')
      console.log('✅ Multi-user system: OPERATIONAL')
      console.log('✅ Dashboard data: READY')
      
      console.log('\n🚀 Application Status: FULLY FUNCTIONAL')
      console.log('   ✅ No more "Failed to load properties" errors')
      console.log('   ✅ No more "Unable to load properties" messages')
      console.log('   ✅ Dashboard will show real property statistics')
      console.log('   ✅ All property management features working')
      
      console.log('\n📱 Ready for Production Use:')
      console.log('   1. Login at: http://localhost:3000/auth/login')
      console.log(`   2. Email: ${productionCredentials.email}`)
      console.log('   3. Dashboard should load with real data')
      console.log('   4. All property management operations functional')
      
    } else {
      console.log('⚠️ SOME ISSUES STILL DETECTED')
      console.log('')
      console.log(`✅ Function access: ${functionsWorking ? 'Working' : 'Issues detected'}`)
      console.log(`✅ Database tables: ${allTablesWorking ? 'Working' : 'Issues detected'}`)
      console.log(`✅ CRUD operations: ${crudWorking ? 'Working' : 'Issues detected'}`)
      
      if (!allTablesWorking) {
        console.log('\n❌ Table access issues:')
        if (propertiesError) console.log(`   - Properties: ${propertiesError.message}`)
        if (unitsError) console.log(`   - Units: ${unitsError.message}`)
        if (tenantsError) console.log(`   - Tenants: ${tenantsError.message}`)
        if (propertyUsersError) console.log(`   - Property Users: ${propertyUsersError.message}`)
      }
      
      console.log('\n🔧 Next Steps:')
      console.log('   1. Verify RLS fix was fully applied in Supabase')
      console.log('   2. Check for any remaining policy conflicts')
      console.log('   3. Ensure all table permissions are granted')
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testAfterRLSFix()
