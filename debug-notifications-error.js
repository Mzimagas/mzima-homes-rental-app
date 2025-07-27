#!/usr/bin/env node

/**
 * Debug script to reproduce the exact notifications page error
 * This simulates the exact calls made by the notifications page
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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test user credentials - using the same as other test scripts
const testEmail = 'newuser@test.com'
const testPassword = 'password123'

// Helper function to handle Supabase errors
function handleSupabaseError(error) {
  if (error?.message) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error occurred'
}

// Replicate the exact getUserLandlordIds function from supabase-client.ts
async function getUserLandlordIds(autoSetup = false) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { data: null, error: handleSupabaseError(userError || new Error('User not authenticated')) }
    }

    console.log(`🔍 Current user: ${user.email} (ID: ${user.id})`)

    // Use the RPC function to get landlord IDs (respects RLS policies)
    const { data, error } = await supabase.rpc('get_user_landlord_ids', { user_uuid: user.id })

    if (error) {
      console.error('❌ RPC error:', error)
      return { data: null, error: handleSupabaseError(error) }
    }

    const landlordIds = data || []
    console.log(`🏠 Found landlord IDs: ${JSON.stringify(landlordIds)}`)

    // If no landlord access and auto-setup is enabled, try to create it
    if (landlordIds.length === 0 && autoSetup) {
      console.log('🔧 No landlord access found, attempting auto-setup...')

      // Try to create landlord access automatically
      const setupResult = await setupLandlordAccess()

      if (setupResult.success && setupResult.landlordId) {
        return { data: [setupResult.landlordId], error: null }
      } else {
        return { data: null, error: setupResult.message }
      }
    }

    return { data: landlordIds, error: null }
  } catch (err) {
    console.error('❌ Exception in getUserLandlordIds:', err)
    return { data: null, error: handleSupabaseError(err) }
  }
}

// Replicate the exact setupLandlordAccess function from supabase-client.ts
async function setupLandlordAccess() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log(`🔧 Setting up landlord access for: ${user.email}`)

    // Check if a landlord record already exists for this email
    const { data: existingLandlords, error: checkError } = await supabase
      .from('landlords')
      .select('id')
      .eq('email', user.email)
      .limit(1)

    if (checkError) {
      console.error('❌ Error checking existing landlords:', checkError)
      return { success: false, message: `Error checking existing landlords: ${checkError.message}` }
    }

    let landlordId

    if (existingLandlords && existingLandlords.length > 0) {
      // Use existing landlord record
      landlordId = existingLandlords[0].id
      console.log(`✅ Using existing landlord record: ${landlordId}`)
    } else {
      // Create new landlord record
      console.log('🏗️ Creating new landlord record...')
      const { data: newLandlord, error: createError } = await supabase
        .from('landlords')
        .insert([{
          full_name: user.user_metadata?.full_name || (user.email || 'Unknown User').split('@')[0],
          email: user.email || '',
          phone: user.user_metadata?.phone || '+254700000000'
        }])
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating landlord record:', createError)
        return { success: false, message: `Error creating landlord record: ${createError.message}` }
      }

      landlordId = newLandlord.id
      console.log(`✅ Created new landlord record: ${landlordId}`)
    }

    // Create user role assignment
    console.log('🔗 Creating user role assignment...')
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([{
        user_id: user.id,
        landlord_id: landlordId,
        role: 'LANDLORD'
      }])

    if (roleError && roleError.code !== '23505') { // Ignore duplicate key errors
      console.error('❌ Error creating user role:', roleError)
      return { success: false, message: `Error creating user role: ${roleError.message}` }
    }

    console.log('✅ User role assignment created/verified')
    return { success: true, message: 'Successfully set up landlord access', landlordId }
  } catch (err) {
    console.error('❌ Exception in setupLandlordAccess:', err)
    return { success: false, message: handleSupabaseError(err) }
  }
}

// Replicate the exact getNotificationRules function
async function getNotificationRules() {
  try {
    console.log('\n📋 Testing getNotificationRules...')
    
    // Try to get landlord IDs with auto-setup enabled
    const { data: landlordIds, error: landlordError } = await getUserLandlordIds(true)

    if (landlordError) {
      console.error('❌ Landlord error:', landlordError)
      return { data: null, error: landlordError }
    }

    if (!landlordIds || landlordIds.length === 0) {
      return { data: null, error: 'No landlord access found for this user' }
    }

    console.log(`🔍 Querying notification rules for landlords: ${JSON.stringify(landlordIds)}`)

    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .in('landlord_id', landlordIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Query error:', error)
      return { data: null, error: handleSupabaseError(error) }
    }

    console.log(`✅ Found ${data?.length || 0} notification rules`)
    return { data, error: null }
  } catch (err) {
    console.error('❌ Exception in getNotificationRules:', err)
    return { data: null, error: handleSupabaseError(err) }
  }
}

// Replicate the exact getNotificationHistory function
async function getNotificationHistory(limit = 50, offset = 0) {
  try {
    console.log('\n📜 Testing getNotificationHistory...')
    
    const { data: landlordIds, error: landlordError } = await getUserLandlordIds(true)
    if (landlordError || !landlordIds || landlordIds.length === 0) {
      console.error('❌ Landlord error:', landlordError)
      return { data: null, error: landlordError || 'No landlord access found for this user' }
    }

    console.log(`🔍 Querying notification history for landlords: ${JSON.stringify(landlordIds)}`)

    const { data, error } = await supabase
      .from('notification_history')
      .select('*')
      .in('landlord_id', landlordIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ Query error:', error)
      return { data: null, error: handleSupabaseError(error) }
    }

    console.log(`✅ Found ${data?.length || 0} notification history records`)
    return { data, error: null }
  } catch (err) {
    console.error('❌ Exception in getNotificationHistory:', err)
    return { data: null, error: handleSupabaseError(err) }
  }
}

async function main() {
  console.log('🐛 Debugging notifications page error...')
  console.log(`📡 Supabase URL: ${supabaseUrl}`)

  try {
    // Step 0: Create a fresh test user to avoid auth issues
    console.log('\n0. Creating fresh test user...')
    const freshEmail = `debug-${Date.now()}@test.com`
    const freshPassword = 'password123'

    // Use admin client to create user
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: freshEmail,
      password: freshPassword,
      email_confirm: true
    })

    if (createError) {
      console.error('❌ Failed to create test user:', createError.message)
      return
    }

    console.log(`✅ Created fresh test user: ${freshEmail}`)

    // Step 1: Sign in with the fresh user
    console.log('\n1. Signing in with fresh user...')
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: freshEmail,
      password: freshPassword
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message)
      return
    }

    console.log(`✅ Signed in as: ${authData.user?.email}`)

    // Step 2: Test getNotificationRules (this is where line 172 error occurs)
    const rulesResult = await getNotificationRules()
    if (rulesResult.error) {
      console.error('❌ getNotificationRules failed:', rulesResult.error)
    } else {
      console.log('✅ getNotificationRules succeeded')
    }

    // Step 3: Test getNotificationHistory (this is where line 193 error occurs)
    const historyResult = await getNotificationHistory()
    if (historyResult.error) {
      console.error('❌ getNotificationHistory failed:', historyResult.error)
    } else {
      console.log('✅ getNotificationHistory succeeded')
    }

    // Step 4: Clean up - delete the test user
    console.log('\n4. Cleaning up test user...')
    try {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.log('✅ Test user deleted')
    } catch (cleanupErr) {
      console.log('⚠️ Could not delete test user:', cleanupErr.message)
    }

    // Step 5: Sign out
    await supabase.auth.signOut()
    console.log('✅ Signed out')

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

main().catch(console.error)
