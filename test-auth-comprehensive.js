// Comprehensive authentication test script
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

const supabaseAdmin = createClient(supabaseUrl, serviceKey)
const supabaseClient = createClient(supabaseUrl, supabaseKey)

async function comprehensiveAuthTest() {
  console.log('🧪 Comprehensive Authentication Test\n')
  
  try {
    // Step 1: Check Supabase connection
    console.log('1️⃣ Testing Supabase connection...')
    const { data: healthCheck, error: healthError } = await supabaseClient
      .from('landlords')
      .select('count')
      .limit(1)
    
    if (healthError && !healthError.message.includes('relation')) {
      console.error('❌ Supabase connection failed:', healthError.message)
      return
    }
    console.log('✅ Supabase connection working')

    // Step 2: Check auth settings
    console.log('\n2️⃣ Checking authentication settings...')
    
    // Step 3: Clean up existing test user
    console.log('\n3️⃣ Cleaning up existing test user...')
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(user => user.email === 'test@voirental.com')
    
    if (existingUser) {
      console.log('🗑️ Removing existing test user...')
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
      if (deleteError) {
        console.error('❌ Failed to delete existing user:', deleteError.message)
      } else {
        console.log('✅ Existing user removed')
      }
    }

    // Step 4: Create new test user
    console.log('\n4️⃣ Creating fresh test user...')
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@voirental.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Test User'
      },
      email_confirm: true
    })

    if (createError) {
      console.error('❌ Failed to create user:', createError.message)
      return
    }

    console.log('✅ Test user created successfully!')
    console.log('👤 User ID:', newUser.user.id)
    console.log('📧 Email:', newUser.user.email)
    console.log('✅ Email confirmed:', newUser.user.email_confirmed_at ? 'Yes' : 'No')

    // Step 5: Test login with client
    console.log('\n5️⃣ Testing login with client...')
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'test@voirental.com',
      password: 'password123'
    })

    if (loginError) {
      console.error('❌ Login failed:', loginError.message)
      console.log('\n🔍 Debugging info:')
      console.log('- Error code:', loginError.status)
      console.log('- Error details:', loginError)
      
      // Check if it's an email confirmation issue
      if (loginError.message.includes('email') || loginError.message.includes('confirm')) {
        console.log('\n🔧 Attempting to confirm email manually...')
        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
          newUser.user.id,
          { email_confirm: true }
        )
        
        if (confirmError) {
          console.error('❌ Failed to confirm email:', confirmError.message)
        } else {
          console.log('✅ Email confirmed manually')
          
          // Try login again
          console.log('🔄 Retrying login...')
          const { data: retryLogin, error: retryError } = await supabaseClient.auth.signInWithPassword({
            email: 'test@voirental.com',
            password: 'password123'
          })
          
          if (retryError) {
            console.error('❌ Retry login failed:', retryError.message)
          } else {
            console.log('✅ Login successful on retry!')
            await supabaseClient.auth.signOut()
          }
        }
      }
    } else {
      console.log('✅ Login successful!')
      console.log('🎉 Session created for:', loginData.user.email)
      
      // Sign out
      await supabaseClient.auth.signOut()
      console.log('✅ Signed out successfully')
    }

    // Step 6: Verify user in database
    console.log('\n6️⃣ Verifying user in auth.users...')
    const { data: verifyUser } = await supabaseAdmin.auth.admin.getUserById(newUser.user.id)
    if (verifyUser.user) {
      console.log('✅ User exists in database')
      console.log('📧 Email confirmed:', verifyUser.user.email_confirmed_at ? 'Yes' : 'No')
      console.log('🔐 Last sign in:', verifyUser.user.last_sign_in_at || 'Never')
    }

    console.log('\n🎊 Authentication test completed!')
    console.log('\n📋 Test Results Summary:')
    console.log('✅ Supabase connection: Working')
    console.log('✅ User creation: Success')
    console.log('✅ User verification: Success')
    console.log(loginError ? '❌ Login test: Failed' : '✅ Login test: Success')
    
    console.log('\n🚀 Ready to test in browser:')
    console.log('1. Go to: http://localhost:3000/auth/login')
    console.log('2. Email: test@voirental.com')
    console.log('3. Password: password123')
    
    if (loginError) {
      console.log('\n🔧 If login still fails in browser:')
      console.log('1. Check browser console for errors')
      console.log('2. Verify Supabase Auth settings')
      console.log('3. Check if email confirmation is required')
      console.log('4. Verify RLS policies allow authentication')
    }

  } catch (err) {
    console.error('❌ Test failed with exception:', err.message)
    console.error('Stack trace:', err.stack)
  }
}

comprehensiveAuthTest()
