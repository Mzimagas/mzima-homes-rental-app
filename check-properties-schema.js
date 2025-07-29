#!/usr/bin/env node

/**
 * Check Properties Schema
 * Determines the actual column names in the properties table
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

async function checkPropertiesSchema() {
  console.log('🔍 Checking Properties Table Schema...')
  
  try {
    // Get a sample property to see the actual columns
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Error fetching properties:', error.message)
      return
    }
    
    if (properties && properties.length > 0) {
      console.log('\n📋 Actual Properties Table Columns:')
      const columns = Object.keys(properties[0])
      columns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col}`)
      })
      
      console.log('\n🔍 Key Column Analysis:')
      console.log(`   Has 'type' column: ${columns.includes('type') ? '✅' : '❌'}`)
      console.log(`   Has 'property_type' column: ${columns.includes('property_type') ? '✅' : '❌'}`)
      console.log(`   Has 'physical_address' column: ${columns.includes('physical_address') ? '✅' : '❌'}`)
      console.log(`   Has 'address' column: ${columns.includes('address') ? '✅' : '❌'}`)
      
      console.log('\n📝 Sample Property Data:')
      console.log(JSON.stringify(properties[0], null, 2))
      
      // Determine the correct column names for the function
      const typeColumn = columns.includes('property_type') ? 'property_type' : 'type'
      const addressColumn = columns.includes('physical_address') ? 'physical_address' : 'address'
      
      console.log('\n🎯 Correct Column Names for Function:')
      console.log(`   Type column: ${typeColumn}`)
      console.log(`   Address column: ${addressColumn}`)
      
      // Generate the correct INSERT statement
      console.log('\n🔧 Correct INSERT Statement:')
      console.log(`INSERT INTO properties (name, ${addressColumn}, ${typeColumn}, landlord_id, created_at, updated_at)`)
      console.log(`VALUES (property_name, property_address, property_type, effective_user_id, NOW(), NOW())`)
      
    } else {
      console.log('⚠️ No properties found in the table')
    }
    
  } catch (err) {
    console.error('❌ Error checking schema:', err)
  }
}

checkPropertiesSchema()
