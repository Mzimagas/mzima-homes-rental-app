#!/usr/bin/env node

/**
 * Apply the missing RLS policies from migration 008
 * This fixes the "new row violates row-level security policy for table 'landlords'" error
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

// The SQL statements from migration 008
const migrationSQL = [
  {
    name: "Users can create landlord records with their email",
    sql: `CREATE POLICY "Users can create landlord records with their email" ON landlords
  FOR INSERT WITH CHECK (email = auth.email());`
  },
  {
    name: "Users can update their own landlord records", 
    sql: `CREATE POLICY "Users can update their own landlord records" ON landlords
  FOR UPDATE USING (email = auth.email());`
  },
  {
    name: "Users can create their own landlord role assignments",
    sql: `CREATE POLICY "Users can create their own landlord role assignments" ON user_roles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    role = 'LANDLORD' AND
    landlord_id IN (
      SELECT id FROM landlords WHERE email = auth.email()
    )
  );`
  },
  {
    name: "Users can read their own role assignments",
    sql: `CREATE POLICY "Users can read their own role assignments" ON user_roles
  FOR SELECT USING (user_id = auth.uid());`
  }
]

async function applyPolicy(policy) {
  try {
    console.log(`🔧 Applying policy: "${policy.name}"...`)
    
    // Use raw SQL execution via the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: policy.sql
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Failed to apply policy "${policy.name}":`, errorText)
      return false
    }

    console.log(`✅ Successfully applied policy: "${policy.name}"`)
    return true
  } catch (err) {
    console.error(`❌ Error applying policy "${policy.name}":`, err.message)
    return false
  }
}

async function testPolicyApplication() {
  console.log('\n🧪 Testing the fix...')
  
  try {
    // Create a test user
    const testEmail = `fix-test-${Date.now()}@test.com`
    const testPassword = 'password123'
    
    const { data: testUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })
    
    if (createUserError) {
      console.error('❌ Could not create test user:', createUserError)
      return false
    }
    
    console.log(`✅ Created test user: ${testEmail}`)
    
    // Sign in as the test user
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })
    
    if (signInError) {
      console.error('❌ Could not sign in test user:', signInError)
      return false
    }
    
    console.log('✅ Signed in as test user')
    
    // Try to create a landlord record
    const { data: landlordData, error: landlordError } = await userClient
      .from('landlords')
      .insert([{
        full_name: 'Test User',
        email: testEmail,
        phone: '+254700000000'
      }])
      .select()
      .single()
    
    if (landlordError) {
      console.error('❌ Landlord creation still fails:', landlordError.message)
      await userClient.auth.signOut()
      await supabaseAdmin.auth.admin.deleteUser(testUser.user.id)
      return false
    }
    
    console.log('✅ Landlord record created successfully!')
    
    // Try to create a user role
    const { data: roleData, error: roleError } = await userClient
      .from('user_roles')
      .insert([{
        user_id: testUser.user.id,
        landlord_id: landlordData.id,
        role: 'LANDLORD'
      }])
      .select()
      .single()
    
    if (roleError) {
      console.error('❌ User role creation failed:', roleError.message)
    } else {
      console.log('✅ User role created successfully!')
    }
    
    // Clean up
    await userClient.auth.signOut()
    await supabaseAdmin.from('user_roles').delete().eq('id', roleData?.id)
    await supabaseAdmin.from('landlords').delete().eq('id', landlordData.id)
    await supabaseAdmin.auth.admin.deleteUser(testUser.user.id)
    
    console.log('✅ Test completed and cleaned up')
    return true
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Applying missing RLS policies to fix landlord creation error...')
  
  try {
    let successCount = 0
    
    for (const policy of migrationSQL) {
      const success = await applyPolicy(policy)
      if (success) successCount++
    }
    
    console.log(`\n📊 Applied ${successCount}/${migrationSQL.length} policies`)
    
    if (successCount === migrationSQL.length) {
      console.log('✅ All policies applied successfully!')
      
      // Test the fix
      const testSuccess = await testPolicyApplication()
      
      if (testSuccess) {
        console.log('\n🎉 Fix verified! The notifications page should now work properly.')
        console.log('\n💡 The RLS policy violations should be resolved.')
      } else {
        console.log('\n⚠️ Policies applied but test failed. There may be additional issues.')
      }
    } else {
      console.log('\n❌ Some policies failed to apply. Check the errors above.')
      console.log('\n💡 You may need to apply the policies manually in the Supabase Dashboard.')
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

main().catch(console.error)
