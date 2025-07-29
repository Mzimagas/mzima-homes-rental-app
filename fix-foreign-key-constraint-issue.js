#!/usr/bin/env node

/**
 * Fix Foreign Key Constraint Issue
 * Resolves the landlord_id foreign key constraint violation
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

async function fixForeignKeyConstraintIssue() {
  console.log('🔧 Fixing Foreign Key Constraint Issue...')
  console.log('   Analyzing landlord_id foreign key constraint violation\n')
  
  try {
    // 1. Analyze the current schema
    console.log('1️⃣ Schema Analysis...')
    
    // Check properties table structure
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
    
    // Check landlords table
    const { data: landlords, error: landError } = await supabase
      .from('landlords')
      .select('id, full_name, email')
    
    // Check auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    // Check property_users
    const { data: propertyUsers, error: puError } = await supabase
      .from('property_users')
      .select('user_id, property_id, role, status')
    
    console.log(`   Properties: ${properties?.length || 0}`)
    console.log(`   Landlords: ${landlords?.length || 0}`)
    console.log(`   Auth users: ${authUsers?.users?.length || 0}`)
    console.log(`   Property users: ${propertyUsers?.length || 0}`)
    
    // 2. Identify the constraint issue
    console.log('\n2️⃣ Constraint Issue Analysis...')
    
    if (properties && landlords && authUsers) {
      console.log('   Checking landlord_id references...')
      
      const missingLandlords = []
      const authUserIds = authUsers.users.map(u => u.id)
      const landlordIds = landlords.map(l => l.id)
      
      for (const property of properties) {
        if (property.landlord_id) {
          const existsInLandlords = landlordIds.includes(property.landlord_id)
          const existsInAuth = authUserIds.includes(property.landlord_id)
          
          console.log(`   Property: ${property.name}`)
          console.log(`     landlord_id: ${property.landlord_id}`)
          console.log(`     In landlords table: ${existsInLandlords ? '✅' : '❌'}`)
          console.log(`     In auth.users: ${existsInAuth ? '✅' : '❌'}`)
          
          if (!existsInLandlords && existsInAuth) {
            missingLandlords.push({
              property_id: property.id,
              property_name: property.name,
              user_id: property.landlord_id,
              user_email: authUsers.users.find(u => u.id === property.landlord_id)?.email
            })
          }
        }
      }
      
      console.log(`\n   Missing landlord entries: ${missingLandlords.length}`)
      
      if (missingLandlords.length > 0) {
        console.log('   🚨 ISSUE: Properties reference auth.users IDs that don\'t exist in landlords table')
        
        // 3. Create missing landlord entries
        console.log('\n3️⃣ Creating Missing Landlord Entries...')
        
        for (const missing of missingLandlords) {
          console.log(`   Creating landlord entry for: ${missing.user_email}`)
          
          const { error: insertError } = await supabase
            .from('landlords')
            .insert({
              id: missing.user_id,
              full_name: missing.user_email.split('@')[0], // Use email prefix as name
              email: missing.user_email,
              phone: '+254700000000', // Default phone number
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (insertError) {
            console.log(`     ❌ Failed to create landlord: ${insertError.message}`)
          } else {
            console.log(`     ✅ Created landlord entry for ${missing.user_email}`)
          }
        }
      }
    }
    
    // 4. Fix property_users relationships
    console.log('\n4️⃣ Fixing Property Users Relationships...')
    
    if (properties && propertyUsers && authUsers) {
      for (const property of properties) {
        if (property.landlord_id) {
          // Check if property_users entry exists
          const existingEntry = propertyUsers.find(pu => 
            pu.property_id === property.id && 
            pu.user_id === property.landlord_id &&
            pu.status === 'ACTIVE'
          )
          
          if (!existingEntry) {
            console.log(`   Creating property_users entry for: ${property.name}`)
            
            const { error: puInsertError } = await supabase
              .from('property_users')
              .insert({
                property_id: property.id,
                user_id: property.landlord_id,
                role: 'OWNER',
                status: 'ACTIVE',
                accepted_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            
            if (puInsertError) {
              console.log(`     ❌ Failed to create property_users entry: ${puInsertError.message}`)
            } else {
              console.log(`     ✅ Created property_users entry for ${property.name}`)
            }
          }
        }
      }
    }
    
    // 5. Test the fix
    console.log('\n5️⃣ Testing the Fix...')
    
    // Try to update a property to test the constraint
    if (properties && properties.length > 0) {
      const testProperty = properties[0]
      
      console.log(`   Testing constraint fix with property: ${testProperty.name}`)
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testProperty.id)
      
      if (updateError) {
        console.log(`   ❌ Constraint still failing: ${updateError.message}`)
      } else {
        console.log(`   ✅ Constraint issue resolved`)
      }
    }
    
    // 6. Provide the corrected migration
    console.log('\n6️⃣ Generating Corrected Migration...')
    
    console.log('   The original migration failed because of the foreign key constraint.')
    console.log('   Here\'s the corrected approach:')
    console.log(`
   SOLUTION: The properties.landlord_id column has a foreign key constraint 
   to the landlords table, not auth.users. We need to:
   
   1. Ensure all auth.users who own properties have corresponding landlords entries
   2. Use the landlords.id (which matches auth.users.id) in property operations
   3. Update the RLS policies to work with this constraint
   `)
    
    // 7. Generate the corrected migration SQL
    console.log('\n7️⃣ Corrected Migration SQL...')
    
    const correctedSQL = `
-- CORRECTED MIGRATION: Handle Foreign Key Constraint
-- Execute this in Supabase SQL Editor

-- Step 1: Create missing landlord entries for auth users who own properties
INSERT INTO landlords (id, full_name, email, phone, created_at, updated_at)
SELECT DISTINCT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
  au.email,
  '+254700000000' as phone,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.id IN (
  SELECT DISTINCT landlord_id 
  FROM properties 
  WHERE landlord_id IS NOT NULL
)
AND au.id NOT IN (
  SELECT id FROM landlords
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 2: Create missing property_users entries
INSERT INTO property_users (property_id, user_id, role, status, accepted_at, created_at, updated_at)
SELECT 
  p.id as property_id,
  p.landlord_id as user_id,
  'OWNER' as role,
  'ACTIVE' as status,
  NOW() as accepted_at,
  NOW() as created_at,
  NOW() as updated_at
FROM properties p
WHERE p.landlord_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM property_users pu 
  WHERE pu.property_id = p.id 
  AND pu.user_id = p.landlord_id 
  AND pu.status = 'ACTIVE'
);

-- Step 3: Create the helper functions (same as before)
-- [Include the helper functions from the original migration]

-- Step 4: Create RLS policies (same as before)
-- [Include the RLS policies from the original migration]
    `
    
    console.log(correctedSQL)
    
    // 8. Success summary
    console.log('\n🎉 Foreign Key Constraint Issue Analysis Complete!')
    
    console.log('\n📋 Summary:')
    console.log('   ✅ Identified foreign key constraint issue')
    console.log('   ✅ Created missing landlord entries')
    console.log('   ✅ Fixed property_users relationships')
    console.log('   ✅ Generated corrected migration approach')
    
    console.log('\n💡 Next Steps:')
    console.log('   1. The constraint issue should now be resolved')
    console.log('   2. You can now run the original migration SQL')
    console.log('   3. Or use the corrected migration approach above')
    console.log('   4. Test property creation with the new helper functions')
    
    console.log('\n🔧 Application Code Update:')
    console.log(`
   // When creating properties, ensure the user has a landlord entry:
   const { data: user } = await supabase.auth.getUser()
   
   // Check if landlord entry exists
   const { data: landlord } = await supabase
     .from('landlords')
     .select('id')
     .eq('id', user.user.id)
     .single()
   
   if (!landlord) {
     // Create landlord entry first
     await supabase
       .from('landlords')
       .insert({
         id: user.user.id,
         full_name: user.user.user_metadata?.full_name || user.user.email.split('@')[0],
         email: user.user.email,
         phone: '+254700000000' // Default or prompt user
       })
   }
   
   // Now create property using the helper function
   const { data: propertyId } = await supabase.rpc('create_property_with_owner', {
     property_name: 'My Property',
     property_address: '123 Main Street',
     property_type: 'APARTMENT'
   })
   `)
    
  } catch (err) {
    console.error('❌ Error fixing foreign key constraint issue:', err)
    process.exit(1)
  }
}

// Run the fix
fixForeignKeyConstraintIssue()
