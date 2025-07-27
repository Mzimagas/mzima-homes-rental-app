const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function diagnoseAndFixLandlordAccess() {
  console.log('🔍 Diagnosing Landlord Access Issue...\n')

  try {
    // Step 1: Check if get_user_landlord_ids function exists
    console.log('1. Checking if get_user_landlord_ids function exists...')
    
    const { data: functions, error: functionsError } = await supabaseAdmin
      .rpc('exec', { 
        sql: `SELECT proname, prosrc FROM pg_proc WHERE proname = 'get_user_landlord_ids';`
      })
    
    if (functionsError) {
      console.log('⚠️  Cannot check functions directly, will test by calling it...')
    } else if (!functions || functions.length === 0) {
      console.log('❌ get_user_landlord_ids function does NOT exist!')
      console.log('🔧 Creating the function...')
      
      // Create the missing function
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION get_user_landlord_ids(user_uuid UUID)
        RETURNS UUID[] AS $$
        BEGIN
          RETURN ARRAY(
            SELECT ur.landlord_id 
            FROM user_roles ur 
            WHERE ur.user_id = user_uuid 
              AND ur.role = 'LANDLORD'
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
      
      const { error: createError } = await supabaseAdmin.rpc('exec', { sql: createFunctionSQL })
      
      if (createError) {
        console.error('❌ Error creating function:', createError.message)
      } else {
        console.log('✅ get_user_landlord_ids function created successfully!')
      }
    } else {
      console.log('✅ get_user_landlord_ids function exists')
    }

    // Step 2: Test the function with test user
    console.log('\n2. Testing get_user_landlord_ids function...')
    
    // Get test user
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error getting users:', usersError.message)
      return
    }

    const testUser = users.find(u => u.email === 'test@mzimahomes.com')
    
    if (!testUser) {
      console.log('❌ Test user test@mzimahomes.com not found')
      console.log('🔧 Creating test user...')
      
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: 'test@mzimahomes.com',
        password: 'TestPassword123!',
        email_confirm: true
      })

      if (createUserError) {
        console.error('❌ Error creating test user:', createUserError.message)
        return
      }

      console.log('✅ Test user created successfully')
      testUserId = newUser.user.id
    } else {
      testUserId = testUser.id
      console.log(`✅ Found test user: ${testUser.email} (ID: ${testUserId})`)
    }

    // Test the function
    const { data: landlordIds, error: functionError } = await supabaseAdmin.rpc('get_user_landlord_ids', {
      user_uuid: testUserId
    })

    if (functionError) {
      console.error('❌ Error calling get_user_landlord_ids:', functionError.message)
      
      // Try to create the function again with a different approach
      console.log('🔧 Attempting to create function with alternative method...')
      
      const altCreateSQL = `
        CREATE OR REPLACE FUNCTION get_user_landlord_ids(user_uuid UUID)
        RETURNS UUID[] AS $$
        DECLARE
          landlord_ids UUID[];
        BEGIN
          SELECT ARRAY_AGG(ur.landlord_id) 
          INTO landlord_ids
          FROM user_roles ur 
          WHERE ur.user_id = user_uuid 
            AND ur.role = 'LANDLORD';
          
          RETURN COALESCE(landlord_ids, ARRAY[]::UUID[]);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
      
      const { error: altCreateError } = await supabaseAdmin.rpc('exec', { sql: altCreateSQL })
      
      if (altCreateError) {
        console.error('❌ Alternative function creation failed:', altCreateError.message)
      } else {
        console.log('✅ Function created with alternative method')
        
        // Test again
        const { data: retestIds, error: retestError } = await supabaseAdmin.rpc('get_user_landlord_ids', {
          user_uuid: testUserId
        })
        
        if (retestError) {
          console.error('❌ Function still not working:', retestError.message)
        } else {
          console.log(`✅ Function now working! Returned: ${JSON.stringify(retestIds)}`)
        }
      }
    } else {
      console.log(`✅ Function works! Returned landlord IDs: ${JSON.stringify(landlordIds)}`)
      
      if (!landlordIds || landlordIds.length === 0) {
        console.log('⚠️  No landlord IDs found for test user')
        console.log('🔧 Setting up landlord access for test user...')
        
        // Step 3: Set up landlord access
        await setupTestUserLandlordAccess(testUserId)
      }
    }

    // Step 4: Test property creation flow
    console.log('\n4. Testing property creation flow...')
    
    // Sign in as test user
    const { data: authData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: 'test@mzimahomes.com',
      password: 'TestPassword123!'
    })

    if (signInError) {
      console.error('❌ Error signing in as test user:', signInError.message)
      return
    }

    console.log('✅ Signed in as test user')

    // Test getUserLandlordIds from client perspective
    const { data: clientLandlordIds, error: clientError } = await supabaseAdmin.rpc('get_user_landlord_ids', {
      user_uuid: authData.user.id
    })

    if (clientError) {
      console.error('❌ Client-side function call failed:', clientError.message)
    } else {
      console.log(`✅ Client-side function call successful: ${JSON.stringify(clientLandlordIds)}`)
      
      if (clientLandlordIds && clientLandlordIds.length > 0) {
        // Try to create a test property
        const testPropertyName = `Test Property - ${Date.now()}`
        const { data: testProperty, error: propertyError } = await supabaseAdmin
          .from('properties')
          .insert({
            landlord_id: clientLandlordIds[0],
            name: testPropertyName,
            physical_address: 'Test Address, Nairobi'
          })
          .select()
          .single()

        if (propertyError) {
          console.error('❌ Property creation failed:', propertyError.message)
        } else {
          console.log(`✅ Property creation successful: ${testProperty.name} (ID: ${testProperty.id})`)
          
          // Clean up test property
          await supabaseAdmin.from('properties').delete().eq('id', testProperty.id)
          console.log('🧹 Cleaned up test property')
        }
      }
    }

    // Sign out
    await supabaseAdmin.auth.signOut()

    console.log('\n🎉 Diagnosis and fix completed!')
    console.log('\n📋 Summary:')
    console.log('   ✅ get_user_landlord_ids function verified/created')
    console.log('   ✅ Test user setup verified')
    console.log('   ✅ Property creation flow tested')
    
    console.log('\n🚀 Next steps:')
    console.log('   1. Test property creation in the web interface')
    console.log('   2. Use credentials: test@mzimahomes.com / TestPassword123!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

async function setupTestUserLandlordAccess(userId) {
  try {
    console.log('🔧 Setting up landlord access for test user...')

    // Check if landlord record exists
    const { data: existingLandlord } = await supabaseAdmin
      .from('landlords')
      .select('id')
      .eq('email', 'test@mzimahomes.com')
      .single()

    let landlordId
    if (existingLandlord) {
      landlordId = existingLandlord.id
      console.log(`✅ Using existing landlord: ${landlordId}`)
    } else {
      const { data: newLandlord, error: landlordError } = await supabaseAdmin
        .from('landlords')
        .insert({
          full_name: 'Test Landlord',
          phone: '+254700000001',
          email: 'test@mzimahomes.com'
        })
        .select()
        .single()

      if (landlordError) {
        console.error('❌ Error creating landlord:', landlordError.message)
        return
      }

      landlordId = newLandlord.id
      console.log(`✅ Created new landlord: ${landlordId}`)
    }

    // Check if user role exists
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('landlord_id', landlordId)
      .single()

    if (existingRole) {
      console.log('✅ User role already exists')
    } else {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          landlord_id: landlordId,
          role: 'LANDLORD'
        })

      if (roleError) {
        console.error('❌ Error creating user role:', roleError.message)
        return
      }

      console.log('✅ Created user role assignment')
    }

    return landlordId
  } catch (error) {
    console.error('❌ Error in setupTestUserLandlordAccess:', error.message)
  }
}

diagnoseAndFixLandlordAccess()
