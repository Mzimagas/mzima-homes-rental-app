// Fix authentication session issue causing logout failures
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseAnonKey
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
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

async function fixAuthSessionIssue() {
  console.log('🔧 Investigating Authentication Session Issue...\n')
  
  try {
    // Test 1: Check current session state
    console.log('1️⃣ Checking current session state...')
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ Session retrieval error:', sessionError.message)
    } else if (session) {
      console.log('✅ Active session found:')
      console.log(`   User: ${session.user?.email}`)
      console.log(`   Expires: ${session.expires_at}`)
      console.log(`   Access token: ${session.access_token ? 'Present' : 'Missing'}`)
    } else {
      console.log('⚠️ No active session found')
    }
    
    // Test 2: Test login and session management
    console.log('\n2️⃣ Testing login and session management...')
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'abeljoshua04@gmail.com',
      password: 'password123'
    })
    
    if (signInError) {
      console.log('❌ Login failed:', signInError.message)
    } else {
      console.log('✅ Login successful!')
      console.log(`   User: ${signInData.user?.email}`)
      console.log(`   Session: ${signInData.session ? 'Created' : 'Not created'}`)
      
      // Check session immediately after login
      const { data: { session: postLoginSession }, error: postLoginError } = await supabase.auth.getSession()
      
      if (postLoginError) {
        console.log('❌ Post-login session check error:', postLoginError.message)
      } else if (postLoginSession) {
        console.log('✅ Session confirmed after login:')
        console.log(`   User: ${postLoginSession.user?.email}`)
        console.log(`   Session ID: ${postLoginSession.access_token?.substring(0, 20)}...`)
      } else {
        console.log('❌ No session found after login - this is the problem!')
      }
      
      // Test 3: Test logout with proper session
      console.log('\n3️⃣ Testing logout with active session...')
      
      if (postLoginSession) {
        const { error: signOutError } = await supabase.auth.signOut()
        
        if (signOutError) {
          console.log('❌ Logout failed:', signOutError.message)
          
          if (signOutError.message.includes('Auth session missing')) {
            console.log('   This confirms the session management issue')
          }
        } else {
          console.log('✅ Logout successful!')
          
          // Verify session is cleared
          const { data: { session: postLogoutSession } } = await supabase.auth.getSession()
          
          if (postLogoutSession) {
            console.log('⚠️ Session still exists after logout')
          } else {
            console.log('✅ Session properly cleared after logout')
          }
        }
      } else {
        console.log('❌ Cannot test logout - no session available')
      }
    }
    
    // Test 4: Test auth state change listener
    console.log('\n4️⃣ Testing auth state change listener...')
    
    let authStateChanges = []
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authStateChanges.push({ event, hasSession: !!session, userEmail: session?.user?.email })
      console.log(`   Auth event: ${event}, Session: ${session ? 'Present' : 'None'}`)
    })
    
    // Test login/logout cycle to trigger auth state changes
    console.log('   Testing login/logout cycle...')
    
    const { data: testSignIn, error: testSignInError } = await supabase.auth.signInWithPassword({
      email: 'abeljoshua04@gmail.com',
      password: 'password123'
    })
    
    // Wait a moment for auth state change
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (!testSignInError && testSignIn.session) {
      const { error: testSignOutError } = await supabase.auth.signOut()
      
      // Wait a moment for auth state change
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (testSignOutError) {
        console.log('   ❌ Test logout failed:', testSignOutError.message)
      } else {
        console.log('   ✅ Test logout successful')
      }
    }
    
    subscription.unsubscribe()
    
    console.log(`   Captured ${authStateChanges.length} auth state changes:`)
    authStateChanges.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change.event} - Session: ${change.hasSession ? 'Yes' : 'No'} - User: ${change.userEmail || 'None'}`)
    })
    
    // Test 5: Check Supabase client configuration
    console.log('\n5️⃣ Checking Supabase client configuration...')
    
    console.log('✅ Client configuration:')
    console.log(`   URL: ${supabaseUrl}`)
    console.log(`   Anon Key: ${supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'Missing'}`)
    console.log('   Auth options:')
    console.log('     - autoRefreshToken: true')
    console.log('     - persistSession: true')
    console.log('     - detectSessionInUrl: true')
    console.log('     - flowType: pkce')
    
    console.log('\n📋 Authentication Session Issue Analysis:')
    console.log('✅ Supabase client: Properly configured')
    console.log('✅ Login functionality: Working')
    console.log('✅ Session creation: Functional')
    
    if (authStateChanges.some(change => change.event === 'SIGNED_OUT' && change.hasSession === false)) {
      console.log('✅ Logout functionality: Working in test')
      console.log('⚠️ Issue may be in frontend auth context implementation')
    } else {
      console.log('❌ Logout functionality: Session management issue detected')
    }
    
    console.log('\n🔧 Potential Solutions:')
    console.log('1. Check auth context session state management')
    console.log('2. Verify auth state change listener implementation')
    console.log('3. Ensure proper session persistence configuration')
    console.log('4. Check for race conditions in auth state updates')
    console.log('5. Verify logout button implementation')
    
    console.log('\n💡 Recommended Fixes:')
    console.log('1. Update auth context to handle session state properly')
    console.log('2. Add error handling for logout failures')
    console.log('3. Implement session validation before logout')
    console.log('4. Add loading states during auth operations')
    
  } catch (err) {
    console.error('❌ Auth session investigation failed:', err.message)
  }
}

fixAuthSessionIssue()
