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

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure and data...\n')

  // Check auth.users table
  console.log('1. Checking auth.users...')
  try {
    const { data: users, error: usersError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, created_at')
      .limit(5)

    if (usersError) {
      console.error('❌ Error accessing auth.users:', usersError)
    } else {
      console.log(`✅ Found ${users?.length || 0} users in auth.users`)
      if (users && users.length > 0) {
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}`)
        })
      }
    }
  } catch (err) {
    console.error('❌ Error checking auth.users:', err.message)
  }

  // Check landlords table
  console.log('\n2. Checking landlords table...')
  try {
    const { data: landlords, error: landlordsError } = await supabaseAdmin
      .from('landlords')
      .select('*')
      .limit(5)

    if (landlordsError) {
      console.error('❌ Error accessing landlords table:', landlordsError)
    } else {
      console.log(`✅ Found ${landlords?.length || 0} landlords`)
      if (landlords && landlords.length > 0) {
        landlords.forEach((landlord, index) => {
          console.log(`   ${index + 1}. ID: ${landlord.id}, Name: ${landlord.full_name}, Email: ${landlord.email}`)
        })
      }
    }
  } catch (err) {
    console.error('❌ Error checking landlords table:', err.message)
  }

  // Check user_roles table
  console.log('\n3. Checking user_roles table...')
  try {
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .limit(10)

    if (rolesError) {
      console.error('❌ Error accessing user_roles table:', rolesError)
    } else {
      console.log(`✅ Found ${userRoles?.length || 0} user role assignments`)
      if (userRoles && userRoles.length > 0) {
        userRoles.forEach((role, index) => {
          console.log(`   ${index + 1}. User: ${role.user_id}, Landlord: ${role.landlord_id}, Role: ${role.role}`)
        })
      }
    }
  } catch (err) {
    console.error('❌ Error checking user_roles table:', err.message)
  }

  // Check notification_rules table
  console.log('\n4. Checking notification_rules table...')
  try {
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('notification_rules')
      .select('*')
      .limit(5)

    if (rulesError) {
      console.error('❌ Error accessing notification_rules table:', rulesError)
    } else {
      console.log(`✅ Found ${rules?.length || 0} notification rules`)
      if (rules && rules.length > 0) {
        rules.forEach((rule, index) => {
          console.log(`   ${index + 1}. ID: ${rule.id}, Landlord: ${rule.landlord_id}, Type: ${rule.type}, Name: ${rule.name}`)
        })
      }
    }
  } catch (err) {
    console.error('❌ Error checking notification_rules table:', err.message)
  }

  // Test get_user_landlord_ids function with a sample user
  console.log('\n5. Testing get_user_landlord_ids function...')
  try {
    // First get a sample user ID
    const { data: users } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .limit(1)

    if (users && users.length > 0) {
      const sampleUserId = users[0].id
      const { data: landlordIds, error: functionError } = await supabaseAdmin.rpc('get_user_landlord_ids', {
        user_uuid: sampleUserId
      })

      if (functionError) {
        console.error('❌ Error calling get_user_landlord_ids:', functionError)
      } else {
        console.log(`✅ get_user_landlord_ids function works for user ${sampleUserId}`)
        console.log(`   Returned landlord IDs: ${JSON.stringify(landlordIds)}`)
      }
    } else {
      console.log('⚠️  No users found to test function with')
    }
  } catch (err) {
    console.error('❌ Error testing get_user_landlord_ids function:', err.message)
  }

  console.log('\n📋 Database Structure Analysis Complete!')
}

checkDatabaseStructure().catch(console.error)
