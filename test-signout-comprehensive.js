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

// Create Supabase client with same config as the app
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    retryAttempts: 3,
    timeout: 30000
  }
})

async function testComprehensiveSignOut() {
  console.log('🧪 Comprehensive SignOut Test...\n')

  const testEmail = 'test@mzimahomes.com'
  const testPassword = 'TestPassword123!'

  // Step 1: Sign in
  console.log('1. Signing in...')
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message)
      return
    }

    console.log(`✅ Signed in successfully: ${signInData.user.email}`)
    console.log(`   Access Token: ${signInData.session?.access_token?.substring(0, 20)}...`)
    console.log(`   Refresh Token: ${signInData.session?.refresh_token?.substring(0, 20)}...`)
  } catch (err) {
    console.error('❌ Sign in exception:', err.message)
    return
  }

  // Step 2: Test different signOut scopes
  console.log('\n2. Testing signOut with global scope...')
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })
    
    if (signOutError) {
      console.error('❌ SignOut failed:', signOutError.message)
    } else {
      console.log('✅ SignOut with global scope successful')
    }
  } catch (err) {
    console.error('❌ SignOut exception:', err.message)
  }

  // Step 3: Verify session is cleared
  console.log('\n3. Verifying session clearing...')
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for cleanup
  
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log(`✅ getSession correctly failed: ${sessionError.message}`)
    } else if (sessionData.session) {
      console.error('❌ Session still exists after signOut:', sessionData.session.user.email)
    } else {
      console.log('✅ Session successfully cleared')
    }
  } catch (err) {
    console.log(`✅ getSession exception (expected): ${err.message}`)
  }

  // Step 4: Test getUser after signOut
  console.log('\n4. Testing getUser after signOut...')
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log(`✅ getUser correctly failed: ${userError.message}`)
    } else if (userData.user) {
      console.error('❌ getUser still returns user after signOut:', userData.user.email)
    } else {
      console.log('✅ getUser correctly returns no user')
    }
  } catch (err) {
    console.log(`✅ getUser exception (expected): ${err.message}`)
  }

  // Step 5: Test protected operation after signOut
  console.log('\n5. Testing protected operation after signOut...')
  try {
    const { data, error } = await supabase.rpc('get_user_landlord_ids', { user_uuid: 'test-uuid' })
    
    if (error) {
      console.log(`✅ Protected operation correctly failed: ${error.message}`)
    } else {
      console.error('❌ Protected operation succeeded after signOut:', data)
    }
  } catch (err) {
    console.log(`✅ Protected operation exception (expected): ${err.message}`)
  }

  // Step 6: Test re-authentication after signOut
  console.log('\n6. Testing re-authentication after signOut...')
  try {
    const { data: reSignInData, error: reSignInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    if (reSignInError) {
      console.error('❌ Re-authentication failed:', reSignInError.message)
    } else {
      console.log(`✅ Re-authentication successful: ${reSignInData.user.email}`)
      
      // Clean up by signing out again
      await supabase.auth.signOut()
      console.log('✅ Cleaned up test session')
    }
  } catch (err) {
    console.error('❌ Re-authentication exception:', err.message)
  }

  console.log('\n🎉 Comprehensive SignOut test completed!')
}

// Test different signOut scenarios
async function testSignOutScenarios() {
  console.log('\n🔬 Testing different signOut scenarios...\n')

  const testEmail = 'test@mzimahomes.com'
  const testPassword = 'TestPassword123!'

  // Scenario 1: Local scope signOut
  console.log('Scenario 1: Local scope signOut')
  try {
    await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword })
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    
    if (error) {
      console.error('❌ Local signOut failed:', error.message)
    } else {
      console.log('✅ Local signOut successful')
    }
  } catch (err) {
    console.error('❌ Local signOut scenario failed:', err.message)
  }

  // Scenario 2: Default signOut (should be global)
  console.log('\nScenario 2: Default signOut')
  try {
    await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword })
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('❌ Default signOut failed:', error.message)
    } else {
      console.log('✅ Default signOut successful')
    }
  } catch (err) {
    console.error('❌ Default signOut scenario failed:', err.message)
  }

  console.log('\n🎉 SignOut scenarios test completed!')
}

// Run all tests
async function runAllTests() {
  try {
    await testComprehensiveSignOut()
    await testSignOutScenarios()
  } catch (err) {
    console.error('❌ Test suite failed:', err.message)
  }
}

runAllTests()
