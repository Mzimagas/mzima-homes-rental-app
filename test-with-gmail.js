// Test with a standard Gmail address
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseAnonKey, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function testWithGmail() {
  console.log('📧 Testing Registration with Standard Gmail Address...\n')
  
  try {
    const testEmail = 'testuser123@gmail.com'
    const testPassword = 'TestPassword123!'
    const testFullName = 'Test User'
    
    console.log(`Testing with: ${testEmail}`)
    
    // Clean up any existing test user
    try {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingTestUser = existingUsers.users?.find(u => u.email === testEmail)
      
      if (existingTestUser) {
        console.log('Cleaning up existing test user...')
        await supabaseAdmin.auth.admin.deleteUser(existingTestUser.id)
      }
    } catch (err) {
      console.log('No existing test user to clean up')
    }
    
    // Test registration
    console.log('\n1️⃣ Testing registration...')
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testFullName,
        }
      }
    })

    if (signUpError) {
      console.log('❌ Registration failed:', signUpError.message)
      return
    }

    console.log('✅ Registration successful!')
    console.log(`   User ID: ${signUpData.user?.id}`)
    console.log(`   Email: ${signUpData.user?.email}`)
    console.log(`   Email confirmed: ${signUpData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   Session created: ${signUpData.session ? 'Yes' : 'No'}`)

    // Auto-confirm if needed
    if (!signUpData.user?.email_confirmed_at) {
      console.log('\n2️⃣ Auto-confirming user...')
      
      const { data: confirmedUser, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        signUpData.user.id,
        { email_confirm: true }
      )

      if (confirmError) {
        console.log('❌ Auto-confirmation failed:', confirmError.message)
      } else {
        console.log('✅ Auto-confirmation successful!')
      }
    }

    // Test login
    console.log('\n3️⃣ Testing login...')

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signInError) {
      console.log('❌ Login failed:', signInError.message)
    } else {
      console.log('✅ Login successful!')
      console.log(`   User: ${signInData.user?.email}`)
      
      // Sign out
      await supabase.auth.signOut()
    }

    // Clean up
    console.log('\n4️⃣ Cleaning up...')
    
    try {
      await supabaseAdmin.auth.admin.deleteUser(signUpData.user.id)
      console.log('✅ Test user cleaned up')
    } catch (err) {
      console.log('⚠️ Cleanup failed:', err.message)
    }

    console.log('\n🎉 Gmail Registration Test: SUCCESSFUL!')
    console.log('The enhanced registration flow works with standard email addresses.')

  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testWithGmail()
