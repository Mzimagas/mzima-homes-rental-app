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

// Create Supabase client (same as in the app)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Import the client business functions logic
async function getUserLandlordIds() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { data: null, error: `User not authenticated: ${userError?.message || 'No user found'}` }
    }

    console.log(`🔍 Current user: ${user.email} (ID: ${user.id})`)

    // Use the RPC function to get landlord IDs (respects RLS policies)
    const { data, error } = await supabase.rpc('get_user_landlord_ids', { user_uuid: user.id })

    if (error) {
      return { data: null, error: `RPC error: ${error.message}` }
    }

    const landlordIds = data || []
    return { data: landlordIds, error: null }
  } catch (err) {
    return { data: null, error: `Exception: ${err.message}` }
  }
}

async function getNotificationRules() {
  try {
    const { data: landlordIds, error: landlordError } = await getUserLandlordIds()

    if (landlordError) {
      return { data: null, error: landlordError }
    }

    if (!landlordIds || landlordIds.length === 0) {
      return { data: null, error: 'No landlord access found for this user' }
    }

    console.log(`🔍 Found landlord IDs: ${JSON.stringify(landlordIds)}`)

    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .in('landlord_id', landlordIds)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: `Query error: ${error.message}` }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: `Exception: ${err.message}` }
  }
}

async function testClientAuthFlow() {
  console.log('🧪 Testing client-side authentication flow...\n')

  // Test credentials
  const testEmail = 'test@mzimahomes.com'
  const testPassword = 'TestPassword123!'

  // Step 1: Sign in
  console.log('1. Signing in...')
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    if (error) {
      console.error('❌ Sign in failed:', error.message)
      return
    }

    console.log(`✅ Signed in successfully: ${data.user.email}`)
  } catch (err) {
    console.error('❌ Sign in exception:', err.message)
    return
  }

  // Step 2: Test getUserLandlordIds
  console.log('\n2. Testing getUserLandlordIds...')
  const { data: landlordIds, error: landlordError } = await getUserLandlordIds()

  if (landlordError) {
    console.error('❌ getUserLandlordIds failed:', landlordError)
  } else {
    console.log(`✅ getUserLandlordIds success: ${JSON.stringify(landlordIds)}`)
  }

  // Step 3: Test getNotificationRules
  console.log('\n3. Testing getNotificationRules...')
  const { data: rules, error: rulesError } = await getNotificationRules()

  if (rulesError) {
    console.error('❌ getNotificationRules failed:', rulesError)
  } else {
    console.log(`✅ getNotificationRules success: Found ${rules?.length || 0} rules`)
    if (rules && rules.length > 0) {
      rules.forEach((rule, index) => {
        console.log(`   ${index + 1}. ${rule.name} (${rule.type}) - Enabled: ${rule.enabled}`)
      })
    }
  }

  // Step 4: Test notification history
  console.log('\n4. Testing getNotificationHistory...')
  try {
    const { data: landlordIds } = await getUserLandlordIds()
    if (landlordIds && landlordIds.length > 0) {
      const { data: history, error: historyError } = await supabase
        .from('notification_history')
        .select('*')
        .in('landlord_id', landlordIds)
        .order('created_at', { ascending: false })
        .limit(5)

      if (historyError) {
        console.error('❌ getNotificationHistory failed:', historyError.message)
      } else {
        console.log(`✅ getNotificationHistory success: Found ${history?.length || 0} records`)
      }
    }
  } catch (err) {
    console.error('❌ getNotificationHistory exception:', err.message)
  }

  // Step 5: Test notification settings
  console.log('\n5. Testing getNotificationSettings...')
  try {
    const { data: landlordIds } = await getUserLandlordIds()
    if (landlordIds && landlordIds.length > 0) {
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('landlord_id', landlordIds[0])
        .single()

      if (settingsError) {
        console.log(`⚠️  getNotificationSettings: ${settingsError.message} (This is normal if no settings exist yet)`)
      } else {
        console.log('✅ getNotificationSettings success: Found settings')
      }
    }
  } catch (err) {
    console.error('❌ getNotificationSettings exception:', err.message)
  }

  console.log('\n🎉 Client authentication flow test completed!')
  
  // Sign out
  await supabase.auth.signOut()
  console.log('✅ Signed out')
}

testClientAuthFlow().catch(console.error)
