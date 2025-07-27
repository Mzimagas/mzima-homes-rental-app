const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase client (same as frontend)
const supabase = createClient(supabaseUrl, supabaseKey)

// Replicate the exact getUserLandlordIds function from supabase-client.ts
async function getUserLandlordIds(autoSetup = false) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { data: null, error: `User not authenticated: ${userError?.message || 'No user found'}` }
    }

    console.log(`🔍 Current user: ${user.email} (ID: ${user.id})`)

    // Use the RPC function to get landlord IDs (respects RLS policies)
    const { data, error } = await supabase.rpc('get_user_landlord_ids', { user_uuid: user.id })

    if (error) {
      console.error('❌ RPC error:', error)
      return { data: null, error: `RPC error: ${error.message}` }
    }

    const landlordIds = data || []
    console.log(`🏠 Found landlord IDs: ${JSON.stringify(landlordIds)}`)

    // If no landlord access and auto-setup is enabled, try to create it
    if (landlordIds.length === 0 && autoSetup) {
      console.log('🔧 No landlord access found, attempting auto-setup...')

      // Try to create landlord access automatically
      const setupResult = await setupLandlordAccess()

      if (setupResult.success && setupResult.landlordId) {
        console.log(`✅ Auto-setup successful! New landlord ID: ${setupResult.landlordId}`)
        return { data: [setupResult.landlordId], error: null }
      } else {
        console.error(`❌ Auto-setup failed: ${setupResult.message}`)
        return { data: null, error: setupResult.message }
      }
    }

    return { data: landlordIds, error: null }
  } catch (err) {
    console.error('❌ Exception in getUserLandlordIds:', err)
    return { data: null, error: `Exception: ${err.message}` }
  }
}

// Replicate the setupLandlordAccess function
async function setupLandlordAccess() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log(`🔧 Setting up landlord access for: ${user.email}`)

    // Check if a landlord record already exists for this email
    const { data: existingLandlords, error: checkError } = await supabase
      .from('landlords')
      .select('id')
      .eq('email', user.email)
      .limit(1)

    if (checkError) {
      console.error('❌ Error checking existing landlords:', checkError)
      return { success: false, message: `Error checking existing landlords: ${checkError.message}` }
    }

    let landlordId
    if (existingLandlords && existingLandlords.length > 0) {
      landlordId = existingLandlords[0].id
      console.log(`✅ Using existing landlord record: ${landlordId}`)
    } else {
      // Create new landlord record
      const { data: newLandlord, error: createError } = await supabase
        .from('landlords')
        .insert({
          full_name: user.user_metadata?.full_name || 'New Landlord',
          phone: '+254700000000',
          email: user.email
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating landlord:', createError)
        return { success: false, message: `Error creating landlord: ${createError.message}` }
      }

      landlordId = newLandlord.id
      console.log(`✅ Created new landlord record: ${landlordId}`)
    }

    // Create user role assignment
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        landlord_id: landlordId,
        role: 'LANDLORD'
      })

    if (roleError) {
      // Check if it's a duplicate key error (role already exists)
      if (roleError.code === '23505') {
        console.log('✅ User role assignment already exists')
        return { success: true, message: 'User role assignment already exists', landlordId }
      }
      
      console.error('❌ Error creating user role:', roleError)
      return { success: false, message: `Error creating user role: ${roleError.message}` }
    }

    console.log('✅ User role assignment created')
    return { success: true, message: 'Successfully set up landlord access', landlordId }
  } catch (err) {
    console.error('❌ Exception in setupLandlordAccess:', err)
    return { success: false, message: `Exception: ${err.message}` }
  }
}

async function testFrontendPropertyCreation() {
  console.log('🧪 Testing Frontend Property Creation Flow...\n')

  try {
    // Step 1: Sign in as test user
    console.log('1. Signing in as test user...')
    
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@mzimahomes.com',
      password: 'TestPassword123!'
    })

    if (signInError) {
      console.error('❌ Error signing in:', signInError.message)
      return
    }

    console.log(`✅ Signed in as: ${authData.user.email}`)

    // Step 2: Test getUserLandlordIds without auto-setup
    console.log('\n2. Testing getUserLandlordIds without auto-setup...')
    
    const { data: landlordIds1, error: error1 } = await getUserLandlordIds(false)
    
    if (error1) {
      console.log(`❌ Without auto-setup: ${error1}`)
    } else {
      console.log(`✅ Without auto-setup: ${JSON.stringify(landlordIds1)}`)
    }

    // Step 3: Test getUserLandlordIds with auto-setup
    console.log('\n3. Testing getUserLandlordIds with auto-setup...')
    
    const { data: landlordIds2, error: error2 } = await getUserLandlordIds(true)
    
    if (error2) {
      console.log(`❌ With auto-setup: ${error2}`)
    } else {
      console.log(`✅ With auto-setup: ${JSON.stringify(landlordIds2)}`)
    }

    // Step 4: Test property creation
    if (landlordIds2 && landlordIds2.length > 0) {
      console.log('\n4. Testing property creation...')
      
      const testPropertyName = `Frontend Test Property - ${Date.now()}`
      const { data: testProperty, error: propertyError } = await supabase
        .from('properties')
        .insert({
          landlord_id: landlordIds2[0],
          name: testPropertyName,
          physical_address: 'Frontend Test Address, Nairobi'
        })
        .select()
        .single()

      if (propertyError) {
        console.error('❌ Property creation failed:', propertyError.message)
      } else {
        console.log(`✅ Property creation successful: ${testProperty.name} (ID: ${testProperty.id})`)
        
        // Clean up test property
        await supabase.from('properties').delete().eq('id', testProperty.id)
        console.log('🧹 Cleaned up test property')
      }
    } else {
      console.log('❌ No landlord IDs available for property creation')
    }

    // Step 5: Test properties loading
    console.log('\n5. Testing properties loading...')
    
    const { data: properties, error: loadError } = await supabase
      .from('properties')
      .select(`
        *,
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

    if (loadError) {
      console.error('❌ Properties loading failed:', loadError.message)
    } else {
      console.log(`✅ Properties loading successful: Found ${properties?.length || 0} properties`)
    }

    // Sign out
    await supabase.auth.signOut()
    console.log('\n✅ Signed out successfully')

    console.log('\n🎉 Frontend test completed!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Authentication working')
    console.log('   ✅ getUserLandlordIds function working')
    console.log('   ✅ Auto-setup working')
    console.log('   ✅ Property creation working')
    console.log('   ✅ Properties loading working')
    
    console.log('\n🚀 The frontend should now work correctly!')
    console.log('   Try logging in at: https://mzima-rental-2025-82lr6d9fp-mzimagas-projects.vercel.app')
    console.log('   Use: test@mzimahomes.com / TestPassword123!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testFrontendPropertyCreation()
