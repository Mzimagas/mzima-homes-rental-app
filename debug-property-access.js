#!/usr/bin/env node

/**
 * Debug script to verify property access and role checking
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function debugPropertyAccess() {
  console.log('🔍 DEBUGGING PROPERTY ACCESS AND ROLES')
  console.log('=' .repeat(60))
  
  try {
    // Get all users and their property access
    console.log('📋 Checking all users and their property access...')
    
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return
    }
    
    console.log(`✅ Found ${users.users.length} users`)
    
    for (const user of users.users) {
      console.log(`\n👤 User: ${user.email} (ID: ${user.id})`)
      
      // Check property_users table
      const { data: propertyUsers, error: propertyUsersError } = await supabaseAdmin
        .from('property_users')
        .select(`
          property_id,
          role,
          status,
          properties (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
      
      if (propertyUsersError) {
        console.error(`   ❌ Error fetching property users: ${propertyUsersError.message}`)
        continue
      }
      
      if (!propertyUsers || propertyUsers.length === 0) {
        console.log('   📝 No property access found in property_users table')
        
        // Check if user is a direct landlord
        const { data: ownedProperties, error: ownedError } = await supabaseAdmin
          .from('properties')
          .select('id, name')
          .eq('landlord_id', user.id)
        
        if (ownedError) {
          console.error(`   ❌ Error checking owned properties: ${ownedError.message}`)
        } else if (ownedProperties && ownedProperties.length > 0) {
          console.log(`   🏠 Direct landlord of ${ownedProperties.length} properties:`)
          ownedProperties.forEach(prop => {
            console.log(`      - ${prop.name} (ID: ${prop.id}) - Role: OWNER (implicit)`)
          })
        } else {
          console.log('   📝 No owned properties found')
        }
      } else {
        console.log(`   🏠 Property access (${propertyUsers.length} properties):`)
        propertyUsers.forEach(pu => {
          console.log(`      - ${pu.properties?.name || 'Unknown'} (ID: ${pu.property_id})`)
          console.log(`        Role: ${pu.role}, Status: ${pu.status}`)
        })
      }
      
      // Test the get_user_accessible_properties function
      console.log('   🧪 Testing get_user_accessible_properties function...')
      const { data: accessibleProps, error: accessError } = await supabaseAdmin
        .rpc('get_user_accessible_properties', { user_uuid: user.id })
      
      if (accessError) {
        console.error(`   ❌ RPC Error: ${accessError.message}`)
      } else if (!accessibleProps || accessibleProps.length === 0) {
        console.log('   📝 RPC returned no accessible properties')
      } else {
        console.log(`   ✅ RPC returned ${accessibleProps.length} accessible properties:`)
        accessibleProps.forEach(prop => {
          console.log(`      - ${prop.property_name} (ID: ${prop.property_id})`)
          console.log(`        Role: ${prop.user_role}`)
          console.log(`        Can manage tenants: ${prop.can_manage_tenants}`)
          console.log(`        Can manage users: ${prop.can_manage_users}`)
        })
        
        // Check admin access logic
        const hasAdminAccess = accessibleProps.some(p => 
          ['OWNER', 'PROPERTY_MANAGER'].includes(p.user_role)
        )
        console.log(`   🔑 Has admin access (OWNER/PROPERTY_MANAGER): ${hasAdminAccess ? '✅ YES' : '❌ NO'}`)
      }
    }
    
    // Check if the RPC function exists
    console.log('\n🔧 Checking if get_user_accessible_properties function exists...')
    const { data: functions, error: functionsError } = await supabaseAdmin
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'get_user_accessible_properties')
    
    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError.message)
    } else if (!functions || functions.length === 0) {
      console.log('❌ get_user_accessible_properties function NOT FOUND')
      console.log('   This could be the root cause of the issue!')
    } else {
      console.log('✅ get_user_accessible_properties function exists')
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message)
  }
}

// Run the debug
if (require.main === module) {
  debugPropertyAccess().catch(console.error)
}

module.exports = { debugPropertyAccess }
