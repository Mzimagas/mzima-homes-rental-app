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

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

async function testSignOutFlow() {
  console.log('🧪 Testing SignOut functionality...\n')

  // Test credentials
  const testEmail = 'test@mzimahomes.com'
  const testPassword = 'TestPassword123!'

  // Step 1: Sign in first
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
    console.log(`   Session ID: ${signInData.session?.access_token?.substring(0, 20)}...`)
  } catch (err) {
    console.error('❌ Sign in exception:', err.message)
    return
  }

  // Step 2: Verify we're signed in
  console.log('\n2. Verifying current session...')
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Get session failed:', sessionError.message)
      return
    }

    if (sessionData.session) {
      console.log(`✅ Current session confirmed: ${sessionData.session.user.email}`)
    } else {
      console.log('❌ No current session found')
      return
    }
  } catch (err) {
    console.error('❌ Get session exception:', err.message)
    return
  }

  // Step 3: Test signOut
  console.log('\n3. Testing signOut...')
  try {
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      console.error('❌ SignOut failed:', signOutError.message)
    } else {
      console.log('✅ SignOut call completed successfully')
    }
  } catch (err) {
    console.error('❌ SignOut exception:', err.message)
  }

  // Step 4: Verify we're signed out
  console.log('\n4. Verifying signOut was successful...')
  
  // Wait a moment for the signOut to process
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  try {
    const { data: postSignOutSession, error: postSignOutError } = await supabase.auth.getSession()
    
    if (postSignOutError) {
      console.error('❌ Post-signOut session check failed:', postSignOutError.message)
    } else if (postSignOutSession.session) {
      console.error('❌ SignOut failed - session still exists:', postSignOutSession.session.user.email)
    } else {
      console.log('✅ SignOut successful - no session found')
    }
  } catch (err) {
    console.error('❌ Post-signOut session check exception:', err.message)
  }

  // Step 5: Test getUser after signOut
  console.log('\n5. Testing getUser after signOut...')
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log(`✅ getUser correctly failed after signOut: ${userError.message}`)
    } else if (userData.user) {
      console.error('❌ getUser still returns user after signOut:', userData.user.email)
    } else {
      console.log('✅ getUser correctly returns no user after signOut')
    }
  } catch (err) {
    console.error('❌ getUser exception:', err.message)
  }

  console.log('\n🎉 SignOut test completed!')
}

testSignOutFlow().catch(console.error)
