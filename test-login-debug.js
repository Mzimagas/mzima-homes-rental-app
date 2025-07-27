// Debug login issues
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

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugLogin() {
  console.log('🔍 Login Debug Test\n')
  
  try {
    console.log('1️⃣ Testing environment variables...')
    console.log('✅ SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log('✅ SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing')
    
    console.log('\n2️⃣ Testing Supabase client creation...')
    console.log('✅ Client created successfully')
    
    console.log('\n3️⃣ Testing login with test credentials...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@voirental.com',
      password: 'password123'
    })

    if (error) {
      console.error('❌ Login failed:', error.message)
      console.error('Error details:', error)
      return
    }

    console.log('✅ Login successful!')
    console.log('👤 User ID:', data.user.id)
    console.log('📧 Email:', data.user.email)
    console.log('🔐 Session:', data.session ? 'Created' : 'Missing')
    
    console.log('\n4️⃣ Testing session persistence...')
    const { data: sessionData } = await supabase.auth.getSession()
    console.log('🔐 Current session:', sessionData.session ? 'Active' : 'None')
    
    console.log('\n5️⃣ Signing out...')
    await supabase.auth.signOut()
    console.log('✅ Signed out successfully')
    
    console.log('\n🎉 All tests passed! Frontend login should work.')
    console.log('\n📋 Next steps:')
    console.log('1. Open http://localhost:3000/auth/login')
    console.log('2. Enter: test@voirental.com / password123')
    console.log('3. Check browser console for any errors')
    console.log('4. Should redirect to dashboard after login')
    
  } catch (err) {
    console.error('❌ Debug test failed:', err.message)
    console.error('Stack trace:', err.stack)
  }
}

debugLogin()
