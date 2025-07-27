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

async function manualRLSFix() {
  console.log('🔧 Applying RLS fix manually using service role...\n')

  // For now, let's bypass the RLS issue by using the service role to create the landlord record
  // and user role assignment directly

  const testEmail = 'newuser@test.com'
  
  try {
    // Step 1: Get the user ID
    console.log('1. Getting user information...')
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error listing users:', usersError.message)
      return
    }

    const testUser = users.find(u => u.email === testEmail)
    if (!testUser) {
      console.error('❌ Test user not found')
      return
    }

    console.log(`✅ Found user: ${testUser.email} (ID: ${testUser.id})`)

    // Step 2: Create landlord record using service role (bypasses RLS)
    console.log('\n2. Creating landlord record using service role...')
    
    const { data: existingLandlords } = await supabaseAdmin
      .from('landlords')
      .select('id')
      .eq('email', testEmail)
      .limit(1)

    let landlordId
    if (existingLandlords && existingLandlords.length > 0) {
      landlordId = existingLandlords[0].id
      console.log(`✅ Using existing landlord: ${landlordId}`)
    } else {
      const { data: newLandlord, error: createError } = await supabaseAdmin
        .from('landlords')
        .insert([{
          full_name: testUser.user_metadata?.full_name || testEmail.split('@')[0],
          email: testEmail,
          phone: testUser.user_metadata?.phone || '+254700000000'
        }])
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating landlord:', createError.message)
        return
      }

      landlordId = newLandlord.id
      console.log(`✅ Created landlord: ${landlordId}`)
    }

    // Step 3: Create user role assignment using service role
    console.log('\n3. Creating user role assignment...')
    
    const { data: existingRoles } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('landlord_id', landlordId)

    if (existingRoles && existingRoles.length > 0) {
      console.log('✅ User role assignment already exists')
    } else {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert([{
          user_id: testUser.id,
          landlord_id: landlordId,
          role: 'LANDLORD'
        }])

      if (roleError) {
        console.error('❌ Error creating user role:', roleError.message)
        return
      }

      console.log('✅ Created user role assignment')
    }

    // Step 4: Create a default notification rule
    console.log('\n4. Creating default notification rule...')
    
    const { data: existingRules } = await supabaseAdmin
      .from('notification_rules')
      .select('*')
      .eq('landlord_id', landlordId)
      .limit(1)

    if (existingRules && existingRules.length > 0) {
      console.log('✅ Notification rules already exist')
    } else {
      const { error: ruleError } = await supabaseAdmin
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

      if (ruleError) {
        console.error('❌ Error creating notification rule:', ruleError.message)
      } else {
        console.log('✅ Created default notification rule')
      }
    }

    console.log('\n🎉 Manual RLS fix completed!')
    console.log('\nNow test the authentication flow:')
    console.log(`1. Sign in with: ${testEmail} / TestPassword123!`)
    console.log('2. The notifications page should now work properly')

  } catch (err) {
    console.error('❌ Manual fix failed:', err.message)
  }
}

manualRLSFix().catch(console.error)
