#!/usr/bin/env node

/**
 * Clean up test users to prevent email bounce issues
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupTestUsers() {
  console.log('🧹 Cleaning up test users to prevent email bounces...\n')
  
  try {
    const { data: authUsers, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.log('⚠️ Could not list auth users:', error.message)
      return
    }
    
    const testUsers = authUsers.users.filter(user => 
      user.email && (
        user.email.includes('@voirental.com') ||
        user.email.includes('@mzimahomes.com') ||
        user.email.includes('@example.') || 
        user.email.includes('@test.') || 
        user.email.startsWith('test@') ||
        user.email.includes('@localhost') ||
        user.email.includes('@invalid')
      )
    )
    
    if (testUsers.length === 0) {
      console.log('✅ No test users found to clean up')
      return
    }
    
    console.log(`Found ${testUsers.length} test users:`)
    testUsers.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`)
    })
    
    console.log('\n🗑️  Removing test users...')
    
    for (const user of testUsers) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.log(`❌ Failed to delete ${user.email}: ${deleteError.message}`)
        } else {
          console.log(`✅ Deleted ${user.email}`)
        }
      } catch (err) {
        console.log(`❌ Error deleting ${user.email}: ${err.message}`)
      }
    }
    
    console.log('\n🎉 Test user cleanup completed!')
    
  } catch (err) {
    console.log('❌ Error during cleanup:', err.message)
  }
}

cleanupTestUsers()
