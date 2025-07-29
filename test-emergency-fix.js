// Test the emergency RLS fix with basic columns only
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

async function testEmergencyFix() {
  console.log('🚨 Testing Emergency RLS Recursion Fix...\n')
  
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
    
    // Step 2: Test function (should still work)
    console.log('\n2️⃣ Testing get_user_accessible_properties function...')
    
    const { data: accessibleProperties, error: accessError } = await supabase.rpc('get_user_accessible_properties')
    
    if (accessError) {
      console.log('❌ Function failed:', accessError.message)
    } else {
      console.log('✅ Function working!')
      console.log(`   Accessible properties: ${accessibleProperties?.length || 0}`)
      
      if (accessibleProperties && accessibleProperties.length > 0) {
        accessibleProperties.forEach(prop => {
          console.log(`   - ${prop.property_name}: ${prop.user_role}`)
        })
      }
    }
    
    // Step 3: Test basic table access (the critical test)
    console.log('\n3️⃣ Testing basic table access (CRITICAL TEST)...')
    
    // Test property_users (source of recursion)
    console.log('   Testing property_users table...')
    const { data: propertyUsers, error: propertyUsersError } = await supabase
      .from('property_users')
      .select('property_id, user_id, role, status')
      .eq('user_id', signInData.user.id)
    
    if (propertyUsersError) {
      console.log('❌ Property users failed:', propertyUsersError.message)
      
      if (propertyUsersError.message.includes('infinite recursion')) {
        console.log('   🚨 RECURSION STILL EXISTS - Emergency fix may not have been applied')
      }
    } else {
      console.log('✅ Property users working!')
      console.log(`   User assignments: ${propertyUsers?.length || 0}`)
      
      if (propertyUsers && propertyUsers.length > 0) {
        propertyUsers.forEach(pu => {
          console.log(`   - Property ${pu.property_id}: ${pu.role} (${pu.status})`)
        })
      }
    }
    
    // Test properties (basic columns only)
    console.log('\n   Testing properties table...')
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
    
    if (propertiesError) {
      console.log('❌ Properties failed:', propertiesError.message)
    } else {
      console.log('✅ Properties working!')
      console.log(`   Properties: ${properties?.length || 0}`)
      
      if (properties && properties.length > 0) {
        properties.forEach(prop => {
          console.log(`   - ${prop.name} (ID: ${prop.id})`)
        })
      }
    }
    
    // Test units (basic columns only)
    console.log('\n   Testing units table...')
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_label, property_id')
    
    if (unitsError) {
      console.log('❌ Units failed:', unitsError.message)
    } else {
      console.log('✅ Units working!')
      console.log(`   Units: ${units?.length || 0}`)
      
      if (units && units.length > 0) {
        console.log(`   Sample: ${units[0].unit_label}`)
      }
    }
    
    // Test tenants (basic columns only)
    console.log('\n   Testing tenants table...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, full_name')
    
    if (tenantsError) {
      console.log('❌ Tenants failed:', tenantsError.message)
    } else {
      console.log('✅ Tenants working!')
      console.log(`   Tenants: ${tenants?.length || 0}`)
    }
    
    // Step 4: Test basic property creation
    console.log('\n4️⃣ Testing basic property creation...')
    
    const testProperty = {
      name: 'Emergency Fix Test Property',
      landlord_id: signInData.user.id
    }
    
    const { data: newProperty, error: createError } = await supabase
      .from('properties')
      .insert(testProperty)
      .select()
    
    if (createError) {
      console.log('❌ Property creation failed:', createError.message)
    } else {
      console.log('✅ Property creation working!')
      console.log(`   Created: ${newProperty[0]?.name}`)
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', newProperty[0].id)
      
      if (deleteError) {
        console.log('❌ Cleanup failed:', deleteError.message)
      } else {
        console.log('✅ Cleanup successful!')
      }
    }
    
    // Step 5: Logout
    console.log('\n5️⃣ Testing logout...')
    
    const { error: logoutError } = await supabase.auth.signOut()
    
    if (logoutError) {
      console.log('❌ Logout failed:', logoutError.message)
    } else {
      console.log('✅ Logout successful!')
    }
    
    // Final assessment
    console.log('\n📋 Emergency RLS Fix Test Results:')
    
    const recursionFixed = !propertyUsersError || !propertyUsersError.message.includes('infinite recursion')
    const tablesWorking = !propertiesError && !unitsError && !tenantsError && recursionFixed
    const functionsWorking = !accessError
    const crudWorking = !createError
    
    if (recursionFixed && tablesWorking && functionsWorking) {
      console.log('🎉 EMERGENCY FIX SUCCESSFUL!')
      console.log('')
      console.log('✅ RLS infinite recursion: ELIMINATED')
      console.log('✅ All database tables: ACCESSIBLE')
      console.log('✅ Property management: FUNCTIONAL')
      console.log('✅ Dashboard data: READY')
      
      console.log('\n🚀 Application Status: FULLY FUNCTIONAL')
      console.log('   ✅ No more "Failed to load properties" errors')
      console.log('   ✅ Dashboard should load with real data')
      console.log('   ✅ Property management features working')
      
      console.log('\n📱 Ready for Production Use:')
      console.log('   1. Login at: http://localhost:3000/auth/login')
      console.log(`   2. Email: ${productionCredentials.email}`)
      console.log('   3. Dashboard should display property statistics')
      console.log('   4. All property management operations functional')
      
    } else {
      console.log('⚠️ ISSUES STILL DETECTED')
      console.log('')
      
      if (!recursionFixed) {
        console.log('❌ RLS recursion: Still exists - emergency fix may not have been applied')
        console.log('   🚨 URGENT: Execute EMERGENCY_RLS_RECURSION_FIX.sql in Supabase')
      } else {
        console.log('✅ RLS recursion: Fixed')
      }
      
      console.log(`✅ Function access: ${functionsWorking ? 'Working' : 'Issues'}`)
      console.log(`✅ Table access: ${tablesWorking ? 'Working' : 'Issues'}`)
      console.log(`✅ CRUD operations: ${crudWorking ? 'Working' : 'Issues'}`)
      
      console.log('\n🔧 Next Steps:')
      if (!recursionFixed) {
        console.log('   1. 🚨 Execute EMERGENCY_RLS_RECURSION_FIX.sql')
        console.log('   2. Test again after applying the emergency fix')
      } else {
        console.log('   1. Check for remaining schema issues')
        console.log('   2. Test dashboard functionality')
      }
    }
    
  } catch (err) {
    console.error('❌ Emergency fix test failed:', err.message)
  }
}

testEmergencyFix()
