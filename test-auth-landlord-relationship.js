const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseKey, serviceKey
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
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey || !serviceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase clients
const supabase = createClient(supabaseUrl, supabaseKey)
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function testAuthLandlordRelationship() {
  console.log('🔍 Testing authentication and landlord relationship...\n')

  // Test 1: Check current user session
  console.log('1. Checking current user session...')
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('❌ No authenticated user found')
      console.log('   Please sign in to the application first')
      return
    }
    
    console.log('✅ User authenticated:')
    console.log(`   User ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
  } catch (err) {
    console.error('❌ Error checking user session:', err.message)
    return
  }

  // Test 2: Check if user_roles table exists and has data
  console.log('\n2. Checking user_roles table...')
  try {
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .limit(10)

    if (rolesError) {
      console.error('❌ Error accessing user_roles table:', rolesError)
    } else {
      console.log(`✅ user_roles table exists with ${userRoles?.length || 0} records`)
      if (userRoles && userRoles.length > 0) {
        console.log('   Sample records:')
        userRoles.forEach((role, index) => {
          console.log(`   ${index + 1}. User: ${role.user_id}, Landlord: ${role.landlord_id}, Role: ${role.role}`)
        })
      }
    }
  } catch (err) {
    console.error('❌ Error checking user_roles table:', err.message)
  }

  // Test 3: Check landlords table
  console.log('\n3. Checking landlords table...')
  try {
    const { data: landlords, error: landlordsError } = await supabaseAdmin
      .from('landlords')
      .select('*')
      .limit(5)

    if (landlordsError) {
      console.error('❌ Error accessing landlords table:', landlordsError)
    } else {
      console.log(`✅ landlords table exists with ${landlords?.length || 0} records`)
      if (landlords && landlords.length > 0) {
        console.log('   Sample records:')
        landlords.forEach((landlord, index) => {
          console.log(`   ${index + 1}. ID: ${landlord.id}, Name: ${landlord.full_name}, Email: ${landlord.email}`)
        })
      }
    }
  } catch (err) {
    console.error('❌ Error checking landlords table:', err.message)
  }

  // Test 4: Test get_user_landlord_ids function
  console.log('\n4. Testing get_user_landlord_ids function...')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: landlordIds, error: functionError } = await supabaseAdmin.rpc('get_user_landlord_ids', {
        user_uuid: user.id
      })

      if (functionError) {
        console.error('❌ Error calling get_user_landlord_ids:', functionError)
      } else {
        console.log('✅ get_user_landlord_ids function works')
        console.log(`   Returned landlord IDs: ${JSON.stringify(landlordIds)}`)
        console.log(`   Count: ${landlordIds?.length || 0}`)
      }
    }
  } catch (err) {
    console.error('❌ Error testing get_user_landlord_ids function:', err.message)
  }

  // Test 5: Check current user's role assignments
  console.log('\n5. Checking current user\'s role assignments...')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)

      if (rolesError) {
        console.error('❌ Error checking user roles:', rolesError)
      } else {
        console.log(`✅ Found ${userRoles?.length || 0} role assignments for current user`)
        if (userRoles && userRoles.length > 0) {
          userRoles.forEach((role, index) => {
            console.log(`   ${index + 1}. Landlord: ${role.landlord_id}, Role: ${role.role}, Property: ${role.property_id || 'N/A'}`)
          })
        } else {
          console.log('   ⚠️  No role assignments found - this is the problem!')
        }
      }
    }
  } catch (err) {
    console.error('❌ Error checking user role assignments:', err.message)
  }

  // Test 6: Test notification rules access with current user
  console.log('\n6. Testing notification rules access...')
  try {
    const { data: rules, error: rulesError } = await supabase
      .from('notification_rules')
      .select('*')
      .limit(5)

    if (rulesError) {
      console.error('❌ Error accessing notification_rules:', rulesError)
      console.log('   This confirms the RLS policy is blocking access')
    } else {
      console.log(`✅ Successfully accessed notification_rules: ${rules?.length || 0} records`)
    }
  } catch (err) {
    console.error('❌ Error testing notification rules access:', err.message)
  }

  console.log('\n📋 Diagnosis Summary:')
  console.log('The "No landlord access found for this user" error occurs because:')
  console.log('1. The user is authenticated but has no entries in the user_roles table')
  console.log('2. The get_user_landlord_ids function returns an empty array')
  console.log('3. The RLS policies block access when no landlord IDs are found')
  console.log('\n💡 Solution: Create user_roles entries to link users to landlords')
}

testAuthLandlordRelationship().catch(console.error)
