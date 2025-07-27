#!/usr/bin/env node

/**
 * Check what users exist in the system
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🔍 Checking existing users...')
  
  try {
    // Check landlords table to see what emails exist
    const { data: landlords, error: landlordsError } = await supabaseAdmin
      .from('landlords')
      .select('id, email, full_name')
      .order('created_at', { ascending: false })

    if (landlordsError) {
      console.error('❌ Error fetching landlords:', landlordsError)
      return
    }

    console.log(`\n📋 Found ${landlords?.length || 0} landlords:`)
    landlords?.forEach((landlord, index) => {
      console.log(`   ${index + 1}. ${landlord.email} (${landlord.full_name}) - ID: ${landlord.id}`)
    })

    // Check user_roles to see what user IDs exist
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, landlord_id, role')
      .order('created_at', { ascending: false })

    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError)
      return
    }

    console.log(`\n🔗 Found ${userRoles?.length || 0} user role assignments:`)
    userRoles?.forEach((role, index) => {
      console.log(`   ${index + 1}. User: ${role.user_id}, Landlord: ${role.landlord_id}, Role: ${role.role}`)
    })

    // Try to create a test user if none exist
    if (!userRoles || userRoles.length === 0) {
      console.log('\n🔧 No users found, creating test user...')
      
      const testEmail = 'debug@test.com'
      const testPassword = 'password123'
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      if (createError) {
        console.error('❌ Error creating test user:', createError)
      } else {
        console.log(`✅ Created test user: ${testEmail} (ID: ${newUser.user?.id})`)
        console.log(`🔑 Password: ${testPassword}`)
      }
    } else {
      // Find a landlord email to use for testing
      const testLandlord = landlords?.[0]
      if (testLandlord) {
        console.log(`\n🧪 You can test with email: ${testLandlord.email}`)
        console.log('   (You may need to reset the password if you don\'t know it)')
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

main().catch(console.error)
