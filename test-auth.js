// Test authentication system
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

const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function createTestUser() {
  console.log('🧪 Creating test user for authentication testing...\n')
  
  try {
    // Create a test user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@voirental.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Test User'
      },
      email_confirm: true // Skip email confirmation for testing
    })

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Test user already exists!')
        console.log('📧 Email: test@voirental.com')
        console.log('🔑 Password: password123')
      } else {
        console.error('❌ Error creating test user:', error.message)
      }
    } else {
      console.log('✅ Test user created successfully!')
      console.log('📧 Email: test@voirental.com')
      console.log('🔑 Password: password123')
      console.log('👤 User ID:', data.user.id)
    }

    console.log('\n🚀 You can now test the authentication system:')
    console.log('1. Go to http://localhost:3004/auth/login')
    console.log('2. Use the credentials above to sign in')
    console.log('3. You should be redirected to the dashboard')
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

createTestUser()
