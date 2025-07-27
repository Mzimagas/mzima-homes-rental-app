#!/usr/bin/env node

/**
 * Check what RLS policies exist on the landlords table
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
  console.log('🔍 Checking RLS policies on landlords table...')
  
  try {
    // Query the information_schema to see what policies exist
    const { data: policies, error: policiesError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT
            pol.policyname,
            pol.cmd,
            pol.permissive,
            pol.roles,
            pol.qual,
            pol.with_check
          FROM pg_policies pol
          WHERE pol.schemaname = 'public'
            AND pol.tablename = 'landlords'
          ORDER BY pol.policyname
        `
      })

    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError)

      // Try a simpler approach - just test if we can create a landlord record
      console.log('\n🧪 Testing landlord record creation directly...')

      // Create a test user first
      const testEmail = `policy-test-${Date.now()}@test.com`
      const { data: testUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: 'password123',
        email_confirm: true
      })

      if (createUserError) {
        console.error('❌ Could not create test user:', createUserError)
        return
      }

      // Try to create landlord record as that user
      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: testEmail,
        password: 'password123'
      })

      if (signInError) {
        console.error('❌ Could not sign in test user:', signInError)
        return
      }

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
        console.error('❌ Landlord creation failed (confirming RLS issue):', landlordError.message)
        console.log('\n💡 This confirms the RLS policies are missing!')
      } else {
        console.log('✅ Landlord creation succeeded - policies are working')
      }

      // Clean up
      await userClient.auth.signOut()
      await supabaseAdmin.auth.admin.deleteUser(testUser.user.id)
      if (landlordData) {
        await supabaseAdmin.from('landlords').delete().eq('id', landlordData.id)
      }

      return
    }

    console.log(`\n📋 Found ${policies?.length || 0} RLS policies on landlords table:`)
    policies?.forEach((policy, index) => {
      console.log(`\n   ${index + 1}. Policy: "${policy.policyname}"`)
      console.log(`      Command: ${policy.cmd}`)
      console.log(`      Permissive: ${policy.permissive}`)
      console.log(`      Roles: ${policy.roles}`)
      console.log(`      Qual: ${policy.qual || 'N/A'}`)
      console.log(`      With Check: ${policy.with_check || 'N/A'}`)
    })

    // Also check if RLS is enabled on the table
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity,
            forcerowsecurity
          FROM pg_tables 
          WHERE tablename = 'landlords' AND schemaname = 'public'
        `
      })

    if (tableError) {
      console.error('❌ Error checking table info:', tableError)
    } else {
      console.log('\n🔒 Table security settings:')
      console.log(`   RLS Enabled: ${tableInfo?.[0]?.rowsecurity || 'Unknown'}`)
      console.log(`   Force RLS: ${tableInfo?.[0]?.forcerowsecurity || 'Unknown'}`)
    }

    // Check what the missing policy should be
    console.log('\n🔧 Expected policies from migration 008:')
    console.log('   1. "Users can create landlord records with their email" (INSERT)')
    console.log('   2. "Users can update their own landlord records" (UPDATE)')
    
    const expectedPolicies = [
      'Users can create landlord records with their email',
      'Users can update their own landlord records'
    ]
    
    const existingPolicyNames = policies?.map(p => p.policyname) || []
    const missingPolicies = expectedPolicies.filter(name => !existingPolicyNames.includes(name))
    
    if (missingPolicies.length > 0) {
      console.log('\n❌ Missing policies:')
      missingPolicies.forEach(policy => {
        console.log(`   - ${policy}`)
      })
      console.log('\n💡 Solution: Apply migration 008 manually in Supabase Dashboard')
    } else {
      console.log('\n✅ All expected policies are present')
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

main().catch(console.error)
