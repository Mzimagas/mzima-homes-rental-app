#!/usr/bin/env node

/**
 * Create a test user for development
 * This script creates a test user that can be used to log in and test the dashboard
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestUser() {
  const testEmail = 'test@mzimahomes.com'
  const testPassword = 'TestPassword123!'
  const testFullName = 'Test User'

  console.log('🚀 Creating test user...')
  console.log(`Email: ${testEmail}`)
  console.log(`Password: ${testPassword}`)

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error checking existing users:', listError.message)
      return
    }

    const existingUser = existingUsers.users.find(user => user.email === testEmail)
    
    if (existingUser) {
      console.log('✅ Test user already exists!')
      console.log(`User ID: ${existingUser.id}`)
      console.log(`Email: ${existingUser.email}`)
      console.log(`Email confirmed: ${existingUser.email_confirmed_at ? 'Yes' : 'No'}`)
      
      // Ensure email is confirmed
      if (!existingUser.email_confirmed_at) {
        console.log('📧 Confirming email...')
        const { error: confirmError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true
        })
        
        if (confirmError) {
          console.error('❌ Error confirming email:', confirmError.message)
        } else {
          console.log('✅ Email confirmed!')
        }
      }
      
      return existingUser
    }

    // Create new user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: testFullName
      }
    })

    if (authError) {
      console.error('❌ Error creating user:', authError.message)
      return
    }

    console.log('✅ Test user created successfully!')
    console.log(`User ID: ${authData.user.id}`)
    console.log(`Email: ${authData.user.email}`)
    
    // Create user profile in enhanced_users table
    const { error: profileError } = await supabase.from('enhanced_users').insert({
      id: authData.user.id,
      email: testEmail,
      full_name: testFullName,
      member_number: 'TEST001',
      phone_number: '+254700000000',
      id_passport_number: 'TEST123456',
      status: 'active',
      profile_complete: true,
      next_of_kin_complete: false,
      must_change_password: false
    })

    if (profileError) {
      console.warn('⚠️  Could not create user profile:', profileError.message)
      console.log('User can still log in, but profile features may not work')
    } else {
      console.log('✅ User profile created!')
    }

    return authData.user

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

async function main() {
  console.log('🔧 Test User Creation Script')
  console.log('============================')
  
  const user = await createTestUser()
  
  if (user) {
    console.log('\n🎉 Success!')
    console.log('You can now log in with:')
    console.log('Email: test@mzimahomes.com')
    console.log('Password: TestPassword123!')
    console.log('\nGo to: http://localhost:3000/auth/login')
  } else {
    console.log('\n❌ Failed to create test user')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { createTestUser }
