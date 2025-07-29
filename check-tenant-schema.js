// Check the actual tenant table schema
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function checkTenantSchema() {
  console.log('🔍 Checking Tenant Table Schema...\n')
  
  try {
    // Try to create a minimal tenant to see what fields are required/available
    console.log('1️⃣ Testing minimal tenant creation...')
    
    const minimalTenantData = {
      full_name: 'Schema Test Tenant',
      phone: '+254700000000'
    }
    
    const { data: testTenant, error: minimalError } = await supabase
      .from('tenants')
      .insert(minimalTenantData)
      .select()
      .single()
    
    if (minimalError) {
      console.log('❌ Minimal tenant creation failed:', minimalError.message)
    } else {
      console.log('✅ Minimal tenant created successfully')
      console.log('   Available fields in response:', Object.keys(testTenant))
      
      // Clean up
      await supabase.from('tenants').delete().eq('id', testTenant.id)
      console.log('✅ Test tenant cleaned up')
    }
    
    // Try with more fields to see what's available
    console.log('\n2️⃣ Testing extended tenant creation...')
    
    const extendedTenantData = {
      full_name: 'Extended Test Tenant',
      phone: '+254700000001',
      email: 'test@example.com',
      id_number: '12345678'
    }
    
    const { data: extendedTenant, error: extendedError } = await supabase
      .from('tenants')
      .insert(extendedTenantData)
      .select()
      .single()
    
    if (extendedError) {
      console.log('❌ Extended tenant creation failed:', extendedError.message)
    } else {
      console.log('✅ Extended tenant created successfully')
      console.log('   Available fields:', Object.keys(extendedTenant))
      
      // Clean up
      await supabase.from('tenants').delete().eq('id', extendedTenant.id)
      console.log('✅ Extended test tenant cleaned up')
    }
    
    // Check what fields exist by querying existing tenants
    console.log('\n3️⃣ Checking existing tenant structure...')
    
    const { data: existingTenants, error: queryError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1)
    
    if (queryError) {
      console.log('❌ Error querying tenants:', queryError.message)
    } else if (existingTenants && existingTenants.length > 0) {
      console.log('✅ Found existing tenant structure:')
      console.log('   Fields:', Object.keys(existingTenants[0]))
    } else {
      console.log('ℹ️ No existing tenants found')
    }
    
    // Check the tenant form to see what fields it's trying to use
    console.log('\n4️⃣ Checking tenant form field usage...')
    
    console.log('   Fields used in tenant form:')
    console.log('   - full_name (required)')
    console.log('   - phone (required)')
    console.log('   - email (optional)')
    console.log('   - id_number (optional)')
    console.log('   - emergency_contact_name (optional) ← This might not exist in schema')
    console.log('   - emergency_contact_phone (optional) ← This might not exist in schema')
    console.log('   - current_unit_id (for unit assignment)')
    
  } catch (err) {
    console.error('❌ Schema check failed:', err.message)
  }
}

checkTenantSchema()
