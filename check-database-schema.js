// Check the actual database schema to understand column names
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseAnonKey, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmedLine.split('=')[1]
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

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema...\n')
  
  try {
    // Check properties table schema
    console.log('1️⃣ Properties table schema:')
    const { data: propertiesSchema, error: propertiesSchemaError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'properties')
      .eq('table_schema', 'public')
      .order('ordinal_position')
    
    if (propertiesSchemaError) {
      console.log('❌ Error getting properties schema:', propertiesSchemaError.message)
    } else {
      console.log('✅ Properties columns:')
      propertiesSchema.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
    }
    
    // Check units table schema
    console.log('\n2️⃣ Units table schema:')
    const { data: unitsSchema, error: unitsSchemaError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'units')
      .eq('table_schema', 'public')
      .order('ordinal_position')
    
    if (unitsSchemaError) {
      console.log('❌ Error getting units schema:', unitsSchemaError.message)
    } else {
      console.log('✅ Units columns:')
      unitsSchema.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
    }
    
    // Check tenants table schema
    console.log('\n3️⃣ Tenants table schema:')
    const { data: tenantsSchema, error: tenantsSchemaError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'tenants')
      .eq('table_schema', 'public')
      .order('ordinal_position')
    
    if (tenantsSchemaError) {
      console.log('❌ Error getting tenants schema:', tenantsSchemaError.message)
    } else {
      console.log('✅ Tenants columns:')
      tenantsSchema.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
    }
    
    // Check property_users table schema
    console.log('\n4️⃣ Property_users table schema:')
    const { data: propertyUsersSchema, error: propertyUsersSchemaError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'property_users')
      .eq('table_schema', 'public')
      .order('ordinal_position')
    
    if (propertyUsersSchemaError) {
      console.log('❌ Error getting property_users schema:', propertyUsersSchemaError.message)
    } else {
      console.log('✅ Property_users columns:')
      propertyUsersSchema.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
    }
    
    // Check current RLS policies
    console.log('\n5️⃣ Current RLS policies:')
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('pg_policies')
      .select('tablename, policyname, cmd, qual')
      .in('tablename', ['properties', 'units', 'tenants', 'property_users'])
    
    if (policiesError) {
      console.log('❌ Error getting policies:', policiesError.message)
    } else {
      console.log('✅ Current policies:')
      const tableGroups = {}
      policies.forEach(policy => {
        if (!tableGroups[policy.tablename]) {
          tableGroups[policy.tablename] = []
        }
        tableGroups[policy.tablename].push(policy)
      })
      
      Object.keys(tableGroups).forEach(tableName => {
        console.log(`\n   ${tableName}:`)
        tableGroups[tableName].forEach(policy => {
          console.log(`     - ${policy.policyname} (${policy.cmd})`)
        })
      })
    }
    
    // Test basic table access
    console.log('\n6️⃣ Testing basic table access:')
    
    const tables = ['properties', 'units', 'tenants', 'property_users']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: Accessible (${data?.length || 0} records in sample)`)
        }
      } catch (err) {
        console.log(`❌ ${table}: Exception - ${err.message}`)
      }
    }
    
    console.log('\n📋 Schema Analysis Summary:')
    console.log('Use this information to:')
    console.log('1. Update frontend queries with correct column names')
    console.log('2. Verify RLS policies are properly configured')
    console.log('3. Ensure all necessary columns exist for property management')
    console.log('4. Apply the COMPLETE_RLS_AND_SCHEMA_FIX.sql script if needed')
    
  } catch (err) {
    console.error('❌ Schema check failed:', err.message)
  }
}

checkDatabaseSchema()
