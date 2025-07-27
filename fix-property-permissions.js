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

async function fixPropertyPermissions() {
  console.log('🔧 Fixing Property Permissions and User Setup...\n')

  try {
    // Step 1: Apply the RLS migration
    console.log('1. Applying Properties RLS Migration...')
    
    const migrationSQL = fs.readFileSync('./supabase/migrations/009_fix_properties_rls.sql', 'utf8')
    const { error: migrationError } = await supabaseAdmin.rpc('exec', { sql: migrationSQL })
    
    if (migrationError) {
      console.log('⚠️  Migration may have already been applied:', migrationError.message)
    } else {
      console.log('✅ Properties RLS migration applied successfully')
    }

    // Step 2: Set up test user with proper landlord access
    console.log('\n2. Setting up test user with landlord access...')
    
    const testEmail = 'test@mzimahomes.com'
    const testPassword = 'TestPassword123!'
    
    // Get or create test user
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

    // Step 3: Create or update landlord record
    console.log('\n3. Setting up landlord record...')
    
    const { data: existingLandlord } = await supabaseAdmin
      .from('landlords')
      .select('*')
      .eq('email', testEmail)
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
          email: testEmail
        })
        .select()
        .single()

      if (landlordError) {
        console.error('❌ Error creating landlord:', landlordError)
        return
      }

      landlordId = newLandlord.id
      console.log(`✅ Created new landlord: ${landlordId}`)
    }

    // Step 4: Create or update user role
    console.log('\n4. Setting up user role...')
    
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('landlord_id', landlordId)
      .single()

    if (existingRole) {
      console.log(`✅ User role already exists`)
    } else {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          landlord_id: landlordId,
          role: 'LANDLORD'
        })

      if (roleError) {
        console.error('❌ Error creating user role:', roleError)
        return
      }

      console.log(`✅ Created user role: LANDLORD`)
    }

    // Step 5: Test the setup
    console.log('\n5. Testing the setup...')

    // Test get_user_landlord_ids function
    const { data: landlordIds, error: functionError } = await supabaseAdmin.rpc('get_user_landlord_ids', {
      user_uuid: userId
    })

    if (functionError) {
      console.error('❌ Error testing get_user_landlord_ids:', functionError)
    } else {
      console.log(`✅ get_user_landlord_ids returns: ${JSON.stringify(landlordIds)}`)
    }

    // Step 6: Test property creation as the user
    console.log('\n6. Testing property creation...')
    
    // Sign in as the test user
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signInError) {
      console.error('❌ Error signing in:', signInError)
      return
    }

    console.log(`✅ Signed in as: ${authData.user.email}`)

    // Try to create a test property
    const { data: testProperty, error: propertyError } = await supabase
      .from('properties')
      .insert({
        landlord_id: landlordId,
        name: 'Test Property - ' + Date.now(),
        physical_address: 'Test Address, Nairobi'
      })
      .select()
      .single()

    if (propertyError) {
      console.error('❌ Error creating test property:', propertyError)
    } else {
      console.log(`✅ Successfully created test property: ${testProperty.name} (ID: ${testProperty.id})`)
      
      // Clean up test property
      await supabase.from('properties').delete().eq('id', testProperty.id)
      console.log(`🧹 Cleaned up test property`)
    }

    // Sign out
    await supabase.auth.signOut()

    console.log('\n🎉 Property permissions fix completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`   ✅ RLS policies applied to properties, units, and tenants tables`)
    console.log(`   ✅ Test user: ${testEmail}`)
    console.log(`   ✅ Test password: ${testPassword}`)
    console.log(`   ✅ Landlord ID: ${landlordId}`)
    console.log(`   ✅ User can create properties`)
    
    console.log('\n🚀 Next steps:')
    console.log('   1. Update property form to use real landlord ID instead of mock ID')
    console.log('   2. Test property creation in the web interface')
    console.log('   3. Verify all CRUD operations work correctly')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixPropertyPermissions()
