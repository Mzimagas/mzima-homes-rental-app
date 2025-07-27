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

async function fixAuthLandlordSetup() {
  console.log('🔧 Setting up authentication and landlord relationship...\n')

  // Step 1: Create a test user if none exists
  console.log('1. Setting up test user...')
  
  const testEmail = 'test@mzimahomes.com'
  const testPassword = 'TestPassword123!'
  
  try {
    // Get existing user or create new one
    let userId
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error listing users:', listError)
      return
    }

    const existingUser = users.find(u => u.email === testEmail)

    if (existingUser) {
      userId = existingUser.id
      console.log(`✅ Using existing user: ${testEmail} (ID: ${userId})`)
    } else {
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      if (signUpError) {
        console.error('❌ Error creating user:', signUpError)
        return
      }

      userId = signUpData.user.id
      console.log(`✅ Created new user: ${testEmail} (ID: ${userId})`)
    }

    // Step 2: Ensure landlord exists
    console.log('\n2. Setting up landlord record...')
    
    let landlordId
    const { data: existingLandlords } = await supabaseAdmin
      .from('landlords')
      .select('id')
      .eq('email', testEmail)
      .limit(1)

    if (existingLandlords && existingLandlords.length > 0) {
      landlordId = existingLandlords[0].id
      console.log(`✅ Using existing landlord: ${landlordId}`)
    } else {
      const { data: newLandlord, error: landlordError } = await supabaseAdmin
        .from('landlords')
        .insert([{
          full_name: 'Test Landlord',
          email: testEmail,
          phone: '+254700000000'
        }])
        .select()
        .single()

      if (landlordError) {
        console.error('❌ Error creating landlord:', landlordError)
        return
      }

      landlordId = newLandlord.id
      console.log(`✅ Created new landlord: ${landlordId}`)
    }

    // Step 3: Create user role assignment
    console.log('\n3. Setting up user-landlord relationship...')

    console.log(`✅ Using user ID: ${userId}`)

    // Check if role assignment already exists
    const { data: existingRoles } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('landlord_id', landlordId)

    if (existingRoles && existingRoles.length > 0) {
      console.log('✅ User role assignment already exists')
    } else {
      const { data: newRole, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert([{
          user_id: userId,
          landlord_id: landlordId,
          role: 'LANDLORD'
        }])
        .select()

      if (roleError) {
        console.error('❌ Error creating user role:', roleError)
        return
      }

      console.log('✅ Created user role assignment')
    }

    // Step 4: Test the setup
    console.log('\n4. Testing the setup...')

    // Test get_user_landlord_ids function
    const { data: landlordIds, error: functionError } = await supabaseAdmin.rpc('get_user_landlord_ids', {
      user_uuid: userId
    })

    if (functionError) {
      console.error('❌ Error testing get_user_landlord_ids:', functionError)
    } else {
      console.log(`✅ get_user_landlord_ids returns: ${JSON.stringify(landlordIds)}`)
    }

    // Step 5: Create default notification rule if none exists
    console.log('\n5. Setting up default notification rule...')
    
    const { data: existingRules } = await supabaseAdmin
      .from('notification_rules')
      .select('*')
      .eq('landlord_id', landlordId)
      .limit(1)

    if (existingRules && existingRules.length > 0) {
      console.log('✅ Notification rules already exist')
    } else {
      const { data: newRule, error: ruleError } = await supabaseAdmin
        .from('notification_rules')
        .insert([{
          landlord_id: landlordId,
          type: 'rent_due',
          name: 'Rent Due Reminder',
          description: 'Notify tenants when rent is due',
          enabled: true,
          trigger_days: 3,
          channels: ['email']
        }])
        .select()

      if (ruleError) {
        console.error('❌ Error creating notification rule:', ruleError)
      } else {
        console.log('✅ Created default notification rule')
      }
    }

    console.log('\n🎉 Setup complete!')
    console.log('\nTo test the fix:')
    console.log(`1. Sign in with: ${testEmail} / ${testPassword}`)
    console.log('2. Navigate to the notifications page')
    console.log('3. The page should now load without authentication errors')

  } catch (err) {
    console.error('❌ Setup failed:', err.message)
  }
}

fixAuthLandlordSetup().catch(console.error)
