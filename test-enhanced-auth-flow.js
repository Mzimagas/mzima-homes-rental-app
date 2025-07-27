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
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

// Enhanced client business functions with auto-setup
const enhancedClientBusinessFunctions = {
  async getUserLandlordIds(autoSetup = false) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        return { data: null, error: 'User not authenticated' }
      }

      // Use the RPC function to get landlord IDs
      const { data, error } = await supabase.rpc('get_user_landlord_ids', { user_uuid: user.id })

      if (error) {
        return { data: null, error: error.message }
      }

      const landlordIds = data || []

      // If no landlord access and auto-setup is enabled, try to create it
      if (landlordIds.length === 0 && autoSetup) {
        console.log('🔧 No landlord access found, attempting auto-setup...')
        
        const setupResult = await this.setupLandlordAccess()
        
        if (setupResult.success && setupResult.landlordId) {
          return { data: [setupResult.landlordId], error: null }
        } else {
          return { data: null, error: setupResult.message }
        }
      }

      return { data: landlordIds, error: null }
    } catch (err) {
      return { data: null, error: err.message }
    }
  },

  async setupLandlordAccess() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        return { success: false, message: 'User not authenticated' }
      }

      console.log(`🔧 Setting up landlord access for user: ${user.email}`)

      // Check if a landlord record already exists for this email
      const { data: existingLandlords, error: checkError } = await supabase
        .from('landlords')
        .select('id')
        .eq('email', user.email)
        .limit(1)

      if (checkError) {
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
          .insert([{
            full_name: user.user_metadata?.full_name || (user.email || 'Unknown User').split('@')[0],
            email: user.email || '',
            phone: user.user_metadata?.phone || '+254700000000'
          }])
          .select()
          .single()

        if (createError) {
          return { success: false, message: `Error creating landlord record: ${createError.message}` }
        }

        landlordId = newLandlord.id
        console.log(`✅ Created new landlord record: ${landlordId}`)
      }

      // Create user role assignment
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: user.id,
          landlord_id: landlordId,
          role: 'LANDLORD'
        }])

      if (roleError && roleError.code !== '23505') { // Ignore duplicate key errors
        return { success: false, message: `Error creating user role: ${roleError.message}` }
      }

      console.log('✅ Created user role assignment')

      return { success: true, message: 'Successfully set up landlord access', landlordId }
    } catch (err) {
      return { success: false, message: err.message }
    }
  },

  async getNotificationRules() {
    try {
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds(true)

      if (landlordError) {
        return { data: null, error: landlordError }
      }

      if (!landlordIds || landlordIds.length === 0) {
        return { data: null, error: 'No landlord access found for this user' }
      }

      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .in('landlord_id', landlordIds)
        .order('created_at', { ascending: false })

      return { data, error: error ? error.message : null }
    } catch (err) {
      return { data: null, error: err.message }
    }
  },

  async getNotificationHistory(limit = 50, offset = 0) {
    try {
      const { data: landlordIds, error: landlordError } = await this.getUserLandlordIds(true)
      if (landlordError || !landlordIds || landlordIds.length === 0) {
        return { data: null, error: landlordError || 'No landlord access found for this user' }
      }

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .in('landlord_id', landlordIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return { data, error: error ? error.message : null }
    } catch (err) {
      return { data: null, error: err.message }
    }
  }
}

async function testEnhancedAuthFlow() {
  console.log('🧪 Testing enhanced authentication flow with auto-setup...\n')

  // Test with a new user that doesn't have landlord access
  const newTestEmail = 'newuser@test.com'
  const testPassword = 'TestPassword123!'

  // Step 1: Use existing test user
  console.log('1. Using existing test user...')
  console.log(`✅ Test user ready: ${newTestEmail}`)

  // Step 2: Sign in as the new user
  console.log('\n2. Signing in as new user...')
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: newTestEmail,
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

  // Step 3: Test getNotificationRules with auto-setup
  console.log('\n3. Testing getNotificationRules with auto-setup...')
  const { data: rules, error: rulesError } = await enhancedClientBusinessFunctions.getNotificationRules()

  if (rulesError) {
    console.error('❌ getNotificationRules failed:', rulesError)
  } else {
    console.log(`✅ getNotificationRules success: Found ${rules?.length || 0} rules`)
  }

  // Step 4: Test getNotificationHistory with auto-setup
  console.log('\n4. Testing getNotificationHistory with auto-setup...')
  const { data: history, error: historyError } = await enhancedClientBusinessFunctions.getNotificationHistory()

  if (historyError) {
    console.error('❌ getNotificationHistory failed:', historyError)
  } else {
    console.log(`✅ getNotificationHistory success: Found ${history?.length || 0} records`)
  }

  console.log('\n🎉 Enhanced authentication flow test completed!')
  
  // Clean up
  await supabase.auth.signOut()
  console.log('✅ Signed out')
}

testEnhancedAuthFlow().catch(console.error)
